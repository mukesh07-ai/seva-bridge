const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  toggleOnline,
  updateLocation,
  updateProfile,
  verifyVolunteer,
  getUnverified,
  getEarnings,
} = require('../controllers/volunteer.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/me', authenticate, authorize('VOLUNTEER'), getMyProfile);
router.get('/earnings', authenticate, authorize('VOLUNTEER'), getEarnings);
router.patch('/online', authenticate, authorize('VOLUNTEER'), toggleOnline);
router.patch('/location', authenticate, authorize('VOLUNTEER'), updateLocation);
router.patch('/profile', authenticate, authorize('VOLUNTEER'), updateProfile);

// Admin-only routes
router.get('/unverified', authenticate, authorize('ADMIN'), getUnverified);
router.patch('/verify/:id', authenticate, authorize('ADMIN'), verifyVolunteer);

module.exports = router;
