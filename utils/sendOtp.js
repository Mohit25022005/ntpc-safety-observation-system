const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail', // Or your mail service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtp = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP for Signup',
    html: `<p>Your OTP is <b>${otp}</b>. It is valid for 10 minutes.</p>`,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = sendOtp;
