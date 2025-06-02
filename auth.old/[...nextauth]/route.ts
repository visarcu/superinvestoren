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
        email:    { label: 'E-Mail',    type: 'text'     },
        password: { label: 'Passwort',  type: 'password' },
      },
      async authorize(credentials, req) {
        // 1) Wurde überhaupt ein credentials-Objekt übergeben?

    
        if (!credentials?.email || !credentials.password) {
     
          return null;
        }
    
        // 2) Suche den User in der DB
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
    
    
        if (!user) {
          
          return null;
        }
    
        // 3) Vergleiche Passwort mit Hash
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)

    
        if (!valid) {
      
          return null;
        }
    
        // 4) Alles gut: gib das Objekt zurück
   
        return { id: user.id, email: user.email, isPremium: user.isPremium }
      }
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