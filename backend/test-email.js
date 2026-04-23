require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Gmail connection failed:', error.message);
    console.error('Code:', error.code);
  } else {
    console.log('Gmail connection OK - ready to send');
  }
});
