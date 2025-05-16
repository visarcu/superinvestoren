// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  // ① Session.user erweitern
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      isPremium: boolean
    }
  }
  // ② User-Objekt erweitern (wird in `authorize` und co. verwendet)
  interface User extends DefaultUser {
    id: string
    isPremium: boolean
  }
}

// ③ JWT erweitern – hier kommt der Token rein, den du in `jwt()` setzt
declare module 'next-auth/jwt' {
  interface JWT {
    isPremium: boolean
  }
}