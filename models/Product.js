const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    image: { type: String }, // URL or path
    coverage: { type: Number }, // Rendimiento m2/L
    category: { type: String },
    stock: { type: Number, default: 100 },
    sku: { type: String, unique: false }, // Código de barras / ID interno
    cost: { type: Number, default: 0 }, // Costo para cálculo de utilidad
    isRedeemable: { type: Boolean, default: false },
    pointsCost: { type: Number, default: 0 } // Costo en puntos si es canjeable
});

module.exports = mongoose.model('Product', ProductSchema);
