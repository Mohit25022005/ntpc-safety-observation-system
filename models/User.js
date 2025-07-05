const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ZONES } = require("../config/zones");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Required only if not using Google
    },
  },
  role: {
    type: String,
    enum: ["normal", "zone_leader", "eic", "vendor", "admin"],
    default: "normal",
    required: true,
  },
  zone: {
    type: String,
    enum: [...ZONES, null, ""],
    required: function () {
      return this.role === "zone_leader";
    },
    default: null,
  },
  department: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  googleId: {
    type: String,
    default: null,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
