const checkAdminPage = (req, res, next) => {
    if (req.session && req.session.admin) {
        if (req.session.admin.role === 'staff') {
            const referrer = req.get('Referrer') || '/'; // Lấy URL trước đó, nếu không có thì về trang chủ
            console.log(referrer);
            return res.redirect(referrer); 
        }
        return next();
    }
    // Nếu không có session, cho phép truy cập vào login
    res.redirect('/login');
};

module.exports = checkAdminPage;
