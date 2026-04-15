# 🏥 Seva-Bridge — Post-Discharge Healthcare Platform

> Connecting recovering patients with verified medical volunteers through real-time GPS matching.

[![Node.js](https://img.shields.io/badge/Node.js-24.x-green)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-blue)](https://mysql.com)
[![Prisma](https://img.shields.io/badge/ORM-Prisma_5-2D3748)](https://prisma.io)

---

## 📐 Architecture Overview

```
seva-bridge/
├── frontend/          # Next.js 16 (App Router) + Tailwind v4
│   ├── app/
│   │   ├── page.tsx                    # Landing Page
│   │   ├── auth/login/page.tsx         # Login with Role-Based Redirects
│   │   ├── auth/register/page.tsx      # Register (Patient / Volunteer)
│   │   ├── dashboard/                  # Dashboard Hub
│   │   │   ├── page.tsx                # Auto-Redirect based on User Role
│   │   │   ├── patient/page.tsx        # Patient Dashboard
│   │   │   ├── volunteer/page.tsx      # Volunteer Dashboard
│   │   │   └── admin/page.tsx          # Admin Platform Analytics
│   │   ├── components/
│   │   │   └── BookingMap.tsx          # Leaflet GPS Matching Map
│   │   └── context/AuthContext.tsx     # JWT Auth & State Management
│   └── ...
│
└── backend/           # Express.js 5 + Prisma 5 + Socket.IO
    ├── server.js                       # Secure entry point with process guards
    ├── prisma/
    │   ├── schema.prisma               # MySQL Database Schema
    │   └── seed.js                     # Verified services + Default Admin
    └── src/
        ├── config/db.js                # Prisma 5.22 Client Config
        ├── middleware/
        │   ├── auth.js                 # JWT + RBAC authorization
        │   └── validate.js             # Zod v4 validation engine
        ├── controllers/
        │   ├── auth.controller.js      # Register/Login
        │   ├── booking.controller.js   # GPS Haversine Matching Engine
        │   └── ...
        └── routes/
            └── ...
```

---

## 🚀 Quick Start

### Prerequisites

| Tool       | Version  | Description |
|------------|----------|-------------|
| Node.js    | ≥ 22.x   | Runtime (v24 recommended) |
| MySQL      | ≥ 8.0    | Database Server |
| npm        | ≥ 10.x   | Package Manager |

---

### Step 1 — MySQL Database Setup

```sql
-- Connect to MySQL and run:
CREATE DATABASE seva_bridge;
-- The application uses root/MYSQLTEST as default. Update .env if different.
```

---

### Step 2 — Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure Environment
# Copy .env.example to .env and set your DATABASE_URL
# Example: DATABASE_URL="mysql://root:PASS@localhost:3306/seva_bridge"

# 3. Database Initialization
npm run db:generate    # Generate Prisma 5 Client
npm run db:migrate     # Create tables via migrations
npm run db:seed        # Load default services & admin account

# 4. Start Server
npm run dev
```

✅ Backend running at: **http://localhost:5000** | [Health Check](http://localhost:5000/api/health)

---

### Step 3 — Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Dev Server (Turbopack)
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

---

## 🔐 Default Credentials

| Role      | Email                    | Password      |
|-----------|--------------------------|---------------|
| Admin     | **admin@sevabridge.in**  | **Admin@1234**|
| Patient   | Register via UI          | Your choice   |
| Volunteer | Register via UI          | Your choice   |

---

## ✨ Key Features & Improvements

### 🧭 Advanced GPS Matching
The system uses the **Haversine Formula** to bridge the gap between patients and volunteers:
- Filters for **Online + Verified** volunteers only.
- Validates **Skill Levels** against service requirements (e.g., Level 3 required for IV Care).
- Calculates dynamic pricing based on distance (`₹5/km`).
- Visualizes matches in real-time on an interactive map.

### 🛡️ Production Hardening
- **Prisma 5 Engine**: Native MySQL support with optimized query execution.
- **Zod v4 Validation**: Strict schema enforcement for all API payloads.
- **Global Error Handling**: Server-level guards for uncaught exceptions and DB connection failures.
- **Aesthetic Overhaul**: Premium Tailwind v4 UI with glassmorphism, smooth animations, and Inter/Outfit typography.

### 📊 Comprehensive Admin Panel
- Real-time revenue and user metrics.
- Volunteer verification queue.
- Platform-wide booking analytics.

---

## 🛠️ Environment Variables

### Backend (`backend/.env`)
`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`

### Frontend (`frontend/.env.local`)
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`

---

## 📝 Change Log (Recent Fixes)
- [x] **Prisma Downgrade**: Moved from unstable v7 config to production-grade v5.22.
- [x] **CSS Fix**: Resolved Tailwind v4 `@import` conflicts with Google Fonts.
- [x] **Auth Flow**: Fixed login/register redirects that were causing 404s/stalls.
- [x] **Seed Logic**: Fixed broken upsert logic that used names as IDs.
- [x] **Middleware**: Updated Zod error handling for v4 compatibility (`error.issues`).

---

MIT © 2026 Seva-Bridge
