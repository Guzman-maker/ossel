const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order, Product } = require('../utils/localDB');

router.post('/create-checkout-session', async (req, res) => {
    try {
        const { items, customer_details } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // 1. Validar Precios y Stock vs Base de Datos (Seguridad Backend)
        const line_items = [];
        const orderItems = [];
        let totalAmount = 0;

        for (const item of items) {
            // Buscar producto real en DB
            const product = await Product.findById(item.id) || await Product.findOne({ id: item.id });

            if (!product) {
                return res.status(400).json({ error: `El producto ${item.name} ya no existe.` });
            }
            if (product.stock < item.qty) {
                return res.status(400).json({ error: `Stock insuficiente para ${product.name}. Disponibles: ${product.stock}` });
            }

            // Usar precio de DB, NO del frontend
            const realPrice = parseFloat(product.price);

            line_items.push({
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: product.name,
                        images: product.image && product.image.startsWith('http') ? [product.image] : [],
                        description: product.description ? product.description.substring(0, 100) : undefined
                    },
                    unit_amount: Math.round(realPrice * 100), // Convert cents
                },
                quantity: item.qty,
            });

            orderItems.push({
                product: product._id || product.id,
                name: product.name,
                price: realPrice,
                qty: item.qty,
                image: product.image
            });

            totalAmount += realPrice * item.qty;
        }

        // 2. Crear Orden "PENDING" en Base de Datos
        const newOrder = new Order({
            client: {
                name: customer_details.name,
                email: customer_details.email,
                phone: customer_details.phone
            },
            shipping: {
                address: customer_details.address,
                references: customer_details.references || ''
            },
            items: orderItems,
            totalAmount: totalAmount,
            status: 'pending', // Estado inicial
            paymentMethod: 'Stripe Checkout',
            createdAt: new Date()
        });

        const savedOrder = await newOrder.save();

        // 3. Crear Sesión de Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${req.headers.origin}/checkout.html?success=true&order_id=${savedOrder._id || savedOrder.id}`,
            cancel_url: `${req.headers.origin}/checkout.html?canceled=true`,
            customer_email: customer_details.email, // Auto-fill email
            metadata: {
                orderId: (savedOrder._id || savedOrder.id).toString(), // VITAL para el Webhook
                client_name: customer_details.name
            }
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error('Error al crear sesión de Stripe:', err);
        res.status(500).json({ error: 'Error interno del servidor al procesar el pago.' });
    }
});

// NUEVO: Crear Payment Intent para Stripe Elements (Pago en sitio)
router.post('/create-payment-intent', async (req, res) => {
    try {
        const { items, customer_details } = req.body;

        let total = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.id) || await Product.findOne({ id: item.id });
            if (product) {
                const realPrice = parseFloat(product.price);
                total += Math.round(realPrice * item.qty * 100);
                processedItems.push({
                    product: product._id || product.id,
                    name: product.name,
                    price: realPrice,
                    qty: item.qty
                });
            }
        }

        // Crear Orden Pendiente
        const newOrder = new Order({
            client: {
                name: customer_details.name,
                email: customer_details.email,
                phone: customer_details.phone
            },
            shipping: {
                address: customer_details.address,
                references: customer_details.references || ''
            },
            items: processedItems,
            totalAmount: total / 100,
            status: 'pending',
            paymentMethod: 'Tarjeta (Embedded)',
            createdAt: new Date()
        });
        const savedOrder = await newOrder.save();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'mxn',
            automatic_payment_methods: { enabled: true },
            metadata: {
                orderId: (savedOrder._id || savedOrder.id).toString(),
                client_name: customer_details.name
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            orderId: savedOrder._id || savedOrder.id
        });
    } catch (err) {
        console.error('Error PaymentIntent:', err);
        res.status(500).json({ error: 'No se pudo crear el intento de pago' });
    }
});


router.post('/confirm-order', async (req, res) => {
    try {
        const orderData = req.body;

        // 1. Guardar en Base de Datos Real (MongoDB)
        const newOrder = new Order({
            id_custom: orderData.id_custom,
            client: orderData.client,
            shipping: orderData.shipping || orderData.client.address, // fallback
            items: orderData.items,
            totalAmount: orderData.total,
            paymentMethod: orderData.paymentMethod || 'Tarjeta (Stripe)'
        });

        // Asegurar que shipping sea un objeto si viene como string
        if (typeof newOrder.shipping === 'string') {
            newOrder.shipping = {
                address: newOrder.shipping,
                colonia: 'N/A',
                city: 'N/A',
                zip: 'N/A',
                references: orderData.client.references || ''
            };
        }

        const savedOrder = await newOrder.save();

        // 3. Restar Stock de Inventario
        for (const item of newOrder.items) {
            if (item.product && true /* Validation handled inside update */) {
                try {
                    await Product.findByIdAndUpdate(item.product, {
                        $inc: { stock: -(item.qty || 0) }
                    });
                } catch (e) {
                    console.error(`No se pudo actualizar stock para producto ${item.product}: ${e.message}`);
                }
            }
        }

        // 2. Enviar Correos de Notificación
        await sendOrderNotification(savedOrder);

        res.json({ success: true, order: savedOrder });
    } catch (err) {
        console.error('Error al confirmar orden:', err);
        res.status(500).json({ error: 'Error al registrar pedido' });
    }
});

module.exports = router;
