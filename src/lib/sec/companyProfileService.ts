// src/lib/sec/companyProfileService.ts
// Company Profile Service – Firmendaten direkt von SEC EDGAR
// Name, Ticker, Exchange, SIC, Adresse, Fiscal Year End, etc.

import { getCIK, padCIK } from './cikMapping'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  // Identifiers
  name: string
  ticker: string
  cik: string
  // Exchange
  exchangeName: string
  exchangeSymbol: string        // "NASDAQ", "NYSE"
  // Classification
  sic: string
  sicDescription: string
  sector: string                // Mapped from SIC
  industry: string              // Mapped from SIC
  // Geography
  countryCode: string
  state: string
  stateDescription: string
  // Corporate
  category: string              // "Large accelerated filer", "Accelerated filer", etc.
  entityType: string            // "operating"
  fiscalYearEnd: string         // "0926" (MMDD)
  fiscalYearEndFormatted: string // "September 26"
  // Contact
  phone: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    zip: string | null
  } | null
  // Meta
  formerNames: { name: string; from: string; to: string }[]
  source: 'sec-edgar'
}

// ─── SIC → Sector/Industry Mapping ──────────────────────────────────────────
// Vereinfachtes Mapping der wichtigsten SIC-Codes auf Sektoren.
// Nicht perfekt (SIC ist veraltet), aber besser als nichts.

const SIC_SECTOR_MAP: Record<string, { sector: string; industry: string }> = {
  // Technology
  '3571': { sector: 'Technology', industry: 'Computer Hardware' },
  '3572': { sector: 'Technology', industry: 'Computer Storage' },
  '3674': { sector: 'Technology', industry: 'Semiconductors' },
  '3672': { sector: 'Technology', industry: 'Printed Circuit Boards' },
  '7372': { sector: 'Technology', industry: 'Software' },
  '7371': { sector: 'Technology', industry: 'Computer Services' },
  '7374': { sector: 'Technology', industry: 'Data Processing' },
  '3825': { sector: 'Technology', industry: 'Instruments' },
  // Communication
  '4813': { sector: 'Communication Services', industry: 'Telecommunications' },
  '4841': { sector: 'Communication Services', industry: 'Cable & Streaming' },
  '7812': { sector: 'Communication Services', industry: 'Entertainment' },
  // Consumer
  '5311': { sector: 'Consumer Staples', industry: 'Retail' },
  '5331': { sector: 'Consumer Staples', industry: 'Variety Stores' },
  '5411': { sector: 'Consumer Staples', industry: 'Grocery' },
  '5912': { sector: 'Consumer Staples', industry: 'Drug Stores' },
  '2080': { sector: 'Consumer Staples', industry: 'Beverages' },
  '2086': { sector: 'Consumer Staples', industry: 'Beverages' },
  '2844': { sector: 'Consumer Staples', industry: 'Personal Products' },
  '5940': { sector: 'Consumer Discretionary', industry: 'Sporting Goods' },
  '5651': { sector: 'Consumer Discretionary', industry: 'Apparel Retail' },
  '3711': { sector: 'Consumer Discretionary', industry: 'Automobiles' },
  '3714': { sector: 'Consumer Discretionary', industry: 'Auto Parts' },
  '5812': { sector: 'Consumer Discretionary', industry: 'Restaurants' },
  '7011': { sector: 'Consumer Discretionary', industry: 'Hotels & Lodging' },
  // Financials
  '6020': { sector: 'Financials', industry: 'Banking' },
  '6021': { sector: 'Financials', industry: 'Banking' },
  '6022': { sector: 'Financials', industry: 'Banking' },
  '6141': { sector: 'Financials', industry: 'Credit Services' },
  '6153': { sector: 'Financials', industry: 'Payment Processing' },
  '6159': { sector: 'Financials', industry: 'Financial Services' },
  '6199': { sector: 'Financials', industry: 'Financial Services' },
  '6211': { sector: 'Financials', industry: 'Investment Banking' },
  '6311': { sector: 'Financials', industry: 'Insurance' },
  '6321': { sector: 'Financials', industry: 'Insurance' },
  '6331': { sector: 'Financials', industry: 'Insurance' },
  '6726': { sector: 'Financials', industry: 'Investment Holdings' },
  // Healthcare
  '2834': { sector: 'Healthcare', industry: 'Pharmaceuticals' },
  '2835': { sector: 'Healthcare', industry: 'Diagnostics' },
  '2836': { sector: 'Healthcare', industry: 'Biotechnology' },
  '3841': { sector: 'Healthcare', industry: 'Medical Devices' },
  '5912': { sector: 'Healthcare', industry: 'Pharmacies' },
  '8000': { sector: 'Healthcare', industry: 'Healthcare Services' },
  // Industrials
  '3721': { sector: 'Industrials', industry: 'Aerospace & Defense' },
  '3724': { sector: 'Industrials', industry: 'Aerospace & Defense' },
  '3531': { sector: 'Industrials', industry: 'Construction Equipment' },
  '3561': { sector: 'Industrials', industry: 'Industrial Machinery' },
  '4512': { sector: 'Industrials', industry: 'Airlines' },
  '4210': { sector: 'Industrials', industry: 'Trucking' },
  '4215': { sector: 'Industrials', industry: 'Courier Services' },
  // Energy
  '1311': { sector: 'Energy', industry: 'Oil & Gas Production' },
  '2911': { sector: 'Energy', industry: 'Oil Refining' },
  '1381': { sector: 'Energy', industry: 'Oil & Gas Services' },
  // Materials
  '2810': { sector: 'Materials', industry: 'Chemicals' },
  '2820': { sector: 'Materials', industry: 'Chemicals' },
  '2860': { sector: 'Materials', industry: 'Chemicals' },
  // Real Estate
  '6512': { sector: 'Real Estate', industry: 'REITs' },
  '6798': { sector: 'Real Estate', industry: 'REITs' },
  // Utilities
  '4911': { sector: 'Utilities', industry: 'Electric Utilities' },
  '4931': { sector: 'Utilities', industry: 'Electric & Gas Utilities' },
}

function sicToSector(sic: string): { sector: string; industry: string } {
  // Exact match
  if (SIC_SECTOR_MAP[sic]) return SIC_SECTOR_MAP[sic]
  // Try first 3 digits
  const prefix3 = sic.slice(0, 3)
  for (const [code, mapping] of Object.entries(SIC_SECTOR_MAP)) {
    if (code.startsWith(prefix3)) return mapping
  }
  // Try first 2 digits
  const prefix2 = sic.slice(0, 2)
  for (const [code, mapping] of Object.entries(SIC_SECTOR_MAP)) {
    if (code.startsWith(prefix2)) return mapping
  }
  return { sector: 'Other', industry: 'Other' }
}

// ─── Fiscal Year Formatter ───────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function formatFiscalYearEnd(fyEnd: string): string {
  if (!fyEnd || fyEnd.length < 4) return ''
  const month = parseInt(fyEnd.slice(0, 2))
  const day = parseInt(fyEnd.slice(2, 4))
  if (month < 1 || month > 12) return fyEnd
  return `${MONTHS[month - 1]} ${day}`
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: CompanyProfile; ts: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

// ─── Main API ────────────────────────────────────────────────────────────────

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile> {
  const normalized = ticker.toUpperCase()

  // Cache check
  const cached = cache.get(normalized)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const cik = await getCIK(normalized)
  if (!cik) {
    throw new Error(`Kein CIK-Mapping für Ticker: ${normalized}`)
  }

  const url = `https://data.sec.gov/submissions/CIK${padCIK(cik)}.json`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })

  if (!res.ok) {
    throw new Error(`SEC EDGAR submissions API failed: ${res.status}`)
  }

  const data = await res.json()

  const sic = data.sic || ''
  const { sector, industry } = sicToSector(sic)

  const tickers = data.tickers || []
  const exchanges = data.exchanges || []

  const mailingAddr = data.addresses?.mailing || data.addresses?.business || {}

  const profile: CompanyProfile = {
    name: data.name || normalized,
    ticker: tickers[0] || normalized,
    cik,
    exchangeName: exchanges[0] || '',
    exchangeSymbol: exchanges[0] || '',
    sic,
    sicDescription: data.sicDescription || '',
    sector,
    industry,
    countryCode: mailingAddr.stateOrCountry?.length === 2 && !/[A-Z]{2}/.test(mailingAddr.stateOrCountry || '')
      ? 'US' : (mailingAddr.stateOrCountry || 'US'),
    state: data.stateOfIncorporation || '',
    stateDescription: data.stateOfIncorporationDescription || '',
    category: data.category || '',
    entityType: data.entityType || '',
    fiscalYearEnd: data.fiscalYearEnd || '',
    fiscalYearEndFormatted: formatFiscalYearEnd(data.fiscalYearEnd || ''),
    phone: data.phone || null,
    address: mailingAddr.street1 ? {
      street: mailingAddr.street1,
      city: mailingAddr.city,
      state: mailingAddr.stateOrCountry,
      zip: mailingAddr.zipCode,
    } : null,
    formerNames: (data.formerNames || []).map((n: any) => ({
      name: n.name,
      from: n.from || '',
      to: n.to || '',
    })),
    source: 'sec-edgar',
  }

  cache.set(normalized, { data: profile, ts: Date.now() })
  return profile
}
