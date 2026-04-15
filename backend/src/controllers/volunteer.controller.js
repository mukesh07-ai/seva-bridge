const { prisma } = require('../config/db');

// GET /api/volunteers/me
const getMyProfile = async (req, res) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { name: true, email: true, avatar: true, phone: true } },
        bookings: {
          where: { status: 'COMPLETED' },
          select: { totalAmount: true },
        },
      },
    });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer profile not found' });
    return res.status(200).json({ success: true, data: volunteer });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/volunteers/online  — Go Online/Offline toggle
const toggleOnline = async (req, res) => {
  try {
    const { isOnline, latitude, longitude } = req.body;

    const volunteer = await prisma.volunteer.findUnique({ where: { userId: req.user.id } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer profile not found' });
    if (!volunteer.isVerified) {
      return res.status(403).json({ success: false, message: 'Your account is pending verification by an admin.' });
    }

    const updated = await prisma.volunteer.update({
      where: { userId: req.user.id },
      data: {
        isOnline,
        ...(isOnline && latitude && longitude ? { latitude, longitude } : {}),
        ...(!isOnline ? { isOnline: false } : {}),
      },
    });

    return res.status(200).json({
      success: true,
      message: `You are now ${isOnline ? 'online' : 'offline'}`,
      data: { isOnline: updated.isOnline },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/volunteers/location
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    await prisma.volunteer.update({
      where: { userId: req.user.id },
      data: { latitude, longitude },
    });
    return res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/volunteers/profile
const updateProfile = async (req, res) => {
  try {
    const { qualification, yearOfStudy, certificationUrl } = req.body;
    const updated = await prisma.volunteer.update({
      where: { userId: req.user.id },
      data: { qualification, yearOfStudy, certificationUrl },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/volunteers/verify/:id  — Admin Only
const verifyVolunteer = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, skillLevel } = req.body;

    const volunteer = await prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Volunteer not found' });

    const updated = await prisma.volunteer.update({
      where: { id },
      data: {
        isVerified: isVerified !== undefined ? isVerified : volunteer.isVerified,
        ...(skillLevel ? { skillLevel } : {}),
      },
      include: { user: { select: { name: true, email: true } } },
    });

    return res.status(200).json({
      success: true,
      message: `Volunteer ${isVerified ? 'verified' : 'rejected'}`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/volunteers/unverified  — Admin Only
const getUnverified = async (req, res) => {
  try {
    const volunteers = await prisma.volunteer.findMany({
      where: { isVerified: false },
      include: { user: { select: { id: true, name: true, email: true, phone: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json({ success: true, data: volunteers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/volunteers/earnings  — Volunteer wallet
const getEarnings = async (req, res) => {
  try {
    const volunteer = await prisma.volunteer.findUnique({ where: { userId: req.user.id } });
    if (!volunteer) return res.status(404).json({ success: false, message: 'Not found' });

    const completedBookings = await prisma.booking.findMany({
      where: { volunteerId: volunteer.id, status: 'COMPLETED' },
      include: { service: true, payment: true },
      orderBy: { updatedAt: 'desc' },
    });

    const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: { totalEarnings, completedCount: completedBookings.length, history: completedBookings },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getMyProfile, toggleOnline, updateLocation, updateProfile, verifyVolunteer, getUnverified, getEarnings };
