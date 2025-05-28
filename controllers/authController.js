const User = require('../models/User');
const jwt = require('jsonwebtoken');

const signup = async (req, res, next) => {
    const { email, password, name, role } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/auth/signup?error=Email already exists');
        }

        const user = new User({ email, password, name, role });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('jwt', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
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
    res.render('signup', { errorMessage });
};

module.exports = { signup, login, logout, renderLogin, renderSignup };