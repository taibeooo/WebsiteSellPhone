// routes/cart.js
const express = require('express');
const router = express.Router();
const cartController = require('../controller/CartController');
const checkSession = require('../middleware/sessionCheck'); // Nhập middleware

// Sử dụng middleware để kiểm tra session trước khi vào view giỏ hàng
router.get('/', checkSession, cartController.viewCart);

// Route thêm sản phẩm vào giỏ hàng
router.post('/add', cartController.addToCart);
router.post('/update', cartController.updateQuantity);
router.post('/remove', cartController.removeFromCart);

module.exports = router;
