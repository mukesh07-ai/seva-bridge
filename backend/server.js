require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./src/config/db');

// Routes
const authRoutes = require('./src/routes/auth.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const volunteerRoutes = require('./src/routes/volunteer.routes');
const reportRoutes = require('./src/routes/report.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const server = http.createServer(app);

// ── Socket.IO (Real-time notifications) ──────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});

const onlineUsers = new Map(); // userId → socketId

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) { onlineUsers.delete(uid); break; }
    }
  });
});

// Export io for use in controllers
app.set('io', io);
app.set('onlineUsers', onlineUsers);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Seva-Bridge API' })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', bookingRoutes);         // /api/services, /api/bookings
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ── Process-level guards ──────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  process.exit(1);
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n🚀 Seva-Bridge API running at http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`💊 Health check: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });

