const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

// GET /api/profile
const getProfile = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

// PATCH /api/profile
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'profile'];
    const updates = {};
    for (const f of allowedFields) { if (req.body[f] !== undefined) updates[f] = req.body[f]; }

    if (updates.name && (updates.name.length < 2 || updates.name.length > 100)) {
      throw new AppError('Name must be 2–100 characters', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) { next(err); }
};

module.exports = { getProfile, updateProfile };
