const { PrismaClient } = require('@prisma/client');

// Prisma 5: reads DATABASE_URL from schema.prisma => env("DATABASE_URL")
// No adapter needed — direct connection via the Rust query engine
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { prisma, connectDB };
