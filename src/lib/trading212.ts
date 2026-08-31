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

async function t212Request<T>(path: string, apiKey: string, apiSecret: string): Promise<T> {
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${credentials}` },
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

/** Alle offenen Positionen (inkl. ISIN je Instrument). */
export function listPositions(apiKey: string, apiSecret: string): Promise<T212Position[]> {
  return t212Request<T212Position[]>('/api/v0/equity/positions', apiKey, apiSecret)
}

/** Freies Cash gesamt (verfügbar + für Orders reserviert + unverplantes Pie-Cash). */
export function totalFreeCash(summary: T212AccountSummary): number {
  const c = summary.cash
  if (!c) return 0
  return (c.availableToTrade || 0) + (c.reservedForOrders || 0) + (c.inPies || 0)
}
