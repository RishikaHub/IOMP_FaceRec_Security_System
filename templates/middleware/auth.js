const jwt = require('jsonwebtoken');
const db = require('../models');

exports.loginRequired = async function(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        
        // Include recognizedName in the request object if it exists in the token
        if (decoded.recognizedName) {
            req.recognizedName = decoded.recognizedName;
        }
        
        // If we have email in the token, try to find the user
        if (decoded.email) {
            const user = await db.User.findOne({ email: decoded.email });
            if (!user) {
                return res.status(401).json({ message: 'Invalid token - User not found' });
            }
            req.user = user;
        }

        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};
