const express = require('express');
const { signup, login, logout, renderLogin, renderSignup } = require('../controllers/authController');

const router = express.Router();

router.get('/login', renderLogin);
router.get('/signup', renderSignup);
router.post('/login', login);
router.post('/signup', signup);
router.get('/logout', logout);

module.exports = router;