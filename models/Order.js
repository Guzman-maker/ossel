const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    id_custom: { type: String, unique: true }, // Ej: OSEL-1234
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Opcional para invitados
    client: {
        name: String,
        email: String,
        phone: String
    },
    shipping: {
        address: String,
        colonia: String,
        city: String,
        zip: String,
        references: String
    },
    items: [
        {
            name: String,
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            qty: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    totalAmount: { type: Number, required: true },
    pointsEarned: { type: Number, default: 0 },
    status: { type: String, default: 'Pagado' },
    paymentMethod: { type: String, default: 'Tarjeta (Stripe)' },
    isRedemption: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
