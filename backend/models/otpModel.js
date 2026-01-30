const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  otpHash: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 300 } }, // TTL 5 minutes
  createdAt: { type: Date, default: Date.now }
});

const Otp = mongoose.model('Otp', otpSchema);
module.exports = Otp;
