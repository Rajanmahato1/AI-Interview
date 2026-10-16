const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

const signToken = (userId) => jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) throw new AppError('Name, email and password are required', 400, 'MISSING_FIELDS');
    if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

    const user = new User({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash: password });
    await user.save();

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const valid = await user.comparePassword(password);
    if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// POST /api/auth/logout (stateless JWT – client discards token)
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400, 'MISSING_FIELDS');
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond 200 to prevent user enumeration
    if (!user) return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // In production: send email with reset link
    // For now: return token in dev mode only
    const isDev = config.NODE_ENV === 'development';
    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.', ...(isDev && { devToken: token }) });
  } catch (err) { next(err); }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new AppError('Token and password are required', 400, 'MISSING_FIELDS');
    if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } }).select('+resetPasswordToken +resetPasswordExpires');
    if (!user) throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');

    user.passwordHash = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const jwtToken = signToken(user._id);
    res.json({ success: true, token: jwtToken, message: 'Password reset successful' });
  } catch (err) { next(err); }
};

// POST /api/auth/firebase
const firebaseAuth = async (req, res, next) => {
  try {
    const { idToken, email, name, firebaseUid, photoUrl } = req.body;
    let verifiedEmail = email;
    let verifiedUid = firebaseUid;
    let verifiedName = name;
    let verifiedPhoto = photoUrl;

    if (idToken) {
      try {
        const tokenRes = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
          { timeout: 5000 }
        );
        if (tokenRes.data && tokenRes.data.email) {
          verifiedEmail = tokenRes.data.email;
          verifiedUid = tokenRes.data.sub || tokenRes.data.user_id || firebaseUid;
          verifiedName = tokenRes.data.name || name;
          verifiedPhoto = tokenRes.data.picture || photoUrl;
        }
      } catch (tokenErr) {
        console.warn('[AUTH] Token verification notice:', tokenErr.response?.data?.error_description || tokenErr.message);
      }
    }

    if (!verifiedEmail) {
      throw new AppError('Email is required for Firebase authentication', 400, 'MISSING_FIELDS');
    }

    const cleanEmail = verifiedEmail.toLowerCase().trim();
    let user = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(verifiedUid ? [{ firebaseUid: verifiedUid }] : []),
      ],
    });

    if (!user) {
      user = new User({
        name: verifiedName ? verifiedName.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        firebaseUid: verifiedUid || undefined,
        profile: {
          avatar: verifiedPhoto || '',
        },
      });
      await user.save();
      console.log(`[AUTH] New user provisioned via Firebase Auth: ${cleanEmail}`);
    } else {
      let updated = false;
      if (verifiedUid && !user.firebaseUid) {
        user.firebaseUid = verifiedUid;
        updated = true;
      }
      if (verifiedPhoto && (!user.profile || !user.profile.avatar)) {
        if (!user.profile) user.profile = {};
        user.profile.avatar = verifiedPhoto;
        updated = true;
      }
      if (updated) await user.save();
      console.log(`[AUTH] Existing user authenticated via Firebase: ${cleanEmail}`);
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, logout, forgotPassword, resetPassword, firebaseAuth };
