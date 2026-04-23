// src/lib/dax/daxFinancials.ts
// Integration-Layer: liefert manuell gepflegte DAX-Finanzdaten im gleichen Format
// wie secDataStore's getFinancialData, damit die bestehenden Stock-Pages transparent
// zwischen SEC-Daten und eigenen DAX-Daten umschalten können.

import { prisma } from '@/lib/prisma'
import type { SecFinancialResponse, SecFinancialPeriod } from '@/lib/sec/secFinancialService'

/**
 * Versucht einen Ticker auf einen DAX-Company-Eintrag aufzulösen.
 * Probiert mehrere Strategien:
 *   1. Exakter Match (z.B. "BMW.DE")
 *   2. Mit ".DE" Suffix (z.B. "BMW" → "BMW.DE")
 *   3. Via tickerUS-Feld (z.B. "SAP" → SAP.DE weil tickerUS=SAP)
 */
export async function resolveDaxCompany(rawTicker: string) {
  const t = rawTicker.toUpperCase().trim()

  // 1. Exakter Match
  const exact = await prisma.daxCompany.findUnique({ where: { ticker: t } })
  if (exact) return exact

  // 2. Mit .DE Suffix
  if (!t.endsWith('.DE')) {
    const withSuffix = await prisma.daxCompany.findUnique({
      where: { ticker: `${t}.DE` },
    })
    if (withSuffix) return withSuffix
  }

  // 3. Via tickerUS
  const viaUS = await prisma.daxCompany.findFirst({ where: { tickerUS: t } })
  if (viaUS) return viaUS

  return null
}

/**
 * Mapped eine FinancialStatement (unser Schema, in Mio) auf das SecFinancialPeriod-Format
 * das die Stock-Pages erwarten. Achtung: wir speichern in Mio, SEC liefert absolute Zahlen.
 */
function statementToPeriod(s: any): SecFinancialPeriod {
  // In Mio → absolute (multipliziert mit 1.000.000)
  const m = (v: number | null | undefined) => (v == null ? null : v * 1_000_000)

  // Total Debt ableiten wenn nicht explizit gesetzt
  const totalDebt =
    s.totalDebt ??
    (s.longTermDebt != null || s.shortTermDebt != null
      ? (s.longTermDebt ?? 0) + (s.shortTermDebt ?? 0)
      : null)

  // Free Cash Flow ableiten
  const freeCashFlow =
    s.freeCashFlow ??
    (s.operatingCashFlow != null && s.capex != null
      ? s.operatingCashFlow - s.capex
      : null)

  return {
    period: `${s.fiscalPeriod}-${s.fiscalYear}`,
    fiscalYear: s.fiscalYear,
    fiscalPeriod: s.fiscalPeriod,
    filed: s.reportDate ? new Date(s.reportDate).toISOString().slice(0, 10) : '',
    // Income Statement
    revenue: m(s.revenue),
    netIncome: m(s.netIncome),
    grossProfit: m(s.grossProfit),
    operatingIncome: m(s.operatingIncome),
    costOfRevenue: m(s.costOfRevenue),
    eps: s.eps ?? null,          // EPS bleibt unskaliert (pro Aktie)
    epsBasic: s.eps ?? null,
    rd: m(s.rAndD),
    sga: m(s.sgA),
    incomeTax: m(s.incomeTax),
    interestExpense: m(s.interestExpense),
    depreciation: null,
    // Balance Sheet
    totalAssets: m(s.totalAssets),
    totalLiabilities: m(s.totalLiabilities),
    shareholdersEquity: m(s.shareholdersEquity),
    cash: m(s.cashAndEquivalents),
    longTermDebt: m(s.longTermDebt),
    shortTermDebt: m(s.shortTermDebt),
    totalDebt: m(totalDebt),
    inventory: m(s.inventory),
    accountsReceivable: m(s.receivables),
    accountsPayable: null,
    goodwill: m(s.goodwill),
    propertyPlantEquip: m(s.ppE),
    sharesOutstanding: s.sharesOutstanding ?? null,
    // Cash Flow
    operatingCashFlow: m(s.operatingCashFlow),
    capex: m(s.capex),
    freeCashFlow: m(freeCashFlow),
    dividendPerShare: null,
    dividendsPaid: m(s.dividendsPaid),
    shareRepurchase: m(s.shareRepurchases),
    // Meta — Quelle: eigene manuelle Daten aus ESEF-Filing
    source: 'finclue-manual',
  }
}

export type DaxFinancialsResult =
  | { status: 'not-dax' }
  | { status: 'dax-no-data'; response: SecFinancialResponse }
  | { status: 'dax-with-data'; response: SecFinancialResponse }

/**
 * Holt DAX-Daten wenn verfügbar.
 *  - 'not-dax'         → Ticker ist keine DAX-Firma → weiter mit SEC/FMP-Fallback
 *  - 'dax-no-data'     → DAX-Firma erkannt aber noch nichts eingepflegt → kein SEC-Fallback!
 *                        Wir geben leere Response zurück damit UI "noch nicht verfügbar" anzeigen kann.
 *  - 'dax-with-data'   → Eigene Daten gefunden → nehmen
 */
export async function getDaxFinancials(
  rawTicker: string,
  options: { years?: number; period?: 'annual' | 'quarterly' } = {}
): Promise<DaxFinancialsResult> {
  const company = await resolveDaxCompany(rawTicker)
  if (!company) return { status: 'not-dax' }

  const fiscalPeriodFilter =
    options.period === 'quarterly'
      ? { in: ['Q1', 'Q2', 'Q3', 'Q4', 'H1', '9M'] }
      : 'FY'

  const statements = await prisma.financialStatement.findMany({
    where: {
      ticker: company.ticker,
      fiscalPeriod: fiscalPeriodFilter as any,
    },
    orderBy: [{ fiscalYear: 'asc' }, { periodEnd: 'asc' }],
    take: options.years ?? 10,
  })

  // DAX-Firma ohne eigene Daten → leere Response mit Hinweis
  if (statements.length === 0) {
    return {
      status: 'dax-no-data',
      response: {
        ticker: company.ticker,
        entityName: company.name,
        cik: '',
        periods: [],
        availableMetrics: [],
        totalPeriodsAvailable: 0,
        source: 'no-data',
        fetchedAt: new Date().toISOString(),
        notice: `Finanzdaten für ${company.nameShort ?? company.name} werden gerade manuell eingepflegt. Erste Daten folgen in Kürze.`,
      },
    }
  }

  const periods = statements.map(statementToPeriod)

  return {
    status: 'dax-with-data',
    response: {
      ticker: company.ticker,
      entityName: company.name,
      cik: '',
      periods,
      availableMetrics: Object.keys(periods[0] || {}).filter(
        k =>
          !['period', 'fiscalYear', 'fiscalPeriod', 'filed', 'source'].includes(k) &&
          periods.some(p => (p as any)[k] !== null)
      ),
      totalPeriodsAvailable: periods.length,
      source: 'finclue-manual',
      fetchedAt: statements[statements.length - 1].updatedAt.toISOString(),
      notice: `Eigene Daten, direkt aus dem ESEF-Jahresfinanzbericht von ${company.nameShort ?? company.name}.`,
    },
  }
}
