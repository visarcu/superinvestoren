// src/app/api/auth/[...nextauth]/route.ts

import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { LRUCache } from 'lru-cache'
import type { NextApiRequest } from 'next'

/** Rate-Limit: max 5 Login-Versuche pro Minute/IP */
const ONE_MINUTE = 60 * 1000
const loginLimiter = new LRUCache<string, number>({
  max: 500,
  ttl: ONE_MINUTE,
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  },
  providers: [
    CredentialsProvider({
      name: 'E-Mail & Passwort',
      credentials: {
        email: { label: 'E-Mail', type: 'text' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null

        // Rate-Limit per IP
        const request = req as NextApiRequest
        const forwarded = (request.headers['x-forwarded-for'] as string) ?? ''
        const ip =
          forwarded.split(',')[0].trim() || request.socket.remoteAddress || ''
        const count = loginLimiter.get(ip) ?? 0
        if (count >= 5) throw new Error('Zu viele Login-Versuche…')
        loginLimiter.set(ip, count + 1)

        // User & Passwort prüfen
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        // Gib im ersten Login schon `isPremium` mit zurück
        return { id: user.id, email: user.email, isPremium: user.isPremium }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isPremium = (user as any).isPremium
      } else {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { isPremium: true },
        })
        token.isPremium = dbUser?.isPremium ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.isPremium = token.isPremium as boolean
      }
      return session
    },
  },
}

// ① Erzeuge den NextAuth-Handler
const handler = NextAuth(authOptions)

// ② Exportiere ihn _direkt_ als GET und POST, ohne eigene Wrapper:
export { handler as GET, handler as POST }