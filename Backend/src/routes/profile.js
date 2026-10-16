const router = require('express').Router();
const auth = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/profileController');

router.get('/', auth, getProfile);
router.patch('/', auth, updateProfile);

module.exports = router;
