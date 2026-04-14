// src/lib/sec/secFinancialService.ts
// SEC XBRL Financial Data Service
// Holt standardisierte Finanzdaten direkt von der SEC XBRL API.
// Komplett unabhängig von FMP – eigener, sauberer Datenservice.

import { getCIK, getXbrlUrl } from './cikMapping'

// ─── XBRL Concept Mapping ────────────────────────────────────────────────────
// Mapped standardisierte US-GAAP XBRL-Tags auf lesbare Feldnamen.
// Manche Konzepte haben sich über die Jahre geändert – Fallbacks sind definiert.

const XBRL_CONCEPTS: Record<string, { primary: string; fallbacks?: string[] }> = {
  revenue:            { primary: 'Revenues', fallbacks: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'SalesRevenueGoodsNet'] },
  netIncome:          { primary: 'NetIncomeLoss' },
  grossProfit:        { primary: 'GrossProfit' },
  operatingIncome:    { primary: 'OperatingIncomeLoss', fallbacks: ['OperatingIncomeLossFromContinuingOperations'] },
  costOfRevenue:      { primary: 'CostOfGoodsAndServicesSold', fallbacks: ['CostOfRevenue', 'CostOfGoodsSold', 'ProductionAndDistributionCosts'] },
  eps:                { primary: 'EarningsPerShareDiluted' },
  epsBasic:           { primary: 'EarningsPerShareBasic' },
  totalAssets:        { primary: 'Assets' },
  totalLiabilities:   { primary: 'Liabilities' },
  shareholdersEquity: { primary: 'StockholdersEquity', fallbacks: ['StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'] },
  cash:               { primary: 'CashAndCashEquivalentsAtCarryingValue', fallbacks: ['CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'] },
  longTermDebt:       { primary: 'LongTermDebtNoncurrent', fallbacks: ['LongTermDebt'] },
  shortTermDebt:      { primary: 'LongTermDebtCurrent' },
  totalDebt:          { primary: 'LongTermDebt', fallbacks: ['DebtInstrumentCarryingAmount'] },
  operatingCashFlow:  { primary: 'NetCashProvidedByUsedInOperatingActivities', fallbacks: ['NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'] },
  capex:              { primary: 'PaymentsToAcquirePropertyPlantAndEquipment', fallbacks: ['PaymentsToAcquireProductiveAssets', 'CapitalExpenditures'] },
  dividendPerShare:   { primary: 'CommonStockDividendsPerShareDeclared', fallbacks: ['CommonStockDividendsPerShareCashPaid'] },
  sharesOutstanding:  { primary: 'CommonStockSharesOutstanding', fallbacks: ['WeightedAverageNumberOfDilutedSharesOutstanding'] },
  rd:                 { primary: 'ResearchAndDevelopmentExpense', fallbacks: ['ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost', 'TechnologyAndDevelopmentExpense'] },
  sga:                { primary: 'SellingGeneralAndAdministrativeExpense', fallbacks: ['GeneralAndAdministrativeExpense'] },
  depreciation:       { primary: 'DepreciationDepletionAndAmortization', fallbacks: ['DepreciationAndAmortization', 'Depreciation'] },
  dividendsPaid:      { primary: 'PaymentsOfDividends', fallbacks: ['PaymentsOfDividendsCommonStock'] },
  shareRepurchase:    { primary: 'PaymentsForRepurchaseOfCommonStock', fallbacks: ['StockRepurchasedAndRetiredDuringPeriodValue'] },
  incomeTax:          { primary: 'IncomeTaxExpenseBenefit' },
  interestExpense:    { primary: 'InterestExpense', fallbacks: ['InterestExpenseDebt'] },
  ebit:               { primary: 'OperatingIncomeLoss' }, // EBIT ≈ Operating Income in XBRL
  inventory:          { primary: 'InventoryNet', fallbacks: ['InventoryFinishedGoods'] },
  accountsReceivable: { primary: 'AccountsReceivableNetCurrent' },
  accountsPayable:    { primary: 'AccountsPayableCurrent' },
  goodwill:           { primary: 'Goodwill' },
  propertyPlantEquip: { primary: 'PropertyPlantAndEquipmentNet' },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface XbrlFactEntry {
  val: number
  accn: string
  fy: number
  fp: string       // 'FY', 'Q1', 'Q2', 'Q3', 'Q4'
  form: string     // '10-K', '10-Q'
  filed: string    // '2024-10-31'
  frame?: string   // 'CY2024Q3I', 'CY2024'
  start?: string
  end?: string
}

interface XbrlCompanyFacts {
  cik: number
  entityName: string
  facts: {
    'us-gaap'?: Record<string, {
      label: string
      description?: string
      units: Record<string, XbrlFactEntry[]>
    }>
    'ifrs-full'?: Record<string, {
      label: string
      description?: string
      units: Record<string, XbrlFactEntry[]>
    }>
    dei?: Record<string, any>
  }
}

export interface SecFinancialPeriod {
  period: string          // "2024" oder "Q3 2024"
  fiscalYear: number
  fiscalPeriod: string    // "FY", "Q1", "Q2", "Q3"
  filed: string           // Wann bei SEC eingereicht
  // Income Statement
  revenue: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  costOfRevenue: number | null
  eps: number | null
  epsBasic: number | null
  rd: number | null
  sga: number | null
  incomeTax: number | null
  interestExpense: number | null
  depreciation: number | null
  // Balance Sheet
  totalAssets: number | null
  totalLiabilities: number | null
  shareholdersEquity: number | null
  cash: number | null
  longTermDebt: number | null
  shortTermDebt: number | null
  totalDebt: number | null
  inventory: number | null
  accountsReceivable: number | null
  accountsPayable: number | null
  goodwill: number | null
  propertyPlantEquip: number | null
  sharesOutstanding: number | null
  // Cash Flow
  operatingCashFlow: number | null
  capex: number | null
  freeCashFlow: number | null    // Berechnet: operatingCashFlow - capex
  dividendPerShare: number | null
  dividendsPaid: number | null
  shareRepurchase: number | null
  // Meta
  source: 'sec-xbrl'
}

export interface SecFinancialResponse {
  ticker: string
  entityName: string
  cik: string
  periods: SecFinancialPeriod[]
  availableMetrics: string[]
  totalPeriodsAvailable: number
  source: 'sec-xbrl'
  fetchedAt: string
}

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: XbrlCompanyFacts
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60 * 60 * 1000 // 1 Stunde

function getCached(cik: string): XbrlCompanyFacts | null {
  const entry = cache.get(cik)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(cik)
    return null
  }
  return entry.data
}

// ─── Core Functions ──────────────────────────────────────────────────────────

async function fetchCompanyFacts(cik: string): Promise<XbrlCompanyFacts> {
  const cached = getCached(cik)
  if (cached) return cached

  const url = getXbrlUrl(cik)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })

  if (!res.ok) {
    throw new Error(`SEC XBRL API failed: ${res.status} for CIK ${cik}`)
  }

  const data: XbrlCompanyFacts = await res.json()

  cache.set(cik, { data, timestamp: Date.now() })
  return data
}

/**
 * Extrahiert Werte für ein XBRL-Konzept aus den CompanyFacts.
 *
 * WICHTIG: Jede 10-K enthält Vergleichsdaten der Vorjahre!
 * MSFT's FY2025 10-K hat z.B. 3 Revenue-Einträge: CY2023, CY2024, CY2025.
 * Deshalb nutzen wir das `end`-Datum als Period-Key, NICHT `fy`.
 * Bei mehreren Einträgen für die gleiche Periode gewinnt der neueste Filing.
 */
function extractConcept(
  facts: XbrlCompanyFacts,
  conceptKey: string,
  formFilter: 'annual' | 'quarterly' | 'both'
): Map<string, XbrlFactEntry> {
  // 10-K = US-Unternehmen Annual, 20-F = Foreign Private Issuers Annual
  const annualForms = ['10-K', '20-F']
  const quarterlyForms = ['10-Q', '6-K']
  const conceptDef = XBRL_CONCEPTS[conceptKey]
  if (!conceptDef) return new Map()

  const gaap = facts.facts['us-gaap']
  const ifrs = facts.facts['ifrs-full']

  // IFRS-Mapping: Gleiche Feldnamen, andere XBRL-Tags
  const IFRS_MAP: Record<string, string[]> = {
    revenue: ['Revenue', 'RevenueFromContractsWithCustomers'],
    netIncome: ['ProfitLoss', 'ProfitLossAttributableToOwnersOfParent'],
    grossProfit: ['GrossProfit'],
    operatingIncome: ['ProfitLossFromOperatingActivities'],
    costOfRevenue: ['CostOfSales'],
    eps: ['BasicEarningsLossPerShare'],
    epsBasic: ['BasicEarningsLossPerShare'],
    totalAssets: ['Assets'],
    totalLiabilities: ['Liabilities'],
    shareholdersEquity: ['Equity', 'EquityAttributableToOwnersOfParent'],
    cash: ['CashAndCashEquivalents'],
    longTermDebt: ['NoncurrentFinancialLiabilities', 'NoncurrentLiabilities'],
    shortTermDebt: ['CurrentFinancialLiabilities', 'CurrentLiabilities'],
    operatingCashFlow: ['CashFlowsFromUsedInOperatingActivities'],
    capex: ['PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],
    dividendsPaid: ['DividendsPaid', 'DividendsPaidClassifiedAsFinancingActivities'],
    dividendPerShare: ['DividendsPaidOrdinarySharesPerShare'],
    rd: ['ResearchAndDevelopmentExpense'],
    sga: ['SellingGeneralAndAdministrativeExpense'],
    incomeTax: ['IncomeTaxExpenseContinuingOperations', 'IncomeTaxExpense'],
    interestExpense: ['FinanceCosts', 'InterestExpense'],
    goodwill: ['Goodwill'],
    propertyPlantEquip: ['PropertyPlantAndEquipment'],
    accountsReceivable: ['TradeAndOtherCurrentReceivables'],
    accountsPayable: ['TradeAndOtherCurrentPayables'],
    inventory: ['Inventories'],
    depreciation: ['DepreciationAndAmortisationExpense'],
    shareRepurchase: ['PurchaseOfTreasuryShares'],
  }

  // Bestimme welche Taxonomie(n) vorhanden sind
  const taxonomies: { source: Record<string, any>; conceptNames: string[] }[] = []

  if (gaap && Object.keys(gaap).length > 0) {
    const conceptNames = [conceptDef.primary, ...(conceptDef.fallbacks || [])]
    taxonomies.push({ source: gaap, conceptNames })
  }

  if (ifrs && Object.keys(ifrs).length > 0) {
    const ifrsNames = IFRS_MAP[conceptKey]
    if (ifrsNames) {
      taxonomies.push({ source: ifrs, conceptNames: ifrsNames })
    }
  }

  if (taxonomies.length === 0) return new Map()

  // Legacy: nur für den Fall dass es weder GAAP noch IFRS Matches gibt
  const conceptNames = taxonomies[0].conceptNames
  const results = new Map<string, XbrlFactEntry>()

  // Sammle Einträge von ALLEN Konzepten, nimm das mit der besten Abdeckung.
  // Grund: Manche Unternehmen wechseln XBRL-Tags (z.B. Mastercard: "Revenues"
  // hat 17 Jahre, "RevenueFromContractWithCustomer..." nur 4 Jahre).
  const candidateMaps: Map<string, XbrlFactEntry>[] = []

  for (const taxonomy of taxonomies) {
  for (const conceptName of taxonomy.conceptNames) {
    const concept = taxonomy.source[conceptName]
    if (!concept) continue

    const conceptResults = new Map<string, XbrlFactEntry>()

    for (const [, entries] of Object.entries(concept.units) as [string, XbrlFactEntry[]][]) {
      for (const entry of entries) {
        if (formFilter === 'annual' && !annualForms.includes(entry.form)) continue
        if (formFilter === 'quarterly' && !quarterlyForms.includes(entry.form)) continue
        if (formFilter === 'both' && ![...annualForms, ...quarterlyForms].includes(entry.form)) continue

        if (formFilter === 'annual' && entry.fp !== 'FY') continue
        if (formFilter === 'quarterly' && !['Q1', 'Q2', 'Q3'].includes(entry.fp)) continue

        const endDate = entry.end
        if (!endDate) continue

        // Full-Year Filter: nur Einträge ≥300 Tage (filtert Quartals-Breakdowns)
        if (formFilter === 'annual' && entry.start) {
          const days = (new Date(endDate).getTime() - new Date(entry.start).getTime()) / 86400000
          if (days < 300) continue
        }

        const endYear = endDate.slice(0, 4)
        const key = formFilter === 'annual'
          ? `${endYear}-FY`
          : `${endYear}-${entry.fp}`

        const existing = conceptResults.get(key)
        if (!existing || entry.filed > existing.filed) {
          conceptResults.set(key, entry)
        }
      }
    }

    if (conceptResults.size > 0) {
      candidateMaps.push(conceptResults)
    }
  } // end conceptName loop
  } // end taxonomy loop

  // Wähle das Konzept mit der besten Abdeckung, fülle Lücken aus den anderen.
  // Grund: Mastercard hat 2007-2014 unter "Revenues", 2015-2016 unter
  // "SalesRevenueNet", 2017-2025 wieder unter "Revenues". Nur mergen
  // liefert die volle Historie.
  if (candidateMaps.length === 0) return results

  // Sortiere: meiste Perioden zuerst
  candidateMaps.sort((a, b) => b.size - a.size)

  // Beste Quelle als Basis, Lücken aus den anderen füllen
  for (const [key, entry] of candidateMaps[0]) {
    results.set(key, entry)
  }

  // Lücken aus den restlichen Quellen auffüllen
  for (let i = 1; i < candidateMaps.length; i++) {
    for (const [key, entry] of candidateMaps[i]) {
      if (!results.has(key)) {
        results.set(key, entry)
      }
    }
  }

  return results
}

/**
 * Baut ein Period-Key Set auf aus den verfügbaren Daten.
 * Revenue ist der Anchor – nur Perioden mit Revenue werden zurückgegeben.
 */
function buildPeriodKeys(
  facts: XbrlCompanyFacts,
  mode: 'annual' | 'quarterly',
  years: number
): string[] {
  const formFilter = mode === 'annual' ? 'annual' : 'quarterly'
  const revenueData = extractConcept(facts, 'revenue', formFilter)

  // Sortiere nach Fiscal Year und Period
  const keys = Array.from(revenueData.keys()).sort((a, b) => {
    const [fyA, fpA] = a.split('-')
    const [fyB, fpB] = b.split('-')
    if (fyA !== fyB) return parseInt(fyA) - parseInt(fyB)
    return fpA.localeCompare(fpB)
  })

  // Limitiere auf gewünschte Anzahl Jahre
  const maxEntries = mode === 'annual' ? years : years * 4
  return keys.slice(-maxEntries)
}

// ─── Main API ────────────────────────────────────────────────────────────────

export async function getSecFinancials(
  ticker: string,
  options: { years?: number; period?: 'annual' | 'quarterly' } = {}
): Promise<SecFinancialResponse> {
  const { years = 10, period = 'annual' } = options

  const cik = await getCIK(ticker)
  if (!cik) {
    throw new Error(`Kein CIK-Mapping für Ticker: ${ticker}.`)
  }

  const facts = await fetchCompanyFacts(cik)
  const formFilter = period === 'annual' ? 'annual' : 'quarterly'

  // Alle Konzepte extrahieren
  const conceptData: Record<string, Map<string, XbrlFactEntry>> = {}
  for (const key of Object.keys(XBRL_CONCEPTS)) {
    conceptData[key] = extractConcept(facts, key, formFilter)
  }

  // Perioden aufbauen (basierend auf Revenue als Anchor)
  const periodKeys = buildPeriodKeys(facts, period, years)

  // Perioden zusammenbauen
  const periods: SecFinancialPeriod[] = periodKeys.map(key => {
    const [endYear, fp] = key.split('-')
    const fiscalYear = parseInt(endYear)
    const fiscalPeriod = fp

    // Revenue-Eintrag als Referenz für `filed` Datum und End-Datum
    const revenueEntry = conceptData.revenue?.get(key)
    // Das End-Datum bestimmt das Kalenderjahr der Periode
    const endDate = revenueEntry?.end || ''
    const calendarYear = endDate ? endDate.slice(0, 4) : endYear

    const getValue = (conceptKey: string): number | null => {
      const entry = conceptData[conceptKey]?.get(key)
      return entry ? entry.val : null
    }

    const operatingCF = getValue('operatingCashFlow')
    const capexVal = getValue('capex')

    // Dividend per Share: direkt aus XBRL oder berechnet aus Total / Shares
    let dividendPS = getValue('dividendPerShare')
    if (dividendPS === null) {
      const totalDiv = getValue('dividendsPaid')
      const shares = getValue('sharesOutstanding')
      if (totalDiv !== null && shares !== null && shares > 0) {
        dividendPS = Math.abs(totalDiv) / shares
        // Auf 2 Dezimalstellen runden
        dividendPS = Math.round(dividendPS * 100) / 100
      }
    }

    return {
      period: fiscalPeriod === 'FY' ? calendarYear : `${fp} ${calendarYear}`,
      fiscalYear,
      fiscalPeriod,
      filed: revenueEntry?.filed || '',
      // Income Statement
      revenue: getValue('revenue'),
      netIncome: getValue('netIncome'),
      // GrossProfit: direkt aus XBRL, oder berechnet aus Revenue - CostOfRevenue
      grossProfit: getValue('grossProfit') ?? (
        getValue('revenue') !== null && getValue('costOfRevenue') !== null
          ? getValue('revenue')! - getValue('costOfRevenue')!
          : null
      ),
      operatingIncome: getValue('operatingIncome'),
      costOfRevenue: getValue('costOfRevenue'),
      eps: getValue('eps'),
      epsBasic: getValue('epsBasic'),
      rd: getValue('rd'),
      sga: getValue('sga'),
      incomeTax: getValue('incomeTax'),
      interestExpense: getValue('interestExpense'),
      depreciation: getValue('depreciation'),
      // Balance Sheet
      totalAssets: getValue('totalAssets'),
      totalLiabilities: getValue('totalLiabilities'),
      shareholdersEquity: getValue('shareholdersEquity'),
      cash: getValue('cash'),
      longTermDebt: getValue('longTermDebt'),
      shortTermDebt: getValue('shortTermDebt'),
      totalDebt: getValue('totalDebt'),
      inventory: getValue('inventory'),
      accountsReceivable: getValue('accountsReceivable'),
      accountsPayable: getValue('accountsPayable'),
      goodwill: getValue('goodwill'),
      propertyPlantEquip: getValue('propertyPlantEquip'),
      sharesOutstanding: getValue('sharesOutstanding'),
      // Cash Flow
      operatingCashFlow: operatingCF,
      capex: capexVal,
      freeCashFlow: operatingCF !== null && capexVal !== null
        ? operatingCF - Math.abs(capexVal)
        : null,
      dividendPerShare: dividendPS,
      dividendsPaid: getValue('dividendsPaid'),
      shareRepurchase: getValue('shareRepurchase'),
      // Meta
      source: 'sec-xbrl',
    }
  })

  // Verfügbare Metriken ermitteln
  const availableMetrics = Object.keys(XBRL_CONCEPTS).filter(key =>
    periods.some(p => (p as any)[key] !== null)
  )

  return {
    ticker: ticker.toUpperCase(),
    entityName: facts.entityName || ticker,
    cik,
    periods,
    availableMetrics,
    totalPeriodsAvailable: periodKeys.length,
    source: 'sec-xbrl',
    fetchedAt: new Date().toISOString(),
  }
}
