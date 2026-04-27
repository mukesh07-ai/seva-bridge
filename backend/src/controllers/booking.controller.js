const { prisma } = require('../config/db');
const { haversineKm, calcTotalAmount } = require('../utils/haversine');

// Skill level → allowed service categories
const SKILL_SERVICE_MAP = {
  LEVEL_1: ['VITALS_MONITORING'],
  LEVEL_2: ['VITALS_MONITORING', 'WOUND_CARE'],
  LEVEL_3: ['VITALS_MONITORING', 'WOUND_CARE', 'MEDICATION_MANAGEMENT'],
  LEVEL_4: ['VITALS_MONITORING', 'WOUND_CARE', 'MEDICATION_MANAGEMENT', 'ADVANCED_CARE'],
};

// Required level mapping for frontend gating
const SERVICE_LEVEL_MAP = {
  VITALS_MONITORING: 'LEVEL_1',
  WOUND_CARE: 'LEVEL_2',
  MEDICATION_MANAGEMENT: 'LEVEL_3',
  ADVANCED_CARE: 'LEVEL_4',
};

// GET /api/services
const getServices = async (req, res) => {
  try {
    const { skillLevel } = req.query;

    const where = { isActive: true };
    if (skillLevel && SKILL_SERVICE_MAP[skillLevel]) {
      where.category = { in: SKILL_SERVICE_MAP[skillLevel] };
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: { category: 'asc' },
    });

    return res.status(200).json({ success: true, data: services });
  } catch (error) {
    console.error('getServices error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/bookings/match  — Haversine GPS Matching Engine
const matchVolunteers = async (req, res) => {
  try {
    const { serviceId, patientLat, patientLng, radiusKm = 20 } = req.body;

    // Validate service exists
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Find all online, verified volunteers
    const volunteers = await prisma.volunteer.findMany({
      where: {
        isOnline: true,
        isVerified: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: { user: { select: { id: true, name: true, avatar: true, phone: true } } },
    });

    // Filter: skill level must match the service's required level
    const requiredLevel = SERVICE_LEVEL_MAP[service.category];
    const levelOrder = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'];
    const requiredIdx = levelOrder.indexOf(requiredLevel);

    const eligible = volunteers.filter((v) => {
      const volunteerIdx = levelOrder.indexOf(v.skillLevel);
      return volunteerIdx >= requiredIdx; // Must meet or exceed required level
    });

    // Calculate distances using Haversine formula and sort
    const withDistances = eligible
      .map((v) => ({
        ...v,
        distanceKm: haversineKm(patientLat, patientLng, v.latitude, v.longitude),
      }))
      .filter((v) => v.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5); // Top 5 closest

    // Calculate estimated cost for each
    const result = withDistances.map((v) => ({
      volunteerId: v.id,
      volunteerName: v.user.name,
      avatar: v.user.avatar,
      phone: v.user.phone,
      skillLevel: v.skillLevel,
      rating: v.rating,
      distanceKm: parseFloat(v.distanceKm.toFixed(2)),
      estimatedCost: calcTotalAmount(service.basePrice, v.distanceKm),
      eta: Math.ceil(v.distanceKm * 3), // Rough ETA in minutes
    }));

    return res.status(200).json({
      success: true,
      data: {
        service,
        matches: result,
        totalFound: result.length,
      },
    });
  } catch (error) {
    console.error('matchVolunteers error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { serviceId, scheduledTime, patientLat, patientLng, volunteerId, notes } = req.body;

    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) {
      return res.status(400).json({ success: false, message: 'Patient profile not found' });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    let totalAmount = service.basePrice;
    let distanceKm = null;

    // If a volunteer matched, calculate cost
    if (volunteerId) {
      const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
      if (volunteer?.latitude && volunteer?.longitude) {
        distanceKm = haversineKm(patientLat, patientLng, volunteer.latitude, volunteer.longitude);
        totalAmount = calcTotalAmount(service.basePrice, distanceKm);
      }
    }

    const booking = await prisma.booking.create({
      data: {
        patientId: patient.id,
        volunteerId: volunteerId || null,
        serviceId,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        totalAmount,
        distanceKm,
        patientLat,
        patientLng,
        notes,
        status: volunteerId ? 'PENDING' : 'PENDING',
      },
      include: {
        service: true,
        volunteer: { include: { user: { select: { name: true, avatar: true } } } },
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: { bookingId: booking.id, amount: totalAmount, status: 'PENDING' },
    });

    // ── SOCKET.IO: Notify Volunteer ───────────────────────────────────────────
    const io = req.app.get('io');
    if (volunteerId) {
      const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
      if (volunteer) {
        io.to(`user:${volunteer.userId}`).emit('booking:new', booking);
      }
    }
    // Notify Admins
    io.emit('platform:update', { type: 'BOOKING_CREATED', bookingId: booking.id });

    return res.status(201).json({ success: true, message: 'Booking created', data: booking });
  } catch (error) {
    console.error('createBooking error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/bookings — get bookings by role
const getBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      where.patientId = patient?.id;
    } else if (req.user.role === 'VOLUNTEER') {
      const volunteer = await prisma.volunteer.findUnique({ where: { userId: req.user.id } });
      where.volunteerId = volunteer?.id;
    }
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: true,
          patient: { include: { user: { select: { name: true, avatar: true, phone: true } } } },
          volunteer: { include: { user: { select: { name: true, avatar: true, phone: true } } } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit),
      }),
      prisma.booking.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: bookings,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('getBookings error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validTransitions = {
      VOLUNTEER: { PENDING: ['ACCEPTED', 'CANCELLED'], ACCEPTED: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED'] },
      PATIENT: { PENDING: ['CANCELLED'] },
      ADMIN: { PENDING: ['CANCELLED'], ACCEPTED: ['CANCELLED'] },
    };

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const allowed = validTransitions[req.user.role]?.[booking.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Cannot transition to ${status}` });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: { 
        service: true, 
        patient: { include: { user: { select: { id: true, name: true } } } }, 
        volunteer: { include: { user: { select: { id: true, name: true } } } } 
      },
    });

    // ── SOCKET.IO: Notify both parties ───────────────────────────────────────
    const io = req.app.get('io');
    const pId = updated.patient?.userId;
    const vId = updated.volunteer?.userId;

    if (pId) io.to(`user:${pId}`).emit('booking:update', updated);
    if (vId) io.to(`user:${vId}`).emit('booking:update', updated);
    
    // Notify Admins
    io.emit('platform:update', { type: 'BOOKING_STATUS_CHANGED', bookingId: id, status });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateBookingStatus error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getServices, matchVolunteers, createBooking, getBookings, updateBookingStatus };
