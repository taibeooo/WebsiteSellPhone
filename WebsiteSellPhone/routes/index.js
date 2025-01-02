var express = require('express');
var router = express.Router();
const indexController = require('../controller/indexController');
const accountController = require('../controller/AdminController');
const checkSessionLoggedIn = require('../middleware/sessionLogin');
/* GET home page. */
router.get('/', indexController.getIndex);
// get product
router.get('/product/:id', indexController.getProductById);

router.get('/about', function(req, res, next) {
  res.render('about', { title: 'About Us' });
});
const checkoutController = require('../controller/CheckoutController');

router.get('/checkout', checkoutController.viewCheckout);
router.get('/compare', function(req, res, next) {
  res.render('compare', { title: 'About Us' });
});
router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'About Us' });
});
router.get('/forgot-password', function(req, res, next) {
  res.render('forgot-password', { title: 'About Us' });
});
router.get('/login', checkSessionLoggedIn, function(req, res, next) {
  res.render('login', { title: 'About Us' });
});
router.post('/login', accountController.postlogin);
router.get('/register', function(req, res, next) {
  res.render('register', { title: 'About Us' });
});
router.get('/shop', indexController.getProductShop);


router.get('/logout', accountController.logOut);



module.exports = router;
