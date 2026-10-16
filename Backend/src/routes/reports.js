const router = require('express').Router();
const auth = require('../middleware/auth');
const { getReports, getReport, getReportPdf } = require('../controllers/reportController');

router.get('/', auth, getReports);
router.get('/:id', auth, getReport);
router.get('/:id/pdf', auth, getReportPdf);

module.exports = router;
