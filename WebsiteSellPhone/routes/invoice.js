const express = require('express');
const router = express.Router();
const invoiceController = require('../controller/InvoiceController');


// router.get('/', invoiceController.getAllInvoices);

router.post('/', invoiceController.createInvoice);

router.get('/:id/pdf', invoiceController.downloadInvoicePdf); // Thêm route này



module.exports = router;
