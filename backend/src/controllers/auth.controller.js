const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        // Create role-specific profile
        ...(role === 'PATIENT' && { patient: { create: {} } }),
        ...(role === 'VOLUNTEER' && { volunteer: { create: {} } }),
      },
      include: { patient: true, volunteer: true },
    });

    const token = generateToken(user.id);

    const { password: _, ...userWithoutPass } = user;
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: userWithoutPass, token },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { patient: true, volunteer: true },
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPass } = user;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPass, token },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { patient: true, volunteer: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password: _, ...userWithoutPass } = user;
    return res.status(200).json({ success: true, data: userWithoutPass });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { register, login, getMe };
