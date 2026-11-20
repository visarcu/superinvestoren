// src/app/api/notifications/send-weekly-portfolio-report/route.ts
// Cron: Every Sunday at 18:00 UTC — sends a weekly portfolio performance report via email + push
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { hasPremiumAccess } from '@/lib/premiumAccess'
import { convertPriceToEur, type EurRates } from '@/lib/portfolioValuation'
import { detectTickerCurrency } from '@/lib/fmp'
import { buildRadar, loadEarningsForSymbols, radarEmailSection, type RadarEvent } from '@/lib/earningsRadar'

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

interface FmpQuote {
  symbol: string
  price: number
  changesPercentage: number
  change: number
  previousClose: number
  name?: string
}

interface Close {
  date: string
  close: number
}

// Eine Zeile aus portfolio_holdings (eine je Depot und Symbol)
interface HoldingRow {
  portfolio_id: string
  symbol: string
  quantity: number
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
// noData: kein Vorwochen-Schlusskurs (Kurshistorie fehlt oder Neuemission)
type WeekStatus = 'held' | 'new' | 'noData'

interface HoldingWithPerf {
  symbol: string
  quantity: number
  // Anteile, die seit dem Vorwochen-Schluss durchgehend gehalten wurden. Nur sie
  // gehen in die Wochenveränderung ein, Zukäufe dieser Woche nicht.
  heldQuantity: number
  currentPrice: number
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

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

// Tages-Schlusskurse eines Symbols (aufsteigend). FMP v3 historical-price-full,
// ein Abruf je Symbol: Sammelabrufe sind im Tarif gesperrt, und
// /stable/historical-price-eod liefert im Tarif nur US-Werte (Xetra & Co. nicht).
async function fetchCloses(symbol: string, from: string, to: string): Promise<Close[]> {
  const url =
    `https://financialmodelingprep.com/api/v3/historical-price-full/${encodeURIComponent(symbol)}` +
    `?from=${from}&to=${to}&serietype=line&apikey=${process.env.FMP_API_KEY}`
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    if (res.status === 429 && attempt < 3) {
      await new Promise(r => setTimeout(r, 1500 * 2 ** attempt))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json().catch(() => null)
    const rows: Array<{ date?: unknown; close?: unknown }> = Array.isArray(data?.historical) ? data.historical : []
    return rows
      .filter(r => typeof r.date === 'string' && typeof r.close === 'number' && r.close > 0)
      .map(r => ({ date: (r.date as string).slice(0, 10), close: r.close as number }))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
  }
}

async function fetchClosesForSymbols(symbols: string[], from: string, to: string): Promise<Map<string, Close[]>> {
  const out = new Map<string, Close[]>()
  let next = 0
  const worker = async () => {
    while (next < symbols.length) {
      const symbol = symbols[next++]
      try {
        out.set(symbol, await fetchCloses(symbol, from, to))
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
  closesBySymbol: Map<string, Close[]>,
  quoteMap: Map<string, FmpQuote>,
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

    const currency = detectTickerCurrency(symbol)
    const closes = closesBySymbol.get(symbol) ?? []
    const latest = closes[closes.length - 1]
    const reference = [...closes].reverse().find(c => c.date < weekStart)

    // Ohne Kurshistorie bleibt die Position mit Live-Kurs im Depotwert, aber ohne Woche
    const rawCurrent = latest?.close ?? (quoteMap.get(symbol)?.price || null)
    if (!rawCurrent) continue
    const currentPrice = convertPriceToEur(rawCurrent, currency, eurRates)
    const currentValue = quantity * currentPrice

    if (!reference) {
      holdings.push({
        symbol, quantity, heldQuantity: 0, currentPrice,
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

    const referencePrice = convertPriceToEur(reference.close, currency, eurRates)
    const previousValue = heldQuantity * referencePrice
    const isHeld = heldQuantity > 0

    holdings.push({
      symbol,
      quantity,
      heldQuantity,
      currentPrice,
      referencePrice,
      referenceDate: reference.date,
      currentValue,
      previousValue,
      weeklyChangeAbs: heldQuantity * (currentPrice - referencePrice),
      // Kursbewegung in Börsenwährung (gleiche EUR-Rate auf beiden Seiten)
      weeklyChangePct: isHeld ? (reference.close > 0 ? (latest.close / reference.close - 1) * 100 : 0) : 0,
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
          <td style="padding: 12px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 13px; text-align: right; white-space: nowrap;">${formatCurrency(h.currentPrice)}</td>
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
      .select('id, user_id')

    if (TEST_USER_ID) {
      portfoliosQuery = portfoliosQuery.eq('user_id', TEST_USER_ID)
    }

    const { data: portfolios, error: portfoliosError } = await portfoliosQuery

    if (portfoliosError || !portfolios || portfolios.length === 0) {
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
      .select('portfolio_id, symbol, quantity, purchase_date')
      .in('portfolio_id', portfolioIds)
      .gt('quantity', 0)

    if (holdingsError || !allHoldings || allHoldings.length === 0) {
      console.log('[Weekly Portfolio Report] No holdings found')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No holdings found', emailsSent: 0 })
    }

    // 4. Check premium status and group holdings by user
    const uniqueUserIds = [...new Set(portfolios.map(p => p.user_id))]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, is_premium, subscription_status, subscription_end_date')
      .in('user_id', uniqueUserIds)

    const premiumUserIds = new Set<string>()
    for (const profile of profiles || []) {
      if (hasPremiumAccess(profile)) premiumUserIds.add(profile.user_id)
    }

    // Positionen je Nutzer sammeln (eine Zeile je Depot und Symbol; das
    // Zusammenfassen über Depots passiert in buildPortfolioReport)
    const userHoldings = new Map<string, HoldingRow[]>()

    for (const holding of allHoldings as HoldingRow[]) {
      const userId = portfolioUserMap.get(holding.portfolio_id)
      if (!userId) continue

      const isTestUser = TEST_USER_ID && userId === TEST_USER_ID
      const isPremium = premiumUserIds.has(userId)

      if (!isPremium && !isTestUser) continue

      const list = userHoldings.get(userId) ?? []
      list.push(holding)
      userHoldings.set(userId, list)
    }

    if (userHoldings.size === 0) {
      console.log('[Weekly Portfolio Report] No eligible users with holdings')
      return NextResponse.json({ success: true, testMode: !!TEST_USER_ID, weekNumber, weekRange, message: 'No eligible users', emailsSent: 0 })
    }

    // 5. Fetch FMP quotes for all unique symbols in one batch call
    const allSymbols = [...new Set([...userHoldings.values()].flatMap(rows => rows.map(r => r.symbol)))]
    console.log(`[Weekly Portfolio Report] Fetching quotes for ${allSymbols.length} symbols...`)

    const quoteMap = new Map<string, FmpQuote>()

    // FMP supports comma-separated symbols in one call
    const BATCH_SIZE = 50
    for (let i = 0; i < allSymbols.length; i += BATCH_SIZE) {
      const batch = allSymbols.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${batch.join(',')}?apikey=${process.env.FMP_API_KEY}`
        )
        if (!res.ok) {
          console.error(`[Weekly Portfolio Report] FMP quote error: ${res.status}`)
          continue
        }
        const data: FmpQuote[] = await res.json()
        if (Array.isArray(data)) {
          for (const q of data) {
            quoteMap.set(q.symbol, q)
          }
        }
      } catch (e) {
        console.error('[Weekly Portfolio Report] FMP fetch error:', e)
      }
    }

    console.log(`[Weekly Portfolio Report] Got quotes for ${quoteMap.size} symbols`)

    // Wechselkurse einmal holen — FMP liefert Kurse in Börsenwährung (USD, GBX/Pence
    // bei .L, EUR bei .DE); für den Depotwert muss alles nach EUR umgerechnet werden.
    const currencies = new Set(allSymbols.map(s => detectTickerCurrency(s)))
    const fxEntries = await Promise.all(
      [...currencies].filter(c => c !== 'EUR').map(async c => [c, await getEurRate(c)] as const)
    )
    const byCurrency: Record<string, number | null> = Object.fromEntries(fxEntries)
    const usdToEurRate = byCurrency['USD'] ?? null
    const gbpToEurRate = byCurrency['GBP'] ?? null
    const eurRates = { usdToEurRate, gbpToEurRate, byCurrency }

    // Schlusskurse ab gut zwei Wochen vor dem Wochen-Montag: daraus der Schluss
    // des letzten Handelstags der Vorwoche und der letzte Schlusskurs
    const weekStart = thisMonday.toISOString().split('T')[0]
    const historyFrom = addDaysIso(weekStart, -HISTORY_LOOKBACK_DAYS)
    const closesBySymbol = await fetchClosesForSymbols(allSymbols, historyFrom, today.toISOString().split('T')[0])
    console.log(`[Weekly Portfolio Report] Got price history for ${closesBySymbol.size}/${allSymbols.length} symbols`)

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

    for (const [userId, rows] of userHoldings) {
      // Echte Wochenveränderung je Position (Vorwochen-Schluss → letzter Schluss)
      const userPortfolioIds = new Set(rows.map(r => r.portfolio_id))
      for (const p of portfolios) if (p.user_id === userId) userPortfolioIds.add(p.id)
      const userFlows = allFlows.filter(f => userPortfolioIds.has(f.portfolio_id))

      const report = buildPortfolioReport(rows, userFlows, closesBySymbol, quoteMap, weekStart, eurRates)
      const { holdings, totalCurrentValue, totalWeeklyChangePct } = report

      if (holdings.length === 0) {
        console.log(`[Weekly Portfolio Report] No valid quotes for user ${userId}, skipping`)
        continue
      }

      // Earnings-Radar für die Positionen dieses Nutzers (Werte in EUR)
      const positionValues = new Map(holdings.map(h => [h.symbol.toUpperCase(), h.currentValue]))
      const radar = buildRadar(earningsEvents, positionValues, totalCurrentValue, nextWeekFrom)
      const earningsSection = radarEmailSection(radar, { upcoming: 'Nächste Woche', reported: 'Diese Woche' })

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (!user?.email) {
        console.log(`[Weekly Portfolio Report] No email for user ${userId}`)
        continue
      }

      const isTest = !!TEST_USER_ID
      const subject = isTest
        ? `[TEST] 📊 Dein Portfolio-Bericht: KW ${weekNumber}`
        : `📊 Dein Portfolio-Bericht: KW ${weekNumber}`

      const htmlContent = generateEmailHtml(report, weekNumber, weekRange, earningsSection, isTest)

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Finclue <team@finclue.de>',
          to: [user.email],
          subject,
          html: htmlContent,
        })

        if (emailError) {
          console.error(`[Weekly Portfolio Report] Email error for ${user.email}:`, emailError)
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
          `[Weekly Portfolio Report] 📧 Email sent to ${user.email} — ` +
          `${formatCurrency(totalCurrentValue)} · ${formatPercent(totalWeeklyChangePct)}`
        )

        // Send push notification
        try {
          const secret = process.env.INTERNAL_API_SECRET
          if (secret) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://finclue.de'
            const pushBody = buildPushBody(report)

            await fetch(`${baseUrl}/api/notifications/push`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
              body: JSON.stringify({
                userIds: [userId],
                title: '📊 Dein Wochenbericht',
                body: pushBody,
                data: { screen: 'portfolio' }
              }),
            })
          }
        } catch (e) { console.error('[Weekly Portfolio Report] Push error:', e) }

        // Log to notification_log
        await supabase.from('notification_log').insert({
          user_id: userId,
          notification_type: 'weekly_portfolio_report',
          reference_id: `KW${weekNumber}`,
          content: {
            weekNumber,
            weekRange,
            totalCurrentValue,
            totalWeeklyChangePct,
            holdingCount: holdings.length,
            topGainer: report.topGainers[0]?.symbol ?? null,
            topLoser: report.topLosers[0]?.symbol ?? null
          },
          email_sent: true
        })

      } catch (emailError) {
        console.error(`[Weekly Portfolio Report] Failed to send email to ${user.email}:`, emailError)
      }
    }

    console.log(`[Weekly Portfolio Report] Complete: ${emailsSent} emails sent`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      weekNumber,
      weekRange,
      symbolsQueried: allSymbols.length,
      quotesReceived: quoteMap.size,
      historyReceived: closesBySymbol.size,
      earningsEvents: earningsEvents.length,
      emailsSent,
      userResults
    })

  } catch (error) {
    console.error('[Weekly Portfolio Report] Fatal error:', error)
    return NextResponse.json({ error: 'Failed to send weekly portfolio report' }, { status: 500 })
  }
}
