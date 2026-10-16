const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User no longer exists' } });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } });
    }
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authentication token' } });
  }
};

module.exports = authMiddleware;
