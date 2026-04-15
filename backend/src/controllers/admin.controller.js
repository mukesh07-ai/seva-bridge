const { prisma } = require('../config/db');

// GET /api/admin/analytics
const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers,
      totalPatients,
      totalVolunteers,
      verifiedVolunteers,
      totalBookings,
      activeBookings,
      completedBookings,
      totalRevenue,
      recentBookings,
      pendingVerifications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.patient.count(),
      prisma.volunteer.count(),
      prisma.volunteer.count({ where: { isVerified: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } } }),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          service: true,
          patient: { include: { user: { select: { name: true } } } },
          volunteer: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.volunteer.count({ where: { isVerified: false } }),
    ]);

    // Revenue last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyRevenue = await prisma.payment.aggregate({
      where: { status: 'PAID', createdAt: { gte: sevenDaysAgo } },
      _sum: { amount: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalPatients,
          totalVolunteers,
          verifiedVolunteers,
          totalBookings,
          activeBookings,
          completedBookings,
          totalRevenue: totalRevenue._sum.amount || 0,
          weeklyRevenue: weeklyRevenue._sum.amount || 0,
          pendingVerifications,
        },
        recentBookings,
      },
    });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const where = role ? { role } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, role: true, avatar: true, createdAt: true },
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/admin/services
const createService = async (req, res) => {
  try {
    const { name, description, category, basePrice, requiredLevel, icon } = req.body;
    const service = await prisma.service.create({
      data: { name, description, category, basePrice: parseFloat(basePrice), requiredLevel, icon },
    });
    return res.status(201).json({ success: true, data: service });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/admin/services/:id
const deleteService = async (req, res) => {
  try {
    await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
    return res.status(200).json({ success: true, message: 'Service deactivated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { getAnalytics, getAllUsers, createService, deleteService };
