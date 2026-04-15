const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../config/db');

// ── Multer Setup ───────────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `report-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

// POST /api/reports/upload
const uploadReport = async (req, res) => {
  try {
    const { bookingId, vitalsData, notes } = req.body;

    // Verify booking exists and belongs to this volunteer
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { volunteer: true, patient: true },
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only the assigned volunteer or admin can upload
    if (req.user.role === 'VOLUNTEER' && booking.volunteer?.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden — not your booking' });
    }

    if (booking.status !== 'IN_PROGRESS' && booking.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Can only upload report for active bookings' });
    }

    // Collect uploaded file URLs
    const fileUrls = req.files?.map((f) => `/uploads/reports/${f.filename}`) || [];

    // Parse vitals data safely
    let parsedVitals = null;
    if (vitalsData) {
      try { parsedVitals = JSON.parse(vitalsData); } catch { parsedVitals = { raw: vitalsData }; }
    }

    // Upsert report (in case of re-upload)
    const report = await prisma.healthReport.upsert({
      where: { bookingId },
      update: { vitalsData: parsedVitals, notes, fileUrls: JSON.stringify(fileUrls), updatedAt: new Date() },
      create: { bookingId, vitalsData: parsedVitals, notes, fileUrls: JSON.stringify(fileUrls) },
    });

    // ── SOCKET.IO: Real-time update ───────────────────────────────────────────
    const io = req.app.get('io');
    const patientUserId = booking.patient?.userId;

    // Notify Patient
    if (patientUserId) {
      io.to(`user:${patientUserId}`).emit('report:new', { bookingId, report });
    }

    // Notify Admin
    io.emit('platform:update', { type: 'REPORT_UPLOADED', bookingId });

    return res.status(200).json({ success: true, message: 'Health report uploaded', data: report });
  } catch (error) {
    console.error('uploadReport error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/reports/:bookingId
const getReport = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Verify access
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { patient: true, volunteer: true },
    });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isPatient = booking.patient?.userId === req.user.id;
    const isVolunteer = booking.volunteer?.userId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isPatient && !isVolunteer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied to this report' });
    }

    const report = await prisma.healthReport.findUnique({ where: { bookingId } });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    
    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error('getReport error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { upload, uploadReport, getReport };
