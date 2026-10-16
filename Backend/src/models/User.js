const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: {
    type: String, required: true, unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
  },
  passwordHash: { type: String, required: true, select: false },
  profile: {
    targetRole: { type: String, default: '' },
    experienceLevel: { type: String, enum: ['fresher', 'junior', 'mid', 'senior'], default: 'junior' },
    skills: [{ type: String }],
    preferredDifficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    defaultDuration: { type: Number, default: 30 },
    adaptiveEnabled: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    avatar: { type: String, default: '' },
  },
  firebaseUid: { type: String, sparse: true },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
