const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { register, login, getMe, logout, forgotPassword, resetPassword, firebaseAuth } = require('../controllers/authController');
const auth = require('../middleware/auth');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } } });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/firebase', authLimiter, firebaseAuth);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

module.exports = router;
