// src/lib/marketData/symbols.ts
// Reine Symbol-Logik ohne Datenbank- oder Netzwerkabhängigkeit — damit sie
// sowohl in der App als auch in Skripten importierbar bleibt.

export function isIsin(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(value.toUpperCase())
}

/** Ticker-Suffix (unsere Schreibweise) → EODHD-Börsencode. */
export const SUFFIX_TO_EXCHANGE: Record<string, string> = {
  DE: 'XETRA',
  F: 'F',
  L: 'LSE',
  AS: 'AS',
  PA: 'PA',
  SW: 'SW',
  MI: 'MI',
  MC: 'MC',
  VI: 'VI',
  BR: 'BR',
  ST: 'ST',
  CO: 'CO',
  HE: 'HE',
  OL: 'OL',
  LS: 'LS',
  TO: 'TO',
  T: 'TSE',
  AX: 'AU',
}

const EXCHANGE_TO_YAHOO_SUFFIX: Record<string, string> = {
  XETRA: '.DE',
  F: '.F',
  LSE: '.L',
  AS: '.AS',
  PA: '.PA',
  SW: '.SW',
  MI: '.MI',
  MC: '.MC',
  VI: '.VI',
  BR: '.BR',
  ST: '.ST',
  CO: '.CO',
  HE: '.HE',
  OL: '.OL',
  LS: '.LS',
  TO: '.TO',
  US: '',
}

/** Yahoo-Schreibweise einer Notierung, oder null wenn die Börse dort unbekannt ist. */
export function yahooSymbolFor(code: string, exchange: string): string | null {
  const suffix = EXCHANGE_TO_YAHOO_SUFFIX[exchange?.toUpperCase()]
  if (suffix === undefined) return null
  return `${code}${suffix}`
}

// Handelsplätze, die zu einem angefragten Suffix passen. Ein '.DE'-Ticker darf
// von jedem deutschen Parkett bedient werden (Xetra, Frankfurt, Stuttgart …),
// aber niemals von der NASDAQ: 'DRH.DE' und 'DRH' (DiamondRock, US) sind
// verschiedene Unternehmen, und ein falsches Papier ist schlimmer als keins.
const GERMAN_VENUES = ['XETRA', 'XETR', 'F', 'STU', 'MU', 'HM', 'BE', 'DU', 'HA', 'TG', 'GER']
const US_VENUES = [
  'US', 'NASDAQ', 'NYSE', 'NYSE ARCA', 'NYSE MKT', 'AMEX', 'BATS',
  'PINK', 'OTCQB', 'OTCQX', 'OTCMKTS', 'OTCGREY', 'OTCCE', 'OTCBB', 'NMFQS',
]

const COMPATIBLE_VENUES: Record<string, string[]> = {
  XETRA: GERMAN_VENUES,
  F: GERMAN_VENUES,
  US: US_VENUES,
  LSE: ['LSE', 'IL'],
  AS: ['AS'],
  PA: ['PA'],
  SW: ['SW', 'VX'],
  MI: ['MI'],
  MC: ['MC'],
  VI: ['VI'],
  BR: ['BR'],
  ST: ['ST'],
  CO: ['CO'],
  HE: ['HE'],
  OL: ['OL'],
  LS: ['LS'],
  TO: ['TO', 'V'],
  TSE: ['TSE'],
  AU: ['AU'],
}

/**
 * Suffixe, die keine Börse bezeichnen, sondern eine Broker-Sammelkategorie.
 * Freedom24 exportiert '.EU' für alle europäischen Handelsplätze.
 *
 * Die Reihenfolge bestimmt, welche Notierung gewählt wird, wenn es mehrere gibt.
 * Xetra zuerst (EUR, beste Datenlage), London vor der Schweiz.
 */
const PSEUDO_SUFFIX_VENUES: Record<string, string[]> = {
  EU: ['.DE', '.F', '.AS', '.PA', '.L', '.SW', '.MI', '.MC', '.VI', '.BR'],
}

export function hasPseudoSuffix(symbol: string): boolean {
  const parts = symbol.toUpperCase().split('.')
  return parts.length > 1 && Boolean(PSEUDO_SUFFIX_VENUES[parts[parts.length - 1]])
}

/**
 * Kandidaten für ein Pseudo-Suffix — immer derselbe Basis-Code, nur an echten
 * Börsen. Ein Wechsel des Codes ist ausgeschlossen: 'CSKR.EU' und 'CEBJ.DE'
 * tragen laut Anbieter zwar dieselbe ISIN, notieren aber bei 431 USD bzw.
 * 141 EUR — wer da rät, zeigt dem Nutzer einen erfundenen Verlust.
 */
export function pseudoSuffixCandidates(symbol: string): string[] {
  const upper = symbol.toUpperCase()
  const parts = upper.split('.')
  const suffix = parts[parts.length - 1]
  const venues = PSEUDO_SUFFIX_VENUES[suffix]
  if (!venues) return []
  const base = parts.slice(0, -1).join('.')
  return venues.map(v => `${base}${v}`)
}

/** Darf `exchange` das angefragte Symbol bedienen? */
export function isCompatibleExchange(requestedSymbol: string, exchange: string | null | undefined): boolean {
  if (!exchange) return false
  const parts = requestedSymbol.toUpperCase().split('.')
  const namespace = parts.length > 1 ? SUFFIX_TO_EXCHANGE[parts[parts.length - 1]] : 'US'
  if (!namespace) return false
  const allowed = COMPATIBLE_VENUES[namespace]
  if (!allowed) return false
  return allowed.includes(exchange.toUpperCase())
}

/**
 * EODHD-Symbol → Yahoo-Schreibweise (VGWD.XETRA → VGWD.DE).
 *
 * Wichtig für den Ausfall-Fall: Fällt EODHD aus, ist Yahoo die einzige Quelle
 * für viele Xetra-Papiere — aber nur unter dem echten Börsenticker. Der
 * Broker-Alias (VHYL.DE) existiert dort nicht.
 */
export function yahooSymbolFromEodhd(eodhdSymbol: string | null | undefined): string | null {
  if (!eodhdSymbol || !eodhdSymbol.includes('.')) return null
  const idx = eodhdSymbol.lastIndexOf('.')
  return yahooSymbolFor(eodhdSymbol.slice(0, idx), eodhdSymbol.slice(idx + 1))
}

export function mapType(type: string | null | undefined): string {
  const t = (type || '').toLowerCase()
  if (t.includes('etf')) return 'etf'
  if (t.includes('etc')) return 'etc'
  if (t.includes('fund')) return 'fund'
  if (t.includes('stock')) return 'stock'
  if (t.includes('index')) return 'index'
  return 'unknown'
}

/**
 * Wahl der Hauptnotierung. Das angefragte Suffix gewinnt, sonst entscheidet die
 * ISIN-Herkunft: US-Papiere am US-Markt, europäische bevorzugt an Xetra.
 */
export function pickPreferredListing<T extends { Code: string; Exchange: string; ISIN?: string | null }>(
  hits: T[],
  requestedSymbol?: string
): T | null {
  if (hits.length === 0) return null

  const suffix = requestedSymbol?.includes('.') ? requestedSymbol.split('.').pop()!.toUpperCase() : null
  const suffixExchange = suffix ? SUFFIX_TO_EXCHANGE[suffix] : null
  if (suffixExchange) {
    const match = hits.find(h => h.Exchange?.toUpperCase() === suffixExchange)
    if (match) return match
  }

  const isin = hits.find(h => h.ISIN)?.ISIN || ''
  const order = isin.toUpperCase().startsWith('US')
    ? ['US', 'XETRA', 'F', 'LSE']
    : ['XETRA', 'F', 'AS', 'PA', 'SW', 'LSE', 'US']

  for (const exchange of order) {
    const match = hits.find(h => h.Exchange?.toUpperCase() === exchange)
    if (match) return match
  }
  return hits[0]
}
