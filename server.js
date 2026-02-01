require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));

// STRIPE WEBHOOK (Debe ir antes de express.json para tener acceso al raw body)
app.use('/api/webhook', express.raw({ type: 'application/json' }), require('./routes/webhook'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection (MongoDB)
// Nota para el usuario: Asegúrate de tener MongoDB corriendo o configura tu URI en un archivo .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pinturas-osel';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Conectado'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));

// Fallback to index.html ONLY for non-API routes
app.get('*', (req, res) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
