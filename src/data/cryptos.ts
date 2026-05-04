// src/data/cryptos.ts
//
// Top-Krypto-Assets für Portfolio-Tracking.
// FMP-Symbol-Format: <BASE>USD (z.B. BTCUSD), kompatibel mit
// /api/v3/quote/{symbol} und /api/v3/historical-price-full/{symbol}.
//
// Pflege: Wenn neue Coins gefragt werden, einfach Eintrag adden.
// Aliasse helfen der Suche (z.B. "Bitcoin" → BTCUSD).

export interface CryptoEntry {
  symbol: string // FMP-Symbol, z.B. "BTCUSD"
  name: string
  base: string // Coin-Code, z.B. "BTC"
  aliases?: string[] // alternative Suchbegriffe
}

export const cryptos: CryptoEntry[] = [
  { symbol: 'BTCUSD',  name: 'Bitcoin',           base: 'BTC',  aliases: ['Bitcoin', 'XBT'] },
  { symbol: 'ETHUSD',  name: 'Ethereum',          base: 'ETH',  aliases: ['Ether'] },
  { symbol: 'XRPUSD',  name: 'XRP',               base: 'XRP',  aliases: ['Ripple'] },
  { symbol: 'SOLUSD',  name: 'Solana',            base: 'SOL' },
  { symbol: 'BNBUSD',  name: 'BNB',               base: 'BNB',  aliases: ['Binance Coin'] },
  { symbol: 'ADAUSD',  name: 'Cardano',           base: 'ADA' },
  { symbol: 'DOGEUSD', name: 'Dogecoin',          base: 'DOGE' },
  { symbol: 'AVAXUSD', name: 'Avalanche',         base: 'AVAX' },
  { symbol: 'TRXUSD',  name: 'TRON',              base: 'TRX',  aliases: ['Tron'] },
  { symbol: 'DOTUSD',  name: 'Polkadot',          base: 'DOT' },
  { symbol: 'LINKUSD', name: 'Chainlink',         base: 'LINK' },
  { symbol: 'LTCUSD',  name: 'Litecoin',          base: 'LTC' },
  { symbol: 'MATICUSD',name: 'Polygon',           base: 'MATIC' },
  { symbol: 'BCHUSD',  name: 'Bitcoin Cash',      base: 'BCH' },
  { symbol: 'ATOMUSD', name: 'Cosmos',            base: 'ATOM' },
  { symbol: 'XLMUSD',  name: 'Stellar',           base: 'XLM' },
  { symbol: 'NEARUSD', name: 'NEAR Protocol',     base: 'NEAR', aliases: ['Near'] },
  { symbol: 'UNIUSD',  name: 'Uniswap',           base: 'UNI' },
  { symbol: 'USDCUSD', name: 'USD Coin',          base: 'USDC',  aliases: ['USDC'] },
  { symbol: 'USDTUSD', name: 'Tether',            base: 'USDT',  aliases: ['Tether USD'] },
]

/**
 * Findet Krypto-Einträge per Symbol/Base/Name/Alias-Match.
 * Ranking: exakter Symbol-Match → Base-Prefix → Name-Prefix → Name-Substring → Alias.
 */
export function searchCryptos(query: string, limit = 5): CryptoEntry[] {
  const q = query.trim().toUpperCase()
  if (!q) return []

  const score = (c: CryptoEntry): number => {
    if (c.symbol === q) return 0
    if (c.base === q) return 1
    if (c.symbol.startsWith(q)) return 2
    if (c.base.startsWith(q)) return 3
    if (c.name.toUpperCase().startsWith(q)) return 4
    if (c.name.toUpperCase().includes(q)) return 5
    if (c.aliases?.some(a => a.toUpperCase() === q)) return 6
    if (c.aliases?.some(a => a.toUpperCase().startsWith(q))) return 7
    if (c.aliases?.some(a => a.toUpperCase().includes(q))) return 8
    return 999
  }

  return cryptos
    .map(c => ({ entry: c, s: score(c) }))
    .filter(x => x.s < 999)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map(x => x.entry)
}

/**
 * Prüft ob ein Symbol ein bekanntes Krypto-Asset ist.
 * Wird von der Detail-Page / Pricing-Pipeline genutzt um zu entscheiden
 * ob FMP /api/v3/quote/{symbol} mit dem Crypto-Endpoint befragt wird.
 */
export function isCryptoSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase()
  return cryptos.some(c => c.symbol === upper)
}

export function getCryptoBySymbol(symbol: string): CryptoEntry | undefined {
  const upper = symbol.toUpperCase()
  return cryptos.find(c => c.symbol === upper)
}
