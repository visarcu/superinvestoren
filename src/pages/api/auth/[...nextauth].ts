// src/pages/api/auth/[...nextauth].ts
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        // 1) User aus der DB holen
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        if (!user) return null

        // 2) Passwort prüfen
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )
        if (!valid) return null

        // 3) Rückgabe: dieses Objekt wird in `token.user` und `session.user` zugänglich
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