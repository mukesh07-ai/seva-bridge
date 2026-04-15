const { z } = require('zod');

// Generic Zod validation middleware
// NOTE: Zod v4 uses error.issues (not error.errors)
const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (error) {
    // Zod v4: issues array (was .errors in v3)
    const issues = error.issues || error.errors || [];
    const errors = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : e.path,
      message: e.message,
    }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
};

// ── Auth Schemas ──────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.enum(['PATIENT', 'VOLUNTEER']).default('PATIENT'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

// ── Volunteer Schemas ─────────────────────────────────────────────────────────
const volunteerProfileSchema = z.object({
  qualification: z.string().optional(),
  yearOfStudy: z.number().int().min(1).max(10).optional(),
  certificationUrl: z.string().url().optional(),
  skillLevel: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4']).optional(),
});

// ── Booking Schemas ───────────────────────────────────────────────────────────
const bookingSchema = z.object({
  serviceId: z.string().uuid('Invalid serviceId'),
  volunteerId: z.string().optional(),          // optional — pre-matched volunteer
  scheduledTime: z.string().optional(),        // relaxed — frontend may not send ISO string
  patientLat: z.number().min(-90).max(90),
  patientLng: z.number().min(-180).max(180),
  notes: z.string().max(500).optional(),
});

const matchSchema = z.object({
  serviceId: z.string().uuid('Invalid serviceId'),
  patientLat: z.number().min(-90).max(90),
  patientLng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(100).default(20),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  volunteerProfileSchema,
  bookingSchema,
  matchSchema,
};
