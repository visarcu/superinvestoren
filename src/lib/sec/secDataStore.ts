// src/lib/sec/secDataStore.ts
// Persistenter Cache für SEC Financial Data in Supabase.
// Fetch → Store → Serve Pattern: Daten werden bei Bedarf von SEC geholt,
// in der DB gespeichert, und bei weiteren Requests aus der DB geliefert.

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSecFinancials, SecFinancialPeriod, SecFinancialResponse } from './secFinancialService'

// ─── Supabase Client ─────────────────────────────────────────────────────────

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('⚠️ [SecDataStore] Supabase nicht konfiguriert – nutze In-Memory Cache')
    return null
  }

  supabase = createClient(url, key)
  return supabase
}

// ─── DB Types ────────────────────────────────────────────────────────────────

interface SecFinancialRow {
  ticker: string
  cik: string | null
  entity_name: string | null
  period: string
  fiscal_year: number
  fiscal_period: string
  filed: string | null
  revenue: number | null
  net_income: number | null
  gross_profit: number | null
  operating_income: number | null
  cost_of_revenue: number | null
  eps: number | null
  eps_basic: number | null
  research_and_development: number | null
  selling_general_admin: number | null
  income_tax: number | null
  interest_expense: number | null
  depreciation: number | null
  total_assets: number | null
  total_liabilities: number | null
  shareholders_equity: number | null
  cash: number | null
  long_term_debt: number | null
  short_term_debt: number | null
  total_debt: number | null
  inventory: number | null
  accounts_receivable: number | null
  accounts_payable: number | null
  goodwill: number | null
  property_plant_equip: number | null
  shares_outstanding: number | null
  operating_cash_flow: number | null
  capex: number | null
  free_cash_flow: number | null
  dividend_per_share: number | null
  dividends_paid: number | null
  share_repurchase: number | null
  updated_at: string
}

// ─── Period → Row Mapping ────────────────────────────────────────────────────

function periodToRow(p: SecFinancialPeriod, ticker: string, cik: string, entityName: string): Partial<SecFinancialRow> {
  return {
    ticker,
    cik,
    entity_name: entityName,
    period: p.period,
    fiscal_year: p.fiscalYear,
    fiscal_period: p.fiscalPeriod,
    filed: p.filed || null,
    revenue: p.revenue,
    net_income: p.netIncome,
    gross_profit: p.grossProfit,
    operating_income: p.operatingIncome,
    cost_of_revenue: p.costOfRevenue,
    eps: p.eps,
    eps_basic: p.epsBasic,
    research_and_development: p.rd,
    selling_general_admin: p.sga,
    income_tax: p.incomeTax,
    interest_expense: p.interestExpense,
    depreciation: p.depreciation,
    total_assets: p.totalAssets,
    total_liabilities: p.totalLiabilities,
    shareholders_equity: p.shareholdersEquity,
    cash: p.cash,
    long_term_debt: p.longTermDebt,
    short_term_debt: p.shortTermDebt,
    total_debt: p.totalDebt,
    inventory: p.inventory,
    accounts_receivable: p.accountsReceivable,
    accounts_payable: p.accountsPayable,
    goodwill: p.goodwill,
    property_plant_equip: p.propertyPlantEquip,
    shares_outstanding: p.sharesOutstanding,
    operating_cash_flow: p.operatingCashFlow,
    capex: p.capex,
    free_cash_flow: p.freeCashFlow,
    dividend_per_share: p.dividendPerShare,
    dividends_paid: p.dividendsPaid,
    share_repurchase: p.shareRepurchase,
  }
}

function rowToPeriod(r: SecFinancialRow): SecFinancialPeriod {
  return {
    period: r.period,
    fiscalYear: r.fiscal_year,
    fiscalPeriod: r.fiscal_period,
    filed: r.filed || '',
    revenue: r.revenue,
    netIncome: r.net_income,
    grossProfit: r.gross_profit,
    operatingIncome: r.operating_income,
    costOfRevenue: r.cost_of_revenue,
    eps: r.eps,
    epsBasic: r.eps_basic,
    rd: r.research_and_development,
    sga: r.selling_general_admin,
    incomeTax: r.income_tax,
    interestExpense: r.interest_expense,
    depreciation: r.depreciation,
    totalAssets: r.total_assets,
    totalLiabilities: r.total_liabilities,
    shareholdersEquity: r.shareholders_equity,
    cash: r.cash,
    longTermDebt: r.long_term_debt,
    shortTermDebt: r.short_term_debt,
    totalDebt: r.total_debt,
    inventory: r.inventory,
    accountsReceivable: r.accounts_receivable,
    accountsPayable: r.accounts_payable,
    goodwill: r.goodwill,
    propertyPlantEquip: r.property_plant_equip,
    sharesOutstanding: r.shares_outstanding,
    operatingCashFlow: r.operating_cash_flow,
    capex: r.capex,
    freeCashFlow: r.free_cash_flow,
    dividendPerShare: r.dividend_per_share,
    dividendsPaid: r.dividends_paid,
    shareRepurchase: r.share_repurchase,
    source: 'sec-xbrl',
  }
}

// ─── Cache TTL ───────────────────────────────────────────────────────────────

const CACHE_TTL_HOURS = 24

function isFresh(updatedAt: string): boolean {
  const updated = new Date(updatedAt).getTime()
  const age = Date.now() - updated
  return age < CACHE_TTL_HOURS * 60 * 60 * 1000
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Holt Finanzdaten – erst aus DB, dann von SEC wenn nötig.
 * Speichert neue Daten automatisch in der DB.
 */
export async function getFinancialData(
  ticker: string,
  options: { years?: number; period?: 'annual' | 'quarterly' } = {}
): Promise<SecFinancialResponse> {
  const { years = 10, period = 'annual' } = options
  const db = getSupabase()

  // ── Schritt 0: DAX-eigene Daten prüfen ────────────────────────────────
  // Für deutsche/EU-Firmen prüfen wir ob es sich um eine DAX-Firma handelt.
  // Falls ja: nehmen wir unsere Daten (oder geben leere Response zurück ohne SEC-Fallback,
  // da DAX-Firmen typischerweise nicht bei der SEC filen).
  try {
    const { getDaxFinancials } = await import('@/lib/dax/daxFinancials')
    const daxResult = await getDaxFinancials(ticker, { years, period })
    if (daxResult.status === 'dax-with-data') {
      console.log(`🇩🇪 [DAX eigene Daten] ${ticker}: ${daxResult.response.periods.length} Perioden`)
      return daxResult.response
    }
    if (daxResult.status === 'dax-no-data') {
      console.log(`🇩🇪 [DAX ohne Daten] ${ticker}: noch nicht eingepflegt – KEIN SEC-Fallback (wäre 404)`)
      return daxResult.response
    }
    // status === 'not-dax' → weiter mit SEC-Pfad
  } catch (daxError) {
    console.warn(`⚠️ [DAX Lookup] ${ticker}: ${(daxError as Error).message}`)
  }

  // ── Schritt 1: DB prüfen ──────────────────────────────────────────────
  if (db) {
    try {
      const { data: rows, error } = await db
        .from('SecFinancialData')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .eq('fiscal_period', period === 'annual' ? 'FY' : 'Q1') // Prüfe ob wir Daten haben
        .order('fiscal_year', { ascending: false })
        .limit(1)

      if (!error && rows && rows.length > 0 && isFresh(rows[0].updated_at)) {
        // Daten sind frisch – aus DB laden
        const { data: allRows } = await db
          .from('SecFinancialData')
          .select('*')
          .eq('ticker', ticker.toUpperCase())
          .order('fiscal_year', { ascending: true })
          .limit(years)

        // Nur Cache nutzen wenn genug Perioden vorhanden (mind. 80% der angefragten Jahre)
        if (allRows && allRows.length >= Math.min(years * 0.8, years - 2)) {
          const periods = allRows.map(rowToPeriod)
          const latestRow = allRows[allRows.length - 1]

          console.log(`📦 [DB Cache] ${ticker}: ${periods.length} Perioden aus Supabase (${CACHE_TTL_HOURS}h Cache)`)

          return {
            ticker: ticker.toUpperCase(),
            entityName: latestRow.entity_name || ticker,
            cik: latestRow.cik || '',
            periods,
            availableMetrics: Object.keys(periods[0] || {}).filter(
              k => !['period', 'fiscalYear', 'fiscalPeriod', 'filed', 'source'].includes(k) &&
                periods.some(p => (p as any)[k] !== null)
            ),
            totalPeriodsAvailable: periods.length,
            source: 'sec-xbrl',
            fetchedAt: latestRow.updated_at,
          }
        }
      }
    } catch (dbError) {
      console.warn('⚠️ [DB Cache] Supabase read failed, fetching from SEC:', dbError)
    }
  }

  // ── Schritt 2: Von SEC XBRL fetchen ───────────────────────────────────
  console.log(`🌐 [SEC Fetch] ${ticker}: Lade von SEC XBRL API...`)
  const secData = await getSecFinancials(ticker, options)

  // ── Schritt 3: In DB speichern ────────────────────────────────────────
  if (db && secData.periods.length > 0) {
    try {
      const rows = secData.periods.map(p =>
        periodToRow(p, secData.ticker, secData.cik, secData.entityName)
      )

      // Einzeln upserten statt batch – robuster bei Fehlern
      let stored = 0
      for (const row of rows) {
        const { error: rowError } = await db
          .from('SecFinancialData')
          .upsert(
            { ...row, updated_at: new Date().toISOString() },
            { onConflict: 'ticker,period' }
          )
        if (rowError) {
          console.warn(`⚠️ [DB Store] ${ticker} ${row.period}: ${rowError.message} | ${rowError.details || ''} | ${rowError.hint || ''}`)
        } else {
          stored++
        }
      }

      if (stored > 0) {
        console.log(`💾 [DB Store] ${ticker}: ${stored}/${rows.length} Perioden in Supabase gespeichert`)
      }
    } catch (storeError) {
      console.warn('⚠️ [DB Store] Speichern fehlgeschlagen:', storeError)
    }
  }

  return secData
}
