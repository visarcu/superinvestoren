// src/lib/portfolio/metrics.ts
//
// Depot-Rechnung ohne React: Typen, Bewertung, realisierte Gewinne, Gesamtrendite,
// XIRR. Genutzt vom Hook usePortfolio (Depotseite) und serverseitig von der
// Finclue AI, damit beide dieselben Zahlen nennen.

import { detectTickerCurrency } from '@/lib/fmp'
import { cashFlowKind, isCashFlow, signedCashAmount, sumCashFlows, sumOrderCosts } from '@/lib/portfolio/cashFlows'
import { findInternalTransfers, findSplitPairs, isSplitBooking, settleSplitBookings, walkCostBasis, withoutInternalTransfers } from '@/lib/portfolio/costBasis'
import { isCorpActionTransfer } from '@/lib/portfolioTwr'
import { convertPriceToEur,
  convertPriceToEurStrict, type EurRates } from '@/lib/portfolioValuation'
import { calculateXIRR, type Cashflow } from '@/utils/xirr'

// Types
export interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  broker_credit: number  // Wertpapierkredit — manuell eingetragen, nicht aus Transaktionen
  created_at: string
  is_default?: boolean
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

export interface Holding {
  id: string
  symbol: string
  name: string
  isin?: string
  quantity: number
  purchase_price: number
  purchase_price_display: number
  current_price: number
  current_price_display: number
  purchase_date: string
  value: number
  gain_loss: number
  gain_loss_percent: number
  // Tagesveränderung (letzter Handelstag) — Prozent aus der Quote,
  // Euro-Betrag auf Basis des aktuellen EUR-Werts der Position
  day_change_value: number
  day_change_percent: number
  /** Handelstag des Kurses (Berliner Datum), null = unbekannt */
  traded_on?: string | null
  /** Kein Kurs oder Wechselkurs: Wert zum Einstand, Tagesveränderung 0 */
  price_missing?: boolean
  purchase_currency?: string
  // FX-Split: Kurs-Performance vs Währungs-Effekt separat (optional — benötigt
  // purchase_fx_rate in der DB und aktuelle FX-Rate). Null wenn nicht berechenbar
  // (z.B. EUR-Kauf oder Kaufrate nicht gespeichert).
  pl_excl_fx?: number | null
  pl_from_fx?: number | null
  // Investment-Case (User-Notiz zur Anlagestrategie, optional)
  investment_case?: string | null
  investment_case_updated_at?: string | null
  // Portfolio-Info (gesetzt in "Alle Depots" Ansicht)
  portfolio_id?: string
  portfolio_name?: string
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  fee?: number
  date: string
  created_at: string
  notes?: string
  // Portfolio-Info (gesetzt in "Alle Depots" Ansicht)
  portfolio_id?: string
  portfolio_name?: string
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

/** Kennzahlen eines einzelnen Depots für die Liste in "Alle Depots" */
export interface DepotSummary {
  /** Wertpapiere ohne Cash */
  stockValue: number
  positions: number
  transactions: number
  dayGainLoss: number
  totalReturn: number
  totalReturnPercent: number
}

const SECURITY_TRANSACTION_TYPES = new Set<Transaction['type']>([
  'buy',
  'sell',
  'transfer_in',
  'transfer_out',
])

export function normalizeSymbol(symbol?: string | null): string {
  return (symbol || '').trim().toUpperCase()
}

export function portfolioSymbolKey(portfolioId: string | undefined, symbol: string): string {
  return `${portfolioId || ''}|${normalizeSymbol(symbol)}`
}

export function transactionAmount(tx: Transaction): number {
  const totalValue = Number(tx.total_value) || 0
  if (totalValue > 0) return totalValue

  return Math.abs((Number(tx.quantity) || 0) * (Number(tx.price) || 0))
}

export function isSecurityTransaction(tx: Transaction): boolean {
  return SECURITY_TRANSACTION_TYPES.has(tx.type) && normalizeSymbol(tx.symbol) !== '' && normalizeSymbol(tx.symbol) !== 'CASH'
}

export function filterPerformanceTransactions(transactions: Transaction[], holdings: Holding[]): Transaction[] {
  if (transactions.length === 0) return transactions

  const holdingKeys = new Set(
    holdings
      .filter(h => normalizeSymbol(h.symbol))
      .map(h => portfolioSymbolKey(h.portfolio_id, h.symbol))
  )
  const holdingSymbols = new Set(
    holdings
      .map(h => normalizeSymbol(h.symbol))
      .filter(Boolean)
  )

  const transactionGroups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    if (!isSecurityTransaction(tx)) continue

    const key = portfolioSymbolKey(tx.portfolio_id, tx.symbol)
    if (!transactionGroups.has(key)) transactionGroups.set(key, [])
    transactionGroups.get(key)!.push(tx)
  }

  const ignoredOpenPositionKeys = new Set<string>()
  for (const [key, txs] of transactionGroups) {
    let finalShares = 0
    for (const tx of txs) {
      const quantity = Number(tx.quantity) || 0
      if (tx.type === 'buy' || tx.type === 'transfer_in') {
        finalShares += quantity
      } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
        finalShares -= quantity
      }
    }

    if (finalShares <= 0.0001) continue

    const hasPortfolioSpecificHolding = holdingKeys.has(key)
    const hasSymbolHoldingWithoutPortfolio = !txs.some(tx => tx.portfolio_id) && holdingSymbols.has(normalizeSymbol(txs[0]?.symbol))

    if (!hasPortfolioSpecificHolding && !hasSymbolHoldingWithoutPortfolio) {
      ignoredOpenPositionKeys.add(key)
    }
  }

  if (ignoredOpenPositionKeys.size === 0) return transactions

  return transactions.filter(tx => {
    if (!isSecurityTransaction(tx)) return true
    return !ignoredOpenPositionKeys.has(portfolioSymbolKey(tx.portfolio_id, tx.symbol))
  })
}

// Depotüberträge (teils auch Importe) ohne Kostenbasis (price=0, total_value=0)
// sprengen alle flussbasierten Kennzahlen: XIRR sieht die Shares als Geschenk
// (Endwert ohne Kapitaleinsatz → dreistellige p.a.-Werte), Realized Gains
// rechnen gegen Kostenbasis 0. Fehlende Beträge daher schätzen — bevorzugt
// über die Kostenbasis der zugehörigen Holding, sonst über den aktuellen Kurs.
export function estimateMissingAmounts(transactions: Transaction[], holdings: Holding[]): Transaction[] {
  if (transactions.length === 0) return transactions

  // Erst die Position desselben Depots, dann (Alle Depots) irgendeine zu dem
  // Symbol: Sonst bekam eine wertlose Einbuchung in Depot B den Einstand aus Depot A.
  const holdingByKey = new Map<string, Holding>()
  const holdingBySymbol = new Map<string, Holding>()
  holdings.forEach(h => {
    const sym = normalizeSymbol(h.symbol)
    if (!sym) return
    const key = portfolioSymbolKey(h.portfolio_id, sym)
    if (!holdingByKey.has(key)) holdingByKey.set(key, h)
    if (!holdingBySymbol.has(sym)) holdingBySymbol.set(sym, h)
  })

  // Split als Paar aus wertlosem Aus- und Einbuchen oder als Gratisstücke (Trade
  // Republic): Da fehlt kein Betrag, es ist keiner geflossen. Geschätzt stünde der
  // Einstand doppelt im Depot.
  const splitPairs = findSplitPairs(transactions)

  let changed = false
  const result = transactions.map(tx => {
    if (!isSecurityTransaction(tx) || splitPairs.has(tx) || isSplitBooking(tx)) return tx
    if (transactionAmount(tx) > 0) return tx
    const quantity = Number(tx.quantity) || 0
    if (quantity <= 0) return tx

    const sym = normalizeSymbol(tx.symbol)
    const holding = holdingByKey.get(portfolioSymbolKey(tx.portfolio_id, sym)) ?? holdingBySymbol.get(sym)
    if (!holding) return tx
    const perShare = holding.purchase_price_display > 0
      ? holding.purchase_price_display
      : holding.quantity > 0 ? holding.value / holding.quantity : 0
    if (perShare <= 0) return tx

    changed = true
    return { ...tx, total_value: quantity * perShare }
  })

  return changed ? result : transactions
}

// Realisierte Gewinne & Dividenden aus Transaktionshistorie berechnen
// Verwendet die Durchschnittskostenmethode (Average Cost Method)
export interface RealizedGainInfo {
  realizedGain: number
  avgCostBasis: number
  realizedGainPercent: number
}

export function calculateRealizedGains(transactions: Transaction[]): {
  totalRealizedGain: number
  totalDividends: number
  realizedGainByTxId: Map<string, RealizedGainInfo>
  /** Wertzuwachs abgegebener Anteile bis zum Depotübertrag, siehe unten */
  totalTransferGain: number
  /** Einstand der verkauften Anteile (Basis für die Gesamtrendite in Prozent) */
  totalCostOfSold: number
} {
  let totalRealizedGain = 0
  let totalDividends = 0
  let totalTransferGain = 0
  let totalCostOfSold = 0
  const realizedGainByTxId = new Map<string, RealizedGainInfo>()

  // Umzüge im selben Depot sind kein Übertrag: Dort fließt nichts ab
  const internal = findInternalTransfers(transactions)

  // Einstand je Depot und Symbol (walkCostBasis): nur nach Symbol getrennt würden
  // sich in "Alle Depots" die Einstände verschiedener Depots vermischen.
  walkCostBasis(transactions, ({ tx, avgBefore, quantity, cost }) => {
    if (tx.type === 'sell') {
      if (quantity <= 0) return
      // Erlös aus total_value (Fallback price×qty): tx.price allein kann bei
      // Importen 0 oder gerundet sein. Verkaufsgebühren mindern den Erlös
      // (Kaufgebühren stecken im Einstand). Bei Überverkauf nur den
      // vorhandenen Bestand realisieren.
      const soldQuantity = Number(tx.quantity) || 0
      const sellFee = Math.abs(Number(tx.fee) || 0)
      const proceedsPerShare = soldQuantity > 0 ? (transactionAmount(tx) - sellFee) / soldQuantity : 0
      const realizedGain = (proceedsPerShare - avgBefore) * quantity
      totalRealizedGain += realizedGain
      totalCostOfSold += avgBefore * quantity
      realizedGainByTxId.set(tx.id, {
        realizedGain,
        avgCostBasis: avgBefore,
        realizedGainPercent: avgBefore > 0 ? ((proceedsPerShare - avgBefore) / avgBefore) * 100 : 0,
      })
      return
    }

    // Depotüberträge: Was abgeht, hat bis dahin einen Wertzuwachs erzielt, der
    // sonst nirgends auftaucht. Kommt das Papier später zurück, übernimmt die
    // Einbuchung den alten Einstand; der Zuwachs steckt dann im Kursgewinn und
    // wird hier wieder abgezogen. So gilt: Summe aller Teile = Depotwert −
    // zugeführtes Kapital.
    if (tx.type !== 'transfer_in' && tx.type !== 'transfer_out') return
    if (internal.has(tx) || isCorpActionTransfer(tx)) return
    const amount = transactionAmount(tx)
    if (amount <= 0 || quantity <= 0) return
    if (tx.type === 'transfer_out') {
      const booked = Number(tx.quantity) || 0
      totalTransferGain += amount * (booked > 0 ? quantity / booked : 1) - cost
    } else {
      totalTransferGain -= amount - cost
    }
  })

  for (const tx of transactions) {
    if (tx.type === 'dividend') totalDividends += transactionAmount(tx)
    else if (isCashFlow(tx) && cashFlowKind(tx) === 'dividend_correction') totalDividends += signedCashAmount(tx)
  }

  return { totalRealizedGain, totalDividends, realizedGainByTxId, totalTransferGain, totalCostOfSold }
}

export interface DepotReturn {
  /** Kursgewinn der offenen Positionen */
  priceGain: number
  /** Verkäufe nach Gebühren und Steuern */
  realized: number
  /** Dividenden, wie der Broker sie gutgeschrieben hat */
  dividends: number
  /** Guthaben- und Kreditzinsen, netto */
  interest: number
  /** Gebühren außerhalb von Orders (Abo, Einzahlungen), negativ */
  accountFees: number
  /** Steuerbuchungen aufs Konto (Ausgleich, Erstattung) */
  taxes: number
  /** Wertzuwachs abgegebener Anteile bis zum Depotübertrag */
  transfers: number
  total: number
  totalPercent: number
  /** Ordergebühren, positiv. Schon im Einstand bzw. in `realized` enthalten */
  orderFees: number
  /** Steuern auf Verkäufe, positiv. Schon in `realized` enthalten */
  orderTaxes: number
}

/**
 * Gesamtrendite und ihre Teile. Jeder Betrag zählt genau einmal: Kaufgebühren
 * stecken im Einstand, Verkaufsgebühren und -steuern im realisierten Gewinn,
 * der Rest (Zinsen, Abo, Steuerausgleich) kommt aus den Kontobewegungen.
 * transactions: bereits über filterPerformanceTransactions gelaufen.
 */
export function calculateDepotReturn(
  transactions: Transaction[],
  holdings: Holding[],
  realized: Pick<ReturnType<typeof calculateRealizedGains>, 'totalRealizedGain' | 'totalDividends' | 'totalTransferGain' | 'totalCostOfSold'>,
): DepotReturn {
  const stockValue = holdings.reduce((sum, h) => sum + h.value, 0)
  const invested = holdings.reduce((sum, h) => sum + h.purchase_price_display * h.quantity, 0)
  const cash = sumCashFlows(transactions)
  const order = sumOrderCosts(transactions)
  const priceGain = stockValue - invested
  const total = priceGain + realized.totalRealizedGain + realized.totalDividends +
    cash.interest + cash.fees + cash.taxes + realized.totalTransferGain
  // Basis: eingesetztes Kapital, also offene Positionen plus Einstand der
  // schon verkauften Anteile. Nur offene Positionen ergaben nach einem
  // Komplettverkauf eine Basis aus Gebühren (480 € Gewinn = "+2400 %").
  // Kaufgebühren stecken schon im Einstand (invested, totalCostOfSold); nur die
  // Kosten der Verkäufe kommen dazu, sonst zählten sie doppelt.
  const sellOrder = sumOrderCosts(transactions.filter(tx => tx.type === 'sell'))
  const base = invested + realized.totalCostOfSold + sellOrder.fees + sellOrder.taxes
  return {
    priceGain,
    realized: realized.totalRealizedGain,
    dividends: realized.totalDividends,
    interest: cash.interest,
    accountFees: cash.fees,
    taxes: cash.taxes,
    transfers: realized.totalTransferGain,
    total,
    totalPercent: base > 0 ? (total / base) * 100 : 0,
    orderFees: order.fees,
    orderTaxes: order.taxes,
  }
}

// Abfluss-Wert für transfer_out ohne Betrag (price=0, total_value=0) schätzen:
// durchschnittliche Kostenbasis des Symbols im selben Depot bis zum Transfer-
// Datum, aus den vorhandenen Transaktionen simuliert. Ohne diese Schätzung
// bleiben die früheren Käufe als Phantom-Totalverlust im XIRR (Kapital rein,
// nie wieder raus). Das ist eine Näherung mangels historischer Kurse im Client —
// die Server-Route schätzt stattdessen den Marktwert.
export function estimateValuelessTransferOuts(transactions: Transaction[]): Map<string, number> {
  const estimates = new Map<string, number>()
  const needsEstimate = transactions.some(
    tx => tx.type === 'transfer_out' && transactionAmount(tx) <= 0 && (Number(tx.quantity) || 0) > 0
  )
  if (!needsEstimate) return estimates

  walkCostBasis(transactions, ({ tx, quantity, cost }) => {
    if (tx.type === 'transfer_out' && transactionAmount(tx) <= 0 && quantity > 0) estimates.set(tx.id, cost)
  })

  return estimates
}

// Historische Performance pro (symbol, portfolio_id) aggregieren.
// Wird in der "Alle Depots"-Ansicht genutzt: ermöglicht Ghost-Rows für Depots,
// die eine Position mal hatten (Dividenden, realisierter Gewinn) aber aktuell
// 0 Shares halten — analog zu Parqet.
export interface DepotHistoricalPerf {
  symbol: string
  portfolioId: string
  portfolioName: string
  brokerType?: string | null
  brokerName?: string | null
  brokerColor?: string | null
  totalDividends: number
  totalRealized: number
}

export function calculateHistoricalPerfByDepot(
  allTransactions: Transaction[],
): Map<string, DepotHistoricalPerf> {
  const result = new Map<string, DepotHistoricalPerf>()

  // Pro portfolio_id die Realized Gains berechnen — jedes Depot als isolierter Track
  const byPortfolio = new Map<string, Transaction[]>()
  for (const tx of allTransactions) {
    if (!tx.portfolio_id) continue
    if (!byPortfolio.has(tx.portfolio_id)) byPortfolio.set(tx.portfolio_id, [])
    byPortfolio.get(tx.portfolio_id)!.push(tx)
  }

  for (const [portfolioId, txs] of byPortfolio) {
    // Ergebnis pro Symbol in diesem Depot
    const perSymbol = new Map<string, { dividends: number; realized: number }>()
    const entryFor = (symbol: string) => {
      let entry = perSymbol.get(symbol)
      if (!entry) {
        entry = { dividends: 0, realized: 0 }
        perSymbol.set(symbol, entry)
      }
      return entry
    }
    // Portfolio-Meta aus erster Transaktion ziehen
    const firstTx = txs[0]
    const meta = {
      portfolioName: firstTx.portfolio_name || 'Unbekanntes Depot',
      brokerType: firstTx.broker_type,
      brokerName: firstTx.broker_name,
      brokerColor: firstTx.broker_color,
    }

    const { realizedGainByTxId } = calculateRealizedGains(txs)
    for (const tx of txs) {
      if (!tx.symbol || tx.symbol === 'CASH') continue
      const entry = entryFor(tx.symbol)
      if (tx.type === 'sell') entry.realized += realizedGainByTxId.get(tx.id)?.realizedGain ?? 0
      else if (tx.type === 'dividend') entry.dividends += transactionAmount(tx)
      else if (isCashFlow(tx) && cashFlowKind(tx) === 'dividend_correction') entry.dividends += signedCashAmount(tx)
    }

    // Fülle das Ergebnis-Map
    for (const [symbol, agg] of perSymbol) {
      if (agg.dividends === 0 && agg.realized === 0) continue // nichts zu zeigen
      result.set(`${symbol}|${portfolioId}`, {
        symbol,
        portfolioId,
        portfolioName: meta.portfolioName,
        brokerType: meta.brokerType,
        brokerName: meta.brokerName,
        brokerColor: meta.brokerColor,
        totalDividends: agg.dividends,
        totalRealized: agg.realized,
      })
    }
  }

  return result
}

// Gleiche Rechnung wie die Kennzahlen im Hook, hier für ein einzelnes Depot.
export function summarizeDepot(holdings: Holding[], transactions: Transaction[]): DepotSummary {
  const performanceTransactions = filterPerformanceTransactions(transactions, holdings)
  const result = calculateDepotReturn(
    performanceTransactions,
    holdings,
    calculateRealizedGains(estimateMissingAmounts(performanceTransactions, holdings)),
  )
  return {
    stockValue: holdings.reduce((sum, h) => sum + h.value, 0),
    positions: holdings.length,
    transactions: transactions.length,
    dayGainLoss: holdings.reduce((sum, h) => sum + (h.day_change_value || 0), 0),
    totalReturn: result.total,
    totalReturnPercent: result.totalPercent,
  }
}

/**
 * Gespeicherte Position mit Kurs und Wechselkursen bewerten. apiPrice steht in
 * der Währung, die detectTickerCurrency erwartet (.L in Pence), 0 = kein Kurs.
 */
export function valuateHolding(
  h: any,
  apiPrice: number,
  dayChangePercent: number,
  rates: EurRates,
  tradedOn: string | null = null,
): Holding {
  const tickerCurrency = detectTickerCurrency(h.symbol)
  const purchasePrice = h.purchase_price || 0
  const quantity = h.quantity || 0

  // Kurs → EUR über die zentrale Bewertungslogik (EUR unverändert, GBP kommt
  // als GBX/Pence → ÷100 × Rate, alle anderen Währungen × EUR-Rate). Fehlt der
  // Kurs oder der Wechselkurs, zählt die Position zum Einstand: vorher stand
  // sie mit 0 € und −100 % da, bei fehlendem GBP-Kurs mit Pence als Euro.
  // Das Banner "Kurse nicht verfügbar" nennt die betroffenen Papiere.
  const convertedPrice = apiPrice > 0 ? convertPriceToEurStrict(apiPrice, tickerCurrency, rates) : null
  const priceMissing = convertedPrice === null
  const currentPriceEUR = convertedPrice ?? purchasePrice
  const value = currentPriceEUR * quantity
  const costBasis = purchasePrice * quantity
  const gainLoss = value - costBasis
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

  // Tagesveränderung: Prozent aus der Quote (Börsenwährung), Euro-Betrag
  // über den aktuellen EUR-Wert zurückgerechnet — so bleibt die Währungs-
  // umrechnung konsistent (heutiger Wert − gestriger Wert in EUR).
  const dayChangeValue =
    !priceMissing && dayChangePercent > -100 ? value * (dayChangePercent / (100 + dayChangePercent)) : 0

  // FX-Split: nur berechenbar für Nicht-EUR-Positionen mit gespeicherter fx_rate
  let plExclFx: number | null = null
  let plFromFx: number | null = null
  const purchaseFxRate = (h as any).purchase_fx_rate
    ? Number((h as any).purchase_fx_rate)
    : null
  if (
    purchaseFxRate &&
    purchaseFxRate > 0 &&
    tickerCurrency !== 'EUR' &&
    quantity > 0 &&
    apiPrice > 0
  ) {
    // Aktuelle FX-Rate (EUR pro Einheit Quote-Währung)
    const currentFxRate =
      tickerCurrency === 'USD' ? rates.usdToEurRate
      : tickerCurrency === 'GBP' ? rates.gbpToEurRate
      : rates.byCurrency?.[tickerCurrency] ?? null
    if (currentFxRate && currentFxRate > 0) {
      // Original Kaufpreis in Quote-Währung rekonstruieren:
      // purchase_price (EUR) = purchasePriceOrig × purchaseFxRate
      //   → purchasePriceOrig = purchase_price / purchaseFxRate
      const purchasePriceOrig = purchasePrice / purchaseFxRate
      // Bei GBP-Aktien (.L) kommt der Kurs in GBX (Pence) aus der API.
      // Wir rechnen in GBP für die Split-Berechnung.
      const effectiveApiPrice = tickerCurrency === 'GBP' ? apiPrice / 100 : apiPrice

      // P/L excl. FX: Kursperformance bewertet zum Kauf-FX
      plExclFx = (effectiveApiPrice - purchasePriceOrig) * quantity * purchaseFxRate
      // P/L from FX: Währungs-Effekt auf der aktuellen Position
      plFromFx = effectiveApiPrice * quantity * (currentFxRate - purchaseFxRate)
    }
  }

  return {
    ...h,
    current_price: apiPrice,
    current_price_display: currentPriceEUR,
    purchase_price_display: purchasePrice,
    value,
    gain_loss: gainLoss,
    gain_loss_percent: gainLossPercent,
    day_change_value: dayChangeValue,
    day_change_percent: priceMissing ? 0 : dayChangePercent,
    traded_on: tradedOn,
    price_missing: priceMissing,
    pl_excl_fx: plExclFx,
    pl_from_fx: plFromFx,
  }
}

/**
 * Tagesveränderung auf einen gemeinsamen Handelstag bringen. US-Aktien tragen
 * vor 15:30 Uhr noch die Veränderung von gestern, Xetra schon die von heute.
 * Addiert ergab das "Heute +2.159 €" an einem Tag, an dem das Depot im Minus
 * lag. Es zählt nur der jüngste Handelstag, was dort noch nicht gehandelt
 * wurde, steht auf 0.
 */
export function alignDayChange(holdings: Holding[], day: string | null = latestTradingDay(holdings)): Holding[] {
  if (!day) return holdings
  return holdings.map(h =>
    // Ohne Zeitstempel (Yahoo ohne regularMarketTime) ist unklar, ob die
    // Veränderung von heute stammt; sie wird nicht zum Handelstag addiert.
    h.traded_on === day ? h : { ...h, day_change_value: 0, day_change_percent: 0 }
  )
}

/** Jüngster Handelstag unter den Positionen */
export function latestTradingDay(holdings: Holding[]): string | null {
  return holdings.reduce<string | null>(
    (latest, h) => (h.traded_on && (!latest || h.traded_on > latest) ? h.traded_on : latest),
    null,
  )
}

/** "Heute" oder der letzte Handelstag, z. B. "Mo., 23.11." */
export function tradingDayLabel(day: string | null, now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(now)
  if (!day || day >= today) return 'Heute'
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin',
  })
}

/**
 * Interner Zinsfuß p.a. in Prozent. transactions: bereits über
 * filterPerformanceTransactions und estimateMissingAmounts gelaufen.
 */
export function calculateDepotXirr(enrichedPerformanceTransactions: Transaction[], holdings: Holding[], stockValue: number): number | null {
  const cashflows: Cashflow[] = []

  if (enrichedPerformanceTransactions.length > 0) {
    // Alle Buy/Sell/Dividend-Transaktionen als Cashflows.
    // Depotüberträge (transfer_in/out) werden als fiktive Käufe/Verkäufe zur
    // damaligen Kostenbasis eingerechnet — sonst fehlt der Anfangskapital-Fluss
    // und XIRR explodiert (Beispiel ING: zeigte +1000% p.a. statt realistischer
    // ~12%, weil 147 VGWL-Shares ohne Cashflow materialisiert wurden).
    // Genauso wie Parqet das macht. Beträge kommen aus den enriched
    // Transaktionen — Überträge ohne Kostenbasis sind dort bereits geschätzt.
    // Rest-Fall: transfer_out ohne Wert UND ohne Holding (voll übertragen) —
    // dafür den Abfluss aus der Kostenbasis-Simulation schätzen.
    // Umzüge im selben Depot sind kein Geldfluss.
    const transferOutEstimates = estimateValuelessTransferOuts(enrichedPerformanceTransactions)
    withoutInternalTransfers(enrichedPerformanceTransactions).forEach(tx => {
      if (!tx.date) return
      const txDate = new Date(tx.date)
      const amount = transactionAmount(tx)

      // Gebühren und Steuern einer Order gehören zum Geldfluss
      const costs = Math.abs(Number(tx.fee) || 0)
      if (tx.type === 'buy') {
        cashflows.push({ amount: -(amount + costs), date: txDate })
      } else if (tx.type === 'sell') {
        cashflows.push({ amount: amount - costs, date: txDate })
      } else if (tx.type === 'dividend') {
        cashflows.push({ amount, date: txDate })
      } else if (tx.type === 'transfer_in') {
        // Fiktiver Kauf zur Kostenbasis am Transfer-Datum
        if (amount > 0) cashflows.push({ amount: -amount, date: txDate })
      } else if (tx.type === 'transfer_out') {
        // Fiktiver Verkauf zum Transfer-Kurs am Transfer-Datum; ohne Wert:
        // geschätzte Ø-Kostenbasis (Näherung, s. estimateValuelessTransferOuts)
        const outAmount = amount > 0 ? amount : (transferOutEstimates.get(tx.id) || 0)
        if (outAmount > 0) cashflows.push({ amount: outAmount, date: txDate })
      }
      // cash_deposit/cash_withdrawal ignorieren (externe Geldbewegungen)
    })

    // Terminal: aktueller Aktienwert
    if (stockValue > 0) {
      cashflows.push({ amount: stockValue, date: new Date() })
    }
  } else if (holdings.length > 0) {
    // Fallback für Legacy-Daten ohne Transaktionen
    holdings.forEach(h => {
      if (h.purchase_date && h.purchase_price_display > 0 && h.quantity > 0) {
        cashflows.push({
          amount: -(h.purchase_price_display * h.quantity),
          date: new Date(h.purchase_date)
        })
      }
    })
    if (stockValue > 0) {
      cashflows.push({ amount: stockValue, date: new Date() })
    }
  }

  cashflows.sort((a, b) => a.date.getTime() - b.date.getTime())
  if (cashflows.length < 2) return null

  const result = calculateXIRR(cashflows)
  return result !== null ? result * 100 : null
}

/** Erwartete Dividenden der nächsten 12 Monate je Position, aus den Zahlungen der letzten 12 Monate */
export interface ForwardDividend {
  symbol: string
  annual: number
  yieldOnCost: number
  currentYield: number
  method: 'per_share' | 'historical'
  total12m: number
}

/** Tage zwischen Stichtag (Ex-Tag) und Zahltag, grob: 3 Tage in Deutschland, 2 bis 4 Wochen sonst */
const EX_TO_PAY_DAYS = 14

/** Zahlungen je Jahr aus den Abständen der Zahltage (Median); null bei weniger als zwei Zahlungen */
function paymentsPerYear(sortedPayDays: string[]): number | null {
  if (sortedPayDays.length < 2) return null
  const gaps: number[] = []
  for (let i = 1; i < sortedPayDays.length; i++) {
    const gap = (Date.parse(sortedPayDays[i]) - Date.parse(sortedPayDays[i - 1])) / 86400000
    if (gap >= 7) gaps.push(gap)
  }
  if (gaps.length === 0) return null
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]
  if (median <= 45) return 12
  if (median <= 135) return 4
  if (median <= 250) return 2
  return 1
}

export function projectDividends(
  dividendTransactions: Transaction[],
  holdings: Holding[],
  now = new Date(),
  /** Alle Buchungen, um die Stückzahl zum Stichtag zu kennen */
  transactions: Transaction[] = [],
) {
  if (dividendTransactions.length === 0 || holdings.length === 0) {
    return {
      annualExpected: 0,
      perHolding: [] as ForwardDividend[],
      historicalFallbackTotal: 0,
      perShareTotal: 0,
      fallbackSymbols: [] as string[],
    }
  }

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())

  // Dasselbe Papier kann in mehreren Depots liegen
  const positions = new Map<string, { quantity: number; value: number; cost: number }>()
  for (const h of holdings) {
    const entry = positions.get(h.symbol) || { quantity: 0, value: 0, cost: 0 }
    entry.quantity += h.quantity
    entry.value += h.value
    entry.cost += h.purchase_price_display * h.quantity
    positions.set(h.symbol, entry)
  }

  const txBySymbol = new Map<string, Transaction[]>()
  const allTxBySymbol = new Map<string, Transaction[]>()
  for (const tx of dividendTransactions) {
    if (!allTxBySymbol.has(tx.symbol)) allTxBySymbol.set(tx.symbol, [])
    allTxBySymbol.get(tx.symbol)!.push(tx)
    if (new Date(tx.date) < twelveMonthsAgo) continue
    if (!txBySymbol.has(tx.symbol)) txBySymbol.set(tx.symbol, [])
    txBySymbol.get(tx.symbol)!.push(tx)
  }

  const positionTxBySymbol = new Map<string, Transaction[]>()
  // Zahlungen vor einem Split verteilen sich auf die Stücke danach: Der heutige
  // Bestand, mit dem die Prognose rechnet, steht auf der neuen Stückzahl.
  for (const tx of withoutInternalTransfers(settleSplitBookings(transactions))) {
    if (!isSecurityTransaction(tx)) continue
    if (!positionTxBySymbol.has(tx.symbol)) positionTxBySymbol.set(tx.symbol, [])
    positionTxBySymbol.get(tx.symbol)!.push(tx)
  }
  const sharesOn = (symbol: string, day: string): number => {
    let shares = 0
    for (const tx of positionTxBySymbol.get(symbol) || []) {
      if (tx.date.slice(0, 10) > day) continue
      const quantity = Number(tx.quantity) || 0
      shares += tx.type === 'buy' || tx.type === 'transfer_in' ? quantity : -quantity
    }
    return shares
  }

  const perHolding: ForwardDividend[] = []
  const fallbackSymbols: string[] = []
  let annualExpected = 0
  let historicalFallbackTotal = 0
  let perShareTotal = 0

  for (const [symbol, txs] of txBySymbol.entries()) {
    const position = positions.get(symbol)
    if (!position || position.quantity <= 0) continue

    const total12m = txs.reduce((sum, tx) => sum + (Number(tx.total_value) || 0), 0)

    // Stückdividende = Zahlung ÷ Bestand am Stichtag. Viele Importe speichern
    // nur die Gesamtzahlung mit Stückzahl 1, der Bestand kommt deshalb aus den
    // Buchungen. Fehlt er, gilt die Stückzahl der Dividende, sofern sie eine ist.
    let perShareAnnual = 0
    let unknown = false
    const perSharePayments: { day: string; perShare: number }[] = []
    for (const tx of txs) {
      const payDay = tx.date.slice(0, 10)
      const exDay = new Date(Date.parse(payDay) - EX_TO_PAY_DAYS * 86400000).toISOString().slice(0, 10)
      const held = sharesOn(symbol, exDay) || sharesOn(symbol, payDay)
      const booked = Number(tx.quantity) || 0
      const isPlaceholder = Math.abs(booked - 1) < 0.0001 && position.quantity > 1.5
      const shares = held > 0.0001 ? held : !isPlaceholder && booked > 0 ? booked : 0
      if (shares <= 0) {
        unknown = true
        break
      }
      perSharePayments.push({ day: payDay, perShare: (Number(tx.total_value) || 0) / shares })
    }
    if (!unknown) {
      // Frequenz aus den Abständen aller Zahlungen des Papiers; Sonderdividenden
      // (deutlich über dem Median) zählen nicht als wiederkehrend. Eine Position
      // mit zwei Monaten Haltedauer und einer Quartalsdividende stand sonst mit
      // einem Viertel der Jahresdividende in der Prognose.
      perSharePayments.sort((a, b) => a.day.localeCompare(b.day))
      const payDays = [...new Set((allTxBySymbol.get(symbol) || []).map(tx => tx.date.slice(0, 10)))].sort()
      const freq = paymentsPerYear(payDays)
      const sortedValues = perSharePayments.map(p => p.perShare).filter(v => v > 0).sort((a, b) => a - b)
      const median = sortedValues.length > 0 ? sortedValues[Math.floor(sortedValues.length / 2)] : 0
      const regular = median > 0 ? perSharePayments.filter(p => p.perShare <= median * 2.5) : perSharePayments
      const lastRegular = [...regular].reverse().find(p => p.perShare > 0)
      if (freq && lastRegular && regular.length < freq) {
        perShareAnnual = lastRegular.perShare * freq
      } else if (freq && regular.length > freq) {
        perShareAnnual = regular.slice(-freq).reduce((sum, p) => sum + p.perShare, 0)
      } else {
        perShareAnnual = regular.reduce((sum, p) => sum + p.perShare, 0)
      }
    }

    const annual = unknown ? total12m : perShareAnnual * position.quantity
    annualExpected += annual
    if (unknown) {
      historicalFallbackTotal += annual
      fallbackSymbols.push(symbol)
    } else {
      perShareTotal += annual
    }

    perHolding.push({
      symbol,
      annual,
      yieldOnCost: position.cost > 0 ? (annual / position.cost) * 100 : 0,
      currentYield: position.value > 0 ? (annual / position.value) * 100 : 0,
      method: unknown ? 'historical' : 'per_share',
      total12m,
    })
  }

  perHolding.sort((a, b) => b.annual - a.annual)
  return { annualExpected, perHolding, historicalFallbackTotal, perShareTotal, fallbackSymbols }
}
