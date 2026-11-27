// scripts/checkPortfolioHistory.ts
// Rechnet den Wertverlauf eines Depots (lib/portfolio/history, dieselbe Funktion
// wie /api/portfolio-history) und stellt ihn der Live-Bewertung gegenüber.
// Zeigt die größten Tagessprünge in Wert und Rendite, damit Rechenfehler im
// Verlauf (falsche Notierungswährung, Kursreihe beginnt nach dem Kauf) sichtbar
// werden, ohne die Depotseite zu öffnen.
//
// Laufzeit:
//   npx tsx scripts/checkPortfolioHistory.ts --portfolio=<uuid>
//   npx tsx scripts/checkPortfolioHistory.ts --symbol=BITC.L        → alle Depots mit dem Papier
//   Optionen: --days=365 (Standard 5475 = MAX), --only=BITC.L (nur dieses Papier
//   im Verlauf, alle anderen Positionen bleiben draußen)
//
// Ändert nichts, liest nur.

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const PORTFOLIO = arg('portfolio')
const SYMBOL = arg('symbol')?.toUpperCase()
const ONLY = arg('only')?.toUpperCase()
const DAYS = Number(arg('days') || 5475)

const eur = (v: number) => `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const pct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} %`

interface ChartPoint { date: string; value: number; invested: number; performance: number }

async function main() {
  if (!PORTFOLIO && !SYMBOL) {
    console.error('Bitte --portfolio=<uuid> oder --symbol=<Kürzel> angeben.')
    process.exit(1)
  }

  // Die Bibliothek legt beim Laden einen Supabase-Client an, deshalb erst nach dotenv importieren
  const { computePortfolioHistory } = await import('../src/lib/portfolio/history')
  const { getQuotes } = await import('../src/lib/marketData/quoteService')
  const { hasPremiumAccess, PREMIUM_PROFILE_SELECT } = await import('../src/lib/premiumAccess')

  let portfolioIds: string[] = []
  if (PORTFOLIO) portfolioIds = [PORTFOLIO]
  else {
    const { data, error } = await supabase.from('portfolio_holdings').select('portfolio_id').eq('symbol', SYMBOL!)
    if (error) throw error
    portfolioIds = [...new Set((data || []).map(r => r.portfolio_id as string))]
    if (portfolioIds.length === 0) {
      console.log(`Kein Depot hält ${SYMBOL}.`)
      return
    }
  }

  for (const portfolioId of portfolioIds) {
    const { data: portfolio, error } = await supabase
      .from('portfolios')
      .select('id, user_id, name, broker_type, cash_position')
      .eq('id', portfolioId)
      .maybeSingle()
    if (error) throw error
    if (!portfolio) {
      console.log(`Depot ${portfolioId} nicht gefunden.`)
      continue
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select(PREMIUM_PROFILE_SELECT)
      .eq('user_id', portfolio.user_id)
      .maybeSingle()
    const { data: holdingRows, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, quantity, purchase_date, purchase_price')
      .eq('portfolio_id', portfolioId)
    if (holdingsError) throw holdingsError
    const allHoldings = (holdingRows || []).map(h => ({
      portfolio_id: h.portfolio_id as string,
      symbol: String(h.symbol).toUpperCase(),
      quantity: Number(h.quantity) || 0,
      purchase_date: h.purchase_date as string | undefined,
      purchase_price: Number(h.purchase_price) || 0,
    }))
    const holdings = ONLY ? allHoldings.filter(h => h.symbol === ONLY) : allHoldings
    const cashPosition = ONLY ? 0 : Number(portfolio.cash_position) || 0

    console.log(`\n${'='.repeat(78)}`)
    console.log(`${portfolio.name} (${portfolio.broker_type || 'manuell'})  ${portfolio.id}`)
    console.log(`Positionen: ${holdings.length}${ONLY ? ` (nur ${ONLY})` : ''}  Cash: ${eur(cashPosition)}  Fenster: ${DAYS} Tage`)

    const started = Date.now()
    const result = await computePortfolioHistory(
      { id: portfolio.user_id, isPremium: hasPremiumAccess(profile) },
      { portfolioId, holdings, cashPosition, days: DAYS }
    )
    const body = result.body
    if (!body?.success) {
      console.log(`Fehler ${result.status}: ${JSON.stringify(body)}`)
      continue
    }
    const points: ChartPoint[] = body.data || []
    console.log(`Verlauf: ${body.meta.totalPoints} Punkte in ${((Date.now() - started) / 1000).toFixed(1)} s, Modus ${body.meta.investedMode}, Cash-Konto ${body.meta.cashLedger ?? '-'}`)
    if (body.meta.priceGaps?.length) {
      console.log('Kursreihe beginnt nach dem Kauf (synthetischer Zufluss am ersten Kurstag):')
      for (const gap of body.meta.priceGaps) console.log(`  ${gap.symbol}: Kauf ${gap.firstBuy}, erster Kurs ${gap.firstPrice}`)
    }
    if (points.length === 0) {
      console.log('Keine Chart-Punkte.')
      continue
    }

    const first = points[0]
    console.log(`Erster Punkt ${first.date}: Wert ${eur(first.value)}, eingesetzt ${eur(first.invested)}`)
    for (const p of points.slice(-3)) {
      console.log(`Punkt ${p.date}: Wert ${eur(p.value)}, eingesetzt ${eur(p.invested)}, ${pct(p.performance)}`)
    }

    // Größte Tagessprünge im Wert, relativ zum Vortag
    const jumps = points
      .slice(1)
      .map((p, i) => ({ date: p.date, prev: points[i].value, value: p.value, rel: points[i].value > 0 ? p.value / points[i].value - 1 : 0 }))
      .sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel))
      .slice(0, 3)
    console.log('Größte Tagessprünge im Wert:')
    for (const j of jumps) console.log(`  ${j.date}: ${eur(j.prev)} → ${eur(j.value)} (${pct(j.rel * 100)})`)

    // Zeitgewichtete Rendite und ihre größten Tagesschritte
    const perf: Array<{ date: string; portfolioPerformance: number }> = body.performanceData || []
    if (perf.length > 1) {
      const last = perf[perf.length - 1]
      console.log(`TWR am ${last.date}: ${pct(last.portfolioPerformance)}`)
      const steps = perf
        .slice(1)
        .map((p, i) => {
          const prev = 1 + perf[i].portfolioPerformance / 100
          const cur = 1 + p.portfolioPerformance / 100
          return { date: p.date, step: prev > 0 ? (cur / prev - 1) * 100 : 0 }
        })
        .sort((a, b) => Math.abs(b.step) - Math.abs(a.step))
        .slice(0, 3)
      console.log('Größte Tagesschritte in der TWR:')
      for (const s of steps) console.log(`  ${s.date}: ${pct(s.step)}`)
    }
    const cmp = body.benchmarkComparison
    if (cmp) {
      console.log(`Benchmark-Vergleich ${cmp.startDate} bis ${cmp.endDate}: Depot ${pct(cmp.portfolio.totalReturnPct)}, FTSE All-World ${cmp.benchmarks.ftseAllWorld ? pct(cmp.benchmarks.ftseAllWorld.totalReturnPct) : '-'}`)
    }

    // Live-Bewertung der Positionen wie die Depotseite: Kurs in Notierungswährung,
    // nach EUR über den aktuellen Wechselkurs (Pence über das Pfund)
    const quotes = await getQuotes([...new Set(holdings.map(h => h.symbol))])
    const currencies = [...new Set([...quotes.values()].map(q => (q.currency === 'GBX' ? 'GBP' : q.currency)))].filter(c => c && c !== 'EUR')
    const fxQuotes = await getQuotes(currencies.map(c => `EUR${c}`))
    const eurPer = (currency: string): number | null => {
      if (currency === 'EUR') return 1
      const pair = fxQuotes.get(`EUR${currency === 'GBX' ? 'GBP' : currency}`)
      if (!pair || !(pair.price > 0)) return null
      return (currency === 'GBX' ? 0.01 : 1) / pair.price
    }
    let liveSecurities = 0
    let unpriced: string[] = []
    const lines: string[] = []
    for (const h of holdings) {
      const q = quotes.get(h.symbol)
      if (!q) {
        unpriced.push(h.symbol)
        continue
      }
      const rate = eurPer(q.currency)
      const priceEur = rate === null ? null : q.price * rate
      if (priceEur === null) {
        unpriced.push(`${h.symbol} (${q.currency})`)
        continue
      }
      liveSecurities += h.quantity * priceEur
      if (ONLY || holdings.length <= 5) {
        lines.push(`  ${h.symbol}: ${h.quantity} × ${q.price} ${q.currency} (${q.source}) = ${eur(h.quantity * priceEur)}`)
      }
    }
    const lastPoint = points[points.length - 1]
    const liveTotal = body.meta.investedMode === 'deposits' ? liveSecurities + cashPosition : liveSecurities
    console.log(`Live-Bewertung: Wertpapiere ${eur(liveSecurities)}${body.meta.investedMode === 'deposits' ? `, mit Cash ${eur(liveTotal)}` : ''}${unpriced.length ? `, ohne Kurs: ${unpriced.join(', ')}` : ''}`)
    lines.forEach(l => console.log(l))
    const diff = lastPoint.value > 0 ? (liveTotal / lastPoint.value - 1) * 100 : 0
    console.log(`Letzter Chart-Punkt ${lastPoint.date} ${eur(lastPoint.value)} gegen Live ${eur(liveTotal)}: ${pct(diff)}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
