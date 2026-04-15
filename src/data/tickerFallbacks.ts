/**
 * tickerFallbacks.ts
 *
 * Manuelle Pflege-Datei für Tickers die FMP auf XETRA (.DE) nicht zuverlässig abdeckt.
 *
 * === WIE PFLEGEN ===
 *
 * Wenn ein User meldet "Kurs nicht verfügbar für XYZ.DE":
 *
 * 1. Suche den Ticker auf justetf.com oder londonstockexchange.com
 * 2. Prüfe ob er auf LSE (.L) oder Euronext Amsterdam (.AS) verfügbar ist
 * 3. Füge ihn in EXCHANGE_FALLBACKS ein:
 *
 *    'XYZ.DE': { symbol: 'XYZ.L', exchange: 'GBp' }   // LSE in Pence
 *    'XYZ.DE': { symbol: 'XYZ.L', exchange: 'GBP' }   // LSE in Pfund (selten)
 *    'XYZ.DE': { symbol: 'XYZ.AS', exchange: 'EUR' }  // Amsterdam in EUR (kein Umrechnen nötig)
 *
 * Hinweis: GBp = Pence (wird automatisch /100 * GBP/EUR umgerechnet)
 *          GBP = Pfund (wird automatisch * GBP/EUR umgerechnet)
 *          EUR = kein Umrechnen nötig
 *
 * === FÜR US-LISTINGS (.DE Ticker aber eigentlich NYSE/NASDAQ) ===
 *
 * Wenn ein Ticker als .DE gespeichert ist, aber eigentlich ein US-Listing:
 * Trage ihn in YAHOO_ALIASES ein:
 *
 *    'TOJ.DE': 'RIG'     // XETRA-Ticker → NYSE-Symbol (wird USD→EUR umgerechnet)
 *    'MICC.DE': 'MICC'   // kein XETRA, NYSE-Listing
 */

export const EXCHANGE_FALLBACKS: Record<string, { symbol: string; exchange: 'EUR' | 'GBp' | 'GBP' }> = {
  // === VANGUARD ===
  'VHYL.DE': { symbol: 'VHYL.AS', exchange: 'EUR' },   // Vanguard FTSE All-World High Div — Amsterdam
  'VWRL.DE': { symbol: 'VWRL.L',  exchange: 'GBp' },   // Vanguard FTSE All-World — LSE
  'VWCE.DE': { symbol: 'VWCE.L',  exchange: 'GBp' },   // Vanguard FTSE All-World Acc — LSE

  // === iSHARES ===
  'IEMA.DE': { symbol: 'IEMA.L',  exchange: 'GBp' },   // iShares MSCI EM UCITS ETF
  'IUIT.DE': { symbol: 'IUIT.L',  exchange: 'GBp' },   // iShares S&P 500 IT Sector
  'CSPX.DE': { symbol: 'CSPX.L',  exchange: 'GBp' },   // iShares Core S&P 500
  'SWDA.DE': { symbol: 'SWDA.L',  exchange: 'GBp' },   // iShares Core MSCI World
  'HMWO.DE': { symbol: 'HMWO.L',  exchange: 'GBp' },   // HSBC MSCI World
  'WSML.DE': { symbol: 'WSML.L',  exchange: 'GBp' },   // iShares MSCI World Small Cap

  // === INVESCO ===
  'EQQQ.DE': { symbol: 'EQQQ.L',  exchange: 'GBp' },   // Invesco NASDAQ-100
  'SPGP.DE': { symbol: 'SPGP.L',  exchange: 'GBp' },   // Invesco S&P 500 GARP
  'FWRG.DE': { symbol: 'FWRG.L',  exchange: 'GBp' },   // Invesco FTSE All-World
  'FWIA.DE': { symbol: 'FWRA.L',  exchange: 'GBP' },   // Invesco FTSE All-World Acc (GBP, nicht GBp)
  'FWIA.EU': { symbol: 'FWRA.L',  exchange: 'GBP' },   // Freedom24-Ticker für Invesco FTSE All-World

  // === VANECK ===
  'NUKL.DE': { symbol: 'NUKL.L',  exchange: 'GBp' },   // VanEck Uranium and Nuclear Technologies

  // === GLOBAL X ===
  'QYLE.DE': { symbol: 'QYLE.L',  exchange: 'GBp' },   // Global X Nasdaq 100 Covered Call

  // === EINZELAKTIEN ===
  'BHP.DE':  { symbol: 'BHP.L',   exchange: 'GBp' },   // BHP Group
}

/**
 * Yahoo Finance Fallback-Aliases.
 * Nur für Tickers die weder FMP direkt noch über EXCHANGE_FALLBACKS abdeckt.
 * Meistens: XETRA-Ticker für US-Listings, oder Freiverkehr.
 */
export const YAHOO_ALIASES: Record<string, string> = {
  'NLM.DE':  'NLM.F',   // FRoSTA AG — nur im Freiverkehr Frankfurt
  'TOJ.DE':  'RIG',     // Transocean — XETRA-Ticker TOJ, Hauptlisting NYSE (USD→EUR)
  'MICC.DE': 'MICC',    // Magnum Ice Cream — kein XETRA-Ticker, NYSE-Listing
}
