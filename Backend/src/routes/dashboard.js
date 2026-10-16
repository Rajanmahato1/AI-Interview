const router = require('express').Router();
const auth = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/stats', auth, getDashboardStats);

module.exports = router;
