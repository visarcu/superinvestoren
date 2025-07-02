// src/middleware.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Nur für authentifizierte Bereiche
  if (request.nextUrl.pathname.startsWith('/profile') ||
      request.nextUrl.pathname.startsWith('/analyse')) {
    
    // Entferne den problematischen Patreon-refresh Call
    // Lass Supabase das Session-Management selbst handhaben
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/analyse/:path*']
};