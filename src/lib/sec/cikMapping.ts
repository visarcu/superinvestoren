// src/lib/sec/cikMapping.ts
// Ticker → CIK Auto-Lookup für SEC EDGAR XBRL API
// Lädt automatisch ALLE ~10.000 US-Ticker von der SEC.
// Hardcoded Overrides nur für Sonderfälle (z.B. BRK.B, GOOG/GOOGL).

// ─── Hardcoded Overrides (Sonderfälle) ───────────────────────────────────────
// Nur für Ticker die in der SEC-Datei anders heißen oder mehrere Klassen haben.

const TICKER_OVERRIDES: Record<string, string> = {
  GOOG: '1652044',      // Alphabet Class C (SEC listet nur GOOGL)
  'BRK.B': '1067983',
  'BRK-B': '1067983',
  BRK_B: '1067983',

  // ── EU-Firmen mit SEC 20-F Filings ─────────────────────────
  // Diese europäischen Firmen haben US-Listings und filen bei der SEC
  SAP: '1000184',         // SAP SE (NYSE: SAP)
  'SAP.DE': '1000184',
  ASML: '937966',         // ASML Holding NV (NASDAQ: ASML)
  'ASML.AS': '937966',
  AZN: '901832',          // AstraZeneca PLC (NYSE: AZN)
  'AZN.L': '901832',
  HSBC: '1089113',        // HSBC Holdings PLC (NYSE: HSBC)
  'HSBA.L': '1089113',
  NVS: '1114448',         // Novartis AG (NYSE: NVS)
  'NOVN.SW': '1114448',
  NOVN: '1114448',
  SHEL: '1306965',        // Shell plc (NYSE: SHEL)
  'SHEL.L': '1306965',
  NVO: '353278',          // Novo Nordisk A/S (NYSE: NVO)
  'NOVO-B.CO': '353278',
  NOVO: '353278',
  UL: '217410',           // Unilever PLC (NYSE: UL)
  'UNA.AS': '217410',
  UNA: '217410',
  GSK: '1660568',         // GSK plc (NYSE: GSK)
  'GSK.L': '1660568',
  RIO: '1370418',         // Rio Tinto (NYSE: RIO)
  BP: '313807',           // BP p.l.c. (NYSE: BP)
  'BP.L': '313807',
  DEO: '807073',          // Diageo plc (NYSE: DEO)
  BUD: '1367693',         // Anheuser-Busch InBev (NYSE: BUD)
  ABB: '1889437',         // ABB Ltd (NYSE: ABB)
  'ABBN.SW': '1889437',
}

// ─── Auto-Lookup Cache ───────────────────────────────────────────────────────

interface SecTickerEntry {
  cik_str: string
  ticker: string
  title: string
}

let tickerMap: Map<string, string> | null = null
let tickerMapTimestamp = 0
const TICKER_MAP_TTL = 24 * 60 * 60 * 1000 // 24 Stunden

/**
 * Lädt die offizielle SEC Ticker→CIK Mapping-Datei.
 * ~10.000 Einträge, gecacht für 24 Stunden.
 */
async function loadTickerMap(): Promise<Map<string, string>> {
  if (tickerMap && Date.now() - tickerMapTimestamp < TICKER_MAP_TTL) {
    return tickerMap
  }

  try {
    const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': 'Finclue research@finclue.de' },
    })

    if (!res.ok) {
      throw new Error(`SEC ticker file fetch failed: ${res.status}`)
    }

    const data: Record<string, SecTickerEntry> = await res.json()
    const map = new Map<string, string>()

    for (const entry of Object.values(data)) {
      map.set(entry.ticker.toUpperCase(), String(entry.cik_str))
    }

    tickerMap = map
    tickerMapTimestamp = Date.now()

    console.log(`✅ SEC Ticker Map geladen: ${map.size} Unternehmen`)
    return map
  } catch (error) {
    console.error('❌ SEC Ticker Map laden fehlgeschlagen:', error)

    // Fallback: leere Map wenn SEC nicht erreichbar
    if (tickerMap) return tickerMap // Alte Daten nutzen
    return new Map()
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Holt die CIK für einen Ticker.
 * 1. Prüft Overrides (Sonderfälle wie BRK.B, GOOG)
 * 2. Sucht in der SEC Ticker-Datei (~10.000 Unternehmen)
 * Gibt null zurück wenn der Ticker nicht gefunden wird.
 */
export async function getCIK(ticker: string): Promise<string | null> {
  const normalized = ticker.toUpperCase().trim()

  // 1. Overrides prüfen
  if (TICKER_OVERRIDES[normalized]) {
    return TICKER_OVERRIDES[normalized]
  }

  // 2. SEC Ticker Map
  const map = await loadTickerMap()
  return map.get(normalized) || null
}

/**
 * Formatiert CIK auf 10 Stellen mit führenden Nullen (SEC Standard).
 */
export function padCIK(cik: string): string {
  return cik.padStart(10, '0')
}

/**
 * Alle verfügbaren Ticker (aus dem Cache).
 */
export async function getAvailableTickers(): Promise<string[]> {
  const map = await loadTickerMap()
  return Array.from(map.keys()).sort()
}

/**
 * Schnelle synchrone Version – gibt bekannte Ticker zurück.
 * Für API-Responses wo async nicht ideal ist.
 */
export function getAvailableTickersSync(): string[] {
  if (!tickerMap) return []
  return Array.from(tickerMap.keys()).sort()
}

/**
 * SEC XBRL API URL für ein Unternehmen.
 */
export function getXbrlUrl(cik: string): string {
  return `https://data.sec.gov/api/xbrl/companyfacts/CIK${padCIK(cik)}.json`
}
