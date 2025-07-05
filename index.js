const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport'); 
require('./config/passport'); 

const observationRoutes = require('./routes/observationRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const connectDB = require('./config/db');

dotenv.config();
const app = express();

// Middleware
app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// ✅ SESSION middleware (must be before passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// ✅ Passport middlewares
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DB connection
connectDB();

// Routes
app.use('/', observationRoutes);
app.use('/', authRoutes);

// Error Handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
