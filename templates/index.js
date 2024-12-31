var express = require("express")
var app = express()
var bodyParser = require("body-parser")
var eventRoutes = require("./routes/events")
var errorHandler = require("./handlers/error")
const port = process.env.PORT || 8080;
var mailer = require("./handlers/mailHandler")
const { handleUnknownFaceAlert } = require('./handlers/alertHandler');
const session = require("express-session")
const authRoutes = require("./routes/auth")
require('dotenv').config();

// "bcrypt": "^3.0.8",
//     "body-parser": "^1.19.0",
//     "bootstrap": "^3.4.1",
//     "cors": "^2.8.5",
//     "dotenv": "^8.2.0",
//     "express": "^4.17.1",
//     "jsonwebtoken": "^8.5.1",
//     "mongoose": "^5.9.1",
//     "nodemailer": "^6.4.11",
//     "nodemailer-mailgun-transport": "^2.0.0",
//     "nodemon": "^2.0.2"

app.use('/', express.static('public'))
app.set('view engine', 'html');
app.use(bodyParser.json())

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}))

app.get('/about', (req, res) => {
    res.redirect('/aboutus.html')
})

app.get('/team', (req, res) => {
    console.log("coming here");
    res.redirect('/team.html')
})

app.get('/exec', (req, res) => {
    // Proxy the request to Flask server
    fetch('http://localhost:5050/exec')
        .then(() => res.redirect('/'))
        .catch(err => {
            console.error('Failed to start face recognition:', err);
            res.redirect('/');
        });
});

app.post('/sendMail', async function (req, res) {
    const { sender, subject, content } = req.body
    var status = await mailer.sendMail(sender, subject, content);
    if (status == "success") {
        res.sendStatus(200)
    } else {
        res.sendStatus(404)
    }
})


app.get('/events/hackathons', (req, res) => {
    res.render("signin.html")
})

app.get('/events/workshops', (req, res) => {
    res.render("signin.html")
})

app.get('/events/collaborations', (req, res) => {
    res.render("signin.html")
})

app.use("/api/events", eventRoutes)
app.use("/auth", authRoutes)

app.use((req, res, next) => {
    let err = new Error("NOT FOUND")
    err.status = 404
    next(err)
})

app.post('/send-alert', handleUnknownFaceAlert);

app.use(errorHandler)

app.listen(port, () => {
    console.log(`SERVER STARTED ON ${port}`)
})


//added a comment to check repo