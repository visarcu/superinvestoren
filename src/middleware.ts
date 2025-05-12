// src/middleware.ts

import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default withAuth({
  // Hier können wir festlegen, wohin umgeleitet wird, wenn nicht autorisiert
  pages: {
    signIn: "/auth/signin",   // Standard-Page für Login/Signup
  },
  callbacks: {
    authorized({ token }) {
      // Nur eingeloggte User dürfen /analyse*-Routen sehen
      return !!token
    }
  }
})

// An welche Pfade das Middleware greifen soll
export const config = {
  matcher: ["/analyse/:path*"],
}