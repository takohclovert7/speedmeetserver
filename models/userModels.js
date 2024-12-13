const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAccountActivated: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date }
}, { timestamps: true });

// Pre-save hook for hashing password and generating verification code
userSchema.pre('save', async function(next) {
  if (this.isModified('password') || this.isNew) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }

  if (this.isModified('verificationCode') || this.isNew) {
    this.verificationCode = crypto.randomInt(100000, 999999).toString();
    this.verificationCodeExpires = new Date(Date.now() + 1.5 * 60 * 1000);
  }
  
  next();
});



const User = mongoose.model('userSpeedMeet', userSchema);

module.exports = User;
