const Account = require('../model/AccountModel');

const authenticate = async (req, res, next) => {
    if (!req.session.admin) {
        return res.render('404'); // Nếu không có session admin, từ chối truy cập
    }

    try {
        // check user
        req.user = await Account.findById(req.session.admin.id);
        if (!req.user) {
            return res.render('login', { message: 'Tài khoản không tồn tại.' }); // Hiển thị thông báo khi không tìm thấy tài khoản
        }
        next(); // Tiếp tục đến route tiếp theo
    } catch (error) {
        console.error('Lỗi xác thực:', error);
        res.render('login', { message: 'Đã có lỗi xảy ra, vui lòng thử lại sau.' }); // Hiển thị thông báo khi có lỗi server
    }
};

module.exports = authenticate;
