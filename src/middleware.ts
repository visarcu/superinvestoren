// src/middleware.ts
//
// Muss unter src/ liegen: das Projekt nutzt src/app, und Next.js sucht die
// Middleware dann ausschliesslich unter src/middleware.ts. Im Repo-Root wird
// sie stillschweigend ignoriert.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEPOT_HOST, WORKSPACE_PATH, isPortfolioPath, mainHostFor, toDepotPath } from '@/lib/siteHosts';

// Deutsche Alias-Pfade. Ältere App-Builds (bis Build 35) verlinken darauf und
// laufen sonst ins 404.
const PATH_ALIASES: Record<string, string> = {
  '/datenschutz': '/privacy',
  '/preise': '/pricing',
  '/auth/reset': '/auth/forgot-password',
};

// Dateien aus /public (Logos, Bilder, JSON) auf dem Depot-Host direkt ausliefern
const HAS_FILE_EXTENSION = /\.[a-z0-9]+$/i;

function redirectToHost(request: NextRequest, host: string, pathname: string) {
  const url = request.nextUrl.clone();
  url.host = host;
  // nextUrl.port würde sonst den Port des alten Hosts behalten
  url.port = host.includes(':') ? host.split(':')[1] : '';
  url.pathname = pathname;
  // 307 statt 308: Browser cachen 308 dauerhaft. Wird die Subdomain wieder
  // abgeschaltet, würden gecachte Weiterleitungen ins Leere zeigen.
  return NextResponse.redirect(url, 307);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const alias = PATH_ALIASES[pathname];
  if (alias) {
    const url = request.nextUrl.clone();
    url.pathname = alias;
    return NextResponse.redirect(url, 308);
  }

  // Depot-Subdomain: nur aktiv, wenn NEXT_PUBLIC_DEPOT_HOST gesetzt ist
  if (DEPOT_HOST) {
    const host = (request.headers.get('host') || '').toLowerCase();
    const mainHost = mainHostFor(DEPOT_HOST);

    if (host === DEPOT_HOST) {
      if (pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = WORKSPACE_PATH;
        const response = NextResponse.rewrite(url);
        response.headers.set('X-Robots-Tag', 'noindex');
        return response;
      }
      if (isPortfolioPath(pathname) || HAS_FILE_EXTENSION.test(pathname)) {
        const response = NextResponse.next();
        response.headers.set('X-Robots-Tag', 'noindex');
        return response;
      }
      // Alles außerhalb des Trackers (Aktienseiten, Login, Preise …) lebt
      // auf der Hauptseite
      return redirectToHost(request, mainHost, pathname);
    }

    // Hauptseite → Tracker auf der Subdomain. Vorschau-Deployments
    // (*.vercel.app) bleiben unberührt.
    if ((host === mainHost || host === `www.${mainHost}`) && isPortfolioPath(pathname)) {
      return redirectToHost(request, DEPOT_HOST, toDepotPath(pathname));
    }
  }

  return NextResponse.next();
}

// Bewusst schmal: Middleware läuft nur auf den Alias-Pfaden, den
// Tracker-Pfaden und auf dem Depot-Host. Der frühere /profile- und
// /analyse-Zweig war ein reines NextResponse.next() und hätte nur
// Edge-Overhead auf heissen Routen erzeugt. Session-Handling macht Supabase
// clientseitig.
export const config = {
  matcher: [
    '/datenschutz',
    '/preise',
    '/auth/reset',
    '/analyse/portfolio',
    '/analyse/portfolio/:path*',
    // Matcher müssen statisch sein, deshalb hier per Muster statt über
    // NEXT_PUBLIC_DEPOT_HOST. Host-Matching vergleicht ohne Port.
    {
      source: '/((?!_next/|api/).*)',
      has: [{ type: 'host', value: 'depot\\..+' }],
    },
  ],
};
