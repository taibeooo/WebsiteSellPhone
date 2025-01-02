const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const accountSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /.+\@.+\..+/
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['staff', 'admin'],
        required: true
    },
    profile_image: {
        type: String,
        required: true
    },
    fullname: {
        type: String,
        required: false
    },
    status: {
        type: Boolean,
        required: true,
    },
    is_Active: {
        type: Boolean,
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: null
    },
    birthday: {
        type: Date
    },
    address: {
        type: String
    },
    phone: {
        type: String
    },
    gender: {
        type: String
    },
    loginToken: {
        type: String
    },
    tokenExpiration: {
        type: Date
    },
    isPasswordChanged: {
        type: Boolean,
        default: false
    }
});

// Định nghĩa trường ảo để định dạng birthday
accountSchema.virtual('formattedBirthday').get(function() {
    if (this.birthday) {
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        return this.birthday.toLocaleDateString('en-GB', options); // Định dạng dd/mm/yyyy
    }
    return null;
});

// Đảm bảo rằng trường ảo được bao gồm trong kết quả JSON
accountSchema.set('toJSON', { virtuals: true });
accountSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Account', accountSchema);