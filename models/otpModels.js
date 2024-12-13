const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the OTP schema
const otpSchema = new Schema({
  email: { type: String, required: true },
  otpCode: { type: String, required: true },
  otpCodeExpiresAt: { type: Date, required: true },
});

// Create a model from the schema
const OTP = mongoose.model('OTPSpeedMeet', otpSchema);

module.exports = OTP;
