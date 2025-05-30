const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { ZONES } = require('../config/zones'); // ✅ Import zones

const signup = async (req, res, next) => {
    const { email, password, name, role, zone, department } = req.body;
    console.log('Signup request body:', req.body); // Debug log

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/auth/signup?error=Email already exists');
        }

        const user = new User({ email, password, name, role, zone, department });
        await user.save();
        console.log('User saved:', user); // Debug log

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        console.error('Signup error:', err); // Debug log
        if (err.code === 11000) {
            return res.redirect('/auth/signup?error=Duplicate key error. Please try a different email or contact support.');
        }
        next(err);
    }
};

const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.redirect('/auth/login?error=Invalid credentials');
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
};

const logout = (req, res) => {
    res.clearCookie('jwt');
    res.redirect('/auth/login');
};

const renderLogin = (req, res) => {
    const errorMessage = req.query.error || null;
    res.render('login', { errorMessage });
};

const renderSignup = (req, res) => {
    const errorMessage = req.query.error || null;
    res.render('signup', { 
        errorMessage, 
        zones: ZONES, 
        user: req.user || null // Pass user, even if null
    });
};

module.exports = {
    signup,
    login,
    logout,
    renderLogin,
    renderSignup
};
