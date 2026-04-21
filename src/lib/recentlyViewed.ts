// Recently-Viewed Stocks — clientseitiges LRU-Tracking.
//
// Zweck: Auf /analyse/home eine Liste der zuletzt analysierten Aktien zeigen.
// Bewusst localStorage statt Supabase — eigene User-Device-Daten bleiben
// beim User, kein DB-Roundtrip, keine Privacy-Implikationen.
//
// Storage-Layout: JSON-Array unter Key `finclue.recentlyViewed`, max 10
// Einträge, neueste zuerst. Jeder Eintrag: { ticker, name, viewedAt }.

const STORAGE_KEY = 'finclue.recentlyViewed'
const MAX_ENTRIES = 10

export interface RecentTicker {
  ticker: string
  /** Firmen-Anzeigename, optional — wird beim Record-Schreiben mitgegeben */
  name: string
  /** Unix-Timestamp in Millisekunden */
  viewedAt: number
}

/** SSR-safe — gibt [] zurück wenn kein window. */
export function getRecentTickers(): RecentTicker[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Defensiv filtern: nur gültige Einträge zurückgeben
    return parsed.filter(
      (e): e is RecentTicker =>
        typeof e?.ticker === 'string' &&
        typeof e?.name === 'string' &&
        typeof e?.viewedAt === 'number'
    )
  } catch {
    return []
  }
}

/**
 * Fügt einen Ticker zur Liste hinzu (oder bewegt ihn nach oben wenn schon drin).
 * No-op bei SSR oder leerem Ticker.
 */
export function addRecentTicker(ticker: string, name: string): void {
  if (typeof window === 'undefined') return
  if (!ticker) return

  try {
    const existing = getRecentTickers()
    // Dedup: bestehenden Eintrag entfernen (case-insensitive)
    const upper = ticker.toUpperCase()
    const filtered = existing.filter(e => e.ticker.toUpperCase() !== upper)

    const next: RecentTicker[] = [
      { ticker: upper, name: name || upper, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ENTRIES)

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    // Event für andere Tabs/Komponenten, die die Liste live anzeigen
    window.dispatchEvent(new CustomEvent('finclue:recentlyViewed:changed'))
  } catch {
    // localStorage kann voll oder disabled sein — silent fail
  }
}

/** Entfernt einen einzelnen Ticker (z.B. für "×" Button in der UI). */
export function removeRecentTicker(ticker: string): void {
  if (typeof window === 'undefined') return
  try {
    const upper = ticker.toUpperCase()
    const next = getRecentTickers().filter(e => e.ticker.toUpperCase() !== upper)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('finclue:recentlyViewed:changed'))
  } catch {}
}

export function clearRecentTickers(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('finclue:recentlyViewed:changed'))
  } catch {}
}
