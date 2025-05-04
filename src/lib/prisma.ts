// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

// Workaround, damit in Next.js hot-reload nicht ständig neue Clients erzeugt werden
const globalForPrisma = global as unknown as { prisma?: PrismaClient }
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}