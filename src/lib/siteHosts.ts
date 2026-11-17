// src/lib/siteHosts.ts
//
// Hosts der Depot-Subdomain. Der Portfolio-Tracker läuft auf
// depot.finclue.de, der Rest von Finclue auf finclue.de — beides dieselbe
// Next-App, getrennt über die Middleware.
//
// Aktiv erst, wenn NEXT_PUBLIC_DEPOT_HOST gesetzt ist (Produktion
// "depot.finclue.de"). Ohne die Variable bleibt alles beim Alten: keine
// Weiterleitungen, relative Links.
//
// Lokal: "depot.finclue.localhost:3000", die Hauptseite ist dann
// finclue.localhost:3000. Nicht depot.localhost + localhost, aus zwei Gründen:
// Chrome teilt ein Cookie mit Domain=localhost nicht mit Subdomains, und
// `next dev` macht Weiterleitungen auf seinen eigenen Host (localhost:3000)
// relativ — depot → Hauptseite würde zur Endlosschleife. Bloßes
// localhost:3000 funktioniert weiter wie bisher, nur ohne Subdomain.

export const SITE_DOMAIN = 'finclue.de'

const DEPOT_PREFIX = 'depot.'

export const DEPOT_HOST = (process.env.NEXT_PUBLIC_DEPOT_HOST || '').toLowerCase()

export const WORKSPACE_PATH = '/analyse/portfolio/workspace'

/** depot.finclue.de → finclue.de, depot.localhost:3000 → localhost:3000 */
export function mainHostFor(depotHost: string): string {
  return depotHost.startsWith(DEPOT_PREFIX) ? depotHost.slice(DEPOT_PREFIX.length) : depotHost
}

/** Pfade des Trackers. Bewusst nicht /analyse/portfolio-check. */
export function isPortfolioPath(pathname: string): boolean {
  return pathname === '/analyse/portfolio' || pathname.startsWith('/analyse/portfolio/')
}

/** Auf dem Depot-Host liegt der Workspace auf "/" */
export function toDepotPath(pathname: string): string {
  return pathname === WORKSPACE_PATH ? '/' : pathname
}

/** Gegenstück zu toDepotPath, z. B. für ?redirect= nach dem Login */
export function fromDepotPath(pathname: string): string {
  return pathname === '/' ? WORKSPACE_PATH : pathname
}

function protocolFor(host: string): string {
  return host.startsWith('localhost') || host.includes('.localhost') ? 'http:' : 'https:'
}

/**
 * Link in den Tracker, nutzbar auf beiden Hosts und beim Server-Rendering.
 * Mit Depot-Host absolut (Next behandelt gleiche Origins trotzdem als
 * interne Navigation), sonst der unveränderte Pfad.
 */
export function depotHref(path: string): string {
  if (!DEPOT_HOST) return path
  const [pathname, query] = path.split('?')
  return `${protocolFor(DEPOT_HOST)}//${DEPOT_HOST}${toDepotPath(pathname)}${query ? `?${query}` : ''}`
}

/** Absolute URL auf der Hauptseite (für Links vom Depot-Host aus) */
export function mainSiteHref(path: string): string {
  if (!DEPOT_HOST) return path
  const mainHost = mainHostFor(DEPOT_HOST)
  return `${protocolFor(mainHost)}//${mainHost}${path}`
}

/** Läuft der Browser gerade auf dem Depot-Host? Nur clientseitig sinnvoll. */
export function isOnDepotHost(): boolean {
  return !!DEPOT_HOST && typeof window !== 'undefined' && window.location.host.toLowerCase() === DEPOT_HOST
}
