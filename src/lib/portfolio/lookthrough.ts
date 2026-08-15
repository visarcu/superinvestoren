// src/lib/portfolio/lookthrough.ts
//
// Look-Through-Engine: zerlegt ETF-Positionen in ihre Einzelaktien-Bestandteile
// und rechnet sie mit den Direktbeständen zu einem "effektiven Portfolio" zusammen.
//
// Nur serverseitig verwenden (braucht FMP_API_KEY). Alle FMP-Antworten laufen
// über den Next.js Data Cache (revalidate) — Holdings ändern sich träge, deshalb
// reichen 24h; Firmenprofile sogar 7 Tage.

import { findLookthroughEntry, type EtfLookthroughEntry, type LookthroughProxy } from '@/data/etfLookthrough'
import { getETFBySymbol } from '@/lib/etfUtils'

// =====================================================
// Typen
// =====================================================

export interface LookthroughInput {
  symbol: string
  name: string
  isin?: string | null
  /** Positionswert in EUR (Frontend hat die Bewertung bereits) */
  value: number
}

export interface ExposureSource {
  etfSymbol: string
  etfName: string
  value: number
}

export interface EffectiveExposure {
  symbol: string
  name: string
  isin: string | null
  value: number
  /** Anteil am zerlegbaren Aktien-Exposure (0–100) */
  percent: number
  directValue: number
  etfValue: number
  etfCount: number
  sources: ExposureSource[]
}

export interface WeightSlice {
  label: string
  value: number
  percent: number
}

export interface OverlapPair {
  symbolA: string
  nameA: string
  symbolB: string
  nameB: string
  /** Σ min(Gewicht A, Gewicht B) über gemeinsame Holdings, 0–100 */
  overlapPercent: number
  sharedCount: number
  topShared: { symbol: string; name: string; weightA: number; weightB: number }[]
}

export type EtfCoverageStatus = 'exact' | 'approximated' | 'no-proxy' | 'non-equity'

export interface EtfCoverageInfo {
  symbol: string
  name: string
  value: number
  status: EtfCoverageStatus
  proxyLabel?: string
  note?: string
}

export interface LookthroughInsight {
  severity: 'info' | 'warn'
  title: string
  text: string
}

export interface LookthroughResult {
  totalValue: number
  /** Wert, der zerlegt werden konnte (Direktaktien + auflösbare ETFs) */
  analyzedValue: number
  coveragePercent: number
  etfValue: number
  directStockValue: number
  topExposures: EffectiveExposure[]
  regions: WeightSlice[]
  sectors: WeightSlice[]
  overlaps: OverlapPair[]
  etfCoverage: EtfCoverageInfo[]
  insights: LookthroughInsight[]
}

// =====================================================
// FMP-Zugriff (mit Next.js Data Cache)
// =====================================================

const FMP_BASE = 'https://financialmodelingprep.com/api/v3'
const HOLDINGS_REVALIDATE = 60 * 60 * 24 // 24h
const PROFILE_REVALIDATE = 60 * 60 * 24 * 7 // 7 Tage
/** Mehr parallele FMP-Calls bringen nur Rate-Limit-Ärger */
const CONCURRENCY = 6

interface FmpEtfHolding {
  asset: string | null
  name: string | null
  isin: string | null
  weightPercentage: number | null
}

interface FmpWeighting {
  sector?: string
  country?: string
  weightPercentage: string
}

interface FmpProfile {
  symbol: string
  country: string | null
  sector: string | null
}

async function fmpJson<T>(path: string, revalidate: number): Promise<T | null> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return null
  try {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${FMP_BASE}${path}${sep}apikey=${apiKey}`, {
      next: { revalidate },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    results.push(...(await Promise.all(batch.map(fn))))
  }
  return results
}

// =====================================================
// Normalisierung: Sektoren & Regionen
// =====================================================

/** FMP-Varianten auf das kanonische Vokabular von SECTOR_TRANSLATIONS mappen */
const SECTOR_ALIASES: Record<string, string> = {
  'Basic Materials': 'Materials',
  'Consumer Cyclical': 'Consumer Discretionary',
  'Consumer Defensive': 'Consumer Staples',
  'Financials': 'Financial Services',
  'Health Care': 'Healthcare',
  'Information Technology': 'Technology',
  'Telecommunications': 'Communication Services',
  'Communication': 'Communication Services',
  'Cash & Others': 'Other',
  'Cash and/or Derivatives': 'Other',
}

function normalizeSector(raw: string | null | undefined): string {
  if (!raw) return 'Other'
  const trimmed = raw.trim()
  return SECTOR_ALIASES[trimmed] || trimmed
}

const EUROPE_CODES = new Set([
  'DE', 'GB', 'FR', 'CH', 'NL', 'SE', 'DK', 'IT', 'ES', 'FI', 'NO', 'BE', 'AT',
  'IE', 'PT', 'PL', 'GR', 'CZ', 'HU', 'LU', 'IS', 'LI', 'MC', 'RO', 'HR', 'SI', 'SK', 'EE', 'LV', 'LT', 'MT', 'CY',
])
const OTHER_DEVELOPED_CODES = new Set(['CA', 'AU', 'NZ', 'SG', 'IL'])
const EMERGING_CODES = new Set([
  'TW', 'KR', 'BR', 'MX', 'ZA', 'SA', 'AE', 'QA', 'KW', 'ID', 'TH', 'MY', 'PH',
  'CL', 'PE', 'CO', 'TR', 'EG', 'VN', 'AR', 'KZ', 'PK', 'NG', 'BD',
])

/** FMP-Ländernamen (country-weightings) → ISO-2 */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'United States': 'US', 'United States of America': 'US',
  'United Kingdom': 'GB', 'Great Britain': 'GB',
  'Germany': 'DE', 'France': 'FR', 'Switzerland': 'CH', 'Netherlands': 'NL',
  'Sweden': 'SE', 'Denmark': 'DK', 'Italy': 'IT', 'Spain': 'ES', 'Finland': 'FI',
  'Norway': 'NO', 'Belgium': 'BE', 'Austria': 'AT', 'Ireland': 'IE', 'Portugal': 'PT',
  'Poland': 'PL', 'Greece': 'GR', 'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Hungary': 'HU', 'Luxembourg': 'LU',
  'Japan': 'JP',
  'China': 'CN', "China (People's Republic of)": 'CN', 'Hong Kong': 'HK', 'Macau': 'MO',
  'India': 'IN',
  'Canada': 'CA', 'Australia': 'AU', 'New Zealand': 'NZ', 'Singapore': 'SG', 'Israel': 'IL',
  'Taiwan': 'TW', 'Taiwan (Province of China)': 'TW', 'Taiwan, Province of China': 'TW',
  'Korea, Republic of': 'KR', 'South Korea': 'KR', 'Republic of Korea': 'KR',
  'Brazil': 'BR', 'Mexico': 'MX', 'South Africa': 'ZA', 'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE', 'Qatar': 'QA', 'Kuwait': 'KW', 'Indonesia': 'ID',
  'Thailand': 'TH', 'Malaysia': 'MY', 'Philippines': 'PH', 'Chile': 'CL', 'Peru': 'PE',
  'Colombia': 'CO', 'Turkey': 'TR', 'Türkiye': 'TR', 'Egypt': 'EG', 'Vietnam': 'VN',
  'Viet Nam': 'VN', 'Argentina': 'AR', 'Kazakhstan': 'KZ',
}

function countryToRegion(codeOrName: string | null | undefined): string {
  if (!codeOrName) return 'Sonstige'
  const raw = codeOrName.trim()
  const code = raw.length === 2 ? raw.toUpperCase() : COUNTRY_NAME_TO_CODE[raw] || ''
  if (code === 'US') return 'USA'
  if (code === 'JP') return 'Japan'
  if (code === 'IN') return 'Indien'
  if (code === 'CN' || code === 'HK' || code === 'MO') return 'China & Hongkong'
  if (EUROPE_CODES.has(code)) return 'Europa'
  if (OTHER_DEVELOPED_CODES.has(code)) return 'Übrige Developed (u.a. Kanada, Australien)'
  if (EMERGING_CODES.has(code)) return 'Übrige Emerging Markets'
  return 'Sonstige'
}

// =====================================================
// ETF-Erkennung & Proxy-Auflösung
// =====================================================

const NON_EQUITY_CATEGORY = /bond|treasury|fixed|municipal|tips|high yield|corporate|aggregate|money market|gold|silver|oil|commodity|currency/i

interface ResolvedEtf {
  input: LookthroughInput
  entry: EtfLookthroughEntry | null
  proxies: LookthroughProxy[] | null
  status: EtfCoverageStatus
  note?: string
  proxyLabel?: string
}

/**
 * Position als ETF erkennen und Proxy bestimmen.
 * Rückgabe null = keine ETF-Position (wird als Direktaktie behandelt).
 */
function resolveEtf(input: LookthroughInput): ResolvedEtf | null {
  const entry = findLookthroughEntry(input.isin, input.symbol)
  if (entry) {
    if (entry.assetClass === 'bond' || entry.assetClass === 'commodity' || entry.assetClass === 'money-market') {
      return { input, entry, proxies: null, status: 'non-equity', note: entry.note }
    }
    if (!entry.proxies) {
      return { input, entry, proxies: null, status: 'no-proxy', note: entry.note }
    }
    return {
      input,
      entry,
      proxies: entry.proxies,
      status: entry.exact ? 'exact' : 'approximated',
      note: entry.note,
      proxyLabel: entry.proxies.map(p => p.symbol).join(' + '),
    }
  }

  // Kein kuratierter Eintrag: bekannte ETFs aus etfs.ts/etfMaster prüfen.
  const known = getETFBySymbol(input.symbol)
  if (!known) {
    // Letzte Verteidigungslinie: Fonds am Namen erkennen, damit unbekannte
    // ETFs nicht als "Direktposition" in den Top-Positionen landen.
    if (/\bUCITS\b|\bETFs?\b|\bETC\b|\bETN\b|\bFund\b|\bIndex\b/i.test(input.name)) {
      return {
        input,
        entry: null,
        proxies: null,
        status: 'no-proxy',
        note: 'Für diesen ETF liegt noch kein Look-Through-Mapping vor',
      }
    }
    return null
  }

  const isUsListed = !input.symbol.includes('.') && (!input.isin || input.isin.toUpperCase().startsWith('US'))
  const isEquity = known.assetClass === 'Equity' && !NON_EQUITY_CATEGORY.test(known.category || '')

  if (!isEquity) {
    return { input, entry: null, proxies: null, status: 'non-equity' }
  }
  if (isUsListed) {
    // US-ETFs deckt FMP direkt ab — der Fonds ist sein eigener "Proxy".
    return {
      input,
      entry: null,
      proxies: [{ symbol: input.symbol.toUpperCase(), weight: 1 }],
      status: 'exact',
      proxyLabel: input.symbol.toUpperCase(),
    }
  }
  return {
    input,
    entry: null,
    proxies: null,
    status: 'no-proxy',
    note: 'Für diesen ETF liegt noch kein Look-Through-Mapping vor',
  }
}

// =====================================================
// Insights: regelbasierte, DESKRIPTIVE Beobachtungen.
// Bewusst keine Handlungsempfehlungen (keine Anlageberatung).
// =====================================================

function buildInsights(
  result: Omit<LookthroughResult, 'insights'>,
  leveragedEtfs: { symbol: string; name: string }[],
): LookthroughInsight[] {
  const insights: LookthroughInsight[] = []
  const fmtPct = (n: number) => `${n.toFixed(0)} %`

  // 1) Effektives Klumpenrisiko: größte Einzelaktie über alles gerechnet
  const top = result.topExposures[0]
  if (top && top.percent >= 10) {
    const viaText =
      top.directValue > 0 && top.etfCount > 0
        ? `direkt und über ${top.etfCount} deiner ETFs`
        : top.etfCount > 0
          ? `über ${top.etfCount} deiner ETFs`
          : 'als Direktposition'
    insights.push({
      severity: top.percent >= 15 ? 'warn' : 'info',
      title: `${top.name} macht effektiv ${fmtPct(top.percent)} aus`,
      text: `Zusammengerechnet steckt die Aktie ${viaText} in deinem Depot — mehr, als die Positionsliste vermuten lässt.`,
    })
  }

  // 2) Versteckte Doppelung: Direktbestand, der zusätzlich in mehreren ETFs steckt
  const hidden = result.topExposures.find(
    e => e.directValue > 0 && e.etfCount >= 2 && e.etfValue >= e.directValue * 0.25 && e.percent >= 3,
  )
  if (hidden && hidden.symbol !== top?.symbol) {
    insights.push({
      severity: 'info',
      title: `${hidden.name}: Direktbestand plus ETF-Anteil`,
      text: `Du hältst die Aktie direkt und zusätzlich über ${hidden.etfCount} ETFs — effektiv ${fmtPct(hidden.percent)} statt der ${fmtPct((hidden.directValue / result.analyzedValue) * 100)} aus der Positionsliste.`,
    })
  }

  // 3) Stark überlappende ETFs
  const bigOverlap = result.overlaps.find(o => o.overlapPercent >= 60)
  if (bigOverlap) {
    insights.push({
      severity: 'warn',
      title: `${fmtPct(bigOverlap.overlapPercent)} Überschneidung zwischen zwei ETFs`,
      text: `${bigOverlap.nameA} und ${bigOverlap.nameB} enthalten weitgehend dieselben Aktien — die zweite Position streut kaum zusätzlich.`,
    })
  }

  // 4) Regionen-Schwerpunkt
  const usa = result.regions.find(r => r.label === 'USA')
  if (usa && usa.percent >= 60) {
    insights.push({
      severity: usa.percent >= 75 ? 'warn' : 'info',
      title: `${fmtPct(usa.percent)} deines Aktien-Exposures hängen an den USA`,
      text: 'Inklusive der US-Anteile in deinen ETFs — dein Depot bewegt sich damit weitgehend mit dem US-Markt.',
    })
  }

  // 5) Sektor-Schwerpunkt
  const topSector = result.sectors[0]
  if (topSector && topSector.percent >= 35 && topSector.label !== 'Other') {
    insights.push({
      severity: 'info',
      title: `Sektor-Schwerpunkt: ${fmtPct(topSector.percent)} ${topSector.label}`,
      text: 'Über Direktbestände und ETF-Anteile zusammengerechnet dominiert dieser Sektor dein Depot.',
    })
  }

  // 6) Gehebelte ETFs
  for (const lev of leveragedEtfs) {
    insights.push({
      severity: 'warn',
      title: `Gehebelter ETF im Depot: ${lev.name}`,
      text: 'Das tatsächliche Markt-Exposure entspricht ca. dem Doppelten des Positionswerts — Verluste wirken entsprechend stärker.',
    })
  }

  // Positiv-Fall: nichts Auffälliges gefunden
  if (insights.length === 0 && result.coveragePercent >= 70) {
    insights.push({
      severity: 'info',
      title: 'Keine auffälligen Klumpen oder Doppelungen',
      text: 'Auch nach Zerlegung deiner ETFs ist das Depot über Einzeltitel, Regionen und Sektoren breit verteilt.',
    })
  }

  // Warnungen zuerst, maximal 4 Hinweise
  return insights.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1)).slice(0, 4)
}

// =====================================================
// Hauptberechnung
// =====================================================

interface ProxyData {
  holdings: FmpEtfHolding[]
  sectors: { sector: string; weight: number }[]
  countries: { country: string; weight: number }[]
}

async function fetchProxyData(symbol: string): Promise<ProxyData | null> {
  const [holdings, sectors, countries] = await Promise.all([
    fmpJson<FmpEtfHolding[]>(`/etf-holder/${symbol}`, HOLDINGS_REVALIDATE),
    fmpJson<FmpWeighting[]>(`/etf-sector-weightings/${symbol}`, HOLDINGS_REVALIDATE),
    fmpJson<FmpWeighting[]>(`/etf-country-weightings/${symbol}`, HOLDINGS_REVALIDATE),
  ])
  if (!holdings || !Array.isArray(holdings) || holdings.length === 0) return null

  const parseWeight = (w: string) => {
    const n = parseFloat(String(w).replace('%', ''))
    return Number.isFinite(n) ? n : 0
  }

  return {
    holdings: holdings.filter(h => h.asset && (h.weightPercentage || 0) > 0),
    sectors: (sectors || []).map(s => ({ sector: normalizeSector(s.sector), weight: parseWeight(s.weightPercentage) })),
    countries: (countries || []).map(c => ({ country: c.country || '', weight: parseWeight(c.weightPercentage) })),
  }
}

export async function computeLookthrough(positions: LookthroughInput[]): Promise<LookthroughResult> {
  const totalValue = positions.reduce((s, p) => s + p.value, 0)

  // 1) Positionen klassifizieren
  const etfs: ResolvedEtf[] = []
  const stocks: LookthroughInput[] = []
  for (const p of positions) {
    if (p.value <= 0) continue
    const resolved = resolveEtf(p)
    if (resolved) etfs.push(resolved)
    else stocks.push(p)
  }

  // 2) Proxy-Daten laden (dedupliziert über alle ETFs)
  const proxySymbols = Array.from(
    new Set(etfs.flatMap(e => (e.proxies || []).map(p => p.symbol))),
  )
  const proxyData = new Map<string, ProxyData>()
  await mapWithConcurrency(proxySymbols, CONCURRENCY, async symbol => {
    const data = await fetchProxyData(symbol)
    if (data) proxyData.set(symbol, data)
  })

  // 3) Profile der Direktaktien laden (Land + Sektor)
  const profiles = new Map<string, FmpProfile>()
  await mapWithConcurrency(stocks, CONCURRENCY, async stock => {
    const res = await fmpJson<FmpProfile[]>(`/profile/${encodeURIComponent(stock.symbol)}`, PROFILE_REVALIDATE)
    if (res && res[0]) profiles.set(stock.symbol, res[0])
  })

  // 4) Effektives Portfolio aufbauen
  interface Agg {
    symbol: string
    name: string
    isin: string | null
    directValue: number
    etfValue: number
    sources: Map<string, ExposureSource>
  }
  // Merge-Schlüssel: ISIN wenn vorhanden (matcht Direktbestand ↔ ETF-Bestandteil
  // über Börsenplätze hinweg), sonst Symbol. Share-Classes desselben Unternehmens
  // (GOOG/GOOGL, BRK-A/B …) haben verschiedene ISINs und werden über das Symbol
  // zwangsvereinigt — sonst taucht Alphabet doppelt auf.
  const SHARE_CLASS_MERGE: Record<string, string> = {
    'GOOG': 'GOOGL',
    'BRK-A': 'BRK-B',
    'BRK.A': 'BRK-B',
    'BRK.B': 'BRK-B',
    'FOX': 'FOXA',
    'NWS': 'NWSA',
    'UA': 'UAA',
  }
  const MERGED_SYMBOLS = new Set([...Object.keys(SHARE_CLASS_MERGE), ...Object.values(SHARE_CLASS_MERGE)])

  const exposures = new Map<string, Agg>()
  const keyFor = (isin: string | null | undefined, symbol: string) => {
    const upper = symbol.toUpperCase()
    const merged = SHARE_CLASS_MERGE[upper] || upper
    if (MERGED_SYMBOLS.has(merged)) return `sym:${merged}`
    return isin ? `isin:${isin.toUpperCase()}` : `sym:${upper}`
  }

  const getAgg = (isin: string | null | undefined, symbol: string, name: string): Agg => {
    const key = keyFor(isin, symbol)
    const upper = symbol.toUpperCase()
    let agg = exposures.get(key)
    if (!agg) {
      agg = { symbol: SHARE_CLASS_MERGE[upper] || upper, name, isin: isin?.toUpperCase() || null, directValue: 0, etfValue: 0, sources: new Map() }
      exposures.set(key, agg)
    }
    return agg
  }

  let directStockValue = 0
  for (const stock of stocks) {
    directStockValue += stock.value
    const agg = getAgg(stock.isin, stock.symbol, stock.name)
    agg.directValue += stock.value
    // Der Direktname (Nutzer-Depot) ist meist lesbarer als der FMP-Holder-Name
    agg.name = stock.name
    agg.symbol = stock.symbol.toUpperCase()
  }

  // Sektoren/Regionen sammeln wir parallel zum effektiven Portfolio
  const sectorAgg = new Map<string, number>()
  const regionAgg = new Map<string, number>()

  for (const stock of stocks) {
    const profile = profiles.get(stock.symbol)
    const sector = normalizeSector(profile?.sector)
    sectorAgg.set(sector, (sectorAgg.get(sector) || 0) + stock.value)
    // Fallback: ISIN-Präfix als Ländercode (Sitzland, nicht perfekt, aber ehrlich nah)
    const region = countryToRegion(profile?.country || stock.isin?.slice(0, 2))
    regionAgg.set(region, (regionAgg.get(region) || 0) + stock.value)
  }

  let decomposedEtfValue = 0
  let etfTotalValue = 0
  const etfCoverage: EtfCoverageInfo[] = []
  const leveragedEtfs: { symbol: string; name: string }[] = []
  /** Pro ETF die zusammengemischte Holdings-Map (ISIN/Symbol → Gewicht %) für Overlap-Berechnung */
  const etfBlends = new Map<string, { name: string; value: number; weights: Map<string, { weight: number; name: string; symbol: string }> }>()

  for (const etf of etfs) {
    etfTotalValue += etf.input.value
    if (etf.entry?.assetClass === 'leveraged-equity') {
      leveragedEtfs.push({ symbol: etf.input.symbol, name: etf.entry.name })
    }

    if (!etf.proxies) {
      // Mapping-Lücken bewusst loggen: daraus wird die Kuratierungs-Liste
      // für neue etfLookthrough-Einträge (Vercel-Logs auswerten).
      if (etf.status === 'no-proxy') {
        console.log(`[lookthrough] Kein Mapping: ${etf.input.symbol} (${etf.input.isin || 'ohne ISIN'}) — ${etf.input.name}`)
      }
      etfCoverage.push({
        symbol: etf.input.symbol,
        name: etf.entry?.name || etf.input.name,
        value: etf.input.value,
        status: etf.status,
        note: etf.note,
      })
      continue
    }

    const availableProxies = etf.proxies.filter(p => proxyData.has(p.symbol))
    if (availableProxies.length === 0) {
      etfCoverage.push({
        symbol: etf.input.symbol,
        name: etf.entry?.name || etf.input.name,
        value: etf.input.value,
        status: 'no-proxy',
        note: 'Holdings-Daten aktuell nicht verfügbar',
      })
      continue
    }
    // Wenn ein Composite-Teil fehlt, Gewichte renormalisieren
    const weightSum = availableProxies.reduce((s, p) => s + p.weight, 0)

    const etfName = etf.entry?.name || etf.input.name
    const blend = { name: etfName, value: etf.input.value, weights: new Map<string, { weight: number; name: string; symbol: string }>() }

    let decomposedFraction = 0
    for (const proxy of availableProxies) {
      const data = proxyData.get(proxy.symbol)!
      const proxyWeight = proxy.weight / weightSum

      // Gewichtssumme des Fonds kann leicht von 100 abweichen → auf 100 deckeln
      const totalW = data.holdings.reduce((s, h) => s + (h.weightPercentage || 0), 0)
      const scale = totalW > 100.5 ? 100 / totalW : 1

      // Bewusst ALLE Holdings, nicht nur die Top-N: ein Cap würde die
      // Overlap-Prozente und die Abdeckungsquote systematisch nach unten
      // verzerren (zwei ETFs auf denselben Index kämen sonst nie auf ~100%).
      for (const holding of data.holdings) {
        const w = ((holding.weightPercentage || 0) * scale) / 100
        const exposureValue = etf.input.value * proxyWeight * w
        if (exposureValue <= 0) continue
        decomposedFraction += proxyWeight * w

        const symbol = holding.asset!.toUpperCase()
        const name = holding.name || symbol
        const agg = getAgg(holding.isin, symbol, name)
        agg.etfValue += exposureValue
        const src = agg.sources.get(etf.input.symbol)
        if (src) src.value += exposureValue
        else agg.sources.set(etf.input.symbol, { etfSymbol: etf.input.symbol, etfName, value: exposureValue })

        // Blend für Overlap (Gewicht in % des ETFs)
        const blendKey = holding.isin?.toUpperCase() || symbol
        const existing = blend.weights.get(blendKey)
        if (existing) existing.weight += proxyWeight * w * 100
        else blend.weights.set(blendKey, { weight: proxyWeight * w * 100, name, symbol })
      }

      // Sektoren & Länder über die offiziellen Fonds-Gewichtungen (voller Fonds, nicht nur Top-N)
      for (const s of data.sectors) {
        const v = etf.input.value * proxyWeight * (s.weight / 100)
        if (v > 0) sectorAgg.set(s.sector, (sectorAgg.get(s.sector) || 0) + v)
      }
      for (const c of data.countries) {
        const v = etf.input.value * proxyWeight * (c.weight / 100)
        if (v > 0) {
          const region = countryToRegion(c.country)
          regionAgg.set(region, (regionAgg.get(region) || 0) + v)
        }
      }
    }

    decomposedEtfValue += etf.input.value * Math.min(1, decomposedFraction)
    etfBlends.set(etf.input.symbol, blend)
    etfCoverage.push({
      symbol: etf.input.symbol,
      name: etfName,
      value: etf.input.value,
      status: etf.status,
      proxyLabel: etf.proxyLabel,
      note: etf.note,
    })
  }

  // 5) Overlap-Matrix (paarweise, nur zerlegte ETFs)
  const blendEntries = Array.from(etfBlends.entries())
  const overlaps: OverlapPair[] = []
  for (let i = 0; i < blendEntries.length; i++) {
    for (let j = i + 1; j < blendEntries.length; j++) {
      const [symA, a] = blendEntries[i]
      const [symB, b] = blendEntries[j]
      const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a]
      let overlap = 0
      let sharedCount = 0
      const shared: { symbol: string; name: string; weightA: number; weightB: number }[] = []
      for (const [key, entrySmall] of Array.from(small.weights.entries())) {
        const entryLarge = large.weights.get(key)
        if (!entryLarge) continue
        sharedCount++
        overlap += Math.min(entrySmall.weight, entryLarge.weight)
        const weightA = small === a ? entrySmall.weight : entryLarge.weight
        const weightB = small === a ? entryLarge.weight : entrySmall.weight
        shared.push({ symbol: entrySmall.symbol, name: entrySmall.name, weightA, weightB })
      }
      if (overlap < 1) continue
      shared.sort((x, y) => Math.min(y.weightA, y.weightB) - Math.min(x.weightA, x.weightB))
      overlaps.push({
        symbolA: symA,
        nameA: a.name,
        symbolB: symB,
        nameB: b.name,
        overlapPercent: Math.min(100, overlap),
        sharedCount,
        topShared: shared.slice(0, 5),
      })
    }
  }
  overlaps.sort((a, b) => b.overlapPercent - a.overlapPercent)

  // 6) Ergebnis zusammensetzen
  const analyzedValue = directStockValue + decomposedEtfValue
  const sorted = Array.from(exposures.values()).sort(
    (a, b) => b.directValue + b.etfValue - (a.directValue + a.etfValue),
  )

  const topExposures: EffectiveExposure[] = sorted.slice(0, 30).map(agg => {
    const value = agg.directValue + agg.etfValue
    return {
      symbol: agg.symbol,
      name: agg.name,
      isin: agg.isin,
      value,
      percent: analyzedValue > 0 ? (value / analyzedValue) * 100 : 0,
      directValue: agg.directValue,
      etfValue: agg.etfValue,
      etfCount: agg.sources.size,
      sources: Array.from(agg.sources.values()).sort((a, b) => b.value - a.value),
    }
  })

  const toSlices = (map: Map<string, number>): WeightSlice[] => {
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    if (total <= 0) return []
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, percent: (value / total) * 100 }))
  }

  const base = {
    totalValue,
    analyzedValue,
    coveragePercent: totalValue > 0 ? (analyzedValue / totalValue) * 100 : 0,
    etfValue: etfTotalValue,
    directStockValue,
    topExposures,
    regions: toSlices(regionAgg),
    sectors: toSlices(sectorAgg),
    overlaps: overlaps.slice(0, 15),
    etfCoverage: etfCoverage.sort((a, b) => b.value - a.value),
  }

  return { ...base, insights: buildInsights(base, leveragedEtfs) }
}
