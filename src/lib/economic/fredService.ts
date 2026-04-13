// src/lib/economic/fredService.ts
// FRED (Federal Reserve Economic Data) Service
// Kostenlose Regierungsdaten – Public Domain, kommerziell nutzbar.
// https://fred.stlouisfed.org/docs/api/

// ─── Wichtigste Wirtschaftsindikatoren ───────────────────────────────────────

export const FRED_SERIES: Record<string, {
  id: string
  name: string
  nameDE: string
  unit: string
  frequency: string
  category: string
}> = {
  // Inflation
  cpi: { id: 'CPIAUCSL', name: 'Consumer Price Index', nameDE: 'Verbraucherpreisindex (CPI)', unit: 'index', frequency: 'monthly', category: 'inflation' },
  cpi_yoy: { id: 'CPIAUCSL', name: 'CPI Year-over-Year', nameDE: 'Inflation (YoY)', unit: 'percent_change', frequency: 'monthly', category: 'inflation' },
  core_cpi: { id: 'CPILFESL', name: 'Core CPI (ex Food & Energy)', nameDE: 'Kerninflation (ohne Nahrung & Energie)', unit: 'index', frequency: 'monthly', category: 'inflation' },
  pce: { id: 'PCEPI', name: 'PCE Price Index', nameDE: 'PCE Preisindex', unit: 'index', frequency: 'monthly', category: 'inflation' },

  // Employment
  unemployment: { id: 'UNRATE', name: 'Unemployment Rate', nameDE: 'Arbeitslosenquote', unit: 'percent', frequency: 'monthly', category: 'employment' },
  nfp: { id: 'PAYEMS', name: 'Non-Farm Payrolls', nameDE: 'Beschäftigte (ohne Landwirtschaft)', unit: 'thousands', frequency: 'monthly', category: 'employment' },
  initial_claims: { id: 'ICSA', name: 'Initial Jobless Claims', nameDE: 'Erstanträge Arbeitslosenhilfe', unit: 'number', frequency: 'weekly', category: 'employment' },

  // GDP
  gdp: { id: 'GDP', name: 'Gross Domestic Product', nameDE: 'Bruttoinlandsprodukt (BIP)', unit: 'billions', frequency: 'quarterly', category: 'gdp' },
  gdp_growth: { id: 'A191RL1Q225SBEA', name: 'Real GDP Growth Rate', nameDE: 'BIP Wachstumsrate (real)', unit: 'percent', frequency: 'quarterly', category: 'gdp' },

  // Interest Rates
  fed_funds: { id: 'FEDFUNDS', name: 'Federal Funds Rate', nameDE: 'Fed Leitzins', unit: 'percent', frequency: 'monthly', category: 'rates' },
  treasury_10y: { id: 'DGS10', name: '10-Year Treasury Yield', nameDE: '10-Jahres US-Staatsanleihe', unit: 'percent', frequency: 'daily', category: 'rates' },
  treasury_2y: { id: 'DGS2', name: '2-Year Treasury Yield', nameDE: '2-Jahres US-Staatsanleihe', unit: 'percent', frequency: 'daily', category: 'rates' },

  // Consumer
  retail_sales: { id: 'RSAFS', name: 'Retail Sales', nameDE: 'Einzelhandelsumsätze', unit: 'millions', frequency: 'monthly', category: 'consumer' },
  consumer_sentiment: { id: 'UMCSENT', name: 'Consumer Sentiment', nameDE: 'Verbraucherstimmung (Michigan)', unit: 'index', frequency: 'monthly', category: 'consumer' },

  // Housing
  housing_starts: { id: 'HOUST', name: 'Housing Starts', nameDE: 'Baubeginne', unit: 'thousands', frequency: 'monthly', category: 'housing' },

  // Manufacturing
  ism_mfg: { id: 'MANEMP', name: 'Manufacturing Employment', nameDE: 'Beschäftigung Produktion', unit: 'thousands', frequency: 'monthly', category: 'manufacturing' },

  // ── Eurozone / EZB ─────────────────────────────────────────────────────
  ecb_rate: { id: 'ECBDFR', name: 'ECB Deposit Facility Rate', nameDE: 'EZB Einlagefazilität', unit: 'percent', frequency: 'daily', category: 'rates' },
  eu_unemployment: { id: 'LRHUTTTTEZM156S', name: 'Eurozone Unemployment Rate', nameDE: 'Eurozone Arbeitslosenquote', unit: 'percent', frequency: 'monthly', category: 'employment' },
  eu_inflation: { id: 'FPCPITOTLZGEMU', name: 'Eurozone CPI Inflation', nameDE: 'Eurozone Inflation', unit: 'percent', frequency: 'annual', category: 'inflation' },
  eu_gdp_growth: { id: 'CLVMEURSCAB1GQEA19', name: 'Eurozone Real GDP', nameDE: 'Eurozone BIP (real)', unit: 'millions', frequency: 'quarterly', category: 'gdp' },

  // ── Deutschland ────────────────────────────────────────────────────────
  de_unemployment: { id: 'LMUNRRTTDEM156S', name: 'German Unemployment Rate', nameDE: 'Deutsche Arbeitslosenquote', unit: 'percent', frequency: 'monthly', category: 'employment' },
  de_inflation: { id: 'FPCPITOTLZGDEU', name: 'German CPI Inflation', nameDE: 'Deutsche Inflation', unit: 'percent', frequency: 'annual', category: 'inflation' },
  de_gdp: { id: 'CLVMNACSCAB1GQDE', name: 'German Real GDP', nameDE: 'Deutsches BIP (real)', unit: 'millions', frequency: 'quarterly', category: 'gdp' },
}

// ─── FRED API Client ─────────────────────────────────────────────────────────

export interface FredObservation {
  date: string
  value: number | null
}

export interface FredSeriesData {
  seriesId: string
  name: string
  nameDE: string
  unit: string
  category: string
  observations: FredObservation[]
}

const cache = new Map<string, { data: FredSeriesData; ts: number }>()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 Stunden

export async function getFredSeries(
  seriesKey: string,
  options: { limit?: number; startDate?: string } = {}
): Promise<FredSeriesData | null> {
  const series = FRED_SERIES[seriesKey]
  if (!series) return null

  const { limit = 60, startDate } = options
  const cacheKey = `${seriesKey}-${limit}-${startDate || ''}`

  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    console.warn('[FRED] No API key configured')
    return null
  }

  try {
    let url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`
    if (startDate) url += `&observation_start=${startDate}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`FRED API: ${res.status}`)

    const data = await res.json()
    const observations: FredObservation[] = (data.observations || [])
      .map((o: any) => ({
        date: o.date,
        value: o.value === '.' ? null : parseFloat(o.value),
      }))
      .filter((o: FredObservation) => o.value !== null)
      .reverse() // chronologisch (älteste zuerst)

    const result: FredSeriesData = {
      seriesId: series.id,
      name: series.name,
      nameDE: series.nameDE,
      unit: series.unit,
      category: series.category,
      observations,
    }

    cache.set(cacheKey, { data: result, ts: Date.now() })
    return result
  } catch (error) {
    console.error(`[FRED] Error fetching ${seriesKey}:`, error)
    return null
  }
}

/**
 * Holt mehrere Serien auf einmal
 */
export async function getMultipleFredSeries(
  keys: string[],
  options: { limit?: number } = {}
): Promise<Record<string, FredSeriesData>> {
  const results: Record<string, FredSeriesData> = {}

  await Promise.all(
    keys.map(async key => {
      const data = await getFredSeries(key, options)
      if (data) results[key] = data
    })
  )

  return results
}

/**
 * Liste aller verfügbaren Serien
 */
export function getAvailableSeries() {
  return Object.entries(FRED_SERIES).map(([key, s]) => ({
    key,
    id: s.id,
    name: s.name,
    nameDE: s.nameDE,
    unit: s.unit,
    frequency: s.frequency,
    category: s.category,
  }))
}
