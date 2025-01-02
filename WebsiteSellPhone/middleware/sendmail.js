const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const salesUsers = {}; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const createSalesAccount = (req, res, next) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ message: 'Full name and Gmail address are required.' });
  }

  // tạo token với thời hạn 60s
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1m' });

  // Save the user temporarily
  salesUsers[email] = {
    name: fullName,
    token,
  };

  // gửi mã kích hoạt tới mail nhân viên
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Sales Account Has Been Created',
    text: `An account has been created for you. Please click the link below to log in. This link is only valid for 1 minute:\n\n${process.env.BASE_URL}/sales-login/${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ message: 'Error sending email', error });
    }
    res.status(200).json({ message: 'Account created. An email has been sent with the login link.' });
  });
};

 // xác thực lần đầu đăng nhập tài khoản của nhân viên
const verifySalesLink = (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({ message: 'Token is required.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(400).json({ message: 'Invalid or expired link. Please contact admin support for a new link.' });
    }

    
    const user = salesUsers[decoded.email];
    if (!user || user.token !== token) {
      return res.status(400).json({ message: 'Invalid token or user does not exist.' });
    }

    
    req.user = decoded;
    next();
  });
};

// Middleware for restricting access for first-time sales users to login form
const restrictSalesFormAccess = (req, res, next) => {
  const { email } = req.body;

  if (salesUsers[email]) {
    return res.status(403).json({ message: 'Please log in by clicking the link in your email.' });
  }

  next();
};

module.exports = {
  createSalesAccount,
  verifySalesLink,
  restrictSalesFormAccess,
};
