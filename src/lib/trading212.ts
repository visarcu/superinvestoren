// src/lib/trading212.ts
// Trading-212-Public-API-Client (Beta) für den Broker-Sync. Nur serverseitig.
//
// Auth: HTTP Basic mit API-Key als Username und API-Secret als Passwort —
// beides erzeugt der Nutzer selbst in der T212-App (Einstellungen → API).
// Wir rufen ausschließlich Lese-Endpoints auf; Order-Endpoints werden
// bewusst NICHT implementiert.
//
// Docs: https://docs.trading212.com/api (v0). Werte in den Responses kommen
// in der primären Kontowährung (Multi-Currency wird von der API nicht
// unterstützt); Kurse je Position zusätzlich in Instrumentenwährung.
// Rate-Limits (pro Konto): account/summary 1/5s, positions 1/1s,
// history-Endpoints 6/min.

const BASE = process.env.T212_API_BASE || 'https://live.trading212.com'

export interface T212AccountSummary {
  id: number
  currency: string
  totalValue: number | null
  cash: {
    availableToTrade: number | null
    inPies: number | null
    reservedForOrders: number | null
  } | null
  investments: {
    currentValue: number | null
    totalCost: number | null
    realizedProfitLoss: number | null
    unrealizedProfitLoss: number | null
  } | null
}

export interface T212Position {
  instrument: {
    ticker: string
    isin: string | null
    name: string | null
    currency: string | null
  }
  quantity: number
  /** Ø-Kaufkurs je Anteil, in Instrumentenwährung */
  averagePricePaid: number | null
  /** Aktueller Kurs je Anteil, in Instrumentenwährung */
  currentPrice: number | null
  /** ISO-Datum der Positionseröffnung */
  createdAt: string | null
  /** Werte in Kontowährung */
  walletImpact: {
    currency: string | null
    currentValue: number | null
    totalCost: number | null
    unrealizedProfitLoss: number | null
    fxImpact: number | null
  } | null
}

export class T212ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function t212Request<T>(path: string, apiKey: string, apiSecret: string, body?: unknown, base = BASE): Promise<T> {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Basic ${credentials}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  })
  if (!res.ok) {
    // Body bewusst nicht loggen/weiterreichen — kann Kontodetails enthalten
    throw new T212ApiError(res.status, `Trading 212 API ${res.status} für ${path}`)
  }
  return res.json() as Promise<T>
}

/** Konto-Basisdaten inkl. Cash — dient auch als Key-Validierung (401 = Key falsch). */
export function getAccountSummary(apiKey: string, apiSecret: string): Promise<T212AccountSummary> {
  return t212Request<T212AccountSummary>('/api/v0/equity/account/summary', apiKey, apiSecret)
}

/** Gehört das Paar zum Übungskonto? Dessen Schlüssel gelten nur dort. */
export async function isPracticeKey(apiKey: string, apiSecret: string): Promise<boolean> {
  try {
    await t212Request<T212AccountSummary>('/api/v0/equity/account/summary', apiKey, apiSecret, undefined, 'https://demo.trading212.com')
    return true
  } catch (err) {
    // 403: Das Paar ist dort bekannt, ihm fehlt nur ein Recht
    return err instanceof T212ApiError && err.status === 403
  }
}

/** Alle offenen Positionen (inkl. ISIN je Instrument). */
export function listPositions(apiKey: string, apiSecret: string): Promise<T212Position[]> {
  return t212Request<T212Position[]>('/api/v0/equity/positions', apiKey, apiSecret)
}

export interface T212Report {
  reportId: number
  status: 'Queued' | 'Processing' | 'Running' | 'Canceled' | 'Failed' | 'Finished'
  timeFrom: string
  timeTo: string
  downloadLink: string | null
}

/**
 * Kontoverlauf als CSV anfordern, derselbe Bericht wie in der App unter
 * Chronik → Export. Höchstens eine Anfrage je 30 Sekunden.
 */
export async function requestReport(apiKey: string, apiSecret: string, from: Date, to: Date): Promise<number> {
  const { reportId } = await t212Request<{ reportId: number }>('/api/v0/equity/history/exports', apiKey, apiSecret, {
    dataIncluded: { includeDividends: true, includeInterest: true, includeOrders: true, includeTransactions: true },
    timeFrom: from.toISOString(),
    timeTo: to.toISOString(),
  })
  return reportId
}

/** Angeforderte Berichte mit Stand und Downloadlink. Höchstens eine Anfrage je Minute. */
export function listReports(apiKey: string, apiSecret: string): Promise<T212Report[]> {
  return t212Request<T212Report[]>('/api/v0/equity/history/exports', apiKey, apiSecret)
}

const MAX_REPORT_BYTES = 20_000_000

/** Lädt einen fertigen Bericht. Der Link ist signiert, die Zugangsdaten gehen nicht mit. */
export async function downloadReport(link: string): Promise<string> {
  const url = new URL(link)
  if (url.protocol !== 'https:' && !process.env.T212_API_BASE) throw new Error('Unerwarteter Downloadlink')
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' })
  if (!res.ok) throw new T212ApiError(res.status, `Trading-212-Bericht ${res.status}`)
  const text = await res.text()
  if (text.length > MAX_REPORT_BYTES) throw new Error('Trading-212-Bericht zu groß')
  return text.replace(/^\uFEFF/, '')
}

/**
 * Guthaben des Kontos samt Geld, das gerade gebunden ist (offene Orders,
 * vorgemerkte Kartenzahlungen). Der Wert der Anlagen enthält bei Trading 212
 * auch das freie Geld in Pies, deshalb kommt es wieder dazu. Geprüft am
 * 24.11.2026: 5.088,20 − 5.062,10 + 3,34 = 29,44 €, laut Verlauf 29,44 €.
 */
export function accountCash(summary: T212AccountSummary): number {
  const pies = summary.cash?.inPies || 0
  const current = summary.investments?.currentValue
  const cash = summary.totalValue != null && current != null
    ? summary.totalValue - current + pies
    : (summary.cash?.availableToTrade || 0) + (summary.cash?.reservedForOrders || 0) + pies
  return Math.round(cash * 100) / 100
}
