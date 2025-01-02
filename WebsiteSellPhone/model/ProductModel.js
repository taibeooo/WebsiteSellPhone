const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new mongoose.Schema({
    barcode: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    import_price: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    retail_price: {
        type: mongoose.Types.Decimal128,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    image_url: {
        type: String,
        required: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Product', productSchema);
