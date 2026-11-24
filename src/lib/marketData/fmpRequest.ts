// src/lib/marketData/fmpRequest.ts
// FMP-Abruf, der "gerade gestört" von "kennt das Papier nicht" unterscheidet.
//
// Ist das Minutenlimit erschöpft, antwortet FMP mit 429 "Limit Reach". Wer das
// wie eine leere Kursreihe behandelt, rechnet ohne Kurs oder Wechselkurs weiter
// (Dollarpositionen im Juli 2026 mit 0,92 statt 0,8755 €).

const TIMEOUT_MS = 10_000
const RETRY_DELAY_MS = 1000
// Hält das Limit an, wird eine Weile nicht mehr gewartet: Ein Depot mit vielen
// Papieren bräuchte sonst bei jeder Zehnergruppe eine Pause, zusammen 20 Sekunden.
const RETRY_PAUSE_MS = 10_000
let retryPausedUntil = 0

/** Störung der Quelle, im Unterschied zu "kennt das Papier nicht" (403, 404) */
export const isOutage = (status: number) => status === 429 || status >= 500

export interface FmpResult {
  /** null bei jedem Fehler */
  data: any
  outage: boolean
}

async function request(url: string, init: RequestInit): Promise<FmpResult & { retry: boolean }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const body = await res.json().catch(() => null)
    // Das Limit meldet FMP auch als gewöhnliche Antwort mit Fehlertext
    const limited = /limit reach/i.test(String(body?.['Error Message'] ?? ''))
    if (limited || isOutage(res.status)) return { data: null, outage: true, retry: true }
    if (res.ok && body === null) return { data: null, outage: true, retry: false }
    return { data: res.ok ? body : null, outage: false, retry: false }
  } catch {
    // Zeitüberschreitung: nicht noch einmal so lange warten
    return { data: null, outage: true, retry: false }
  }
}

/** JSON-Antwort von FMP. Bei Abruflimit oder Serverfehler ein zweiter Versuch nach kurzer Pause. */
export async function fetchFmpJson(url: string): Promise<FmpResult> {
  let result = await request(url, { next: { revalidate: 1800 } })
  if (result.retry && Date.now() >= retryPausedUntil) {
    // Versetzt, damit gleichzeitige Abrufe nicht wieder gemeinsam ans Limit stoßen
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS + Math.random() * 500))
    // Am Zwischenspeicher vorbei: Ein Fehlertext mit Status 200 läge dort sonst weiter
    result = await request(url, { cache: 'no-store' })
    if (result.retry) retryPausedUntil = Date.now() + RETRY_PAUSE_MS
  }
  return { data: result.data, outage: result.outage }
}
