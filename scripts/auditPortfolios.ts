// scripts/auditPortfolios.ts
// Prüft alle Depots auf Datenfehler, die sonst erst per Nutzer-Mail auffallen.
//
// Geprüft wird:
//   1. Bestand vs. Transaktionen  — dieselbe Logik wie der Import (portfolioReconcile)
//   2. Stammdaten-Mapping         — löst jedes Symbol auf ein Instrument auf?
//   3. Kursplausibilität          — aktueller Kurs im Verhältnis zum Kaufkurs
//   4. Splits seit dem Kaufdatum  — via EODHD, erkennt unverarbeitete Kapitalmaßnahmen
//
// Laufzeit:
//   npm run audit:portfolios                  → Bericht, ändert nichts
//   npm run audit:portfolios -- --fix         → gleicht Bestände ab (nur Punkt 1)
//   npm run audit:portfolios -- --portfolio=<uuid>
//
// Punkt 2–4 melden nur: dort ist immer eine menschliche Entscheidung nötig.

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { reconcileHoldings } from '../src/lib/portfolioReconcile'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const FIX = process.argv.includes('--fix')
// Löschen ist die einzige nicht umkehrbare Korrektur — daher eigener Schalter.
const DELETE_ORPHANS = process.argv.includes('--delete-orphans')
const ONLY_PORTFOLIO = process.argv.find(a => a.startsWith('--portfolio='))?.split('=')[1]
const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000'

// Außerhalb dieser Spanne ist ein Kurs verdächtig: entweder ein anderes
// Instrument oder eine unverarbeitete Kapitalmaßnahme.
//
// Die Spanne ist bewusst weit: Apple steht nach Jahren beim Vierfachen des
// Kaufkurses, Canopy Growth bei einem Drittel — beides sind keine Fehler.
// Die echten Treffer liegen bei Faktor 0,01 (200:1-Split) oder 95 (falsche
// Währung), nicht bei 3.
const PRICE_FACTOR_MIN = 0.12
const PRICE_FACTOR_MAX = 9

interface Finding {
  depot: string
  symbol: string
  kategorie: 'Bestand' | 'Mapping' | 'Kurs' | 'Split' | 'Bagatelle'
  befund: string
}

async function main() {
  const findings: Finding[] = []

  let query = supabase.from('portfolios').select('id, name, broker_type')
  if (ONLY_PORTFOLIO) query = query.eq('id', ONLY_PORTFOLIO)
  const { data: portfolios, error } = await query
  if (error) throw error

  console.log(`Depots: ${portfolios?.length ?? 0}${FIX ? '  (--fix aktiv: Bestände werden korrigiert)' : ''}\n`)

  let created = 0
  let updated = 0
  let deleted = 0

  // --- 1. Bestand vs. Transaktionen -----------------------------------------
  for (const portfolio of portfolios || []) {
    const result = await reconcileHoldings(supabase, portfolio.id, {
      dryRun: !FIX,
      deleteOrphans: DELETE_ORPHANS,
    })
    created += result.created
    updated += result.updated
    deleted += result.deleted

    for (const drift of result.drifts) {
      const label = `${portfolio.name} (${portfolio.broker_type || 'manuell'})`
      if (drift.art === 'fehlt') {
        findings.push({
          depot: label,
          symbol: drift.symbol,
          kategorie: 'Bestand',
          befund: `Position fehlt — Transaktionen ergeben ${drift.erwartet!.quantity} Stück zu ${drift.erwartet!.purchasePrice}`,
        })
      } else if (drift.art === 'überzählig') {
        findings.push({
          depot: label,
          symbol: drift.symbol,
          kategorie: 'Bestand',
          befund: `Position ohne Deckung — Transaktionen ergeben 0 Stück, gespeichert ${drift.gespeichert!.quantity}`,
        })
      } else {
        const g = drift.gespeichert!
        const e = drift.erwartet!
        findings.push({
          depot: label,
          symbol: drift.symbol,
          kategorie: drift.bagatelle ? 'Bagatelle' : 'Bestand',
          befund:
            drift.art === 'menge'
              ? `Menge ${g.quantity} statt ${e.quantity}`
              : `Einstand ${g.purchasePrice} statt ${e.purchasePrice} (Faktor ${(g.purchasePrice / e.purchasePrice).toFixed(2)})`,
        })
      }
    }

    for (const err of result.errors) {
      findings.push({ depot: label(portfolio), symbol: '—', kategorie: 'Bestand', befund: err })
    }
  }

  // --- 2.–4. Symbolbezogene Prüfungen ---------------------------------------
  // Mit Wiederholung: nach den vielen Abgleich-Requests scheitert diese Abfrage
  // gelegentlich am Netz. Vorher verschwand der Fehler still — das Audit meldete
  // dann seelenruhig "0 Positionen geprüft" und keine Befunde.
  let holdings: any[] | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, name, quantity, purchase_price, purchase_date')
    if (!error) {
      holdings = data
      break
    }
    if (attempt === 3) {
      console.error(`\nBestände konnten nicht geladen werden: ${error.message}`)
      console.error('Prüfungen 2–4 (Mapping, Kurs, Split) werden übersprungen.\n')
    } else {
      await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }

  const rows = (holdings || []).filter(h =>
    ONLY_PORTFOLIO ? h.portfolio_id === ONLY_PORTFOLIO : true
  )
  const depotById = new Map((portfolios || []).map(p => [p.id, label(p)]))
  const symbols = [...new Set(rows.map(r => String(r.symbol || '').toUpperCase()).filter(Boolean))]

  // 2. Mapping
  const mapped = new Set<string>()
  const eodhdBySymbol = new Map<string, string>()
  for (let i = 0; i < symbols.length; i += 400) {
    const { data } = await supabase
      .from('instrument_aliases')
      .select('alias, eodhd_symbol')
      .in('alias', symbols.slice(i, i + 400))
    for (const row of (data || []) as { alias: string; eodhd_symbol: string | null }[]) {
      mapped.add(row.alias.toUpperCase())
      if (row.eodhd_symbol) eodhdBySymbol.set(row.alias.toUpperCase(), row.eodhd_symbol)
    }
  }

  // 3. Kurse — zum Vergleich in EUR, denn Einstandskurse liegen in EUR vor.
  // Ohne diesen Schritt meldet jedes '.L'-Papier einen Faktor um 95: die Route
  // liefert vertragsgemäß Pence, gespeichert sind Euro.
  const fx = await loadFxRates()
  const prices = new Map<string, { price: number; priceEur: number; currency: string; source: string }>()
  for (let i = 0; i < symbols.length; i += 40) {
    const chunk = symbols.slice(i, i + 40)
    try {
      const res = await fetch(`${BASE_URL}/api/quotes?symbols=${chunk.map(encodeURIComponent).join(',')}`)
      if (!res.ok) continue
      for (const q of (await res.json()) as any[]) {
        if (q?.symbol && q.price > 0) {
          prices.set(String(q.symbol).toUpperCase(), {
            price: q.price,
            priceEur: toEur(q.price, q.currency, fx),
            currency: q.currency,
            source: q._source,
          })
        }
      }
    } catch (err) {
      console.warn(`Kurse für Block ${i} nicht abrufbar:`, err instanceof Error ? err.message : err)
    }
  }

  for (const row of rows) {
    const symbol = String(row.symbol || '').toUpperCase()
    const depot = depotById.get(row.portfolio_id) || row.portfolio_id
    if (!symbol) continue

    if (!mapped.has(symbol)) {
      findings.push({
        depot,
        symbol,
        kategorie: 'Mapping',
        befund: 'kein Stammsatz — Kurs läuft über Rateweg statt über die ISIN',
      })
    }

    const quote = prices.get(symbol)
    const purchase = Number(row.purchase_price) || 0
    if (!quote) {
      findings.push({ depot, symbol, kategorie: 'Kurs', befund: 'kein Kurs abrufbar' })
    } else if (purchase > 0) {
      const factor = quote.priceEur / purchase
      if (factor < PRICE_FACTOR_MIN || factor > PRICE_FACTOR_MAX) {
        findings.push({
          depot,
          symbol,
          kategorie: 'Kurs',
          befund: `Kauf ${purchase.toFixed(2)} € → aktuell ${quote.priceEur.toFixed(2)} € (${quote.price.toFixed(2)} ${quote.currency}, Faktor ${factor.toFixed(2)}, ${quote.source})`,
        })
      }
    }
  }

  // 4. Splits seit Kaufdatum — nur für auffällige Kursfaktoren, sonst zu viele Requests
  const splitCandidates = rows.filter(row => {
    const quote = prices.get(String(row.symbol || '').toUpperCase())
    const purchase = Number(row.purchase_price) || 0
    if (!quote || purchase <= 0) return false
    const factor = quote.priceEur / purchase
    return factor < PRICE_FACTOR_MIN || factor > PRICE_FACTOR_MAX
  })

  for (const row of splitCandidates) {
    const symbol = String(row.symbol || '').toUpperCase()
    const eodhdSymbol = eodhdBySymbol.get(symbol)
    if (!eodhdSymbol || !row.purchase_date || !process.env.EODHD_API_KEY) continue
    try {
      const res = await fetch(
        `https://eodhd.com/api/splits/${encodeURIComponent(eodhdSymbol)}?from=${row.purchase_date}&api_token=${process.env.EODHD_API_KEY}&fmt=json`
      )
      if (!res.ok) continue
      const splits = (await res.json()) as { date: string; split: string }[]
      for (const split of Array.isArray(splits) ? splits : []) {
        findings.push({
          depot: depotById.get(row.portfolio_id) || row.portfolio_id,
          symbol,
          kategorie: 'Split',
          befund: `Split ${split.split} am ${split.date} — nach dem Kauf (${row.purchase_date}), Stückzahl prüfen`,
        })
      }
    } catch {
      // Splits sind eine Zusatzinfo; ein Ausfall soll den Bericht nicht kippen.
    }
  }

  report(findings, { created, updated, deleted, positions: rows.length })
}

function label(portfolio: { name: string; broker_type?: string | null }) {
  return `${portfolio.name} (${portfolio.broker_type || 'manuell'})`
}

interface FxRates {
  usd: number
  gbp: number
}

async function loadFxRates(): Promise<FxRates> {
  const rate = async (from: string, fallback: number) => {
    try {
      const res = await fetch(`${BASE_URL}/api/exchange-rate?from=${from}&to=EUR`)
      if (!res.ok) return fallback
      const data = await res.json()
      return typeof data.rate === 'number' && data.rate > 0 ? data.rate : fallback
    } catch {
      return fallback
    }
  }
  const [usd, gbp] = await Promise.all([rate('USD', 0.92), rate('GBP', 1.18)])
  return { usd, gbp }
}

/** Dieselbe Umrechnung wie im Depot: '.L' kommt in Pence, USD über den Tageskurs. */
function toEur(price: number, currency: string, fx: FxRates): number {
  switch ((currency || '').toUpperCase()) {
    case 'EUR': return price
    case 'GBX': return (price / 100) * fx.gbp
    case 'GBP': return price * fx.gbp
    case 'USD': return price * fx.usd
    default:    return price
  }
}

function report(
  findings: Finding[],
  stats: { created: number; updated: number; deleted: number; positions: number }
) {
  const order: Finding['kategorie'][] = ['Bestand', 'Split', 'Mapping', 'Kurs', 'Bagatelle']

  for (const kategorie of order) {
    const group = findings.filter(f => f.kategorie === kategorie)
    if (group.length === 0) continue

    // Bagatellen (meist Gebühren-Rundung) nur zählen, nicht auflisten.
    if (kategorie === 'Bagatelle') {
      console.log(`\n── Bagatellen: ${group.length} Positionen unter 2 % Abweichung (nicht korrigiert)`)
      continue
    }

    console.log(`\n── ${kategorie} (${group.length}) ${'─'.repeat(Math.max(0, 50 - kategorie.length))}`)
    for (const f of group) {
      console.log(`   ${f.symbol.padEnd(10)} ${f.befund}`)
      console.log(`   ${' '.repeat(10)} ${f.depot}`)
    }
  }

  console.log(`\n${'═'.repeat(62)}`)
  console.log(`Positionen geprüft: ${stats.positions} · Befunde: ${findings.length}`)
  if (FIX) {
    console.log(`Bestände korrigiert: ${stats.created} angelegt · ${stats.updated} aktualisiert · ${stats.deleted} entfernt`)
  } else if (findings.some(f => f.kategorie === 'Bestand')) {
    console.log('Mit --fix werden die Bestände aus den Transaktionen neu aufgebaut.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
