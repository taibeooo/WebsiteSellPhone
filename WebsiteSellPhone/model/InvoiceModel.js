const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    product_ids: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    }],
    staff_name: {  // Thay đổi tên trường thành staff_name
        type: String, 
        required: true 
    },
    customer_name: { 
        type: String, 
        required: true 
    },
    phone: {
        type: String,
        required: true,
    },
    customer_address: { 
        type: String, 
        required: true 
    },
    quantities: [{ 
        type: Number, 
        required: true 
    }],
    total_price: { 
        type: mongoose.Schema.Types.Decimal128, 
        required: true 
    },
    amount_given: { 
        type: mongoose.Schema.Types.Decimal128, 
        required: true 
    },
    change_due: { 
        type: mongoose.Schema.Types.Decimal128, 
        required: true 
    },
    sale_date: { 
        type: Date, 
        default: Date.now 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
