var express = require('express');
var router = express.Router();
const nodemailer = require('nodemailer');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Add a route to send a test email
router.get('/send-email', async function(req, res, next) {
  // Configure Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // Use your email provider
    auth: {
      user: 'takohclovert7@gmail.com', // Your email address
      pass: 'mkma gpwi clpj iscd'   // Your email password or an app-specific password
    },
  });
  
  // Email options
  const mailOptions = {
    from: '"no-reply @SpeedMeet " <service@speedmeet.com>', // Sender's name and email
    to: 'brandoskijunior70@gmail.com', // Replace with the recipient's email
    subject: 'Test Email from Express',
    text: 'This is a test email sent from Nodemailer in an Express route!',
  };

  try {
    // Send email
    const info = await transporter.sendMail(mailOptions);
    res.status(200).send(`Email sent: ${info.response}`);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Error sending email');
  }
});

module.exports = router;
