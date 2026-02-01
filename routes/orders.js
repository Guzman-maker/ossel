const express = require('express');
const router = express.Router();
/*const mongoose = require('mongoose');*/
const Order = require('../utils/localDB').Order;
const Product = require('../utils/localDB').Product;
const User = require('../utils/localDB').User;
const { protect } = require('../middleware/authMiddleware');

// Create Order (Compra o Canje)
router.post('/', protect, async (req, res) => {
    const { items, totalAmount, isRedemption } = req.body;

    try {
        // 1. Crear Orden
        let pointsEarned = 0;

        // Regla de Negocio: 100 puntos por producto comprado (si no es canje)
        if (!isRedemption) {
            items.forEach(item => {
                pointsEarned += 100 * item.quantity;
            });
        }

        const order = new Order({
            user: req.user._id,
            items,
            totalAmount,
            pointsEarned,
            isRedemption
        });

        const createdOrder = await order.save();

        // 2. Actualizar Puntos del Usuario
        const user = await User.findById(req.user._id);

        if (isRedemption) {
            // En canje, totalAmount se asume como 0 en dinero, pero el "costo" fue validado en front
            // Pero idealmente deberíamos recibir cuantos puntos costó.
            // Simplificación: Asumimos que el front manda datos correctos o recalculamos aqui.
            // Para este ejemplo, restamos X puntos que vengan en el body o calculados.
            // Vamos a asumir que "totalAmount" en canje es el costo en PUNTOS.
            if (user.points < totalAmount) {
                return res.status(400).json({ message: 'Puntos insuficientes' });
            }
            user.points -= totalAmount;
        } else {
            user.points += pointsEarned;
        }

        await user.save();

        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar la orden', error: error.message });
    }
});

// Get My Orders
router.get('/myorders', protect, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id });
        res.json(orders.reverse());
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener ordenes' });
    }
});

// Get All Orders (Admin)
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders.reverse());
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener todos los pedidos' });
    }
});

// Helper to find order by _id or id_custom
const findOrder = async (id) => {
    if (require('../utils/localDB').isValidId(id)) {
        return await Order.findById(id);
    }
    return await Order.findOne({ id_custom: id });
};

// Update Order Status (Admin)
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    try {
        const order = await findOrder(req.params.id);
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

        const oldStatus = order.status;
        order.status = status;
        await order.save();

        // Lógica de retorno al inventario si se marca como 'Eliminado'
        if (status === 'Eliminado' && oldStatus !== 'Eliminado') {
            for (const item of order.items) {
                // Verificar si item.product es un objeto poblado o un ID
                const productId = item.product?._id || item.product;
                if (productId && require('../utils/localDB').isValidId(productId)) {
                    try {
                        await Product.findByIdAndUpdate(productId, {
                            $inc: { stock: item.qty || item.quantity }
                        });
                    } catch (e) {
                        console.error('Error devolviendo stock (status update):', e);
                    }
                }
            }
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar estado', error: error.message });
    }
});

// Delete Order and Restore Inventory
router.delete('/:id', async (req, res) => {
    try {
        const order = await findOrder(req.params.id);
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });

        // Si el estado no era 'Eliminado', devolvemos el stock (para evitar duplicados si ya se había marcado como Eliminado)
        if (order.status !== 'Eliminado') {
            for (const item of order.items) {
                const productId = item.product?._id || item.product;
                if (productId && require('../utils/localDB').isValidId(productId)) {
                    try {
                        await Product.findByIdAndUpdate(productId, {
                            $inc: { stock: item.qty || item.quantity }
                        });
                    } catch (e) { console.error('Error restaurando stock (delete):', e); }
                }
            }
        }

        await Order.findByIdAndDelete(order._id);
        res.json({ message: 'Pedido eliminado y stock restaurado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar pedido', error: error.message });
    }
});

module.exports = router;
