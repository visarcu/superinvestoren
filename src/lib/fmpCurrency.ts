// Währungsumrechnung für FMP-Finanzdaten.
//
// FMP liefert Bilanzen, Schätzungen und Segmente in der Berichtswährung der
// Firma, Kurs und Marktkapitalisierung aber in der Handelswährung. Bei ADRs wie
// TSM (TWD), BABA (CNY), ASML (EUR) oder NVO (DKK) stehen sonst TWD-Beträge mit
// "$" in den Charts, und Kurs / EPS ergibt Unsinn wie ein Forward-KGV von 0,5.
//
// Umgerechnet wird zum aktuellen Devisenkurs. Das hält die Wachstumsraten in
// Heimatwährung unverändert (konstante Währung) und macht die Zahlen mit dem
// Kurs vergleichbar.

const FMP = 'https://financialmodelingprep.com/api/v3'

export interface ReportingCurrencyInfo {
  /** Berichtswährung, z. B. TWD (null = unbekannt) */
  reportedCurrency: string | null
  /** Handelswährung des Kurses als ISO-Code, z. B. USD oder GBP (null = unbekannt) */
  tradingCurrency: string | null
  /** Faktor Berichts- → Handelswährung; 1 bei gleicher Währung, null wenn kein FX-Kurs */
  fxToTrading: number | null
  /**
   * Faktor FMP-Kurs → Handelswährung. Londoner Aktien notieren bei FMP in
   * Pence ("GBp"): Kurs 5040 sind 50,40 GBP, also 0.01. Sonst 1. Optional,
   * damit Aufrufer mit eigenem Fallback-Objekt (fehlende Daten) unverändert
   * bleiben; fehlt das Feld, gilt 1.
   */
  quoteToTradingFactor?: number
}

/**
 * FMP kennzeichnet Pence-Notierungen mit "GBp" (teils "GBX"). Devisenkurse
 * gibt es nur für GBP; ohne diese Normalisierung scheiterte jede Umrechnung
 * für .L-Titel an einem Paar "EURGBp" und die Route lieferte 502.
 */
export function normalizeQuoteCurrency(code: string | null | undefined): { currency: string | null; factor: number } {
  if (!code) return { currency: null, factor: 1 }
  const trimmed = code.trim()
  if (trimmed === 'GBp' || trimmed.toUpperCase() === 'GBX') return { currency: 'GBP', factor: 0.01 }
  return { currency: trimmed.toUpperCase(), factor: 1 }
}

async function fmpJson(path: string, apiKey: string): Promise<any> {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${FMP}${path}${sep}apikey=${apiKey}`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`FMP ${path.split('?')[0]} responded with status ${res.status}`)
  return res.json()
}

async function quotePrice(symbol: string, apiKey: string): Promise<number | null> {
  try {
    const data = await fmpJson(`/quote/${symbol}`, apiKey)
    const price = Array.isArray(data) ? data[0]?.price : null
    return typeof price === 'number' && price > 0 ? price : null
  } catch {
    return null
  }
}

export async function getFxRate(from: string, to: string, apiKey: string): Promise<number | null> {
  if (from === to) return 1
  const direct = await quotePrice(`${from}${to}`, apiKey)
  if (direct != null) return direct
  const inverse = await quotePrice(`${to}${from}`, apiKey)
  return inverse != null ? 1 / inverse : null
}

export async function getReportingCurrencyInfo(ticker: string, apiKey: string): Promise<ReportingCurrencyInfo> {
  const [profile, income] = await Promise.all([
    fmpJson(`/profile/${ticker}`, apiKey).catch(() => []),
    fmpJson(`/income-statement/${ticker}?limit=1`, apiKey).catch(() => []),
  ])
  const { currency: tradingCurrency, factor: quoteToTradingFactor } = normalizeQuoteCurrency(profile?.[0]?.currency)
  const reportedCurrency: string | null = income?.[0]?.reportedCurrency || null

  if (!tradingCurrency || !reportedCurrency) {
    return { reportedCurrency, tradingCurrency, fxToTrading: null, quoteToTradingFactor }
  }
  return {
    reportedCurrency,
    tradingCurrency,
    fxToTrading: await getFxRate(reportedCurrency, tradingCurrency, apiKey),
    quoteToTradingFactor,
  }
}

/** true, wenn Berichts- und Handelswährung bekannt sind und sich unterscheiden */
export function isForeignReporting(info: ReportingCurrencyInfo): boolean {
  return !!(info.reportedCurrency && info.tradingCurrency && info.reportedCurrency !== info.tradingCurrency)
}

// In Income-, Balance- und Cashflow-Statements ist jede Zahl ein Geldbetrag
// außer Quoten (grossProfitRatio, ebitdaratio …) und Aktienzahlen.
const STATEMENT_NON_MONETARY = /ratio|shsout|shares/i

/** Rechnet alle Geldbeträge einer FMP-Statement-Zeile um (inkl. EPS). */
export function convertStatementRow<T extends Record<string, any>>(row: T, fx: number, toCurrency: string): T {
  const out: Record<string, any> = { ...row }
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'number' && !STATEMENT_NON_MONETARY.test(key)) {
      out[key] = value * fx
    }
  }
  if ('reportedCurrency' in row) {
    out.convertedFrom = row.reportedCurrency
    out.reportedCurrency = toCurrency
  }
  return out as T
}

// Key Metrics mischen Geldbeträge mit Quoten, Renditen und Tagen. Deshalb hier
// eine Positivliste statt eines Ausschlussmusters.
const KEY_METRIC_MONETARY = new Set([
  'marketCap', 'enterpriseValue', 'workingCapital', 'tangibleAssetValue',
  'netCurrentAssetValue', 'investedCapital', 'averageReceivables',
  'averagePayables', 'averageInventory', 'grahamNumber', 'grahamNetNet',
])

/** Rechnet die Geldbeträge einer FMP-Key-Metrics-Zeile um; Quoten bleiben. */
export function convertKeyMetricsRow<T extends Record<string, any>>(row: T, fx: number): T {
  const out: Record<string, any> = { ...row }
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'number' && (KEY_METRIC_MONETARY.has(key) || key.endsWith('PerShare'))) {
      out[key] = value * fx
    }
  }
  return out as T
}
