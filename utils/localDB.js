const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Base directory for JSON files
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Collection {
    constructor(filename) {
        this.filepath = path.join(DATA_DIR, `${filename}.json`);
        this.data = [];
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filepath)) {
                this.data = JSON.parse(fs.readFileSync(this.filepath, 'utf8'));
            } else {
                this.data = [];
                this.save();
            }
        } catch (err) {
            console.error(`Error loading ${this.filepath}`, err);
            this.data = [];
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error(`Error saving ${this.filepath}`, err);
        }
    }

    // Mongoose-like Methods
    async find(query = {}) {
        this.load();
        return this.data.filter(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });
    }

    async findById(id) {
        this.load();
        return this.data.find(item => String(item._id) === String(id)) || null;
    }

    async findOne(query) {
        this.load();
        return this.data.find(item => {
            for (let key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        }) || null;
    }

    async create(doc) {
        this.load(); // Refresh
        const newDoc = {
            _id: new mongoose.Types.ObjectId().toString(),
            createdAt: new Date(),
            ...doc
        };
        this.data.push(newDoc);
        this.save();
        return newDoc;
    }

    async findByIdAndUpdate(id, update, options = {}) {
        this.load();
        const index = this.data.findIndex(item => String(item._id) === String(id));
        if (index === -1) return null;

        // Handle $inc and other mongo operators loosely
        const newData = { ...this.data[index] };

        if (update.$inc) {
            for (let key in update.$inc) {
                newData[key] = (newData[key] || 0) + update.$inc[key];
            }
            delete update.$inc;
        }

        // Apply direct updates
        Object.assign(newData, update);

        this.data[index] = newData;
        this.save();
        return newData;
    }

    async findByIdAndDelete(id) {
        this.load();
        const index = this.data.findIndex(item => String(item._id) === String(id));
        if (index === -1) return null;

        const deleted = this.data.splice(index, 1)[0];
        this.save();
        return deleted;
    }
}

// Wrapper class to mimic Mongoose Model
class ModelWrapper {
    constructor(collectionName, schema) {
        this.collection = new Collection(collectionName);
        this.schema = schema;
    }

    // Static Mongoose methods
    find(query) { return this.collection.find(query); }
    findById(id) { return this.collection.findById(id); }
    findOne(query) { return this.collection.findOne(query); }
    findByIdAndUpdate(id, data, opts) { return this.collection.findByIdAndUpdate(id, data, opts); }
    findByIdAndDelete(id) { return this.collection.findByIdAndDelete(id); }

    // Constructor for "new Model(data)"
    createInstance(data) {
        const self = this;
        return {
            ...data,
            save: async function () {
                if (this._id) {
                    return self.collection.findByIdAndUpdate(this._id, this);
                } else {
                    return self.collection.create(this);
                }
            },
            matchPassword: async function (enteredPassword) {
                // Warning: This is a hacky way to access the method defined in User schema
                // In a real Mongoose object, methods are on prototype.
                // For now, we assume this is handled in Auth logic explicitly or we reimplement basic bcrypt here if needed.
                const bcrypt = require('bcryptjs');
                return await bcrypt.compare(enteredPassword, this.password);
            }
        };
    }
}

// Singleton instances
const products = new ModelWrapper('products');
const orders = new ModelWrapper('orders');
const users = new ModelWrapper('users');

module.exports = {
    Product: products,
    Order: orders,
    User: users,
    isValidId: (id) => mongoose.Types.ObjectId.isValid(id)
};
