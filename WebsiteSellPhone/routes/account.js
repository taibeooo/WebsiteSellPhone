const express = require('express');
const router = express.Router();
const accountController = require('../controller/AdminController');
const authenticate = require('../middleware/auth');


router.get('/', authenticate,accountController.getDashboard);
// invoices
router.get('/invoices',authenticate,accountController.getAllInvoices);
router.get('/invoices/detail/:id',authenticate,accountController.getDetailsInvoices);
router.get('/invoices/search', authenticate,accountController.searchInvoices);
// biểu đồ
router.get('/monthreport', authenticate,accountController.getMonthReport);
router.get('/quarterlyreport', authenticate,accountController.getQuarterlyReport);
// cust
router.get('/customer',authenticate,accountController.getAllCustomer);
router.get('/customer/search', authenticate,accountController.searchCustomer);
router.get('/customer/:id', authenticate,accountController.viewCustomerDetail);

module.exports = router;
