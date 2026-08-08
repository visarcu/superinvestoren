// scripts/seedInstruments.ts
// Befüllt die Instrumenten-Stammdaten (`instruments` / `instrument_aliases`)
// aus den EODHD-Börsenverzeichnissen und den bestehenden Ticker-Tabellen.
//
// Damit ersetzt ein automatisch gepflegter Stammsatz die handgeschriebenen
// Sonderfall-Listen: Schlüssel ist die ISIN, je Börse hängt das passende Symbol
// daran, und Broker-Ticker (VHYL.DE, VHYD.DE …) zeigen als Alias darauf.
//
// Laufzeit: `npm run seed:instruments`
//           `npm run seed:instruments -- --exchanges=XETRA,US`

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { fetchExchangeSymbols, normalizeEodhdCurrency, type EodhdSymbolRow } from '../src/lib/marketData/providers/eodhd'
// Bewusst aus symbols.ts statt instrumentStore.ts: letzteres zieht den
// Supabase-Admin-Client, der zum Import-Zeitpunkt noch keine Env-Variablen hat.
import { isCompatibleExchange, mapType, yahooSymbolFor } from '../src/lib/marketData/symbols'
import { etfMaster } from '../src/data/etfMaster'
import { xetraETFs } from '../src/data/xetraETFsComplete'
import { EXCHANGE_FALLBACKS } from '../src/data/tickerFallbacks'

// Reihenfolge = Priorität der Hauptnotierung. Xetra zuerst: unsere Depots und
// der CSV-Import arbeiten mit deutschen Tickern.
const DEFAULT_EXCHANGES = ['XETRA', 'F', 'AS', 'PA', 'SW', 'LSE', 'US']

// Die US-Liste führt in `Exchange` den Handelsplatz (NASDAQ, NYSE, PINK …),
// nicht den Namensraum, unter dem EODHD Kurse ausliefert (AAPL.US).
// Gleichzeitig stecken darin 25k NMFQS- und 12k OTC-Zeilen, die niemand hält
// und die nur Ticker-Kollisionen erzeugen — daher die Whitelist.
const US_VENUES = new Set(['US', 'NASDAQ', 'NYSE', 'NYSE ARCA', 'NYSE MKT', 'AMEX', 'BATS'])

function acceptRow(namespace: string, row: EodhdSymbolRow): boolean {
  if (namespace !== 'US') return true
  return US_VENUES.has((row.Exchange || '').toUpperCase())
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface InstrumentRecord {
  isin: string
  name: string
  type: string
  currency: string
  exchange: string
  eodhd_symbol: string
  yahoo_symbol: string | null
  source: string
  verified: boolean
}

/** Ein Alias zeigt auf eine konkrete Notierung, nicht nur auf die ISIN. */
interface AliasRecord {
  isin: string
  eodhd_symbol: string
  currency: string
  exchange: string
}

async function main() {
  const arg = process.argv.find(a => a.startsWith('--exchanges='))
  const exchanges = arg ? arg.split('=')[1].split(',').map(e => e.trim().toUpperCase()) : DEFAULT_EXCHANGES

  if (!process.env.EODHD_API_KEY) {
    console.error('EODHD_API_KEY fehlt — ohne den Key gibt es keine Börsenverzeichnisse.')
    process.exit(1)
  }

  console.log(`Börsen: ${exchanges.join(', ')}\n`)

  const instruments = new Map<string, InstrumentRecord>()
  const aliases = new Map<string, AliasRecord>()

  for (const namespace of exchanges) {
    const rows = await fetchExchangeSymbols(namespace)
    const usable = rows.filter(
      (r: EodhdSymbolRow) => r.Isin && isIsin(r.Isin) && acceptRow(namespace, r)
    )
    let added = 0

    for (const row of usable) {
      const isin = row.Isin!.toUpperCase()
      // Namensraum statt Handelsplatz: EODHD liefert Kurse unter AAPL.US,
      // nicht unter AAPL.NASDAQ.
      const eodhdSymbol = `${row.Code}.${namespace}`
      const yahooSymbol = yahooSymbolFor(row.Code, namespace)
      const currency = normalizeEodhdCurrency(row.Currency, namespace)

      // Erste Börse in der Prioritätsliste gewinnt als Hauptnotierung …
      if (!instruments.has(isin)) {
        instruments.set(isin, {
          isin,
          name: row.Name || row.Code,
          type: mapType(row.Type),
          currency,
          exchange: namespace,
          eodhd_symbol: eodhdSymbol,
          yahoo_symbol: yahooSymbol,
          source: 'exchange_list',
          verified: true,
        })
        added++
      }

      // … jede Notierung bekommt ihren eigenen Alias samt Kursquelle und
      // Währung. 'AAPL' bewertet damit in USD an der NASDAQ, 'AAPL.DE' in EUR
      // an Xetra — sonst würde jede Zweitnotierung zum Kurs der Hauptbörse
      // bewertet werden.
      const listing = { isin, eodhd_symbol: eodhdSymbol, currency, exchange: namespace }
      if (yahooSymbol && !aliases.has(yahooSymbol.toUpperCase())) {
        aliases.set(yahooSymbol.toUpperCase(), listing)
      }
      if (!aliases.has(eodhdSymbol.toUpperCase())) {
        aliases.set(eodhdSymbol.toUpperCase(), listing)
      }
    }

    console.log(
      `${namespace.padEnd(6)} ${String(rows.length).padStart(6)} Zeilen · ${String(usable.length).padStart(6)} verwertbar · ${String(added).padStart(6)} neue Instrumente`
    )
  }

  // Legacy-Ticker aus den handgepflegten Tabellen als Alias übernehmen.
  // Diese Symbole stecken in bestehenden Depots und müssen weiter auflösen.
  // Ein Legacy-Ticker wie VHYL.DE existiert an keiner Börse — er zeigt auf die
  // Hauptnotierung der ISIN, damit bestehende Depots weiter bewertet werden.
  let legacy = 0
  const addLegacyAlias = (alias: string, isin: string) => {
    const key = alias.toUpperCase()
    const upperIsin = isin.toUpperCase()
    const instrument = instruments.get(upperIsin)
    if (!instrument) return
    if (aliases.has(key)) return
    aliases.set(key, {
      isin: upperIsin,
      eodhd_symbol: instrument.eodhd_symbol,
      currency: instrument.currency,
      exchange: instrument.exchange,
    })
    legacy++
  }

  for (const entry of etfMaster) {
    addLegacyAlias(entry.xetraTicker, entry.isin)
  }
  for (const etf of xetraETFs) {
    if (etf.isin && etf.symbol) addLegacyAlias(etf.symbol, etf.isin)
  }
  // Broker-Aliase ohne eigene ISIN (VHYD.DE → dieselbe ISIN wie VHYL.DE)
  for (const [alias, target] of Object.entries(EXCHANGE_FALLBACKS)) {
    const known = aliases.get(target.symbol.toUpperCase()) || aliases.get(alias.toUpperCase())
    if (known) addLegacyAlias(alias, known.isin)
  }

  // Stärkstes Signal zum Schluss: die ISIN, die der Broker beim Import zum
  // Symbol geliefert hat. Sie schlägt jede geratene Ticker-Zuordnung — dadurch
  // zeigt z.B. DRH.DE auf DroneShield (AU000000DRO2) und nicht auf den
  // gleichnamigen US-Wert.
  const brokerAliases = await anchorFromHoldings(aliases)
  console.log(`Aliase aus Depot-ISINs verankert: ${brokerAliases}`)

  console.log(`\nLegacy-Aliase aus etfMaster/xetraETFs/tickerFallbacks: ${legacy}`)
  console.log(`Instrumente gesamt: ${instruments.size} · Aliase gesamt: ${aliases.size}\n`)

  await upsertChunked('instruments', [...instruments.values()], 'isin')
  await upsertChunked(
    'instrument_aliases',
    [...aliases.entries()].map(([alias, listing]) => ({
      alias,
      isin: listing.isin,
      eodhd_symbol: listing.eodhd_symbol,
      currency: listing.currency,
      exchange: listing.exchange,
      source: 'exchange_list',
    })),
    'alias'
  )

  await reportCoverage()
}

/**
 * Verankert jedes real gehaltene Symbol an der ISIN, die der Broker mitgeliefert
 * hat — und zwar an der Notierung, die zum Suffix des Symbols passt.
 */
async function anchorFromHoldings(aliases: Map<string, AliasRecord>): Promise<number> {
  const { data } = await supabase
    .from('portfolio_holdings')
    .select('symbol, isin')
    .not('isin', 'is', null)

  const pairs = new Map<string, string>()
  for (const row of (data || []) as { symbol: string | null; isin: string | null }[]) {
    const symbol = String(row.symbol || '').toUpperCase()
    const isin = String(row.isin || '').toUpperCase()
    if (symbol && isIsin(isin)) pairs.set(symbol, isin)
  }
  if (pairs.size === 0) return 0

  // Index ISIN → vorhandene Notierungen, um die passende Börse zu wählen.
  const byIsin = new Map<string, AliasRecord[]>()
  for (const listing of aliases.values()) {
    const list = byIsin.get(listing.isin) || []
    list.push(listing)
    byIsin.set(listing.isin, list)
  }

  let anchored = 0
  for (const [symbol, isin] of pairs) {
    const listings = byIsin.get(isin)
    if (!listings || listings.length === 0) continue

    const match =
      listings.find(l => isCompatibleExchange(symbol, l.exchange)) || listings[0]

    const current = aliases.get(symbol)
    if (current && current.isin === isin && current.eodhd_symbol === match.eodhd_symbol) continue

    aliases.set(symbol, match)
    anchored++
  }
  return anchored
}

async function upsertChunked(table: string, rows: any[], conflict: string): Promise<number> {
  const CHUNK = 1000
  let done = 0
  const failed: number[] = []

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    // Netzwerkfehler kommen bei ~50 aufeinanderfolgenden Requests vor; ohne
    // Wiederholung fehlen ganze Blöcke und die Aliase laufen danach in
    // Fremdschlüsselfehler.
    let ok = false
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict })
      if (!error) { ok = true; break }
      if (attempt === 3) {
        failed.push(i)
        console.error(`\n${table}: Chunk ab ${i} endgültig fehlgeschlagen — ${error.message}`)
      } else {
        await new Promise(r => setTimeout(r, 500 * attempt))
      }
    }
    if (ok) done += chunk.length
    process.stdout.write(`\r${table}: ${done}/${rows.length}`)
  }

  process.stdout.write(`\r${table}: ${done}/${rows.length} gespeichert${failed.length ? ` (${failed.length} Chunks fehlerhaft)` : ''}\n`)
  return done
}

/** Zeigt, wie viele der real gehaltenen Symbole jetzt auflösen. */
async function reportCoverage() {
  const { data: holdings } = await supabase.from('portfolio_holdings').select('symbol')
  const symbols = [...new Set((holdings || []).map((h: any) => String(h.symbol || '').toUpperCase()).filter(Boolean))]
  if (symbols.length === 0) return

  const resolved = new Set<string>()
  for (let i = 0; i < symbols.length; i += 500) {
    const { data } = await supabase
      .from('instrument_aliases')
      .select('alias')
      .in('alias', symbols.slice(i, i + 500))
    for (const row of (data || [])) resolved.add(String((row as any).alias).toUpperCase())
  }

  const missing = symbols.filter(s => !resolved.has(s))
  console.log(`\nDepot-Symbole: ${resolved.size}/${symbols.length} im Stammsatz`)
  if (missing.length > 0) {
    console.log(`Ohne Stammsatz (${missing.length}): ${missing.slice(0, 40).join(', ')}${missing.length > 40 ? ' …' : ''}`)
  }
}

function isIsin(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(value.toUpperCase())
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
