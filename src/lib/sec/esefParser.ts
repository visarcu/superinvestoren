// src/lib/sec/esefParser.ts
// ESEF/iXBRL Parser für europäische Unternehmen
// Parsed ESEF JSON-Filings (von filings.xbrl.org oder direkt von IR-Seiten)
// und wandelt IFRS-Konzepte in unser standardisiertes Format um.

import { SecFinancialPeriod } from './secFinancialService'

// ─── IFRS → Finclue Concept Mapping ─────────────────────────────────────────
// IFRS-full Taxonomy Tags → unsere Feldnamen

const IFRS_CONCEPTS: Record<string, { primary: string; fallbacks?: string[] }> = {
  // Income Statement (Duration)
  revenue:          { primary: 'Revenue', fallbacks: ['RevenueFromContractsWithCustomers'] },
  netIncome:        { primary: 'ProfitLoss', fallbacks: ['ProfitLossAttributableToOwnersOfParent'] },
  grossProfit:      { primary: 'GrossProfit' },
  operatingIncome:  { primary: 'ProfitLossFromOperatingActivities', fallbacks: ['OperatingProfit'] },
  costOfRevenue:    { primary: 'CostOfSales', fallbacks: ['CostOfGoodsAndServicesSold'] },
  eps:              { primary: 'BasicEarningsLossPerShare' },
  epsBasic:         { primary: 'BasicEarningsLossPerShare' },
  epsDiluted:       { primary: 'DilutedEarningsLossPerShare' },
  rd:               { primary: 'ResearchAndDevelopmentExpense' },
  sga:              { primary: 'SellingGeneralAndAdministrativeExpense', fallbacks: ['DistributionCosts', 'AdministrativeExpense'] },
  incomeTax:        { primary: 'IncomeTaxExpenseContinuingOperations', fallbacks: ['IncomeTaxExpense'] },
  interestExpense:  { primary: 'FinanceCosts', fallbacks: ['InterestExpense'] },
  depreciation:     { primary: 'DepreciationAndAmortisationExpense', fallbacks: ['DepreciationExpense'] },

  // Balance Sheet (Instant)
  totalAssets:        { primary: 'Assets' },
  totalLiabilities:   { primary: 'Liabilities' },
  shareholdersEquity: { primary: 'Equity', fallbacks: ['EquityAttributableToOwnersOfParent'] },
  cash:               { primary: 'CashAndCashEquivalents', fallbacks: ['CashAndBankBalancesAtCentralBanks'] },
  longTermDebt:       { primary: 'NoncurrentFinancialLiabilities', fallbacks: ['NoncurrentLiabilities'] },
  shortTermDebt:      { primary: 'CurrentFinancialLiabilities', fallbacks: ['CurrentLiabilities'] },
  totalDebt:          { primary: 'NoncurrentFinancialLiabilities' }, // Wird berechnet wenn nötig
  inventory:          { primary: 'Inventories', fallbacks: ['CurrentInventories'] },
  accountsReceivable: { primary: 'TradeAndOtherCurrentReceivables', fallbacks: ['TradeReceivables'] },
  accountsPayable:    { primary: 'TradeAndOtherCurrentPayables', fallbacks: ['TradePayables'] },
  goodwill:           { primary: 'Goodwill' },
  propertyPlantEquip: { primary: 'PropertyPlantAndEquipment' },
  sharesOutstanding:  { primary: 'IssuedCapitalOrdinaryShares', fallbacks: ['NumberOfSharesOutstanding'] },

  // Cash Flow (Duration)
  operatingCashFlow:  { primary: 'CashFlowsFromUsedInOperatingActivities' },
  capex:              { primary: 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', fallbacks: ['AcquisitionsOfPropertyPlantAndEquipment'] },
  dividendsPaid:      { primary: 'DividendsPaid', fallbacks: ['DividendsPaidClassifiedAsFinancingActivities'] },
  dividendPerShare:   { primary: 'DividendsPaidOrdinarySharesPerShare', fallbacks: ['DividendsPerShare'] },
  shareRepurchase:    { primary: 'PurchaseOfTreasuryShares', fallbacks: ['PaymentsToAcquireOrRedeemEntitysShares'] },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface EsefFact {
  value: string
  decimals?: number
  dimensions: {
    concept: string
    entity?: string
    period: string
    unit?: string
    [key: string]: any
  }
}

interface EsefJson {
  documentInfo: any
  facts: Record<string, EsefFact>
}

export interface EsefCompanyConfig {
  name: string
  lei: string                  // Legal Entity Identifier
  ticker: string               // Deutscher Börsenticker (z.B. SAP.DE)
  tickerUS?: string            // US ADR Ticker falls vorhanden
  currency: string             // EUR, CHF, GBP
  fiscalYearEnd: string        // "12-31", "09-30" etc.
  esefUrls: Record<string, string>  // Jahr → URL zum ESEF JSON
}

// ─── Parser ──────────────────────────────────────────────────────────────────

function extractValue(
  facts: Record<string, EsefFact>,
  conceptNames: string[],
  periodFilter: (period: string) => boolean,
  excludeMembers: boolean = true
): number | null {
  for (const conceptName of conceptNames) {
    const fullConcept = `ifrs-full:${conceptName}`

    for (const [, fact] of Object.entries(facts)) {
      const dims = fact.dimensions
      if (dims.concept !== fullConcept) continue
      if (!periodFilter(dims.period)) continue

      // Segmente/Member-Dimensionen ausschließen (nur Konzern-Total)
      if (excludeMembers) {
        const hasMember = Object.keys(dims).some(k =>
          k !== 'concept' && k !== 'entity' && k !== 'period' && k !== 'unit' &&
          typeof dims[k] === 'string' && dims[k].includes('Member')
        )
        if (hasMember) continue
      }

      const val = parseFloat(fact.value)
      if (!isNaN(val)) return val
    }
  }

  return null
}

/**
 * Parsed ein ESEF JSON Filing und gibt strukturierte Finanzdaten zurück.
 */
export function parseEsefJson(
  json: EsefJson,
  config: EsefCompanyConfig,
  year: number
): SecFinancialPeriod {
  const facts = json.facts
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const nextYearStart = `${year + 1}-01-01`

  // Filter für Duration-Konzepte (Geschäftsjahr)
  const isDuration = (period: string) => {
    return period.includes(yearStart) && (period.includes(nextYearStart) || period.includes(yearEnd))
  }

  // Filter für Instant-Konzepte (Stichtag)
  const isInstant = (period: string) => {
    return period === `${yearEnd}T00:00:00` ||
           period === `${nextYearStart}T00:00:00` ||
           period === yearEnd ||
           period === nextYearStart
  }

  const getValue = (key: string, type: 'duration' | 'instant'): number | null => {
    const conceptDef = IFRS_CONCEPTS[key]
    if (!conceptDef) return null

    const names = [conceptDef.primary, ...(conceptDef.fallbacks || [])]
    const filter = type === 'duration' ? isDuration : isInstant

    return extractValue(facts, names, filter)
  }

  // Income Statement = Duration
  const revenue = getValue('revenue', 'duration')
  const operatingCF = getValue('operatingCashFlow', 'duration')
  const capexVal = getValue('capex', 'duration')

  return {
    period: year.toString(),
    fiscalYear: year,
    fiscalPeriod: 'FY',
    filed: '',
    // Income Statement
    revenue,
    netIncome: getValue('netIncome', 'duration'),
    grossProfit: getValue('grossProfit', 'duration'),
    operatingIncome: getValue('operatingIncome', 'duration'),
    costOfRevenue: getValue('costOfRevenue', 'duration'),
    eps: getValue('eps', 'duration'),
    epsBasic: getValue('epsBasic', 'duration'),
    rd: getValue('rd', 'duration'),
    sga: getValue('sga', 'duration'),
    incomeTax: getValue('incomeTax', 'duration'),
    interestExpense: getValue('interestExpense', 'duration'),
    depreciation: getValue('depreciation', 'duration'),
    // Balance Sheet = Instant
    totalAssets: getValue('totalAssets', 'instant'),
    totalLiabilities: getValue('totalLiabilities', 'instant'),
    shareholdersEquity: getValue('shareholdersEquity', 'instant'),
    cash: getValue('cash', 'instant'),
    longTermDebt: getValue('longTermDebt', 'instant'),
    shortTermDebt: getValue('shortTermDebt', 'instant'),
    totalDebt: null, // Berechnet: LT + ST
    inventory: getValue('inventory', 'instant'),
    accountsReceivable: getValue('accountsReceivable', 'instant'),
    accountsPayable: getValue('accountsPayable', 'instant'),
    goodwill: getValue('goodwill', 'instant'),
    propertyPlantEquip: getValue('propertyPlantEquip', 'instant'),
    sharesOutstanding: getValue('sharesOutstanding', 'instant'),
    // Cash Flow = Duration
    operatingCashFlow: operatingCF,
    capex: capexVal ? Math.abs(capexVal) : null,
    freeCashFlow: operatingCF !== null && capexVal !== null
      ? operatingCF - Math.abs(capexVal)
      : null,
    dividendPerShare: getValue('dividendPerShare', 'duration'),
    dividendsPaid: getValue('dividendsPaid', 'duration'),
    shareRepurchase: getValue('shareRepurchase', 'duration'),
    // Meta
    source: 'sec-xbrl', // Wir nutzen das gleiche Format
  }
}

// ─── DAX Company Configs ─────────────────────────────────────────────────────

export const DAX_COMPANIES: EsefCompanyConfig[] = [
  {
    name: 'SAP SE',
    lei: '529900D6BF99LW9R2E68',
    ticker: 'SAP.DE',
    tickerUS: 'SAP',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900D6BF99LW9R2E68/2020-12-31/ESEF/DE/0/sap-2020-12-31AR.json',
    },
  },
  {
    name: 'Siemens AG',
    lei: 'W38RGI023J3WT1HWRP32',
    ticker: 'SIE.DE',
    currency: 'EUR',
    fiscalYearEnd: '09-30',
    esefUrls: {
      '2021': 'https://filings.xbrl.org/W38RGI023J3WT1HWRP32/2021-09-30/ESEF/DE/0/siemens-20210930.json.gz',
    },
  },
  {
    name: 'Allianz SE',
    lei: '529900K9B0N5BT694847',
    ticker: 'ALV.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900K9B0N5BT694847/2020-12-31/ESEF/DE/0/allianz-2020-12-31.json.gz',
    },
  },
  {
    name: 'Deutsche Telekom AG',
    lei: '549300V9QSIG4WX4GJ96',
    ticker: 'DTE.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/549300V9QSIG4WX4GJ96/2020-12-31/ESEF/DE/0/deutschetelekomag.json.gz',
    },
  },
  {
    name: 'BASF SE',
    lei: '529900PM64WH8AF1E917',
    ticker: 'BAS.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900PM64WH8AF1E917/2020-12-31/ESEF/DE/0/basf-gruppe-2020-12-31.json.gz',
    },
  },
  {
    name: 'Mercedes-Benz Group AG',
    lei: '529900R27DL06UVNT076',
    ticker: 'MBG.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900R27DL06UVNT076/2020-12-31/ESEF/DE/0/daimlerag-2020-12-.json.gz',
    },
  },
  {
    name: 'Adidas AG',
    lei: '549300JSX0Z4CW0V5023',
    ticker: 'ADS.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/549300JSX0Z4CW0V5023/2020-12-31/ESEF/DE/0/adidasAG-2020-12-31.json.gz',
    },
  },
  {
    name: 'Munich Re',
    lei: '529900MUF4C20K50JS49',
    ticker: 'MUV2.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900MUF4C20K50JS49/2020-12-31/ESEF/DE/0/munichre.json.gz',
    },
  },
  {
    name: 'Deutsche Boerse AG',
    lei: '529900G3SW56SHYNPR95',
    ticker: 'DB1.DE',
    currency: 'EUR',
    fiscalYearEnd: '12-31',
    esefUrls: {
      '2020': 'https://filings.xbrl.org/529900G3SW56SHYNPR95/2020-12-31/ESEF/DE/0/deutschebrseag.json.gz',
    },
  },
  // BMW fehlt auf filings.xbrl.org – muss von IR-Seite geholt werden:
  // https://www.bmwgroup.com/en/report/2024/downloads/index.html
]

// ─── Fetch & Parse ───────────────────────────────────────────────────────────

export async function fetchAndParseEsef(
  config: EsefCompanyConfig,
  year: string
): Promise<SecFinancialPeriod | null> {
  const url = config.esefUrls[year]
  if (!url) return null

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Finclue research@finclue.de' },
    })
    if (!res.ok) return null

    let json: EsefJson

    if (url.endsWith('.gz')) {
      // Gzipped JSON – decompress
      const buffer = await res.arrayBuffer()
      const ds = new DecompressionStream('gzip')
      const decompressed = new Response(new Blob([buffer]).stream().pipeThrough(ds))
      json = await decompressed.json()
    } else {
      json = await res.json()
    }

    return parseEsefJson(json, config, parseInt(year))
  } catch (error) {
    console.error(`ESEF fetch failed for ${config.name} ${year}:`, error)
    return null
  }
}

/**
 * Holt alle verfügbaren Jahre für ein DAX-Unternehmen.
 */
export async function getEsefFinancials(
  ticker: string
): Promise<{ company: EsefCompanyConfig; periods: SecFinancialPeriod[] } | null> {
  // Finde Company Config (nach Ticker DE oder US)
  const config = DAX_COMPANIES.find(c =>
    c.ticker === ticker || c.ticker.replace('.DE', '') === ticker ||
    c.tickerUS === ticker || c.name.toLowerCase().includes(ticker.toLowerCase())
  )
  if (!config) return null

  const periods: SecFinancialPeriod[] = []

  for (const [year, url] of Object.entries(config.esefUrls)) {
    const period = await fetchAndParseEsef(config, year)
    if (period) periods.push(period)
  }

  periods.sort((a, b) => a.fiscalYear - b.fiscalYear)

  return { company: config, periods }
}
