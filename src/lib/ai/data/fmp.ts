// src/lib/ai/data/fmp.ts
// Server-only: FMP-Abrufe der KI-Werkzeuge. Der Schlüssel taucht nie in
// Fehlermeldungen auf; schlägt ein Abruf fehl, kommt null zurück.

const BASE = 'https://financialmodelingprep.com'

export async function fmp<T = any>(
  path: string,
  params: Record<string, string | number> = {},
  { revalidate = 900, timeout = 10_000 }: { revalidate?: number; timeout?: number } = {}
): Promise<T | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) query.set(k, String(v))
  query.set('apikey', apiKey)
  try {
    const res = await fetch(`${BASE}${path}?${query.toString()}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(timeout),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data && typeof data === 'object' && !Array.isArray(data) && 'Error Message' in data) return null
    return data as T
  } catch {
    return null
  }
}

export async function fmpList<T = any>(
  path: string,
  params: Record<string, string | number> = {},
  options: { revalidate?: number; timeout?: number } = {}
): Promise<T[]> {
  const data = await fmp<T[]>(path, params, options)
  return Array.isArray(data) ? data : []
}

/** BRK.B → BRK-B, Kleinschreibung → Großschreibung */
export function normalizeSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase()
  return /^[A-Z]+\.[A-B]$/.test(upper) ? upper.replace('.', '-') : upper
}

export const SYMBOL_PATTERN = /^[A-Z0-9^=][A-Z0-9.\-=^]{0,14}$/

export function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

export function round(value: number | null | undefined, digits = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export function isoDaysAgo(days: number, now = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10)
}
