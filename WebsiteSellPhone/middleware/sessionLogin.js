const checkAdminLoggedIn = (req, res, next) => {
    if (req.session && req.session.admin) {
        return res.redirect(req.session.admin.role === 'staff' ? '/' : '/admin');
    }
    next();
};

module.exports = checkAdminLoggedIn;
