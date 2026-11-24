// src/lib/ai/depot/access.ts
// Zugriff der Finclue AI auf die Depots eines Nutzers.
//
// Die Nutzer-ID kommt aus dem geprüften Login. Jede Abfrage geht zuerst über
// portfolios.user_id, die Depot-IDs der Folgeabfragen stammen nur von dort.
// Ohne eingeschalteten Depotzugriff (Schalter an der Frageleiste) wird nichts
// geladen. Depotdaten werden je Frage geladen, nie zwischengespeichert.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { detectTickerCurrency } from '@/lib/fmp'
import { getExchangeRate } from '@/lib/exchangeRates'
import { convertAmount } from '@/lib/marketData/currency'
import { getInstrumentsForSymbols } from '@/lib/marketData/instrumentStore'
import { getQuotes } from '@/lib/marketData/quoteService'
import { assignDepotSlugs, slugifyDepotName } from '@/lib/depotRoutes'
import { countedDepots, depotLabel, isSampleDepot } from '@/lib/sampleDepotShared'
import {
  calculateDepotReturn, calculateDepotXirr, calculateRealizedGains, estimateMissingAmounts, filterPerformanceTransactions, valuateHolding,
  type Holding, type Portfolio, type RealizedGainInfo, type Transaction,
} from '@/lib/portfolio/metrics'
import { berlinIsoDay, ToolError } from '../tools/base'
import { classifyAll, type SecurityClass } from './classify'

export interface DepotInfo {
  id: string
  name: string
  slug: string
  sample: boolean
  broker_name: string | null
  cash: number
  credit: number
}

export interface Position {
  symbol: string
  name: string
  isin: string | null
  art: SecurityClass
  quantity: number
  value: number
  cost: number
  gain: number
  dayChange: number
  dayChangePercent: number
  priceEur: number
  hasPrice: boolean
  /** Kalendertag des letzten Kurses (deutsche Zeit), null = unbekannt */
  priceDay: string | null
  firstPurchase: string | null
  depots: string[]
  investmentCase: string | null
}

export interface DepotData {
  /** 'all' oder Depot-ID */
  id: string
  label: string
  depots: DepotInfo[]
  cash: number
  credit: number
  holdings: Holding[]
  /** je Wertpapier zusammengefasst, größte zuerst */
  positions: Position[]
  transactions: Transaction[]
  /** für Rendite und realisierte Gewinne bereinigt, wie auf der Depotseite */
  performanceTransactions: Transaction[]
  realized: Map<string, RealizedGainInfo>
  classes: Map<string, SecurityClass>
  stockValue: number
  invested: number
  missingPrices: string[]
  quotedAt: Date
}

const PAGE = 1000
const MAX_TRANSACTIONS = 20_000

async function loadTransactions(ids: string[]): Promise<Transaction[]> {
  const rows: Transaction[] = []
  for (let offset = 0; offset < MAX_TRANSACTIONS; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('portfolio_transactions')
      .select('id, portfolio_id, type, symbol, name, quantity, price, total_value, fee, date, created_at, notes')
      .in('portfolio_id', ids)
      .order('date', { ascending: false })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error('Buchungen nicht lesbar')
    rows.push(...((data ?? []) as unknown as Transaction[]))
    if (!data || data.length < PAGE) break
  }
  return rows
}

/** Live-Kurse wie /api/quotes und usePortfolio */
async function valuate(rows: any[]): Promise<{ holdings: Holding[]; missing: string[]; days: Map<string, string> }> {
  if (rows.length === 0) return { holdings: [], missing: [], days: new Map() }
  const symbols = [...new Set(rows.map(r => String(r.symbol)))]
  const quotes = await getQuotes(symbols)
  const currencies = [...new Set(symbols.map(s => detectTickerCurrency(s)))].filter(c => c !== 'EUR')
  const byCurrency = Object.fromEntries(await Promise.all(currencies.map(async c => [c, await getExchangeRate(c, 'EUR')] as const)))
  const rates = { usdToEurRate: byCurrency.USD ?? null, gbpToEurRate: byCurrency.GBP ?? null, byCurrency }

  const prices = new Map<string, { price: number; change: number }>()
  const days = new Map<string, string>()
  for (const symbol of symbols) {
    const quote = quotes.get(symbol.toUpperCase())
    if (!quote) continue
    const currency = detectTickerCurrency(symbol)
    const price = await convertAmount(quote.price, quote.currency, currency === 'GBP' ? 'GBX' : currency)
    if (price === null || price <= 0) continue
    prices.set(symbol, { price, change: quote.changePercent })
    const seconds = Number(quote.raw?.timestamp)
    if (seconds > 0) days.set(symbol, berlinIsoDay(seconds * 1000))
  }
  return {
    holdings: rows.map(r => {
      const quote = prices.get(r.symbol)
      return valuateHolding(r, quote?.price ?? 0, quote?.change ?? 0, rates)
    }),
    missing: symbols.filter(s => !prices.has(s)),
    days,
  }
}

export class DepotAccess {
  private depotsPromise: Promise<DepotInfo[]> | null = null
  private data = new Map<string, Promise<DepotData>>()

  constructor(
    private readonly userId: string,
    readonly isPremium: boolean,
    /** Schalter an der Frageleiste */
    readonly enabled: boolean,
    /** gerade geöffnetes Depot, sonst 'all' */
    private readonly openDepotId: string = 'all'
  ) {}

  /** ID des geprüften Nutzers, für computePortfolioHistory */
  get owner(): { id: string; isPremium: boolean } {
    return { id: this.userId, isPremium: this.isPremium }
  }

  async list(): Promise<DepotInfo[]> {
    if (!this.enabled) {
      throw new ToolError('Der Nutzer hat den Depotzugriff nicht eingeschaltet. Beantworte nur, was ohne Depot geht, und schreibe als letzte Zeile [[depot-einschalten]].')
    }
    this.depotsPromise ??= this.loadDepots()
    const depots = await this.depotsPromise
    if (depots.length === 0) throw new ToolError('Der Nutzer hat noch kein Depot angelegt. Er kann unter "Portfolio" eines anlegen und den Export seines Brokers hochladen.')
    return depots
  }

  /** Name des geöffneten Depots für die Anweisung */
  async openName(): Promise<string> {
    const depots = await this.list()
    return depots.find(d => d.id === this.openDepotId)?.name ?? (depots.length > 1 ? 'Alle Depots' : depots[0].name)
  }

  private async loadDepots(): Promise<DepotInfo[]> {
    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .select('id, name, cash_position, broker_credit, broker_name, is_default, created_at')
      .eq('user_id', this.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw new Error('Depots nicht lesbar')
    const rows = (data ?? []) as unknown as Portfolio[]
    const slugs = assignDepotSlugs(rows)
    return rows.map(p => ({
      id: p.id, name: isSampleDepot(p) ? `Beispieldepot ${depotLabel(p)}` : depotLabel(p), slug: slugs.get(p.id) ?? p.id, sample: isSampleDepot(p), broker_name: p.broker_name ?? null,
      cash: Number(p.cash_position) || 0, credit: Number(p.broker_credit) || 0,
    }))
  }

  /** Depot nach Name, sonst das geöffnete, sonst alle */
  async load(name?: string | null): Promise<DepotData> {
    const depots = await this.list()
    let id = this.openDepotId
    const wanted = name?.trim()
    if (wanted) {
      if (/^(?:alle|all|alle depots|gesamt)$/i.test(wanted)) id = 'all'
      else if (!/^(?:mein(?:e[mnr]?)? )?(?:depots?|portfolios?)$/i.test(wanted)) {
        const slug = slugifyDepotName(wanted)
        const hit = depots.find(d => d.name.toLowerCase() === wanted.toLowerCase() || d.slug === slug)
          ?? (/beispiel/i.test(wanted) ? depots.find(d => d.sample) : undefined)
          ?? depots.find(d => d.name.toLowerCase().includes(wanted.toLowerCase()) || (slug.length >= 3 && slug !== 'depot' && d.slug.includes(slug)))
        if (!hit) throw new ToolError(`Kein Depot namens "${wanted}". Vorhanden: ${depots.map(d => d.name).join(', ')}.`)
        id = hit.id
      }
    }
    if (id !== 'all' && !depots.some(d => d.id === id)) id = 'all'
    let pending = this.data.get(id)
    if (!pending) {
      pending = this.loadData(id, depots)
      this.data.set(id, pending)
    }
    return pending
  }

  private async loadData(id: string, depots: DepotInfo[]): Promise<DepotData> {
    // Über alle Depots zählt das Beispieldepot nicht mit, einzeln gefragt schon
    const selected = id === 'all' ? countedDepots(depots) : depots.filter(d => d.id === id)
    const ids = selected.map(d => d.id)
    const [holdingRows, transactions] = await Promise.all([
      supabaseAdmin.from('portfolio_holdings').select('*').in('portfolio_id', ids).limit(2000),
      loadTransactions(ids),
    ])
    if (holdingRows.error) throw new Error('Positionen nicht lesbar')
    const rows = (holdingRows.data ?? []).filter((r: any) => Number(r.quantity) > 0)
    const { holdings, missing, days } = await valuate(rows)

    const symbols = [...new Set([
      ...holdings.map(h => h.symbol),
      ...transactions.filter(t => t.symbol && t.symbol !== 'CASH' && t.type !== 'cash_deposit' && t.type !== 'cash_withdrawal').map(t => t.symbol),
    ])]
    const instruments = await getInstrumentsForSymbols(symbols)
    const names = new Map<string, string>()
    for (const t of transactions) if (t.name && !names.has(t.symbol)) names.set(t.symbol, t.name)
    for (const h of holdings) if (h.name) names.set(h.symbol, h.name)
    const classes = await classifyAll(symbols.map(symbol => {
      const instrument = instruments.get(symbol.toUpperCase())
      return { symbol, name: names.get(symbol) ?? symbol, isin: instrument?.isin, type: instrument?.type, instrumentName: instrument?.name }
    }))

    const depotName = new Map(depots.map(d => [d.id, d.name]))
    const grouped = new Map<string, Position>()
    for (const h of holdings) {
      const isin = h.isin || instruments.get(h.symbol.toUpperCase())?.isin || null
      const key = isin ?? h.symbol.toUpperCase()
      const depot = depotName.get(h.portfolio_id ?? '') ?? ''
      const cost = h.purchase_price_display * h.quantity
      const existing = grouped.get(key)
      if (existing) {
        existing.quantity += h.quantity
        existing.value += h.value
        existing.cost += cost
        existing.gain += h.value - cost
        existing.dayChange += h.day_change_value
        existing.hasPrice &&= h.current_price > 0
        if (existing.priceDay !== (days.get(h.symbol) ?? null)) existing.priceDay = null
        if (depot && !existing.depots.includes(depot)) existing.depots.push(depot)
        if (h.purchase_date && (!existing.firstPurchase || h.purchase_date < existing.firstPurchase)) existing.firstPurchase = h.purchase_date
        existing.priceEur = existing.quantity > 0 ? existing.value / existing.quantity : 0
        existing.investmentCase ??= h.investment_case ?? null
        continue
      }
      grouped.set(key, {
        symbol: h.symbol, name: h.name, isin, art: classes.get(h.symbol.toUpperCase()) ?? { art: 'Aktie', klasse: null, unsicher: true },
        quantity: h.quantity, value: h.value, cost, gain: h.value - cost, dayChange: h.day_change_value, dayChangePercent: h.day_change_percent,
        priceEur: h.current_price_display, hasPrice: h.current_price > 0, priceDay: days.get(h.symbol) ?? null, firstPurchase: h.purchase_date || null,
        depots: depot ? [depot] : [], investmentCase: h.investment_case ?? null,
      })
    }
    const positions = [...grouped.values()].sort((a, b) => b.value - a.value)
    for (const p of positions) {
      const before = p.value - p.dayChange
      p.dayChangePercent = before > 0 ? (p.dayChange / before) * 100 : 0
    }

    const performanceTransactions = estimateMissingAmounts(filterPerformanceTransactions(transactions, holdings), holdings)
    return {
      id, label: id === 'all' ? (depots.length > 1 ? 'Alle Depots' : selected[0]?.name ?? 'Depot') : selected[0]?.name ?? 'Depot',
      depots: selected, cash: selected.reduce((s, d) => s + d.cash, 0), credit: selected.reduce((s, d) => s + d.credit, 0),
      holdings, positions, transactions, performanceTransactions,
      realized: calculateRealizedGains(performanceTransactions).realizedGainByTxId,
      classes,
      stockValue: holdings.reduce((s, h) => s + h.value, 0),
      invested: holdings.reduce((s, h) => s + h.purchase_price_display * h.quantity, 0),
      missingPrices: missing, quotedAt: new Date(),
    }
  }
}

/** Gesamtrendite wie in den Kennzahlen der Depotseite (calculateDepotReturn) */
export function depotTotals(d: DepotData) {
  const filtered = filterPerformanceTransactions(d.transactions, d.holdings)
  const result = calculateDepotReturn(filtered, d.holdings, calculateRealizedGains(d.performanceTransactions))
  const dayChange = d.holdings.reduce((s, h) => s + (h.day_change_value || 0), 0)
  const before = d.stockValue - dayChange
  return {
    gain: result.priceGain, gainPercent: d.invested > 0 ? (result.priceGain / d.invested) * 100 : 0,
    realized: result.realized, dividends: result.dividends, fees: result.orderFees, taxes: result.orderTaxes,
    interest: result.interest, accountFees: result.accountFees, taxBookings: result.taxes, transfers: result.transfers,
    totalReturn: result.total, totalReturnPercent: result.totalPercent,
    xirr: calculateDepotXirr(d.performanceTransactions, d.holdings, d.stockValue),
    dayChange, dayChangePercent: before > 0 ? (dayChange / before) * 100 : 0,
  }
}

/** Betrag einer Buchung inklusive Kaufgebühr */
export function buyAmount(t: Transaction): number {
  const total = Number(t.total_value) || 0
  const amount = total > 0 ? total : Math.abs((Number(t.quantity) || 0) * (Number(t.price) || 0))
  return amount + Math.abs(Number(t.fee) || 0)
}

export function sellAmount(t: Transaction): number {
  const total = Number(t.total_value) || 0
  const amount = total > 0 ? total : Math.abs((Number(t.quantity) || 0) * (Number(t.price) || 0))
  return amount - Math.abs(Number(t.fee) || 0)
}
