const express = require('express');
const router = express.Router();
const { upload, uploadReport, getReport } = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/upload', authenticate, authorize('VOLUNTEER', 'ADMIN'), upload.array('files', 5), uploadReport);
router.get('/:bookingId', authenticate, getReport);

module.exports = router;
