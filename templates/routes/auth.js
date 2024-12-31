const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../models');

router.post('/signup', async (req, res, next) => {
    try {
        const user = await db.User.create(req.body);
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );
        return res.status(200).json({
            token,
            email: user.email,
            message: "User created successfully"
        });
    } catch (err) {
        if (err.code === 11000) {
            err.message = "Email already taken";
        }
        return next(err);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const user = await db.User.findOne({ email: req.body.email });
        if (!user) {
            return next({
                status: 400,
                message: "Invalid Email/Password"
            });
        }
        const isMatch = await user.comparePassword(req.body.password);
        if (isMatch) {
            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1d' }
            );
            return res.status(200).json({
                token,
                email: user.email,
                message: "Logged in successfully"
            });
        } else {
            return next({
                status: 400,
                message: "Invalid Email/Password"
            });
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;