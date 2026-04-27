const express = require('express');
const router = express.Router();
const {
  getServices,
  matchVolunteers,
  createBooking,
  getBookings,
  updateBookingStatus,
} = require('../controllers/booking.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, bookingSchema, matchSchema } = require('../middleware/validate');

// Services
router.get('/services', authenticate, getServices);

// Bookings
router.get('/bookings', authenticate, getBookings);
router.post('/bookings', authenticate, authorize('PATIENT'), validate(bookingSchema), createBooking);
router.post('/bookings/match', authenticate, authorize('PATIENT'), validate(matchSchema), matchVolunteers);
router.patch('/bookings/:id/status', authenticate, updateBookingStatus);

module.exports = router;
