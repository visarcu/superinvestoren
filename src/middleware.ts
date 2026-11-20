// src/middleware.ts
//
// Muss unter src/ liegen: das Projekt nutzt src/app, und Next.js sucht die
// Middleware dann ausschliesslich unter src/middleware.ts. Im Repo-Root wird
// sie stillschweigend ignoriert.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEPOT_HOST, fromDepotPath, isPortfolioPath, mainHostFor, toDepotPath } from '@/lib/siteHosts';
import { LEGACY_WORKSPACE_PATH, MAIN_SITE_SEGMENTS, isViewSegment, legacyWorkspaceTarget } from '@/lib/depotRoutes';

// Deutsche Alias-Pfade. Ältere App-Builds (bis Build 35) verlinken darauf und
// laufen sonst ins 404.
const PATH_ALIASES: Record<string, string> = {
  '/datenschutz': '/privacy',
  '/preise': '/pricing',
  '/auth/reset': '/auth/forgot-password',
};

// Dateien aus /public (Logos, Bilder, JSON) auf dem Depot-Host direkt ausliefern
const HAS_FILE_EXTENSION = /\.[a-z0-9]+$/i;

/** host null = gleicher Host; search undefined = Query unverändert lassen */
function redirectTo(request: NextRequest, host: string | null, pathname: string, search?: string) {
  const url = request.nextUrl.clone();
  if (host) {
    url.host = host;
    // nextUrl.port würde sonst den Port des alten Hosts behalten
    url.port = host.includes(':') ? host.split(':')[1] : '';
  }
  url.pathname = pathname;
  if (search !== undefined) url.search = search;
  // 307 statt 308: Browser cachen 308 dauerhaft. Wird die Subdomain wieder
  // abgeschaltet, würden gecachte Weiterleitungen ins Leere zeigen.
  return NextResponse.redirect(url, 307);
}

function noindex(response: NextResponse) {
  response.headers.set('X-Robots-Tag', 'noindex');
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const alias = PATH_ALIASES[pathname];
  if (alias) {
    const url = request.nextUrl.clone();
    url.pathname = alias;
    return NextResponse.redirect(url, 308);
  }

  const host = (request.headers.get('host') || '').toLowerCase();
  const mainHost = DEPOT_HOST ? mainHostFor(DEPOT_HOST) : '';
  const onDepotHost = !!DEPOT_HOST && host === DEPOT_HOST;
  const onMainHost = !!DEPOT_HOST && (host === mainHost || host === `www.${mainHost}`);

  // Frühere Adressen /analyse/portfolio/workspace?depot=<id>&view=… (Mails,
  // Lesezeichen) und "/?depot=…" auf dem Depot-Host → lesbare Pfade. Eine
  // Depot-ID im Pfad schreibt der Workspace danach auf den Kurznamen um.
  if (
    pathname === LEGACY_WORKSPACE_PATH ||
    (onDepotHost && pathname === '/' && (searchParams.has('depot') || searchParams.has('view')))
  ) {
    const target = legacyWorkspaceTarget(searchParams);
    if (onDepotHost || onMainHost) {
      return redirectTo(request, onDepotHost ? null : DEPOT_HOST, toDepotPath(target.pathname), target.search);
    }
    return redirectTo(request, null, target.pathname, target.search);
  }

  // Depot-Subdomain: nur aktiv, wenn NEXT_PUBLIC_DEPOT_HOST gesetzt ist
  if (onDepotHost) {
    if (HAS_FILE_EXTENSION.test(pathname)) return noindex(NextResponse.next());

    if (isPortfolioPath(pathname)) {
      // Workspace-Pfade gibt es hier nur in Kurzform (ohne /analyse/portfolio),
      // Unterseiten wie /analyse/portfolio/depots/neu bleiben, wie sie sind
      const short = toDepotPath(pathname);
      if (short !== pathname) return redirectTo(request, null, short);
      return noindex(NextResponse.next());
    }

    // Alles außerhalb des Trackers (Aktienseiten, Login, Preise …) lebt
    // auf der Hauptseite. Ausnahme: ein einzelnes Ansichts-Segment wie
    // "/analyse" ist hier die Analyse aller Depots, nicht das Terminal.
    const segments = pathname.split('/').filter(Boolean);
    const isAllDepotsView = segments.length === 1 && isViewSegment(segments[0]);
    if (!isAllDepotsView && MAIN_SITE_SEGMENTS.has(segments[0] ?? '')) {
      return redirectTo(request, mainHost, pathname);
    }

    // "/", "/analyse", "/trade-republic/analyse" … → Workspace
    const url = request.nextUrl.clone();
    url.pathname = fromDepotPath(pathname);
    return noindex(NextResponse.rewrite(url));
  }

  // Hauptseite → Tracker auf der Subdomain. Vorschau-Deployments
  // (*.vercel.app) bleiben unberührt.
  if (onMainHost && isPortfolioPath(pathname)) {
    return redirectTo(request, DEPOT_HOST, toDepotPath(pathname));
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
