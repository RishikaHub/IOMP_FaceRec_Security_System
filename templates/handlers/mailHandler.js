const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "gaddamlokesh20@gmail.com",
        pass: "fewb zzgt kufv bpep"
    }
})

async function sendAlert(imageBuffer, timestamp) {
    try {
        const mailOptions = {
            from: "gaddamlokesh20@gmail.com",
            to: "rishika.bussa31@gmail.com",
            subject: "Security Alert: Unknown Face Detected",
            text: `An unknown face was detected by your security system at ${timestamp}.\n\nPlease check the attached image for verification.\n\nThis is an automated alert from your Home Security System.`,
            attachments: [{
                filename: "unknown_face.jpg",
                content: imageBuffer
            }]
        }

        const response = await transporter.sendMail(mailOptions)
        console.log("Email sent:", response)
        return "success"
    } catch (err) {
        console.error("Email error:", err)
        return "fail"
    }
}

module.exports = {
    sendAlert
}