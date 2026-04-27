// Liest Earnings aus der earningsCalendar-Tabelle, die täglich vom Cron
// /api/cron/sync-earnings befüllt wird. Damit vermeiden wir, dass alle
// UI- und Notification-Routes redundant /v3/earning_calendar bei FMP
// hitten — die Tabelle hält die nächsten ~60 Tage vor.
//
// Routes sollten die DB-Variante bevorzugen und FMP nur als Fallback
// nutzen, falls die Tabelle für den angefragten Zeitraum leer ist
// (z.B. wenn der Cron noch nicht gelaufen ist).

import { prisma } from './prisma'

export interface EarningsRecord {
  symbol: string
  companyName: string | null
  date: string // ISO YYYY-MM-DD
  time: string // 'bmo' | 'amc' | 'dmh'
  fiscalQuarter: number | null
  fiscalYear: number | null
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
}

/**
 * Liest Earnings aus der earningsCalendar-Tabelle.
 *
 * @param from ISO YYYY-MM-DD (inklusive)
 * @param to   ISO YYYY-MM-DD (inklusive)
 * @param tickers optional — falls gesetzt, nur diese Symbole zurückgeben
 */
export async function getEarningsFromDb(
  from: string,
  to: string,
  tickers?: string[]
): Promise<EarningsRecord[]> {
  const fromDate = new Date(from + 'T00:00:00.000Z')
  const toDate = new Date(to + 'T23:59:59.999Z')

  const rows = await prisma.earningsCalendar.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      ...(tickers && tickers.length > 0 ? { symbol: { in: tickers } } : {}),
    },
    orderBy: { date: 'asc' },
  })

  return rows.map(r => ({
    symbol: r.symbol,
    companyName: r.companyName,
    date: r.date.toISOString().split('T')[0],
    time: r.time,
    fiscalQuarter: r.fiscalQuarter,
    fiscalYear: r.fiscalYear,
    epsEstimate: r.epsEstimate,
    epsActual: r.epsActual,
    revenueEstimate: r.revenueEstimate,
    revenueActual: r.revenueActual,
  }))
}

/**
 * Konvertiert DB-Records ins Format, das die FMP /v3/earning_calendar API liefert.
 * Damit können bestehende Routes ohne große Umbauten von FMP auf DB switchen.
 */
export function toFmpShape(records: EarningsRecord[]): Array<{
  symbol: string
  date: string
  time: string
  epsEstimated: number | null
  epsActual: number | null
  revenueEstimated: number | null
  revenueActual: number | null
  name?: string | null
}> {
  return records.map(r => ({
    symbol: r.symbol,
    date: r.date,
    time: r.time,
    epsEstimated: r.epsEstimate,
    epsActual: r.epsActual,
    revenueEstimated: r.revenueEstimate,
    revenueActual: r.revenueActual,
    name: r.companyName,
  }))
}
