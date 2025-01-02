var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var expressHbs = require('express-handlebars');
var mongoose = require('mongoose');
const Account = require('./model/AccountModel'); 
const bcrypt = require('bcrypt');
const session = require('express-session');
const crypto = require('crypto');
const flash = require('connect-flash');
const sessionAdminPageCheck = require('./middleware/sessionAdminPage');


var indexRouter = require('./routes/index');
var invoiceRoutes = require('./routes/invoice');
var cartRoutes = require('./routes/cart');
var customerRoutes = require('./routes/customer');
var productRoutes = require('./routes/product');
var accountRoutes = require('./routes/account');
var employeeRoutes = require('./routes/employee');
var connectDB = require('./config/db'); // Database setup config



var app = express();
app.use(express.urlencoded({ extended: true })); // Để xử lý dữ liệu từ biểu mẫu
app.use(express.json()); 
app.use(session({
  secret: crypto.randomBytes(20).toString("hex"), 
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // Thời gian sống của session (60p)
}));
// Cấu hình flash middleware
app.use(flash());

app.use(express.urlencoded({ extended: true }));
// Connect to MongoDB
connectDB();

app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null; // Lưu thông tin admin vào locals
  next();
});


async function createAdminAccount() {
  try {
      // check admin đã tồn tạic hưa
      let adminAccount = await Account.findOne({ email: process.env.ADMIN_USERNAME });

      // ko admin -> tạo mới
      if (!adminAccount) {
          const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10); // hash pass

          adminAccount = new Account({
              username: process.env.ADMIN_USERNAME, // Lấy username từ email
              email: process.env.ADMIN_USERNAME,
              password: hashedPassword,
              role: 'admin',
              profile_image: 'admin.png',
              fullname: 'Admin User',
              status: true,
              is_Active: false,
              refreshtoken: '',
              updated_at: Date.now(),
              birthday: null, 
              address: '', 
              phone: '',
              gender: '',
              isPasswordChanged: true
          });
         
          await adminAccount.save();
          console.log('Tài khoản admin mặc định đã được tạo.');
      } else {
          console.log('Tài khoản admin đã tồn tại.');
      }
  } catch (error) {
      console.error('Lỗi khi kiểm tra hoặc tạo tài khoản admin:', error);
  }
}
// Gọi hàm này khi khởi động server
createAdminAccount();



app.engine('hbs', expressHbs.engine({
  extname: '.hbs',
  helpers: {
      eq: (arg1, arg2) => arg1 === arg2,
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      range: (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i),
      ifEquals: (a, b, options) => (a === b ? options.fn(this) : options.inverse(this)),
      multiply: (a, b) => a * b, 
      formatCurrency: (amount) => {
        return `${parseFloat(amount).toFixed(2)}`;
      },
      
  }
}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');



// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Routes setup
app.use('/', indexRouter);
app.use('/products', productRoutes);
app.use('/admin', sessionAdminPageCheck, accountRoutes);
app.use('/cart', cartRoutes);
app.use('/customer', customerRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/employees', employeeRoutes);
// Handle 404 errors
app.use(function (req, res, next) {
  next(createError(404));
});


// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
