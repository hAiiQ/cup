import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!')
  console.log('🔧 Please set DATABASE_URL in your Render environment variables')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ['query'], // Query-Logs deaktiviert für saubere Konsole
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
