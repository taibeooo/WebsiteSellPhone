const express = require('express');
const router = express.Router();
const productController = require('../controller/ProductController');
const authenticate = require('../middleware/auth');
// List all products
router.get('/', authenticate,productController.getAllProducts);
// Show form to add a new product (GET)
router.get('/add', authenticate,productController.showAddProductForm);
// Create a new product

router.post('/add', authenticate,productController.createProduct);
// Delete a prodcut
router.post('/delete/:id', authenticate,productController.deleteProduct);
// details product
router.get('/detail/:id',authenticate, productController.detailProduct);
// update product
router.get('/update/:id',authenticate, productController.getUpdateProduct);
router.post('/update/:id',authenticate,productController.updateProduct);
// search product
router.get('/search',authenticate,productController.searchProduct);



router.get('/wk/detail/:id', authenticate, productController.getProductDetailForWorkSpace);
module.exports = router;
