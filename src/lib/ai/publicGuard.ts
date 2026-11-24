// src/lib/ai/publicGuard.ts
// Bremse für KI-Routen, die ohne Anmeldung erreichbar bleiben müssen
// (öffentlicher Screener, öffentliche Aktienseite, App).
//
// Der Zähler lebt pro Serverinstanz und ist damit nur eine grobe Bremse. Der
// eigentliche Kostenschutz ist der Cache der Routen: je Ticker bzw. Suchtext
// wird höchstens einmal pro Zeitraum ein Modell aufgerufen.

const hits = new Map<string, { count: number; reset: number }>()
const MAX_KEYS = 5_000

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

/** true = Aufruf erlaubt */
export function allowPublicCall(scope: string, ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const key = `${scope}:${ip}`
  const entry = hits.get(key)
  if (!entry || entry.reset <= now) {
    if (hits.size > MAX_KEYS) hits.clear()
    hits.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export const TICKER_PATTERN = /^[A-Z0-9^][A-Z0-9.\-]{0,11}$/
