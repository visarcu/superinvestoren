// src/pages/api/auth/[...nextauth].ts
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import NextAuth, { NextAuthOptions, Session, JWT } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      /* ... wie gehabt ... */
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Beim ersten Login: setze isPremium
      if (user) {
        token.isPremium = user.isPremium
      } else {
        // Bei späteren Requests: frisch aus DB holen
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
        })
        token.isPremium = dbUser?.isPremium ?? false
      }
      return token
    },
    async session({ session, token }) {
      // Session immer aus Token befüllen
      session.user.id        = token.sub
      session.user.isPremium = token.isPremium
      return session
    },
  },
}

export default NextAuth(authOptions)