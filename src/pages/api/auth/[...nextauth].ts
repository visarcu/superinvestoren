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
    maxAge:   30 * 24 * 60 * 60, // 30 Tage
  },
  providers: [
    CredentialsProvider({
      name: 'E-Mail & Passwort',
      credentials: {
        email:    { label: 'E-Mail',    type: 'text'     },
        password: { label: 'Passwort',  type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null
    
        // Cast hier rein:
        const request = req as NextApiRequest
    
        // IP-Extraktion:
        const forwarded = (request.headers['x-forwarded-for'] as string) ?? ''
        const ip =
          forwarded.split(',')[0].trim() ||
          (request.socket?.remoteAddress ?? '')
    
        // Rate-Limit checken…
        const count = loginLimiter.get(ip) ?? 0
        if (count >= 5) throw new Error('Zu viele Login-Versuche…')
        loginLimiter.set(ip, count + 1)

        // 2) User holen
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user) return null

        // 3) Passwort prüfen
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null


        // 4) Bei Erfolg: gebe das User-Objekt zurück
        return {
          id:        user.id,
          email:     user.email,
          isPremium: user.isPremium
        }
      }
    })
  ],

  callbacks: {
    // Erstellt / aktualisiert das JWT-Token
    async jwt({ token, user }) {
      if (user) {
        // beim ersten Login kommt `user` hier rein
        token.isPremium = (user as any).isPremium
      } else {
        // bei späteren Requests holen wir uns den aktuellen Wert nochmal aus der DB
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub }
        })
        token.isPremium = dbUser?.isPremium ?? false
      }
      return token
    },

    // Baut die Session auf Basis des Tokens auf
    async session({ session, token }) {
      session.user.id        = token.sub
      session.user.isPremium = token.isPremium as boolean
      return session
    }
  }
}

export default NextAuth(authOptions)