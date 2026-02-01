const fs = require('fs');
const path = require('path');

const ROUTES = [
    'c:/Users/52753/OneDrive/Documents/proyecto osel/routes/products.js',
    'c:/Users/52753/OneDrive/Documents/proyecto osel/routes/orders.js',
    'c:/Users/52753/OneDrive/Documents/proyecto osel/routes/auth.js',
    'c:/Users/52753/OneDrive/Documents/proyecto osel/routes/payment.js',
    'c:/Users/52753/OneDrive/Documents/proyecto osel/middleware/authMiddleware.js'
];

const REPLACEMENTS = [
    { from: "require('../models/Product')", to: "require('../utils/localDB').Product" },
    { from: "require('../models/Order')", to: "require('../utils/localDB').Order" },
    { from: "require('../models/User')", to: "require('../utils/localDB').User" },
    { from: "const mongoose = require('mongoose');", to: "/*const mongoose = require('mongoose');*/" },
    // Fix findByIdAndUpdate argument order if needed or ensure wrapper handles logic.
];

ROUTES.forEach(filePath => {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        REPLACEMENTS.forEach(rep => {
            if (content.includes(rep.from)) {
                content = content.replace(new RegExp(rep.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rep.to);
                changed = true;
            }
        });

        // Special fix for payment.js which imports Product separately sometimes or uses mongoose.Types
        if (filePath.endsWith('payment.js')) {
            content = content.replace("const mongoose = require('mongoose');", "");
            content = content.replace(/mongoose\.Types\.ObjectId\.isValid\((.*?)\)/g, "require('../utils/localDB').isValidId($1)");
        }

        // Special fix for orders.js which uses mongoose.Types
        if (filePath.endsWith('orders.js')) {
            content = content.replace(/mongoose\.Types\.ObjectId\.isValid\((.*?)\)/g, "require('../utils/localDB').isValidId($1)");
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${path.basename(filePath)}`);
        }
    }
});
