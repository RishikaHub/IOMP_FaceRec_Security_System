// templates/handlers/alertHandler.js
const { sendMail } = require('./mailhandler');

async function handleUnknownFaceAlert(req, res) {
    try {
        const { image, timestamp } = req.body;
        
        // Create email content
        const subject = 'Security Alert: Unknown Face Detected';
        const body = `
            An unknown face was detected by your security system at ${timestamp}.
            
            Please check the attached image for verification.
            
            This is an automated alert from your Home Security System.
        `;
        
        // Create email with attachment
        const sender = 'gaddamlokesh20@gmail.com';
        
        // Add the base64 image as an attachment
        const mailOptions = {
            attachment: [{
                data: Buffer.from(image, 'base64'),
                filename: 'unknown_face.jpg'
            }]
        };

        // Send the email
        const result = await sendMail(sender, subject, body, mailOptions);
        
        if (result === 'success') {
            res.json({ status: 'success', message: 'Alert email sent successfully' });
        } else {
            res.status(500).json({ status: 'error', message: 'Failed to send alert email' });
        }
    } catch (error) {
        console.error('Error sending alert:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

module.exports = {
    handleUnknownFaceAlert
};