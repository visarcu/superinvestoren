// scripts/applySplits.ts
// Verrechnet Aktiensplits, die NACH dem Import passiert sind.
//
// Der CSV-Import kennt nur die Splits, die im Broker-Report stehen. Passiert ein
// Split danach, zeigt die Position den Kurs nach dem Split gegen den Einstand
// davor — bei 200:1 also dauerhaft −99 %.
//
// Laufzeit:
//   npm run splits:check                     nur berichten
//   npm run splits:check -- --fix            anwenden
//   npm run splits:check -- --portfolio=<id> auf ein Depot begrenzen
//
// Sicherungen gegen doppelte Anwendung:
//   1. Marker in den Notizen (dasselbe Format wie im Import)
//   2. Plausibilitätsprüfung gegen den aktuellen Kurs — wer seinen Report nach
//      dem Split exportiert, hat die neuen Stückzahlen schon in der Datei
//   3. Ohne --fix wird nichts geschrieben

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { fetchSplits, splitLooksUnapplied, type SplitEvent } from '../src/lib/marketData/splits'
import { appendSplitNote, hasSplitApplied } from '../src/lib/splitAdjustment'
import { reconcileHoldings } from '../src/lib/portfolioReconcile'

const FIX = process.argv.includes('--fix')
const ONLY_PORTFOLIO = process.argv.find(a => a.startsWith('--portfolio='))?.split('=')[1]
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface Candidate {
  portfolioId: string
  depot: string
  symbol: string
  eodhdSymbol: string
  purchasePrice: number
  quantity: number
  earliestDate: string
  currentPrice: number
  splits: SplitEvent[]
}

async function main() {
  if (!process.env.EODHD_API_KEY) {
    console.error('EODHD_API_KEY fehlt — ohne den Key gibt es keine Split-Daten.')
    process.exit(1)
  }

  console.log(FIX ? 'Modus: ANWENDEN\n' : 'Modus: nur berichten (mit --fix anwenden)\n')

  // --- Bestände + Depots laden ---
  let holdingQuery = supabase
    .from('portfolio_holdings')
    .select('portfolio_id, symbol, quantity, purchase_price, purchase_date')
  if (ONLY_PORTFOLIO) holdingQuery = holdingQuery.eq('portfolio_id', ONLY_PORTFOLIO)

  const { data: holdings, error: holdingError } = await holdingQuery
  if (holdingError) {
    console.error('Bestände konnten nicht geladen werden:', holdingError.message)
    process.exit(1)
  }

  const rows = (holdings || []).filter(h => h.symbol && Number(h.quantity) > 0)
  if (rows.length === 0) {
    console.log('Keine Positionen gefunden.')
    return
  }

  const { data: portfolios } = await supabase.from('portfolios').select('id, name, broker_type')
  const depotById = new Map(
    (portfolios || []).map(p => [p.id, `${p.name} (${p.broker_type || 'manual'})`])
  )

  // --- Stammdaten für die EODHD-Symbole ---
  const symbols = [...new Set(rows.map(r => String(r.symbol).toUpperCase()))]
  const eodhdBySymbol = new Map<string, string>()
  for (let i = 0; i < symbols.length; i += 400) {
    const { data } = await supabase
      .from('instrument_aliases')
      .select('alias, eodhd_symbol')
      .in('alias', symbols.slice(i, i + 400))
    for (const row of (data || []) as { alias: string; eodhd_symbol: string | null }[]) {
      if (row.eodhd_symbol) eodhdBySymbol.set(row.alias.toUpperCase(), row.eodhd_symbol)
    }
  }

  // --- Aktuelle Kurse für die Plausibilitätsprüfung ---
  const prices = new Map<string, number>()
  for (let i = 0; i < symbols.length; i += 40) {
    const chunk = symbols.slice(i, i + 40)
    try {
      const res = await fetch(`${BASE_URL}/api/quotes?symbols=${chunk.map(encodeURIComponent).join(',')}`)
      if (!res.ok) continue
      for (const q of (await res.json()) as any[]) {
        if (q?.symbol && q.price > 0) prices.set(String(q.symbol).toUpperCase(), q.price)
      }
    } catch {
      // Ohne Kurs findet keine Korrektur statt — das ist die sichere Richtung.
    }
  }

  // --- Kandidaten sammeln ---
  const candidates: Candidate[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const symbol = String(row.symbol).toUpperCase()
    const eodhdSymbol = eodhdBySymbol.get(symbol)
    const depot = depotById.get(row.portfolio_id) || row.portfolio_id

    if (!eodhdSymbol) {
      skipped.push(`${symbol} — kein Stammsatz`)
      continue
    }

    // Frühestes Transaktionsdatum ist maßgeblich, nicht das Bestandsdatum:
    // Splits zwischen erstem Kauf und heute sind relevant.
    const { data: txs } = await supabase
      .from('portfolio_transactions')
      .select('date')
      .eq('portfolio_id', row.portfolio_id)
      .eq('symbol', row.symbol)
      .in('type', ['buy', 'transfer_in'])
      .order('date', { ascending: true })
      .limit(1)

    const earliestDate = txs?.[0]?.date || row.purchase_date
    if (!earliestDate) {
      skipped.push(`${symbol} — kein Kaufdatum`)
      continue
    }

    const splits = await fetchSplits(eodhdSymbol, earliestDate)
    if (splits.length === 0) continue

    const currentPrice = prices.get(symbol) || 0
    if (!(currentPrice > 0)) {
      skipped.push(`${symbol} — kein aktueller Kurs, Plausibilität nicht prüfbar`)
      continue
    }

    candidates.push({
      portfolioId: row.portfolio_id,
      depot,
      symbol,
      eodhdSymbol,
      purchasePrice: Number(row.purchase_price) || 0,
      quantity: Number(row.quantity) || 0,
      earliestDate,
      currentPrice,
      splits,
    })
  }

  if (candidates.length === 0) {
    console.log(`Keine Splits nach dem Kaufdatum gefunden (${rows.length} Positionen geprüft).`)
    if (skipped.length > 0) console.log(`\nÜbersprungen: ${skipped.length}`)
    return
  }

  // --- Prüfen und ggf. anwenden ---
  let applied = 0
  let alreadyDone = 0
  let rejected = 0
  const touchedPortfolios = new Set<string>()

  for (const c of candidates) {
    for (const split of c.splits) {
      const label = `${c.symbol.padEnd(10)} ${split.raw} am ${split.date}`

      // 1) Marker: schon im Import verrechnet?
      const { data: txRows } = await supabase
        .from('portfolio_transactions')
        .select('id, quantity, price, notes')
        .eq('portfolio_id', c.portfolioId)
        .eq('symbol', c.symbol)
        .lt('date', split.date)
        .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])

      const pending = (txRows || []).filter(tx => !hasSplitApplied(tx.notes, split.date))
      if (pending.length === 0) {
        alreadyDone++
        continue
      }

      // 2) Plausibilität: passt der Einstand nur OHNE den Split zum Kurs?
      if (!splitLooksUnapplied(c.purchasePrice, c.currentPrice, split.ratio)) {
        console.log(
          `   ÜBERSPRUNGEN  ${label}\n` +
            `                 Einstand ${c.purchasePrice} vs. Kurs ${c.currentPrice} — sieht bereits verrechnet aus`
        )
        rejected++
        continue
      }

      console.log(
        `   ${FIX ? 'ANGEWENDET   ' : 'ZU KORRIGIEREN'} ${label}\n` +
          `                 ${c.depot} · ${pending.length} Transaktion(en) · ` +
          `Menge ×${split.ratio}, Einstand ÷${split.ratio} (${c.purchasePrice} → ${(c.purchasePrice / split.ratio).toFixed(4)})`
      )

      if (!FIX) continue

      for (const tx of pending) {
        const qty = Number(tx.quantity) || 0
        const price = Number(tx.price) || 0
        const { error } = await supabase
          .from('portfolio_transactions')
          .update({
            quantity: parseFloat((qty * split.ratio).toFixed(8)),
            price: price > 0 ? parseFloat((price / split.ratio).toFixed(4)) : price,
            notes: appendSplitNote(tx.notes, split.ratio, split.date),
          })
          .eq('id', tx.id)
        if (error) {
          console.error(`                 Fehler bei Transaktion ${tx.id}: ${error.message}`)
        }
      }
      applied++
      touchedPortfolios.add(c.portfolioId)
    }
  }

  // --- Bestände nachziehen ---
  // Die Korrektur läuft auf den Transaktionen; der Bestand wird daraus neu
  // abgeleitet — dieselbe Funktion wie im Import, damit beides deckungsgleich ist.
  if (FIX && touchedPortfolios.size > 0) {
    console.log('')
    for (const portfolioId of touchedPortfolios) {
      const result = await reconcileHoldings(supabase, portfolioId)
      console.log(
        `   Bestände abgeglichen: ${depotById.get(portfolioId) || portfolioId} — ` +
          `${result.created} angelegt · ${result.updated} aktualisiert`
      )
      for (const err of result.errors) console.error(`   Fehler: ${err}`)
    }
  }

  console.log('\n' + '═'.repeat(62))
  console.log(
    `Positionen geprüft: ${rows.length} · Splits gefunden: ${candidates.reduce((n, c) => n + c.splits.length, 0)}`
  )
  console.log(
    `${FIX ? 'Angewendet' : 'Zu korrigieren'}: ${applied} · bereits verrechnet: ${alreadyDone} · verworfen: ${rejected}`
  )
  if (skipped.length > 0) {
    console.log(`\nÜbersprungen (${skipped.length}):`)
    for (const s of [...new Set(skipped)].slice(0, 15)) console.log(`   ${s}`)
  }
  if (!FIX && applied > 0) console.log('\nMit --fix werden die Korrekturen geschrieben.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
