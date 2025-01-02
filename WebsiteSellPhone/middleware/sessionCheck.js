function checkSession(req, res, next) {
  if (req.session && req.session.admin) {
      return next(); // Nếu có session, cho phép tiếp tục
  }
  return res.redirect('/login'); // Nếu không có session, chuyển hướng đến trang đăng nhập
}

module.exports = checkSession;