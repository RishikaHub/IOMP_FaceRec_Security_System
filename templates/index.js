const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const eventRoutes = require("./routes/events");
const fileRoutes = require("./routes/files");
const session = require("express-session");
const authRoutes = require("./routes/auth");
require('dotenv').config();

const port = process.env.PORT || 8080;

// Initialize MongoDB connection via models/index.js
require('./models');

app.set('view engine', 'html');

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: ['http://localhost:5050', 'http://127.0.0.1:5050'],
    credentials: true
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Routes
app.use("/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/files", fileRoutes);

// Static files
app.use(express.static('public'));

// 404 handler
app.use((req, res, next) => {
    const err = new Error("NOT FOUND");
    err.status = 404;
    next(err);
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        status: "error",
        message: err.message || "An unexpected error occurred"
    });
});

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});
