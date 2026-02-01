const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pinturas-osel';

const products = [
    {
        name: "Osel Oro 10Años",
        description: "Pintura vinil-acrílica de máxima durabilidad y lavabilidad.",
        price: 1200,
        image: "https://via.placeholder.com/300/E30613/FFFFFF?text=Osel+Oro",
        coverage: 12, // m2/L
        category: "Vinílica",
        stock: 50
    },
    {
        name: "Osel Plata",
        description: "Excelente poder cubriente y rendimiento.",
        price: 850,
        image: "https://via.placeholder.com/300/999999/FFFFFF?text=Osel+Plata",
        coverage: 10,
        category: "Vinílica",
        stock: 80
    },
    {
        name: "Impermeabilizante 5 Años",
        description: "Protección total contra la humedad y goteras.",
        price: 1500,
        image: "https://via.placeholder.com/300/333333/FFFFFF?text=Imper+5",
        coverage: 1, // m2/L (aprox 1L por m2 a dos manos)
        category: "Impermeabilizantes",
        stock: 30
    },
    {
        name: "Esmalte Summa",
        description: "Esmalte alquidálico anticorrosivo de alto brillo.",
        price: 250,
        image: "https://via.placeholder.com/300/E30613/FFFFFF?text=Esmalte+Summa",
        coverage: 14,
        category: "Esmaltes",
        stock: 100
    }
];

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Mongo Conectado - Seeding...');

        await Product.deleteMany({});
        await User.deleteMany({});

        await Product.insertMany(products);

        // Create Admin
        const admin = new User({
            name: "Admin Osel",
            email: "admin@osel.com",
            password: "admin123", // Will be hashed
            role: "admin"
        });
        await admin.save();

        console.log('Datos importados!');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
