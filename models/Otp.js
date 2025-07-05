// models/otp.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  metaData: {
    name: String,
    password: String,
    role: String,
    zone: String,
    department: String,
  },
});

module.exports = mongoose.model('Otp', otpSchema);
