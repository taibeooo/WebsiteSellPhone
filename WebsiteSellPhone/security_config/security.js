// Import các thư viện
const express = require('express');
const account = require('../model/AccountModel')
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());

const users = [];

const generateAccessToken = (user) => {
    return jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });
};

// Middleware kiểm tra token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // xác thực người dùng
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(400).json({ message: 'Username hoặc password không đúng!' });

    // tạo token JWT
    const accessToken = generateAccessToken({ username: user.username, id: user.id });
    res.json({ accessToken });
});

// chỉ truy cập khi có token hợp lệ
app.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Bạn đã truy cập vào endpoint bảo mật!', user: req.user });
});


