const express = require('express');
const router = express.Router();
const accountController = require('../controller/AdminController');
const authenticate = require('../middleware/auth');

// employees
router.get('/',authenticate,accountController.getAllEmployees);

router.get('/changedStatus/:id', accountController.lockAccountEmployees);

router.get('/add', async(req, res) =>{
    res.render('Employee/AddEmployee'); 
});

router.post('/add', accountController.addNewAccountForEmployee);

router.get('/verify/:token', accountController.verifyAccountToken);

router.get('/resend-login-link/:id', accountController.resendLoginLink);

router.get('/changedpass', async(req, res) => {
    res.render('Employee/ChangePassword', {user: req.session.user});
})

router.post('/changedpass', authenticate, accountController.changePassword);

router.get('/details/:id', authenticate, accountController.getDetailsEmployee);

router.get('/profile/:id', accountController.getProfileEmployee);

router.get('/profile', authenticate, async (req, res) => {
    res.render('Employee/Profile', {employee: req.session.employee});
});

router.get('/account/:id', accountController.getAccountEmployee);

router.get('/account', authenticate, async (req, res) => {
    res.render('Employee/Account', {account: req.session.account, message: req.session.message});
});

router.post('/update/:id', authenticate, accountController.updateProfileEmployee);

router.post('/account/update/:id',authenticate, accountController.updateAccountEmployee);

router.get('/workSpace', authenticate, accountController.getAllProducts);

router.get('/workSpace/invoices', authenticate, accountController.getInvoicesForWorkSpace);

router.get('/invoices/detail/:id', authenticate, accountController.getDetailInvoiceForWorkSpace);
module.exports = router;