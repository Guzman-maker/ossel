const express = require('express');
const router = express.Router();
const User = require('../utils/localDB').User;
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key_123', { expiresIn: '30d' });
};

// Register
// Register
router.post('/register', async (req, res) => {
    let { name, phone, password } = req.body;
    if (phone) phone = phone.replace(/\s/g, ''); // Limpiar espacios backend
    try {
        const userExists = await User.findOne({ phone });
        if (userExists) return res.status(400).json({ message: 'El usuario ya existe con este número' });

        // En localDB.js, User es un ModelWrapper, y create se llama sobre la colección interna
        // pero para simplificar, el wrapper no tiene metodo estatico create directo a menos que se agregue.
        // Accedemos a la colección subyacente:
        const user = await User.collection.create({ name, phone, password, role: 'customer', points: 0 });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            points: user.points,
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    let { phone, password, role } = req.body;
    if (phone) phone = phone.replace(/\s/g, ''); // Limpiar espacios backend
    try {
        const user = await User.findOne({ phone });

        // El usuario pidió "ver contraseña", así que comparamos en texto plano
        if (user && user.password === password) {
            // Si el login pide rol de admin, verificarlo
            if (role === 'admin' && user.role !== 'admin') {
                return res.status(401).json({ message: 'Acceso denegado. No eres administrador.' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                points: user.points,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Teléfono o contraseña incorrectos' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Admin Routes for Clients Management
router.get('/clients', async (req, res) => {
    try {
        const clients = await User.find({ role: 'customer' });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
});

router.delete('/clients/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
});

module.exports = router;
