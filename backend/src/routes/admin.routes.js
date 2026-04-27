const express = require('express');
const router = express.Router();
const { getAnalytics, getAllUsers, createService, deleteService } = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/users', getAllUsers);
router.post('/services', createService);
router.delete('/services/:id', deleteService);

module.exports = router;
