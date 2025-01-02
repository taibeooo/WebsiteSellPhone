var express = require('express');
var router = express.Router();
const customerController = require('../controller/CustomerController');

/* GET users listing. */

router.post('/add', customerController.addCustomer);

router.get('/search', customerController.searchCustomer);

module.exports = router;
