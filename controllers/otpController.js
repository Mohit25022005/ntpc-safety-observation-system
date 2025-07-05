const Otp = require('../models/Otp');
const User = require('../models/User');
const sendOtp = require('../utils/sendOtp');
const jwt = require('jsonwebtoken');

exports.requestSignupOtp = async (req, res) => {
  const { email, name, password, role, zone, department } = req.body;

  try {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Remove old OTPs
    await Otp.deleteMany({ email });

    // Save new OTP with metaData
    await Otp.create({
      email,
      otp,
      expiresAt,
      metaData: { name, password, role, zone, department },
    });

    // Send OTP to email
    await sendOtp(email, otp);

    res.redirect(`/auth/verify-otp?email=${email}`);
  } catch (err) {
    console.error('Failed to send OTP:', err);
    res.redirect('/auth/signup?error=Failed to send OTP');
  }
};



exports.verifySignupOtp = async (req, res) => {
    const { email, otp } = req.body;

    console.log('OTP Verify Request:', { email, otp });

    try {
        const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            console.log('❌ No OTP found for:', email);
            return res.redirect(`/auth/verify-otp?error=No OTP found&email=${email}`);
        }

        const isMatch = otpRecord.otp === otp;
        const isExpired = otpRecord.expiresAt < new Date();

        if (!isMatch || isExpired) {
            return res.redirect(`/auth/verify-otp?error=Invalid or expired OTP&email=${email}`);
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/auth/login?error=Account already exists. Please log in.');
        }

        const { name, password, role, zone, department } = otpRecord.metaData;
        const newUser = new User({ email, password, name, role, zone, department });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true });

        await Otp.deleteMany({ email });

        return res.redirect('/dashboard');
    } catch (err) {
        console.error('OTP verification failed:', err);
        return res.redirect(`/auth/verify-otp?error=Server error&email=${email}`);
    }
};
