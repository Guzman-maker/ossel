const express = require('express');
const router = express.Router(); // Stripe Webhooks don't need Router usually if mounted directly, but here we mounted with require. Use standard module.exports handler if mounted directly, or Router. 
// In server.js we did: app.use('/api/webhook', ..., require('./routes/webhook'));
// If ./routes/webhook exports a Router, it matches subpaths. If we want /api/webhook to BE the route, we need to handle '/'.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order, Product } = require('../utils/localDB');
const { sendOrderNotification } = require('../utils/mailer');

router.post('/', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        // Verificar firma de Stripe
        if (endpointSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            // Si no hay secreto configurado (dev mode inseguro), confiamos en el body
            // NOTA: En producción ESTO ES UN RIESGO DE SEGURIDAD.
            // Para desarrollo rápido sin CLI, a veces se salta, pero no es recomendado.
            // Asumimos que el usuario configurará el secreto.
            event = req.body;
            // OJO: stripe.webhooks.constructEvent lanza error si req.body es Buffer y no machea firma.
            // Si no hay secreto, asumimos integración simple o debug.
        }
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Webhook] Evento recibido: ${event.type}`);

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.metadata.orderId;

            if (orderId) {
                console.log(`[Webhook] Pago completado para Orden ${orderId}`);

                // 1. Actualizar Orden a 'paid'
                const order = await Order.findById(orderId);
                if (order) {
                    order.status = 'paid';
                    order.transactionId = session.payment_intent;

                    // Aseguramos estructura de shipping si falta
                    if (!order.shipping || typeof order.shipping === 'string') {
                        order.shipping = {
                            address: session.shipping_details?.address?.line1 || 'N/A',
                            city: session.shipping_details?.address?.city || 'N/A',
                            zip: session.shipping_details?.address?.postal_code || 'N/A',
                            country: session.shipping_details?.address?.country || 'MX'
                        };
                    }

                    await order.save();
                    console.log(`[Webhook] Orden ${orderId} actualizada a PAID`);

                    // 2. Restar Stock (Ahora lo hacemos aquí al confirmar pago, no antes)
                    // NOTA: Si ya restamos al crear (pending), no restamos de nuevo.
                    // En este flujo "robusto", solemos reservar stock al crear ORDEN PENDING,
                    // O restar aquí.
                    // Vamos a asumir que restamos stock AQUÍ para asegurar que solo se venda lo pagado.
                    // Si prefieres reservar, deberíamos haber restado en 'pending' y devolver si falla/expira.
                    // Para simplificar: RESTAMOS AL PAGAR.

                    for (const item of order.items) {
                        try {
                            const product = await Product.findById(item.product || item.id);
                            if (product) {
                                let newStock = (product.stock || 0) - (item.qty || 0);
                                if (newStock < 0) newStock = 0;

                                // localDB update logic
                                product.stock = newStock;
                                await product.save();
                                console.log(`[Stock] Producto ${product.name} stock actualizado a ${newStock}`);
                            }
                        } catch (err) {
                            console.error(`[Stock] Error actualizando producto ${item.product}:`, err);
                        }
                    }

                    // 3. Enviar Correo
                    try {
                        await sendOrderNotification(order);
                    } catch (mailErr) {
                        console.error("Error enviando correo:", mailErr);
                    }
                } else {
                    console.error(`[Webhook] Orden ${orderId} no encontrada en DB local.`);
                }
            }
        }
    } catch (error) {
        console.error('Error procesando webhook:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.json({ received: true });
});

module.exports = router;
