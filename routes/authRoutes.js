const express = require('express');
const { renderSignup, signup, renderLogin, login, logout } = require('../controllers/authController');
const router = express.Router();

router.get('/auth/signup', renderSignup);
router.post('/auth/signup', signup);
router.get('/auth/login', renderLogin);
router.post('/auth/login', login);
router.get('/auth/logout', logout);

module.exports = router;