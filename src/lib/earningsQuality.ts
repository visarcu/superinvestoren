// src/lib/earningsQuality.ts
// Server-only: Wie viel vom Gewinn der letzten zwölf Monate stammt nicht aus dem
// laufenden Geschäft? Alphabet Q3 2026: 44 % des Vorsteuergewinns sind
// Bewertungsgewinne auf Beteiligungen, das KGV von 14,5 läge ohne sie bei rund 26.
//
// Gemeldet wird nur, was sich vom üblichen Bild der Firma abhebt. Wiederkehrende
// Beteiligungserträge (Prosus, Phillips 66) und jährliche Belastungen (AbbVie)
// gehören zum Geschäftsmodell. Getestet an 214 Firmen (S&P 100, DAX, Europa).

import { finite, fmp, fmpList } from '@/lib/ai/data/fmp'
import { classifyEarnings, type EarningsQuality, type IncomeRow } from '@/lib/earningsQualityRules'

export type { EarningsQuality } from '@/lib/earningsQualityRules'
export { adjustedPe, affectsPe, cleanPeFor, describeEarnings, isSolid } from '@/lib/earningsQualityRules'

async function incomeRows(symbol: string, period: 'quarter' | 'annual', limit: number): Promise<IncomeRow[] | null> {
  const rows = await fmp<any[]>(
    `/api/v3/income-statement/${encodeURIComponent(symbol)}`,
    { period, limit },
    { revalidate: period === 'quarter' ? 6 * 3600 : 24 * 3600 },
  )
  if (!Array.isArray(rows)) return null
  return rows.map((r): IncomeRow => ({
    date: String(r.date ?? ''),
    currency: r.reportedCurrency ?? 'USD',
    revenue: finite(r.revenue),
    operatingIncome: finite(r.operatingIncome),
    incomeBeforeTax: finite(r.incomeBeforeTax),
    incomeTax: finite(r.incomeTaxExpense),
    netIncome: finite(r.netIncome),
    interestIncome: finite(r.interestIncome),
    interestExpense: finite(r.interestExpense),
  }))
}

/** undefined = Anbieter nicht erreichbar, null = kein auffälliger Einfluss */
export async function loadEarningsQuality(symbol: string): Promise<EarningsQuality | null | undefined> {
  const rows = await incomeRows(symbol, 'quarter', 16)
  if (!rows) return undefined
  const quality = classifyEarnings(rows)
  if (!quality) return null
  const ratios = await fmpList<any>(`/api/v3/ratios-ttm/${encodeURIComponent(symbol)}`, {}, { revalidate: 3600 })
  const pe = finite(ratios[0]?.peRatioTTM) ?? finite(ratios[0]?.priceEarningsRatioTTM)
  return { ...quality, trailingPe: pe != null && pe > 0 ? pe : null }
}

/**
 * Dasselbe für ein Geschäftsjahr, erkannt am Nettogewinn: Die Zählung der
 * Geschäftsjahre weicht je nach Quelle ab, der Betrag nicht.
 */
export async function annualEarningsQuality(symbol: string, netIncome: number): Promise<EarningsQuality | null> {
  const rows = await incomeRows(symbol, 'annual', 5)
  const start = rows?.findIndex(r => r.netIncome != null && Math.abs(r.netIncome - netIncome) <= 0.02 * Math.abs(netIncome)) ?? -1
  return rows && start >= 0 && start <= 1 ? classifyEarnings(rows.slice(start)) : null
}

export async function earningsQuality(symbol: string): Promise<EarningsQuality | null> {
  return (await loadEarningsQuality(symbol)) ?? null
}
