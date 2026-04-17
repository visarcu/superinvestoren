// scripts/validateEtfPrices.ts
//
// Validiert dass für jeden etfMaster-Eintrag über die definierte priceSource
// ein plausibler Preis abrufbar ist.
//
// Laufzeit: `npm run validate:etf-prices`
// Benötigt: FMP_API_KEY in .env

import { etfMaster, type ETFMasterEntry, type PriceSource } from '../src/data/etfMaster'

const FMP_API_KEY = process.env.FMP_API_KEY

async function fetchFmpQuote(symbol: string): Promise<number | null> {
  try {
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_API_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    if (Array.isArray(data) && data[0]?.price > 0) return data[0].price
    return null
  } catch {
    return null
  }
}

async function fetchYahooQuote(symbol: string): Promise<{ price: number; currency: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&region=DE`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    const price = meta?.regularMarketPrice
    if (!price || price <= 0) return null
    return { price, currency: meta?.currency || 'EUR' }
  } catch {
    return null
  }
}

async function fetchGbpEurRate(): Promise<number> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/fx/GBPEUR?apikey=${FMP_API_KEY}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data[0]?.ask) return data[0].ask
    }
  } catch { /* Fallback */ }
  return 1.17
}

async function fetchPriceForEntry(
  entry: ETFMasterEntry,
  gbpEurRate: number,
): Promise<{ eurPrice: number; rawPrice: number; source: string } | null> {
  const ps = entry.priceSource

  if (ps.type === 'fmp_direct') {
    const price = await fetchFmpQuote(entry.xetraTicker)
    if (price) return { eurPrice: price, rawPrice: price, source: `FMP:${entry.xetraTicker}` }
    return null
  }

  if (ps.type === 'fmp_alt') {
    const rawPrice = await fetchFmpQuote(ps.ticker)
    if (!rawPrice) return null
    let eurPrice = rawPrice
    if (ps.exchange === 'GBp') eurPrice = (rawPrice / 100) * gbpEurRate
    else if (ps.exchange === 'GBP') eurPrice = rawPrice * gbpEurRate
    return { eurPrice, rawPrice, source: `FMP:${ps.ticker} (${ps.exchange})` }
  }

  if (ps.type === 'yahoo') {
    const ticker = ps.ticker || entry.xetraTicker
    const result = await fetchYahooQuote(ticker)
    if (!result) return null
    return { eurPrice: result.price, rawPrice: result.price, source: `Yahoo:${ticker} (${result.currency})` }
  }

  return null
}

async function main() {
  if (!FMP_API_KEY) {
    console.error('FMP_API_KEY nicht gesetzt. Bitte .env laden.')
    process.exit(1)
  }

  console.log(`Validiere ${etfMaster.length} etfMaster-Einträge...\n`)

  const gbpEurRate = await fetchGbpEurRate()
  console.log(`GBP/EUR Rate: ${gbpEurRate.toFixed(4)}\n`)

  let failures = 0
  let warnings = 0

  for (const entry of etfMaster) {
    const result = await fetchPriceForEntry(entry, gbpEurRate)

    if (!result) {
      console.error(`FAIL  ${entry.xetraTicker.padEnd(12)} (${entry.isin}) — kein Preis von ${entry.priceSource.type}`)
      failures++
      continue
    }

    if (result.eurPrice <= 0) {
      console.error(`FAIL  ${entry.xetraTicker.padEnd(12)} — Preis=${result.eurPrice} (muss > 0 sein)`)
      failures++
      continue
    }

    if (result.eurPrice > 50000) {
      console.warn(`WARN  ${entry.xetraTicker.padEnd(12)} — ${result.eurPrice.toFixed(2)} EUR (ungewöhnlich hoch)`)
      warnings++
      continue
    }

    console.log(`  OK  ${entry.xetraTicker.padEnd(12)} ${result.eurPrice.toFixed(2).padStart(10)} EUR  ← ${result.source}`)

    // Cross-Check für fmp_alt: auch XETRA-Ticker direkt probieren
    if (entry.priceSource.type === 'fmp_alt') {
      const directPrice = await fetchFmpQuote(entry.xetraTicker)
      if (directPrice && directPrice > 0) {
        const diff = Math.abs(result.eurPrice - directPrice) / result.eurPrice * 100
        if (diff > 10) {
          console.warn(`      ⚠ Cross-Check: FMP direkt liefert ${directPrice.toFixed(2)} EUR (${diff.toFixed(1)}% Abweichung) — priceSource korrekt?`)
          warnings++
        }
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Ergebnis: ${etfMaster.length - failures} OK, ${failures} Fehler, ${warnings} Warnungen`)

  if (failures > 0) {
    console.error('\n❌ Validierung fehlgeschlagen.\n')
    process.exit(1)
  }

  console.log('\n✓ Alle Preise validiert.\n')
}

main()
