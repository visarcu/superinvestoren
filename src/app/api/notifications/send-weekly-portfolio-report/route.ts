// src/app/api/notifications/send-weekly-portfolio-report/route.ts
// Cron: Every Sunday at 18:00 UTC — sends a weekly portfolio performance report via email + push
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend, type CreateEmailOptions } from 'resend'
import { hasPremiumAccess } from '@/lib/premiumAccess'
import { convertPriceToEur, type EurRates } from '@/lib/portfolioValuation'
import { detectTickerCurrency } from '@/lib/fmp'
import { getQuotes } from '@/lib/marketData/quoteService'
import { getDailyHistory } from '@/lib/marketData/history'
import type { NormalizedQuote } from '@/lib/marketData/types'
import { buildRadar, loadEarningsForSymbols, radarEmailSection, type RadarEvent } from '@/lib/earningsRadar'
import { countedDepots } from '@/lib/sampleDepotShared'

// Kurse, Versand und Wiederholungen je Nutzer brauchen Zeit
export const maxDuration = 300

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

// TEST MODE: Set TEST_USER_ID_PORTFOLIO env var to a valid UUID to only send to yourself
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID_PORTFOLIO || process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

interface Close {
  date: string
  close: number
}

// Schlusskurse einer Position samt Notierungswährung ('GBX' = Pence)
interface PriceSeries {
  currency: string
  closes: Close[]
}

// Eine Zeile aus portfolio_holdings (eine je Depot und Symbol)
interface HoldingRow {
  portfolio_id: string
  symbol: string
  quantity: number
  purchase_price: number | null
  purchase_date: string | null
}

// Käufe/Verkäufe/Überträge aus portfolio_transactions im Berichtsfenster
interface FlowRow {
  portfolio_id: string
  symbol: string | null
  type: string
  quantity: number | null
  date: string
}

// held:   Bestand lag schon am Schlusskurs der Vorwoche (ganz oder teilweise) im Depot
// new:    erst nach dem Vorwochen-Schluss gekauft, keine Wochenveränderung
// noData: kein Kurs der Vorwoche oder dieser Woche (Kurshistorie fehlt oder Neuemission)
type WeekStatus = 'held' | 'new' | 'noData'

interface HoldingWithPerf {
  symbol: string
  quantity: number
  // Anteile, die seit dem Vorwochen-Schluss durchgehend gehalten wurden. Nur sie
  // gehen in die Wochenveränderung ein, Zukäufe dieser Woche nicht.
  heldQuantity: number
  currentPrice: number
  // true: keine Quelle lieferte einen Kurs, currentPrice ist der Einstandspreis
  priceMissing: boolean
  referencePrice: number | null
  referenceDate: string | null
  currentValue: number
  previousValue: number
  weeklyChangeAbs: number
  weeklyChangePct: number
  weekStatus: WeekStatus
}

interface PortfolioReport {
  totalCurrentValue: number
  totalPreviousValue: number
  totalWeeklyChangeAbs: number
  totalWeeklyChangePct: number
  topGainers: HoldingWithPerf[]
  topLosers: HoldingWithPerf[]
  holdings: HoldingWithPerf[]
}

const INFLOW_TYPES = new Set(['buy', 'transfer_in'])
const OUTFLOW_TYPES = new Set(['sell', 'transfer_out'])
// Kurshistorie ab so vielen Tagen vor dem Wochen-Montag laden, damit der letzte
// Handelstag der Vorwoche auch über Feiertage hinweg sicher enthalten ist
const HISTORY_LOOKBACK_DAYS = 14
// FMP verträgt etwa 15 Abrufe pro Sekunde ohne 429
const HISTORY_CONCURRENCY = 6
const FLOW_PAGE_SIZE = 1000

const NOTIFICATION_TYPE = 'weekly_portfolio_report'
// Wartezeiten vor dem 2., 3. und 4. Sendeversuch
const SEND_RETRY_DELAYS_MS = [1000, 2000, 4000]
const SEND_TIMEOUT_MS = 20_000
const PUSH_TIMEOUT_MS = 10_000
// Vorübergehende Fehler. Alles andere (Absender, Adresse, API-Key) wird durch
// Wiederholen nicht besser.
const RETRYABLE_SEND_ERRORS = new Set([
  'rate_limit_exceeded', 'internal_server_error', 'application_error', 'concurrent_idempotent_requests', 'timeout'
])


function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getUTCDate()
  const startMonth = MONTHS[startDate.getUTCMonth()]
  const endDay = endDate.getUTCDate()
  const endMonth = MONTHS[endDate.getUTCMonth()]

  if (startMonth === endMonth) {
    return `${startDay}. - ${endDay}. ${endMonth}`
  }
  return `${startDay}. ${startMonth} - ${endDay}. ${endMonth}`
}

function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`
}

function formatShares(quantity: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(quantity)
}

// EUR-Wechselkurs (EUR pro Einheit Fremdwährung) serverseitig über die API-Route holen.
async function getEurRate(from: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://finclue.de'}/api/exchange-rate?from=${from}&to=EUR`
    )
    if (res.ok) {
      const json = await res.json()
      if (json.rate && !isNaN(json.rate) && json.rate > 0) return Number(json.rate)
    }
  } catch { /* Fallback: keine Umrechnung */ }
  return null
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// convertPriceToEur erwartet unter 'GBP' Pence, der Kursdienst unterscheidet
// dagegen 'GBX' (Pence) und 'GBP' (Pfund)
function toEur(price: number, currency: string, rates: EurRates): number {
  if (currency === 'GBX') return convertPriceToEur(price, 'GBP', rates)
  if (currency === 'GBP') return convertPriceToEur(price * 100, 'GBP', rates)
  return convertPriceToEur(price, currency, rates)
}

function currencyFromSymbol(symbol: string): string {
  const currency = detectTickerCurrency(symbol)
  return currency === 'GBP' ? 'GBX' : currency
}

/**
 * Tages-Schlusskurse einer Position (aufsteigend). Abgefragt wird das Symbol,
 * unter dem der Kursdienst die Position auch im Depot bewertet (VGWD.DE für
 * VHYL.DE). Mit dem Broker-Symbol allein fehlten solche Positionen im Report.
 */
async function loadSeries(
  symbol: string,
  quote: NormalizedQuote | undefined,
  from: string,
  to: string
): Promise<PriceSeries | null> {
  const candidates: Array<{ symbol: string; currency: string }> = []
  if (quote) {
    // getDailyHistory liefert Pfund-Linien an der LSE bereits in Pence
    const pence = quote.currency === 'GBP' && quote.sourceSymbol.toUpperCase().endsWith('.L')
    candidates.push({ symbol: quote.sourceSymbol, currency: pence ? 'GBX' : quote.currency })
  }
  if (quote?.sourceSymbol.toUpperCase() !== symbol.toUpperCase()) {
    candidates.push({ symbol, currency: currencyFromSymbol(symbol) })
  }

  // Ein zweiter Anlauf, falls die Quelle kurzzeitig nicht antwortet (429)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1500)
    for (const candidate of candidates) {
      const bars = await getDailyHistory(candidate.symbol, from, to)
      if (bars.length > 0) {
        return { currency: candidate.currency, closes: bars.map(b => ({ date: b.date, close: b.close })) }
      }
    }
  }
  return null
}

async function loadSeriesForSymbols(
  symbols: string[],
  quotes: Map<string, NormalizedQuote>,
  from: string,
  to: string
): Promise<Map<string, PriceSeries>> {
  const out = new Map<string, PriceSeries>()
  let next = 0
  const worker = async () => {
    while (next < symbols.length) {
      const symbol = symbols[next++]
      try {
        const series = await loadSeries(symbol, quotes.get(symbol.toUpperCase()), from, to)
        if (series) out.set(symbol, series)
      } catch (e) {
        console.warn(`[Weekly Portfolio Report] Kurshistorie ${symbol} fehlt:`, e instanceof Error ? e.message : e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(HISTORY_CONCURRENCY, symbols.length) }, worker))
  return out
}

// Käufe, Verkäufe und Überträge der angegebenen Depots ab `from` (seitenweise,
// PostgREST liefert höchstens 1000 Zeilen je Abruf)
async function loadFlows(portfolioIds: string[], from: string): Promise<FlowRow[]> {
  const out: FlowRow[] = []
  if (portfolioIds.length === 0) return out
  for (let offset = 0; ; offset += FLOW_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('portfolio_transactions')
      .select('portfolio_id, symbol, type, quantity, date')
      .in('portfolio_id', portfolioIds)
      .in('type', [...INFLOW_TYPES, ...OUTFLOW_TYPES])
      .gte('date', from)
      .order('id')
      .range(offset, offset + FLOW_PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const page = (data as FlowRow[] | null) ?? []
    out.push(...page)
    if (page.length < FLOW_PAGE_SIZE) break
  }
  return out
}

/**
 * Echte Wochenveränderung eines Nutzers: Schlusskurs des letzten Handelstags
 * vor `weekStart` (Montag der Berichtswoche) bis zum letzten Schlusskurs.
 *
 * Zukäufe nach dem Vorwochen-Schluss werden herausgerechnet statt ab Kaufdatum
 * bewertet: der Einstand steht in EUR zum Kauf-Wechselkurs und mit Gebühren in
 * der DB, die Schlusskurse dagegen in Börsenwährung zum heutigen Kurs. Beides zu
 * mischen erzeugt Scheingewinne, und ein am Donnerstag gekaufter Wert stünde mit
 * einem Tag Bewegung neben Werten mit fünf Tagen in der Gewinnerliste.
 * Gerechnet wird daher nur mit den Anteilen, die über die ganze Woche im Depot
 * lagen; ganz neue Positionen zählen zum Depotwert, aber nicht zur Woche.
 */
function buildPortfolioReport(
  rows: HoldingRow[],
  flows: FlowRow[],
  seriesBySymbol: Map<string, PriceSeries>,
  quotes: Map<string, NormalizedQuote>,
  weekStart: string,
  eurRates: EurRates
): PortfolioReport {
  const rowsBySymbol = new Map<string, HoldingRow[]>()
  for (const row of rows) {
    const list = rowsBySymbol.get(row.symbol) ?? []
    list.push(row)
    rowsBySymbol.set(row.symbol, list)
  }

  const holdings: HoldingWithPerf[] = []

  for (const [symbol, symbolRows] of rowsBySymbol) {
    const quantity = symbolRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
    if (quantity <= 0) continue

    const quote = quotes.get(symbol.toUpperCase())
    const series = seriesBySymbol.get(symbol)
    const latest = series?.closes[series.closes.length - 1]
    const reference = series ? [...series.closes].reverse().find(c => c.date < weekStart) : undefined
    const seriesToEur = (price: number) => toEur(price, series?.currency ?? 'EUR', eurRates)

    // Schluss dieser Woche, sonst Live-Kurs, sonst letzter bekannter Schluss
    const inWeek = !!latest && latest.date >= weekStart
    const hasQuote = !!quote && quote.price > 0
    const priceMissing = !latest && !hasQuote
    let currentPrice: number
    if (latest && inWeek) {
      currentPrice = seriesToEur(latest.close)
    } else if (quote && hasQuote) {
      currentPrice = toEur(quote.price, quote.currency, eurRates)
    } else if (latest) {
      currentPrice = seriesToEur(latest.close)
    } else {
      // Wie in der Depot-Bewertung: ohne Kurs zählt der Einstand (EUR), die
      // Position darf nicht aus dem Depotwert verschwinden
      currentPrice = symbolRows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.purchase_price) || 0), 0) / quantity
    }
    const currentValue = quantity * currentPrice

    if (!reference || (!inWeek && !hasQuote)) {
      holdings.push({
        symbol, quantity, heldQuantity: 0, currentPrice, priceMissing,
        referencePrice: null, referenceDate: null,
        currentValue, previousValue: 0, weeklyChangeAbs: 0, weeklyChangePct: 0,
        weekStatus: 'noData'
      })
      continue
    }

    // Netto-Zugang nach dem Vorwochen-Schluss über alle Depots des Nutzers.
    // Depotüberträge gleichen sich so aus. Eine Position mit Erstkauf nach dem
    // Stichtag war am Stichtag in diesem Depot nicht vorhanden, auch wenn ihr
    // keine Kauf-Transaktion gegenübersteht.
    const openedAfter = new Map(
      symbolRows
        .filter(r => r.purchase_date && r.purchase_date > reference.date)
        .map(r => [r.portfolio_id, Number(r.quantity) || 0])
    )
    const flowByPortfolio = new Map<string, number>()
    for (const f of flows) {
      if (f.symbol !== symbol || f.date <= reference.date) continue
      const q = Math.abs(Number(f.quantity) || 0)
      const signed = INFLOW_TYPES.has(f.type) ? q : OUTFLOW_TYPES.has(f.type) ? -q : 0
      flowByPortfolio.set(f.portfolio_id, (flowByPortfolio.get(f.portfolio_id) ?? 0) + signed)
    }
    for (const [portfolioId, qty] of openedAfter) flowByPortfolio.set(portfolioId, qty)
    const netInflow = [...flowByPortfolio.values()].reduce((s, v) => s + v, 0)

    // Durchgehend gehalten: höchstens der heutige Bestand, nie negativ
    let heldQuantity = Math.min(quantity, quantity - netInflow)
    if (heldQuantity < 1e-9) heldQuantity = 0

    const referencePrice = seriesToEur(reference.close)
    const previousValue = heldQuantity * referencePrice
    const isHeld = heldQuantity > 0

    holdings.push({
      symbol,
      quantity,
      heldQuantity,
      currentPrice,
      priceMissing,
      referencePrice,
      referenceDate: reference.date,
      currentValue,
      previousValue,
      weeklyChangeAbs: heldQuantity * (currentPrice - referencePrice),
      // Gleiche EUR-Rate auf beiden Seiten, also reine Kursbewegung
      weeklyChangePct: isHeld && referencePrice > 0 ? (currentPrice / referencePrice - 1) * 100 : 0,
      weekStatus: isHeld ? 'held' : 'new'
    })
  }

  const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalPreviousValue = holdings.reduce((sum, h) => sum + h.previousValue, 0)
  const totalWeeklyChangeAbs = holdings.reduce((sum, h) => sum + h.weeklyChangeAbs, 0)
  const totalWeeklyChangePct = totalPreviousValue > 0 ? (totalWeeklyChangeAbs / totalPreviousValue) * 100 : 0

  const withWeek = holdings.filter(h => h.weekStatus === 'held')
  const topGainers = withWeek.filter(h => h.weeklyChangePct > 0).sort((a, b) => b.weeklyChangePct - a.weeklyChangePct).slice(0, 3)
  const topLosers = withWeek.filter(h => h.weeklyChangePct < 0).sort((a, b) => a.weeklyChangePct - b.weeklyChangePct).slice(0, 3)

  return { totalCurrentValue, totalPreviousValue, totalWeeklyChangeAbs, totalWeeklyChangePct, topGainers, topLosers, holdings }
}

function buildPushBody(report: PortfolioReport): string {
  // Nur neue Positionen: kein Vorwochenwert, also auch keine Wochenveränderung
  if (report.totalPreviousValue <= 0) {
    return `${formatCurrency(report.totalCurrentValue)} Gesamtwert · Wochenvergleich ab nächster Woche`
  }
  const changeLabel = `${report.totalWeeklyChangePct >= 0 ? '+' : ''}${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(report.totalWeeklyChangePct)}%`
  const topGainer = report.topGainers[0]
  return topGainer
    ? `${changeLabel} diese Woche · ${topGainer.symbol} führt mit ${formatPercent(topGainer.weeklyChangePct)}`
    : `${changeLabel} diese Woche · ${formatCurrency(report.totalCurrentValue)} Gesamtwert`
}

function generatePerformerCard(holding: HoldingWithPerf, type: 'gainer' | 'loser'): string {
  const isGainer = type === 'gainer'
  const color = isGainer ? '#059669' : '#dc2626'
  const bgColor = isGainer ? '#f0fdf4' : '#fef2f2'
  const borderColor = isGainer ? '#bbf7d0' : '#fecaca'
  const emoji = isGainer ? '▲' : '▼'
  const pctDisplay = formatPercent(holding.weeklyChangePct)
  const absDisplay = isGainer
    ? `+${formatCurrency(holding.weeklyChangeAbs)}`
    : formatCurrency(holding.weeklyChangeAbs)

  return `
    <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px 20px; flex: 1; min-width: 0;">
      <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
        ${isGainer ? 'Top Performer' : 'Flop Performer'}
      </p>
      <p style="margin: 0 0 6px 0; color: #111827; font-size: 20px; font-weight: 700;">${holding.symbol}</p>
      <p style="margin: 0; color: ${color}; font-size: 18px; font-weight: 700;">${emoji} ${pctDisplay}</p>
      <p style="margin: 4px 0 0 0; color: ${color}; font-size: 13px;">${absDisplay} diese Woche</p>
      <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">${formatShares(holding.quantity)} Anteile · Kurs: ${formatCurrency(holding.currentPrice)}</p>
    </div>
  `
}

function generateHoldingsRows(holdings: HoldingWithPerf[]): string {
  return holdings
    .sort((a, b) => b.currentValue - a.currentValue)
    .map(h => {
      const color = h.weekStatus !== 'held' ? '#6b7280' : h.weeklyChangePct >= 0 ? '#059669' : '#dc2626'
      const sign = h.weeklyChangePct >= 0 ? '+' : ''
      const weekCell = h.weekStatus === 'new'
        ? 'neu'
        : h.weekStatus === 'noData'
          ? 'k. A.'
          : `${sign}${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(h.weeklyChangePct)}%`
      return `
        <tr>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">${h.symbol}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; text-align: right;">${formatShares(h.quantity)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; text-align: right; white-space: nowrap;">${h.priceMissing ? 'Einstand' : formatCurrency(h.currentPrice)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap;">${formatCurrency(h.currentValue)}</td>
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: ${color}; font-size: 13px; font-weight: 600; text-align: right; white-space: nowrap;">
            ${weekCell}
          </td>
        </tr>
      `
    })
    .join('')
}

function generateEmailHtml(
  report: PortfolioReport,
  weekNumber: number,
  weekRange: string,
  earningsSection: string,
  isTest: boolean
): string {
  const changeColor = report.totalWeeklyChangePct >= 0 ? '#059669' : '#dc2626'
  const changeBg = report.totalWeeklyChangePct >= 0 ? '#f0fdf4' : '#fef2f2'
  const changeBorder = report.totalWeeklyChangePct >= 0 ? '#bbf7d0' : '#fecaca'
  const changeArrow = report.totalWeeklyChangePct >= 0 ? '▲' : '▼'

  const topGainer = report.topGainers[0]
  const topLoser = report.topLosers[0]

  const performerCards = [
    topGainer ? generatePerformerCard(topGainer, 'gainer') : '',
    topLoser ? generatePerformerCard(topLoser, 'loser') : ''
  ].filter(Boolean).join('')

  const holdingsRows = generateHoldingsRows(report.holdings)
  const unpriced = report.holdings.filter(h => h.priceMissing).map(h => h.symbol)

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Portfolio-Bericht KW ${weekNumber} | Finclue</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #111827; background-color: #f9fafb;">

      <!-- Header -->
      <div style="max-width: 620px; margin: 0 auto; padding: 32px 20px 16px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #374151; margin: 0; font-size: 24px; font-weight: 700;">Finclue</h1>
          <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 14px;">Wöchentlicher Portfolio-Bericht</p>
          ${isTest ? '<p style="background: #fbbf24; color: #92400e; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin: 8px auto; display: inline-block;">🧪 TEST E-MAIL</p>' : ''}
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <div style="padding: 32px;">

          <!-- Title -->
          <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 6px 0; line-height: 1.3;">
            📊 Dein wöchentlicher Portfolio-Bericht
          </h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">Kalenderwochen-Zusammenfassung · KW ${weekNumber} · ${weekRange}</p>

          <!-- Portfolio Total Value -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Gesamtwert Portfolio</p>
            <p style="margin: 0; color: #111827; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">${formatCurrency(report.totalCurrentValue)}</p>
          </div>

          <!-- Weekly Performance Badge -->
          ${report.totalPreviousValue <= 0 ? `
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
            <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-weight: 500;">Wochenperformance</p>
            <p style="margin: 0; color: #374151; font-size: 15px; font-weight: 600;">Alle Positionen sind diese Woche neu, der Wochenvergleich startet nächste Woche.</p>
          </div>
          ` : `
          <div style="background: ${changeBg}; border: 1px solid ${changeBorder}; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-weight: 500;">Wochenperformance</p>
              <p style="margin: 0; color: ${changeColor}; font-size: 22px; font-weight: 700;">${changeArrow} ${formatPercent(report.totalWeeklyChangePct)}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px; font-weight: 500;">Absolute Änderung</p>
              <p style="margin: 0; color: ${changeColor}; font-size: 16px; font-weight: 600;">${report.totalWeeklyChangeAbs >= 0 ? '+' : ''}${formatCurrency(report.totalWeeklyChangeAbs)}</p>
            </div>
          </div>
          `}

          <!-- Performer Cards -->
          ${performerCards ? `
          <div style="display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap;">
            ${performerCards}
          </div>
          ` : ''}

          <!-- Holdings Table -->
          ${holdingsRows ? `
          <div style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 4px;">
            <div style="background: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">Alle Positionen</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Symbol</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Anteile</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Kurs</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Wert</th>
                  <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; text-transform: uppercase;">Woche</th>
                </tr>
              </thead>
              <tbody>
                ${holdingsRows}
              </tbody>
            </table>
          </div>
          ` : ''}

          ${unpriced.length > 0 ? `
          <p style="margin: 8px 0 4px 0; color: #6b7280; font-size: 12px;">Kein aktueller Kurs für ${unpriced.join(', ')}. Diese Positionen stehen zum Einstandspreis im Depotwert.</p>
          ` : ''}

          <!-- Earnings-Radar: diese Woche gemeldet, nächste Woche anstehend -->
          ${earningsSection}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0 24px 0;">
            <a href="https://finclue.de/analyse/portfolio/workspace?depot=all"
               target="_blank"
               rel="noopener noreferrer"
               style="display: inline-block; background: #059669; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Zur App →
            </a>
          </div>

          <!-- Disclaimer -->
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.6;">
              Die Wochenperformance vergleicht den letzten Schlusskurs mit dem Schlusskurs des letzten Handelstags der Vorwoche.
              Fremdwährungen sind auf beiden Seiten zum aktuellen Wechselkurs umgerechnet.
              In dieser Woche gekaufte Anteile sind nicht enthalten (in der Tabelle als „neu“ markiert).
              Alle Angaben ohne Gewähr. Keine Anlageberatung.
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 13px; margin: 0 0 8px 0; text-align: center;">
            Du erhältst diesen Bericht jeden Sonntag für dein Portfolio auf Finclue.
          </p>
          <div style="text-align: center;">
            <a href="https://finclue.de/analyse/portfolio/workspace?depot=all" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Portfolio</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de/settings" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">Einstellungen</a>
            <span style="color: #d1d5db;">•</span>
            <a href="https://finclue.de" style="color: #374151; text-decoration: none; font-weight: 500; margin: 0 8px; font-size: 13px;">finclue.de</a>
          </div>
        </div>

      </div>

      <!-- Spacer -->
      <div style="height: 32px;"></div>

    </body>
    </html>
  `
}

/**
 * Schickt eine Mail und wiederholt bei vorübergehenden Fehlern. Der
 * Idempotenz-Schlüssel verhindert, dass ein Versuch, den Resend trotz Timeout
 * angenommen hat, beim nächsten Mal doppelt ankommt.
 * Gibt den Fehlernamen zurück, null bei Erfolg. Bewusst ohne Fehlertext: der
 * kann die Mailadresse enthalten und landet im Protokoll.
 */
async function sendWithRetry(mail: CreateEmailOptions, idempotencyKey: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    let reason: string | null
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      reason = await Promise.race([
        resend.emails.send(mail, { idempotencyKey }).then(({ error }) => (error ? error.name || 'application_error' : null)),
        new Promise<string>(resolve => { timer = setTimeout(() => resolve('timeout'), SEND_TIMEOUT_MS) })
      ])
    } catch {
      reason = 'application_error'
    } finally {
      clearTimeout(timer)
    }
    if (reason === null) return null
    if (!RETRYABLE_SEND_ERRORS.has(reason) || attempt >= SEND_RETRY_DELAYS_MS.length) return reason
    await sleep(SEND_RETRY_DELAYS_MS[attempt])
  }
}

async function logReport(userId: string, referenceId: string, content: Record<string, unknown>, emailSent: boolean) {
  const { error } = await supabase.from('notification_log').insert({
    user_id: userId,
    notification_type: NOTIFICATION_TYPE,
    reference_id: referenceId,
    content,
    email_sent: emailSent
  })
  if (error) console.error(`[Weekly Portfolio Report] Protokoll für ${userId} nicht geschrieben: ${error.message}`)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyPortfolioReport()
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleWeeklyPortfolioReport()
}

async function handleWeeklyPortfolioReport() {
  try {
    console.log('[Weekly Portfolio Report] Starting weekly portfolio report...')
    console.log(`[Weekly Portfolio Report] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Calculate KW and week range
    const today = new Date()
    const weekNumber = getISOWeekNumber(today)

    // Next week range (Mon-Sun) for earnings preview
    const nextMonday = new Date(today)
    const dayOfWeek = today.getUTCDay()
    const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    nextMonday.setUTCDate(today.getUTCDate() + daysToNextMonday)
    nextMonday.setUTCHours(0, 0, 0, 0)
    const nextSunday = new Date(nextMonday)
    nextSunday.setUTCDate(nextMonday.getUTCDate() + 6)

    // Current week range for the report subject
    const thisMonday = new Date(today)
    const daysToThisMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    thisMonday.setUTCDate(today.getUTCDate() + daysToThisMonday)
    thisMonday.setUTCHours(0, 0, 0, 0)
    const thisSunday = new Date(thisMonday)
    thisSunday.setUTCDate(thisMonday.getUTCDate() + 6)

    const weekRange = formatWeekRange(thisMonday, thisSunday)
    const nextWeekFrom = nextMonday.toISOString().split('T')[0]
    const nextWeekTo = nextSunday.toISOString().split('T')[0]

    console.log(`[Weekly Portfolio Report] KW ${weekNumber} · ${weekRange}`)

    // 2. Get all portfolios (or just the test user's)
    let portfoliosQuery = supabase
      .from('portfolios')
      .select('id, user_id, broker_name')

    if (TEST_USER_ID) {
      portfoliosQuery = portfoliosQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: portfolioRows, error: portfoliosError } = await portfoliosQuery
    const portfolios = countedDepots(portfolioRows ?? [])

    if (portfoliosError) throw new Error(`Depots lesen: ${portfoliosError.message}`)
    if (portfolios.length === 0) {
      console.log('[Weekly Portfolio Report] No portfolios found')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No portfolios found', emailsSent: 0 })
    }

    const portfolioIds = portfolios.map(p => p.id)
    const portfolioUserMap = new Map<string, string>()
    for (const p of portfolios) {
      portfolioUserMap.set(p.id, p.user_id)
    }

    // 3. Get all holdings across those portfolios
    const { data: allHoldings, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('portfolio_id, symbol, quantity, purchase_price, purchase_date')
      .in('portfolio_id', portfolioIds)
      .gt('quantity', 0)

    if (holdingsError) throw new Error(`Positionen lesen: ${holdingsError.message}`)
    if (!allHoldings || allHoldings.length === 0) {
      console.log('[Weekly Portfolio Report] No holdings found')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No holdings found', emailsSent: 0 })
    }

    // 4. Check premium status and group holdings by user
    const uniqueUserIds = [...new Set(portfolios.map(p => p.user_id))]

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, is_premium, subscription_status, subscription_end_date')
      .in('user_id', uniqueUserIds)

    if (profilesError) throw new Error(`Profile lesen: ${profilesError.message}`)

    const premiumUserIds = new Set<string>()
    for (const profile of profiles || []) {
      if (hasPremiumAccess(profile)) premiumUserIds.add(profile.user_id)
    }

    // Positionen je Nutzer sammeln (eine Zeile je Depot und Symbol; das
    // Zusammenfassen über Depots passiert in buildPortfolioReport)
    const userHoldings = new Map<string, HoldingRow[]>()

    for (const holding of allHoldings as HoldingRow[]) {
      const userId = portfolioUserMap.get(holding.portfolio_id)
      if (!userId || !holding.symbol) continue

      const isTestUser = TEST_USER_ID && userId === TEST_USER_ID
      const isPremium = premiumUserIds.has(userId)

      if (!isPremium && !isTestUser) continue

      const list = userHoldings.get(userId) ?? []
      list.push(holding)
      userHoldings.set(userId, list)
    }

    // Wer den Report dieser Woche schon hat, bekommt ihn bei einem erneuten Lauf
    // nicht noch einmal. So lassen sich fehlgeschlagene Mails nachholen.
    const referenceId = TEST_USER_ID ? `KW${weekNumber}-Test` : `KW${weekNumber}`
    let alreadySent = 0
    if (!TEST_USER_ID) {
      const { data: sentRows, error: sentError } = await supabase
        .from('notification_log')
        .select('user_id')
        .eq('notification_type', NOTIFICATION_TYPE)
        .eq('reference_id', referenceId)
        .eq('email_sent', true)
        .gte('sent_at', thisMonday.toISOString())
      if (sentError) console.warn(`[Weekly Portfolio Report] Frühere Läufe nicht lesbar: ${sentError.message}`)
      for (const row of sentRows || []) if (userHoldings.delete(row.user_id)) alreadySent++
    }

    if (userHoldings.size === 0) {
      console.log('[Weekly Portfolio Report] No eligible users with holdings')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No eligible users', emailsSent: 0 })
    }

    // 5. Kurse über denselben Dienst wie das Depot (Stammdaten, FMP, Yahoo)
    const allSymbols = [...new Set([...userHoldings.values()].flatMap(rows => rows.map(r => r.symbol)))].filter(Boolean)
    let quotes = new Map<string, NormalizedQuote>()
    try {
      quotes = await getQuotes(allSymbols)
    } catch (e) {
      // Die Kurshistorie unten kommt auch ohne Live-Kurse aus
      console.error('[Weekly Portfolio Report] Kursdienst fehlgeschlagen:', e)
    }
    console.log(`[Weekly Portfolio Report] Got quotes for ${quotes.size}/${allSymbols.length} symbols`)

    // Schlusskurse ab gut zwei Wochen vor dem Wochen-Montag: daraus der Schluss
    // des letzten Handelstags der Vorwoche und der letzte Schlusskurs
    const weekStart = thisMonday.toISOString().split('T')[0]
    const historyFrom = addDaysIso(weekStart, -HISTORY_LOOKBACK_DAYS)
    const seriesBySymbol = await loadSeriesForSymbols(allSymbols, quotes, historyFrom, today.toISOString().split('T')[0])
    console.log(`[Weekly Portfolio Report] Got price history for ${seriesBySymbol.size}/${allSymbols.length} symbols`)

    // Wechselkurse einmal holen, für alle vorkommenden Notierungswährungen
    const currencies = new Set(
      [...[...quotes.values()].map(q => q.currency), ...[...seriesBySymbol.values()].map(p => p.currency)]
        .map(c => (c === 'GBX' ? 'GBP' : c))
    )
    const fxEntries = await Promise.all(
      [...currencies].filter(c => c !== 'EUR').map(async c => [c, await getEurRate(c)] as const)
    )
    const byCurrency: Record<string, number | null> = Object.fromEntries(fxEntries)
    const usdToEurRate = byCurrency['USD'] ?? null
    const gbpToEurRate = byCurrency['GBP'] ?? null
    const eurRates = { usdToEurRate, gbpToEurRate, byCurrency }

    // Käufe/Verkäufe seit dem Vorwochen-Schluss, damit Zukäufe nicht als Wochengewinn zählen
    const eligiblePortfolioIds = portfolios.filter(p => userHoldings.has(p.user_id)).map(p => p.id)
    let allFlows: FlowRow[] = []
    try {
      allFlows = await loadFlows(eligiblePortfolioIds, historyFrom)
    } catch (e) {
      console.warn('[Weekly Portfolio Report] Could not load transactions, only purchase_date marks new positions:', e)
    }

    // 6. Earnings-Radar: Termine dieser Woche (gemeldet) und der nächsten (anstehend),
    //    aus SecEarningsCalendar samt Kursreaktion und üblicher Bewegung
    let earningsEvents: RadarEvent[] = []
    try {
      earningsEvents = await loadEarningsForSymbols(
        supabase,
        allSymbols,
        thisMonday.toISOString().split('T')[0],
        nextWeekTo,
        process.env.FMP_API_KEY
      )
    } catch (e) {
      console.warn('[Weekly Portfolio Report] Could not load earnings, skipping radar:', e)
    }

    // 7. Send emails per user
    let emailsSent = 0
    const userResults: Array<{ userId: string; email: string; totalValue: number; weeklyChangePct: number }> = []
    const failures: Array<{ userId: string; reason: string }> = []

    const recordFailure = async (userId: string, reason: string) => {
      failures.push({ userId, reason })
      console.error(`[Weekly Portfolio Report] Kein Report für ${userId}: ${reason}`)
      await logReport(userId, referenceId, { weekNumber, weekRange, error: reason }, false)
    }

    for (const [userId, rows] of userHoldings) {
      // Ein Fehler bei einem Nutzer darf die übrigen nicht um ihren Report bringen
      try {
        // Echte Wochenveränderung je Position (Vorwochen-Schluss → letzter Schluss)
        const userPortfolioIds = new Set(rows.map(r => r.portfolio_id))
        for (const p of portfolios) if (p.user_id === userId) userPortfolioIds.add(p.id)
        const userFlows = allFlows.filter(f => userPortfolioIds.has(f.portfolio_id))

        const report = buildPortfolioReport(rows, userFlows, seriesBySymbol, quotes, weekStart, eurRates)
        const { holdings, totalCurrentValue, totalWeeklyChangePct } = report

        // Einzelne Positionen ohne Kurs sind im Report gekennzeichnet. Fehlt er für
        // die meisten, ist die Kursquelle gestört und der Report wertlos.
        const pricedCount = holdings.filter(h => !h.priceMissing).length
        if (pricedCount === 0 || pricedCount * 2 < holdings.length) {
          await recordFailure(userId, 'prices_missing')
          continue
        }

        // Earnings-Radar für die Positionen dieses Nutzers (Werte in EUR)
        const positionValues = new Map(holdings.map(h => [h.symbol.toUpperCase(), h.currentValue]))
        const radar = buildRadar(earningsEvents, positionValues, totalCurrentValue, nextWeekFrom)
        const earningsSection = radarEmailSection(radar, { upcoming: 'Nächste Woche', reported: 'Diese Woche' })

        // Get user email
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
        if (!user?.email) {
          await recordFailure(userId, userError ? 'user_lookup_failed' : 'no_email')
          continue
        }

        const isTest = !!TEST_USER_ID
        const subject = isTest
          ? `[TEST] 📊 Dein Portfolio-Bericht: KW ${weekNumber}`
          : `📊 Dein Portfolio-Bericht: KW ${weekNumber}`

        const htmlContent = generateEmailHtml(report, weekNumber, weekRange, earningsSection, isTest)

        const sendError = await sendWithRetry(
          { from: 'Finclue <team@finclue.de>', to: [user.email], subject, html: htmlContent },
          `${NOTIFICATION_TYPE}/${userId}/${weekStart}${isTest ? `/test-${Date.now()}` : ''}`
        )
        if (sendError) {
          await recordFailure(userId, sendError)
          continue
        }

        emailsSent++
        userResults.push({
          userId,
          email: user.email,
          totalValue: totalCurrentValue,
          weeklyChangePct: totalWeeklyChangePct
        })

        console.log(
          `[Weekly Portfolio Report] 📧 Email sent to ${user.email}: ` +
          `${formatCurrency(totalCurrentValue)} · ${formatPercent(totalWeeklyChangePct)}`
        )

        // Direkt nach dem Versand festhalten: ein hängender Push darf den Eintrag nicht verhindern
        await logReport(userId, referenceId, {
          weekNumber,
          weekRange,
          totalCurrentValue,
          totalWeeklyChangePct,
          holdingCount: holdings.length,
          pricedCount,
          topGainer: report.topGainers[0]?.symbol ?? null,
          topLoser: report.topLosers[0]?.symbol ?? null
        }, true)

        // Send push notification
        try {
          const secret = process.env.INTERNAL_API_SECRET
          if (secret) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
            const pushBody = buildPushBody(report)

            const pushRes = await fetch(`${baseUrl}/api/notifications/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
              body: JSON.stringify({
                userIds: [userId],
                title: '📊 Dein Wochenbericht',
                body: pushBody,
                data: { screen: 'portfolio' }
              }),
              signal: AbortSignal.timeout(PUSH_TIMEOUT_MS),
            })
            if (!pushRes.ok) console.error(`[Weekly Portfolio Report] Push für ${userId}: HTTP ${pushRes.status}`)
          }
        } catch (e) { console.error('[Weekly Portfolio Report] Push error:', e) }

      } catch (e) {
        console.error(`[Weekly Portfolio Report] Unerwarteter Fehler bei ${userId}:`, e)
        await recordFailure(userId, 'unexpected_error').catch(() => {})
      }
    }

    console.log(`[Weekly Portfolio Report] Complete: ${emailsSent} emails sent, ${failures.length} failed, ${alreadySent} already sent`)

    return NextResponse.json({
      success: failures.length === 0,
      testMode: !!TEST_USER_ID,
      weekNumber,
      weekRange,
      symbolsQueried: allSymbols.length,
      quotesReceived: quotes.size,
      historyReceived: seriesBySymbol.size,
      earningsEvents: earningsEvents.length,
      emailsSent,
      alreadySent,
      failures,
      userResults
    }, { status: failures.length > 0 && emailsSent === 0 ? 500 : 200 })

  } catch (error) {
    console.error('[Weekly Portfolio Report] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly portfolio report' }, { status: 500 })
  }
}
