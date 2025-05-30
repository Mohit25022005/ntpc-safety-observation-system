const express = require('express');
const { renderSignup, signup, renderLogin, login, logout } = require('../controllers/authController');
const router = express.Router();

router.get('/signup', renderSignup);
router.post('/signup', signup);
router.get('/login', renderLogin);
router.post('/login', login);
router.get('/logout', logout);

module.exports = router;