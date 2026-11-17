// src/lib/authCookieStorage.ts
//
// Speicher für die Supabase-Sitzung: Cookie für die ganze Domain statt
// localStorage. localStorage gilt nur für genau einen Host — auf
// depot.finclue.de wäre man sonst ausgeloggt, obwohl man auf finclue.de
// angemeldet ist. Das Cookie auf "finclue.de" sehen beide Hosts.
//
// - Die Sitzung (JWT + User-Objekt) ist größer als das Browser-Limit von
//   ~4 KB pro Cookie, deshalb wird sie auf mehrere Cookies verteilt
//   (`<key>.0`, `<key>.1`, …).
// - Sitzungen von vor der Umstellung liegen noch im localStorage. Beim ersten
//   Lesen werden sie ins Cookie übernommen, damit niemand ausgeloggt wird.
// - Lässt der Browser das Cookie nicht zu, bleibt die Sitzung im localStorage
//   (Verhalten wie vorher, nur ohne Subdomain-Teilung).

import { DEPOT_HOST, SITE_DOMAIN, mainHostFor } from './siteHosts'

type AuthStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

// Zeichen pro Cookie. Mit Name und Attributen bleibt jedes Cookie unter 4 KB.
const CHUNK_SIZE = 3000
// Chrome deckelt Cookie-Laufzeiten bei 400 Tagen. Die eigentliche Gültigkeit
// regelt Supabase über den Refresh-Token.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 400

function cookieDomain(): string | undefined {
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

function attributes(domain: string | undefined, maxAge: number): string {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainAttr = domain ? `; Domain=${domain}` : ''
  return `; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domainAttr}`
}

function readCookies(): Map<string, string> {
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

// base64url über UTF-8 — kompakter als encodeURIComponent auf JSON und
// enthält nur cookie-sichere Zeichen.
function encode(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(encoded: string): string | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((encoded.length + 3) % 4)
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function chunkNames(key: string, cookies: Map<string, string>): string[] {
  const names: string[] = []
  for (let i = 0; cookies.has(`${key}.${i}`); i++) names.push(`${key}.${i}`)
  return names
}

function readChunks(key: string): string | null {
  const cookies = readCookies()
  const names = chunkNames(key, cookies)
  if (names.length === 0) return null
  return decode(names.map(name => cookies.get(name)!).join(''))
}

function deleteChunks(key: string, fromIndex: number, domain: string | undefined) {
  const cookies = readCookies()
  for (let i = fromIndex; cookies.has(`${key}.${i}`); i++) {
    document.cookie = `${key}.${i}=${attributes(domain, 0)}`
  }
}

function deleteAllChunks(key: string) {
  const domain = cookieDomain()
  deleteChunks(key, 0, domain)
  if (domain) deleteChunks(key, 0, undefined)
}

function writeChunks(key: string, value: string): boolean {
  const encoded = encode(value)
  const chunks: string[] = []
  for (let i = 0; i < encoded.length; i += CHUNK_SIZE) chunks.push(encoded.slice(i, i + CHUNK_SIZE))

  const domain = cookieDomain()
  // Host-Cookies aus einem früheren Fallback würden das domainweite Cookie
  // gleichen Namens verdecken
  if (domain) deleteChunks(key, 0, undefined)

  // Erst domainweit versuchen, dann als Host-Cookie
  const attempts = domain ? [domain, undefined] : [undefined]
  for (const attempt of attempts) {
    chunks.forEach((chunk, i) => {
      document.cookie = `${key}.${i}=${chunk}${attributes(attempt, MAX_AGE_SECONDS)}`
    })
    // Übrige Teile einer früheren, längeren Sitzung vor dem Gegenlesen
    // entfernen — sonst hängen sie am neuen Wert dran
    deleteChunks(key, chunks.length, attempt)
    if (readChunks(key) === value) return true
    deleteChunks(key, 0, attempt)
  }
  return false
}

function localGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function localSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Privater Modus o. Ä. — Sitzung lebt dann nur im Speicher
  }
}

function localRemove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // siehe localSet
  }
}

// Auf dem Server gibt es weder Cookies noch localStorage. Supabase nutzt dort
// ohnehin keinen persistenten Speicher; die Map entspricht dem bisherigen
// Speicher-Fallback von supabase-js.
const serverMemory = new Map<string, string>()

export const authCookieStorage: AuthStorage = {
  getItem(key) {
    if (typeof document === 'undefined') return serverMemory.get(key) ?? null

    const fromCookie = readChunks(key)
    if (fromCookie !== null) return fromCookie

    // Umzug: Sitzung aus der Zeit vor der Umstellung übernehmen
    const legacy = localGet(key)
    if (legacy !== null && writeChunks(key, legacy)) localRemove(key)
    return legacy
  },

  setItem(key, value) {
    if (typeof document === 'undefined') {
      serverMemory.set(key, value)
      return
    }
    if (writeChunks(key, value)) {
      localRemove(key)
    } else {
      localSet(key, value)
    }
  },

  removeItem(key) {
    if (typeof document === 'undefined') {
      serverMemory.delete(key)
      return
    }
    deleteAllChunks(key)
    localRemove(key)
  },
}
