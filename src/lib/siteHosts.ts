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

import { LEGACY_WORKSPACE_PATH, WORKSPACE_PATH, isWorkspacePathname } from '@/lib/depotRoutes'

export const SITE_DOMAIN = 'finclue.de'

const DEPOT_PREFIX = 'depot.'

export const DEPOT_HOST = (process.env.NEXT_PUBLIC_DEPOT_HOST || '').toLowerCase()

export { WORKSPACE_PATH }

/** depot.finclue.de → finclue.de, depot.localhost:3000 → localhost:3000 */
export function mainHostFor(depotHost: string): string {
  return depotHost.startsWith(DEPOT_PREFIX) ? depotHost.slice(DEPOT_PREFIX.length) : depotHost
}

/** Pfade des Trackers. Bewusst nicht /analyse/portfolio-check. */
export function isPortfolioPath(pathname: string): boolean {
  return pathname === WORKSPACE_PATH || pathname.startsWith(`${WORKSPACE_PATH}/`)
}

/**
 * Auf dem Depot-Host entfällt "/analyse/portfolio" vor den Workspace-Pfaden:
 * /analyse/portfolio → /, /analyse/portfolio/trade-republic/analyse →
 * /trade-republic/analyse. Unterseiten wie /analyse/portfolio/depots/neu
 * bleiben unverändert.
 */
export function toDepotPath(pathname: string): string {
  if (pathname === WORKSPACE_PATH || pathname === LEGACY_WORKSPACE_PATH) return '/'
  if (isWorkspacePathname(pathname)) return pathname.slice(WORKSPACE_PATH.length)
  return pathname
}

/** Gegenstück zu toDepotPath, z. B. für ?redirect= nach dem Login */
export function fromDepotPath(pathname: string): string {
  if (pathname === '/') return WORKSPACE_PATH
  if (pathname.startsWith('/analyse/')) return pathname
  return `${WORKSPACE_PATH}${pathname}`
}

/**
 * Pfad passend zum aktuellen Host, für Navigation per Router oder
 * window.location (nur im Browser, z. B. in Event-Handlern). Für hrefs im
 * gerenderten HTML depotHref nehmen, das ist auf Server und Client gleich.
 */
export function currentHostPath(path: string): string {
  if (!isOnDepotHost()) return path
  const [pathname, query] = path.split('?')
  return `${toDepotPath(pathname)}${query ? `?${query}` : ''}`
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

/**
 * Link aus dem Depot auf eine Seite der Hauptseite (Aktien, Preise …). Auf dem
 * Depot-Host absolut: Ein relativer Link würde erst hier vorgeladen, nach
 * finclue.de umgeleitet und dort an CORS scheitern. Überall sonst (localhost,
 * Vorschau-Deployments) der unveränderte Pfad.
 * Nur für Inhalte, die erst nach dem Laden des Depots im Browser entstehen,
 * sonst weichen Server- und Client-HTML voneinander ab.
 */
export function leaveDepotHref(path: string): string {
  return isOnDepotHost() ? mainSiteHref(path) : path
}

/**
 * Gegenstück zu leaveDepotHref: Link von der Hauptseite ins Depot. Auf der
 * Hauptseite absolut, sonst würde der Link dort vorgeladen, auf die Subdomain
 * umgeleitet und an CORS scheitern. Auf localhost und in Vorschau-Deployments
 * der unveränderte Pfad. Nur im Browser aufrufen.
 */
export function enterDepotHref(path: string): string {
  if (!DEPOT_HOST || typeof window === 'undefined') return path
  const host = window.location.host.toLowerCase()
  const mainHost = mainHostFor(DEPOT_HOST)
  return host === mainHost || host === `www.${mainHost}` ? depotHref(path) : path
}

/** Läuft der Browser gerade auf dem Depot-Host? Nur clientseitig sinnvoll. */
export function isOnDepotHost(): boolean {
  return !!DEPOT_HOST && typeof window !== 'undefined' && window.location.host.toLowerCase() === DEPOT_HOST
}
