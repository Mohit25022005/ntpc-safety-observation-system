const Otp = require('../models/Otp');
const User = require('../models/User');
const sendOtp = require('../utils/sendOtp');

exports.requestResetOtp = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await Otp.deleteMany({ email });
  await Otp.create({ email, otp, expiresAt });
  await sendOtp(email, otp);

  res.redirect(`/auth/forgot-password?email=${email}`);
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const otpEntry = await Otp.findOne({ email, otp });

  if (!otpEntry || otpEntry.expiresAt < new Date()) {
    return res.redirect('/auth/forgot-password?error=Invalid or expired OTP');
  }

  const user = await User.findOne({ email });
  if (!user) return res.redirect('/auth/signup?error=User not found');

  user.password = newPassword;
  await user.save();
  await Otp.deleteMany({ email });

  res.redirect('/auth/login?message=Password reset successful');
};
