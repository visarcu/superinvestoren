// Ticker Resolver — Mappt Basis-Ticker auf die richtige Exchange
// z.B. BMW → BMW.DE (Xetra), NESN → NESN.SW (Swiss Exchange)
// Wird server-seitig in APIs genutzt um EU-Ticker aufzulösen

// ── Bekannte EU-Ticker Mappings ──────────────────────────────────────────────
// Format: 'BASIS_TICKER': { finnhub: 'TICKER.EX', fmp: 'TICKER.EX', name: '...', country: '...' }

interface TickerMapping {
  finnhub: string    // Finnhub-Format
  fmp: string        // FMP-Format
  name: string
  country: string
  currency: string
  isin?: string
}

const EU_TICKER_MAP: Record<string, TickerMapping> = {
  // === DEUTSCHLAND (Xetra = .DE) ===
  'BMW':    { finnhub: 'BMW.DE',    fmp: 'BMW.DE',    name: 'Bayerische Motoren Werke AG', country: 'DE', currency: 'EUR' },
  'VOW3':   { finnhub: 'VOW3.DE',   fmp: 'VOW3.DE',   name: 'Volkswagen AG Vz.', country: 'DE', currency: 'EUR' },
  'MBG':    { finnhub: 'MBG.DE',    fmp: 'MBG.DE',    name: 'Mercedes-Benz Group AG', country: 'DE', currency: 'EUR' },
  'SIE':    { finnhub: 'SIE.DE',    fmp: 'SIE.DE',    name: 'Siemens AG', country: 'DE', currency: 'EUR' },
  'ALV':    { finnhub: 'ALV.DE',    fmp: 'ALV.DE',    name: 'Allianz SE', country: 'DE', currency: 'EUR' },
  'BAS':    { finnhub: 'BAS.DE',    fmp: 'BAS.DE',    name: 'BASF SE', country: 'DE', currency: 'EUR' },
  'BAYN':   { finnhub: 'BAYN.DE',   fmp: 'BAYN.DE',   name: 'Bayer AG', country: 'DE', currency: 'EUR' },
  'DTE':    { finnhub: 'DTE.DE',    fmp: 'DTE.DE',    name: 'Deutsche Telekom AG', country: 'DE', currency: 'EUR' },
  'DBK':    { finnhub: 'DBK.DE',    fmp: 'DBK.DE',    name: 'Deutsche Bank AG', country: 'DE', currency: 'EUR' },
  'ADS':    { finnhub: 'ADS.DE',    fmp: 'ADS.DE',    name: 'adidas AG', country: 'DE', currency: 'EUR' },
  'IFX':    { finnhub: 'IFX.DE',    fmp: 'IFX.DE',    name: 'Infineon Technologies AG', country: 'DE', currency: 'EUR' },
  'MRK':    { finnhub: 'MRK.DE',    fmp: 'MRK.DE',    name: 'Merck KGaA', country: 'DE', currency: 'EUR' },
  'HEN3':   { finnhub: 'HEN3.DE',   fmp: 'HEN3.DE',   name: 'Henkel AG & Co. KGaA Vz.', country: 'DE', currency: 'EUR' },
  'RWE':    { finnhub: 'RWE.DE',    fmp: 'RWE.DE',    name: 'RWE AG', country: 'DE', currency: 'EUR' },
  'EON':    { finnhub: 'EOAN.DE',   fmp: 'EOAN.DE',   name: 'E.ON SE', country: 'DE', currency: 'EUR' },
  'FRE':    { finnhub: 'FRE.DE',    fmp: 'FRE.DE',    name: 'Fresenius SE & Co. KGaA', country: 'DE', currency: 'EUR' },
  'HEI':    { finnhub: 'HEI.DE',    fmp: 'HEI.DE',    name: 'HeidelbergCement AG', country: 'DE', currency: 'EUR' },
  'VNA':    { finnhub: 'VNA.DE',    fmp: 'VNA.DE',    name: 'Vonovia SE', country: 'DE', currency: 'EUR' },
  'P911':   { finnhub: 'P911.DE',   fmp: 'P911.DE',   name: 'Porsche AG Vz.', country: 'DE', currency: 'EUR' },
  'PAH3':   { finnhub: 'PAH3.DE',   fmp: 'PAH3.DE',   name: 'Porsche Automobil Holding SE', country: 'DE', currency: 'EUR' },
  'ZAL':    { finnhub: 'ZAL.DE',    fmp: 'ZAL.DE',    name: 'Zalando SE', country: 'DE', currency: 'EUR' },
  'DTG':    { finnhub: 'DTG.DE',    fmp: 'DTG.DE',    name: 'Daimler Truck Holding AG', country: 'DE', currency: 'EUR' },
  'AIR':    { finnhub: 'AIR.PA',    fmp: 'AIR.PA',    name: 'Airbus SE', country: 'NL', currency: 'EUR' },
  'RHM':    { finnhub: 'RHM.DE',    fmp: 'RHM.DE',    name: 'Rheinmetall AG', country: 'DE', currency: 'EUR' },

  // === FRANKREICH (Euronext Paris = .PA) ===
  'MC':     { finnhub: 'MC.PA',     fmp: 'MC.PA',     name: 'LVMH Moët Hennessy', country: 'FR', currency: 'EUR' },
  'OR':     { finnhub: 'OR.PA',     fmp: 'OR.PA',     name: "L'Oréal S.A.", country: 'FR', currency: 'EUR' },
  'TTE':    { finnhub: 'TTE.PA',    fmp: 'TTE.PA',    name: 'TotalEnergies SE', country: 'FR', currency: 'EUR' },
  'SAN':    { finnhub: 'SAN.PA',    fmp: 'SAN.PA',    name: 'Sanofi S.A.', country: 'FR', currency: 'EUR' },
  'BNP':    { finnhub: 'BNP.PA',    fmp: 'BNP.PA',    name: 'BNP Paribas S.A.', country: 'FR', currency: 'EUR' },
  'AI':     { finnhub: 'AI.PA',     fmp: 'AI.PA',     name: "Air Liquide S.A.", country: 'FR', currency: 'EUR' },
  'CDI':    { finnhub: 'CDI.PA',    fmp: 'CDI.PA',    name: 'Christian Dior SE', country: 'FR', currency: 'EUR' },
  'KER':    { finnhub: 'KER.PA',    fmp: 'KER.PA',    name: 'Kering SA', country: 'FR', currency: 'EUR' },
  'RMS':    { finnhub: 'RMS.PA',    fmp: 'RMS.PA',    name: 'Hermès International', country: 'FR', currency: 'EUR' },

  // === SCHWEIZ (SIX = .SW) ===
  'NESN':   { finnhub: 'NESN.SW',   fmp: 'NESN.SW',   name: 'Nestlé S.A.', country: 'CH', currency: 'CHF' },
  'NOVN':   { finnhub: 'NOVN.SW',   fmp: 'NOVN.SW',   name: 'Novartis AG', country: 'CH', currency: 'CHF' },
  'ROG':    { finnhub: 'ROG.SW',    fmp: 'ROG.SW',    name: 'Roche Holding AG', country: 'CH', currency: 'CHF' },
  'UBSG':   { finnhub: 'UBSG.SW',   fmp: 'UBSG.SW',   name: 'UBS Group AG', country: 'CH', currency: 'CHF' },
  'ABBN':   { finnhub: 'ABBN.SW',   fmp: 'ABBN.SW',   name: 'ABB Ltd', country: 'CH', currency: 'CHF' },
  'ZURN':   { finnhub: 'ZURN.SW',   fmp: 'ZURN.SW',   name: 'Zurich Insurance Group AG', country: 'CH', currency: 'CHF' },

  // === NIEDERLANDE (Euronext Amsterdam = .AS) ===
  'ASML':   { finnhub: 'ASML',      fmp: 'ASML',      name: 'ASML Holding N.V.', country: 'NL', currency: 'EUR' }, // Auch NYSE gelistet
  'PHIA':   { finnhub: 'PHIA.AS',   fmp: 'PHIA.AS',   name: 'Koninklijke Philips N.V.', country: 'NL', currency: 'EUR' },
  'UNA':    { finnhub: 'UNA.AS',    fmp: 'UNA.AS',    name: 'Unilever PLC', country: 'NL', currency: 'EUR' },
  'INGA':   { finnhub: 'INGA.AS',   fmp: 'INGA.AS',   name: 'ING Groep N.V.', country: 'NL', currency: 'EUR' },

  // === UK (London = .L) ===
  'SHEL':   { finnhub: 'SHEL.L',    fmp: 'SHEL.L',    name: 'Shell plc', country: 'GB', currency: 'GBP' },
  'AZN':    { finnhub: 'AZN',       fmp: 'AZN',       name: 'AstraZeneca PLC', country: 'GB', currency: 'GBP' }, // NYSE
  'HSBA':   { finnhub: 'HSBA.L',    fmp: 'HSBA.L',    name: 'HSBC Holdings plc', country: 'GB', currency: 'GBP' },
  'BP':     { finnhub: 'BP.L',      fmp: 'BP.L',      name: 'BP p.l.c.', country: 'GB', currency: 'GBP' },
  'GSK':    { finnhub: 'GSK',       fmp: 'GSK',       name: 'GSK plc', country: 'GB', currency: 'GBP' }, // NYSE
  'RIO':    { finnhub: 'RIO',       fmp: 'RIO',       name: 'Rio Tinto Group', country: 'GB', currency: 'GBP' }, // NYSE

  // === SPANIEN (BME = .MC) ===
  'ITX':    { finnhub: 'ITX.MC',    fmp: 'ITX.MC',    name: 'Industria de Diseño Textil (Inditex)', country: 'ES', currency: 'EUR' },
  'SAN_ES': { finnhub: 'SAN.MC',    fmp: 'SAN.MC',    name: 'Banco Santander S.A.', country: 'ES', currency: 'EUR' },
  'BBVA':   { finnhub: 'BBVA.MC',   fmp: 'BBVA.MC',   name: 'Banco Bilbao Vizcaya Argentaria', country: 'ES', currency: 'EUR' },
  'TEF':    { finnhub: 'TEF.MC',    fmp: 'TEF.MC',    name: 'Telefónica S.A.', country: 'ES', currency: 'EUR' },

  // === ITALIEN (BIT = .MI) ===
  'ENEL':   { finnhub: 'ENEL.MI',   fmp: 'ENEL.MI',   name: 'Enel S.p.A.', country: 'IT', currency: 'EUR' },
  'ISP':    { finnhub: 'ISP.MI',    fmp: 'ISP.MI',    name: 'Intesa Sanpaolo S.p.A.', country: 'IT', currency: 'EUR' },
  'UCG':    { finnhub: 'UCG.MI',    fmp: 'UCG.MI',    name: 'UniCredit S.p.A.', country: 'IT', currency: 'EUR' },

  // === DÄNEMARK (CSE = .CO) ===
  'NOVO':   { finnhub: 'NOVO-B.CO', fmp: 'NOVO-B.CO', name: 'Novo Nordisk A/S', country: 'DK', currency: 'DKK' },
}

// Auch mit .DE suffix matchen (falls jemand BMW.DE eingibt)
const SUFFIX_MAP: Record<string, string> = {}
for (const [base, mapping] of Object.entries(EU_TICKER_MAP)) {
  const suffix = mapping.fmp.includes('.') ? mapping.fmp : null
  if (suffix) {
    SUFFIX_MAP[suffix.toUpperCase()] = base
  }
}

/**
 * Löst einen Ticker zu seinem Exchange-spezifischen Format auf.
 * Gibt null zurück wenn kein Mapping existiert (= wahrscheinlich US-Ticker).
 */
export function resolveEUTicker(ticker: string): TickerMapping | null {
  const upper = ticker.toUpperCase()

  // Direkt im Mapping?
  if (EU_TICKER_MAP[upper]) return EU_TICKER_MAP[upper]

  // Schon mit Suffix eingegeben? (BMW.DE → BMW)
  if (SUFFIX_MAP[upper]) return EU_TICKER_MAP[SUFFIX_MAP[upper]]

  // Ticker hat schon einen Punkt-Suffix → wahrscheinlich schon korrekt
  if (upper.includes('.')) {
    // Versuche den Basis-Ticker
    const base = upper.split('.')[0]
    if (EU_TICKER_MAP[base]) return EU_TICKER_MAP[base]
  }

  return null
}

/**
 * Gibt den besten Ticker für FMP-Abfragen zurück.
 * Falls EU-Mapping existiert, wird der FMP-Ticker zurückgegeben.
 * Sonst der Original-Ticker (für US).
 */
export function resolveFMPTicker(ticker: string): string {
  const mapping = resolveEUTicker(ticker)
  return mapping?.fmp || ticker
}

/**
 * Gibt den besten Ticker für Finnhub-Abfragen zurück.
 */
export function resolveFinnhubTicker(ticker: string): string {
  const mapping = resolveEUTicker(ticker)
  return mapping?.finnhub || ticker
}

/**
 * Gibt Company-Info für EU-Ticker zurück (als Fallback wenn SEC nichts hat)
 */
export function getEUCompanyInfo(ticker: string): {
  name: string; country: string; currency: string; exchange: string
} | null {
  const mapping = resolveEUTicker(ticker)
  if (!mapping) return null

  const exchangeNames: Record<string, string> = {
    DE: 'Xetra', PA: 'Euronext Paris', SW: 'SIX Swiss Exchange',
    AS: 'Euronext Amsterdam', L: 'London Stock Exchange', MC: 'Bolsa de Madrid',
    MI: 'Borsa Italiana', CO: 'Nasdaq Copenhagen',
  }

  const suffix = mapping.fmp.split('.').pop() || ''
  return {
    name: mapping.name,
    country: mapping.country,
    currency: mapping.currency,
    exchange: exchangeNames[suffix] || suffix,
  }
}

/**
 * Prüft ob ein Ticker ein EU-Ticker ist
 */
export function isEUTicker(ticker: string): boolean {
  return resolveEUTicker(ticker) !== null
}
