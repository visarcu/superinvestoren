// src/middleware.ts
//
// Muss unter src/ liegen: das Projekt nutzt src/app, und Next.js sucht die
// Middleware dann ausschliesslich unter src/middleware.ts. Im Repo-Root wird
// sie stillschweigend ignoriert.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Deutsche Alias-Pfade. Ältere App-Builds (bis Build 35) verlinken darauf und
// laufen sonst ins 404.
const PATH_ALIASES: Record<string, string> = {
  '/datenschutz': '/privacy',
  '/preise': '/pricing',
  '/auth/reset': '/auth/forgot-password',
};

export function middleware(request: NextRequest) {
  const alias = PATH_ALIASES[request.nextUrl.pathname];
  if (alias) {
    const url = request.nextUrl.clone();
    url.pathname = alias;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

// Bewusst nur die Alias-Pfade: der frühere /profile- und /analyse-Zweig war ein
// reines NextResponse.next() und hätte nur Edge-Overhead auf heissen Routen
// erzeugt. Session-Handling macht Supabase clientseitig.
export const config = {
  matcher: ['/datenschutz', '/preise', '/auth/reset'],
};
