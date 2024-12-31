const jwt = require('jsonwebtoken');

exports.loginRequired = async function (req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded;
        return next();
    } catch (err) {
        return next({
            status: 401,
            message: "Please log in first",
        });
    }
};
