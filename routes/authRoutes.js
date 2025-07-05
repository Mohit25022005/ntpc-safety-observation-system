const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const {
    renderSignup,
    renderLogin,
    login,
    logout,
} = require('../controllers/authController');

const {
    requestSignupOtp,
    verifySignupOtp,
} = require('../controllers/otpController');

const {
    requestResetOtp,
    resetPassword,
} = require('../controllers/resetController');

// Initialize router and passport config
const router = express.Router();
require('../config/passport'); // Load Google OAuth strategy

// ========================
// OTP-Based Signup Routes
// ========================

// Renders the signup page
router.get('/auth/signup', renderSignup);

// Step 1: User submits signup form → sends OTP to email
router.post('/auth/request-otp', requestSignupOtp);

// Step 2: Render OTP verification page
router.get('/auth/verify-otp', (req, res) => {
    const errorMessage = req.query.error || null;
    const email = req.query.email || '';
    res.render('verify-otp', { errorMessage, email });
});

// ✅ Step 3: Verify OTP and create account
router.post('/auth/verify-otp', verifySignupOtp);

// =========================
// Email/Password Login
// =========================

router.get('/auth/login', renderLogin);
router.post('/auth/login', login);
router.get('/auth/logout', logout);

// =========================
// Forgot Password via OTP
// =========================
router.get('/auth/request-reset', (req, res) => {
  const errorMessage = req.query.error || null;
  const email = req.query.email || '';
  res.render('reset-password', { errorMessage, email });
});
router.post('/auth/reset-password', resetPassword);

// =========================
// Google OAuth
// =========================

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        const token = jwt.sign(
            { id: req.user._id, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.cookie('jwt', token, { httpOnly: true });
        res.redirect('/dashboard');
    }
);

module.exports = router;
