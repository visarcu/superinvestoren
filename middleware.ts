// Middleware für automatische Token-Refresh (src/middleware.ts)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Nur für authentifizierte Bereiche
  if (request.nextUrl.pathname.startsWith('/profile') || 
      request.nextUrl.pathname.startsWith('/analyse')) {
    
    try {
      // Check if user has valid session
      const response = await fetch(`${request.nextUrl.origin}/api/auth/patreon/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || '',
        },
      });

      // Token refresh was attempted, continue with request
      return NextResponse.next();
      
    } catch (error) {
      // If refresh fails, continue anyway (will be handled by component)
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/analyse/:path*']
};