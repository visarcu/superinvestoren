// src/lib/prisma.ts
// Import from prisma output directory as specified in schema.prisma
import { PrismaClient } from '../../prisma/node_modules/@prisma/client'

// Workaround, damit in Next.js hot-reload nicht ständig neue Clients erzeugt werden
const globalForPrisma = global as unknown as { prisma?: PrismaClient }
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['query'] })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}