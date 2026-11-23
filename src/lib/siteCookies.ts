// src/lib/siteCookies.ts
//
// Cookies, die finclue.de und depot.finclue.de gemeinsam sehen. localStorage
// gilt nur für genau einen Host. Genutzt für die Supabase-Sitzung
// (authCookieStorage) und die Cookie-Auswahl (useCookieConsent).
// Nur im Browser aufrufen.

import { DEPOT_HOST, SITE_DOMAIN, mainHostFor } from './siteHosts'

// Chrome deckelt Cookie-Laufzeiten bei 400 Tagen
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400

/** Domain, die beide Hosts abdeckt; undefined = Cookie nur für diesen Host */
export function sharedCookieDomain(): string | undefined {
  const host = window.location.hostname
  // Produktion: immer domainweit, auch solange die Subdomain noch aus ist —
  // so muss beim Einschalten kein Cookie mehr umziehen.
  if (host === SITE_DOMAIN || host.endsWith(`.${SITE_DOMAIN}`)) return SITE_DOMAIN
  // Lokal: Domain der Hauptseite aus NEXT_PUBLIC_DEPOT_HOST, z. B.
  // depot.finclue.localhost:3000 → finclue.localhost. Bloßes "localhost"
  // taugt nicht: Chrome teilt Domain=localhost nicht mit depot.localhost.
  if (DEPOT_HOST) {
    const mainHostname = mainHostFor(DEPOT_HOST).split(':')[0]
    if (host === mainHostname || host.endsWith(`.${mainHostname}`)) return mainHostname
  }
  return undefined
}

export function cookieAttributes(domain: string | undefined, maxAge: number): string {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainAttr = domain ? `; Domain=${domain}` : ''
  return `; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domainAttr}`
}

export function readCookies(): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!document.cookie) return cookies
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const name = part.slice(0, eq)
    if (!cookies.has(name)) cookies.set(name, part.slice(eq + 1))
  }
  return cookies
}
