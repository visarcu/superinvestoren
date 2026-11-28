// src/lib/portfolio/taxes.ts
//
// Steuerschätzung für Anleger in Deutschland, je Depot und Kalenderjahr:
//  - Verkäufe nach FIFO je Depot (§ 20 Abs. 4 Satz 7 EStG). Der Rest des Depots
//    rechnet mit Durchschnittskosten (costBasis), die Bank aber mit FIFO.
//  - Zwei Verlusttöpfe wie bei der Bank: Aktienverluste nur gegen
//    Aktiengewinne, der allgemeine Topf gegen alles.
//  - Teilfreistellung für Fonds (Aktienfonds 30 %), Altbestand vor 2009 bei
//    Aktien steuerfrei.
//  - Direkt gehaltene Kryptowerte laufen getrennt nach § 23 EStG: steuerfrei
//    nach einem Jahr, darunter Freigrenze 1.000 € im Jahr.
//
// Rein rechnend und ohne Serverabhängigkeiten. Die Route liefert die Zahlen je
// Depot und Jahr bis vor den Freibetrag, den rechnet die Oberfläche selbst ein,
// damit eine Änderung am Freistellungsauftrag sofort sichtbar ist.
//
// Nicht enthalten: Vorabpauschale, Anrechnung der Quellensteuer, Mischfonds
// (15 %) und Immobilienfonds. Alles ist eine Schätzung aus den importierten
// Buchungen, maßgeblich bleibt die Abrechnung der Bank.

import { bookedAmount, costBasisKey, findSplitPairs, settleSplitBookings } from '@/lib/portfolio/costBasis'
import { cashFlowKind, orderCosts } from '@/lib/portfolio/cashFlows'

// ─── Einordnung ────────────────────────────────────────────────────────────

/** aktien = Aktientopf, allgemein = allgemeiner Topf, privat = § 23 (Krypto direkt) */
export type TaxPot = 'aktien' | 'allgemein' | 'privat'

export interface TaxClass {
  pot: TaxPot
  /** Teilfreistellung als Anteil (0,3 = 30 %), nur bei Fonds */
  exemption: number
  label: string
  /** Einordnung geschätzt (nur aus dem Namen oder unbekannt) */
  uncertain: boolean
}

/** Ergebnis von classifySecurity (lib/ai/depot/classify), hier nur als Form */
export interface SecurityClassLike {
  art: 'Aktie' | 'ETF' | 'Fonds' | 'Rohstoff' | 'Krypto'
  klasse: 'Aktien' | 'Anleihen' | 'Geldmarkt' | 'gehebelt' | null
  unsicher: boolean
}

// Gleiche Liste wie in classify.ts: Kryptowert gegen USD/EUR, also direkt gehalten
const CRYPTO_PAIR = /^(?:BTC|ETH|SOL|ADA|XRP|DOGE|DOT|LTC|BNB|AVAX|LINK|MATIC|POL|SHIB|UNI|ATOM|XLM|TRX|BCH|USDT|USDC|NEAR|APT|ARB|SUI)[-/]?(?:USD|EUR|USDT)$/

export const AKTIENFONDS_EXEMPTION = 0.3

export function taxClassFor(symbol: string, security: SecurityClassLike | null | undefined): TaxClass {
  if (!security) return { pot: 'aktien', exemption: 0, label: 'Aktie', uncertain: true }
  const uncertain = security.unsicher
  switch (security.art) {
    case 'Krypto':
      // Krypto-ETPs rechnen die Banken als Kapitalertrag ab, direkt gehaltene
      // Kryptowerte sind private Veräußerungsgeschäfte
      return CRYPTO_PAIR.test(symbol.toUpperCase())
        ? { pot: 'privat', exemption: 0, label: 'Krypto', uncertain: false }
        : { pot: 'allgemein', exemption: 0, label: 'Krypto-ETP', uncertain: false }
    case 'Aktie':
      return { pot: 'aktien', exemption: 0, label: 'Aktie', uncertain }
    case 'Rohstoff':
      return { pot: 'allgemein', exemption: 0, label: 'Rohstoff-ETC', uncertain }
    case 'ETF':
    case 'Fonds': {
      const fund = security.art === 'ETF' ? 'ETF' : 'fonds'
      // Aktive Fonds können Mischfonds sein (15 %), das sehen wir nicht
      const fundUncertain = uncertain || security.art === 'Fonds'
      if (security.klasse === 'Anleihen') return { pot: 'allgemein', exemption: 0, label: `Anleihen-${fund}`, uncertain: fundUncertain }
      if (security.klasse === 'Geldmarkt') return { pot: 'allgemein', exemption: 0, label: `Geldmarkt-${fund}`, uncertain: fundUncertain }
      // Hebel-ETFs sind nicht immer Aktienfonds: lieber ohne Teilfreistellung
      if (security.klasse === 'gehebelt') return { pot: 'allgemein', exemption: 0, label: `Hebel-${fund}`, uncertain: true }
      return {
        pot: 'allgemein',
        exemption: AKTIENFONDS_EXEMPTION,
        label: security.art === 'ETF' ? 'Aktien-ETF' : 'Aktienfonds',
        uncertain: fundUncertain,
      }
    }
  }
}

// ─── Buchungen ─────────────────────────────────────────────────────────────

export interface TaxTransaction {
  id: string
  portfolio_id: string
  type: string
  symbol: string
  name?: string | null
  quantity: number | string | null
  price: number | string | null
  total_value: number | string | null
  fee: number | string | null
  date: string
  notes?: string | null
}

const POSITION_TYPES = new Set(['buy', 'sell', 'transfer_in', 'transfer_out'])
const EPS = 1e-6
/** Ein- und Ausbuchung desselben Papiers in zwei Depots gelten bis dahin als Depotübertrag */
const CROSS_DEPOT_TRANSFER_DAYS = 31
// Kennzeichen aus dem Scalable-Import, wie in costBasis
const RENAME_OUT_NOTE = /Kostenbasis übertragen|Aufgegliedert in/
const RENAME_IN_NOTE = /Einstandskurs übernommen/

const num = (value: number | string | null | undefined) => Number(value) || 0
const day = (tx: { date: string }) => String(tx.date).slice(0, 10)
const yearOf = (date: string) => Number(date.slice(0, 4))
const normSymbol = (symbol: string | null | undefined) => (symbol || '').trim().toUpperCase()

function isPosition(tx: TaxTransaction): boolean {
  const symbol = normSymbol(tx.symbol)
  return POSITION_TYPES.has(tx.type) && symbol !== '' && symbol !== 'CASH'
}

const isValueless = (tx: TaxTransaction) => !(num(tx.total_value) > 0) && !(num(tx.price) > 0)
const isRenameOut = (tx: TaxTransaction) => tx.type === 'transfer_out' && isValueless(tx) && RENAME_OUT_NOTE.test(tx.notes || '')
const isRenameIn = (tx: TaxTransaction) => tx.type === 'transfer_in' && RENAME_IN_NOTE.test(tx.notes || '')

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000
}

/** Steuer aus der Notiz: "Steuern: 4.50€" (Scalable), "Steuer 4.50€" (Trade Republic), "Steuern 4.50€" (Trading 212) */
export function noteTax(notes: string | null | undefined): number {
  const match = (notes || '').match(/(?:^|· )Steuern?:? ([\d.]+) ?€/)
  return match ? num(match[1]) : 0
}

/**
 * Quellensteuer aus Trading-212-Notizen ("WHT 1.23") in Euro. Sie steht in der
 * Währung der Dividende, der Kurs dazu in derselben Notiz ("@ FX 1.0850",
 * Fremdwährung je Euro).
 */
export function noteWithholding(notes: string | null | undefined): number {
  const text = notes || ''
  const wht = text.match(/· WHT ([\d.]+)/)
  if (!wht) return 0
  const amount = num(wht[1])
  const fx = num(text.match(/@ FX ([\d.]+)/)?.[1])
  return fx > 0 ? amount / fx : amount
}

// Zinsen auf Guthaben: Scalable "Zinsen", Trade Republic "Zinsgutschrift"/"Interest payment"
const INTEREST_NOTE = /^(?:zinsen|zinsgutschrift|interest payment)\b/i
const INTEREST_NAME = /^(?:zinsen|interest( on cash)?)$/i

function isInterestCredit(tx: TaxTransaction): boolean {
  if (tx.type !== 'cash_deposit') return false
  return INTEREST_NOTE.test((tx.notes || '').trim()) || INTEREST_NAME.test((tx.name || '').trim())
}

// ─── FIFO ──────────────────────────────────────────────────────────────────

interface Lot {
  quantity: number
  /** Einstand je Stück inkl. Kaufgebühren, null = unbekannt */
  unitCost: number | null
  /** Anschaffungstag (bei Depotüberträgen der ursprüngliche) */
  acquired: string
}

export interface SalePart {
  quantity: number
  /** null = Einstand unbekannt */
  cost: number | null
  proceeds: number
  acquired: string
}

export interface TaxSale {
  id: string
  portfolioId: string
  symbol: string
  name: string
  date: string
  parts: SalePart[]
  /** Verkaufte Stücke ohne Kauf in den Buchungen */
  unmatched: number
}

export interface OpenLot {
  portfolioId: string
  symbol: string
  name: string
  quantity: number
  unitCost: number | null
  acquired: string
}

interface TransferStash {
  key: string
  portfolioId: string
  symbol: string
  date: string
  quantity: number
  lots: Lot[]
}

function takeLots(queue: Lot[], wanted: number): { taken: Lot[]; missing: number } {
  const taken: Lot[] = []
  let rest = wanted
  while (rest > EPS && queue.length > 0) {
    const lot = queue[0]
    if (lot.quantity <= rest + EPS) {
      taken.push({ ...lot })
      rest -= lot.quantity
      queue.shift()
    } else {
      taken.push({ ...lot, quantity: rest })
      lot.quantity -= rest
      rest = 0
    }
  }
  return { taken, missing: rest > EPS ? rest : 0 }
}

const lotsQuantity = (lots: Lot[]) => lots.reduce((sum, lot) => sum + lot.quantity, 0)

/** Stücke umrechnen, Einstand bleibt (Umbenennung mit anderer Stückzahl) */
function scaleLots(lots: Lot[], quantity: number): Lot[] {
  const held = lotsQuantity(lots)
  if (!(held > EPS)) return []
  const ratio = quantity / held
  return lots.map(lot => ({
    quantity: lot.quantity * ratio,
    unitCost: lot.unitCost === null ? null : lot.unitCost / ratio,
    acquired: lot.acquired,
  }))
}

/**
 * Geht die Buchungen je Depot und Papier nach FIFO durch. Splits, Umbenennungen,
 * Umzüge im selben Depot und Depotüberträge behalten den ursprünglichen
 * Anschaffungstag und Einstand, wie es die Bank beim Übertrag tut.
 */
export function walkFifo(transactions: readonly TaxTransaction[]): { sales: TaxSale[]; open: OpenLot[] } {
  const relevant = settleSplitBookings(transactions.filter(isPosition) as TaxTransaction[])
  const splitPairs = findSplitPairs(relevant)

  // Split-Paare je Papier und Tag zusammengefasst: alte Stücke aus, neue ein
  const splitGroups = new Map<string, { out: number; in: number }>()
  for (const tx of splitPairs) {
    const groupKey = `${costBasisKey(tx)}|${day(tx)}`
    const group = splitGroups.get(groupKey) ?? { out: 0, in: 0 }
    if (tx.type === 'transfer_in') group.in += num(tx.quantity)
    else group.out += num(tx.quantity)
    splitGroups.set(groupKey, group)
  }

  const rank = (tx: TaxTransaction) =>
    isRenameOut(tx) ? -1 : tx.type === 'buy' || tx.type === 'transfer_in' ? 0 : tx.type === 'sell' ? 1 : 2
  const timeline = [...relevant].sort((a, b) => day(a).localeCompare(day(b)) || rank(a) - rank(b))

  const queues = new Map<string, Lot[]>()
  const names = new Map<string, string>()
  const stash: TransferStash[] = []
  const renameStash = new Map<string, Lot[][]>()
  const doneSplits = new Set<string>()
  const sales: TaxSale[] = []

  for (const tx of timeline) {
    const key = costBasisKey(tx)
    const symbol = normSymbol(tx.symbol)
    if (tx.name) names.set(key, tx.name)
    let queue = queues.get(key)
    if (!queue) {
      queue = []
      queues.set(key, queue)
    }
    const quantity = num(tx.quantity)
    if (!(quantity > 0)) continue

    if (splitPairs.has(tx)) {
      const groupKey = `${key}|${day(tx)}`
      if (doneSplits.has(groupKey)) continue
      doneSplits.add(groupKey)
      const group = splitGroups.get(groupKey)!
      const held = lotsQuantity(queue)
      const after = held - group.out + group.in
      if (held > EPS && after > EPS) {
        const scaled = scaleLots(queue, after)
        queue.splice(0, queue.length, ...scaled)
      } else if (after > EPS) {
        queue.push({ quantity: after, unitCost: null, acquired: day(tx) })
      }
      continue
    }

    if (tx.type === 'buy') {
      const amount = bookedAmount(tx)
      // Kaufgebühren und Steuern beim Kauf (Finanztransaktionssteuer) gehören zum Einstand
      const unitCost = amount > 0 ? (amount + Math.abs(num(tx.fee))) / quantity : null
      queue.push({ quantity, unitCost, acquired: day(tx) })
      continue
    }

    if (tx.type === 'transfer_in') {
      const renameKey = `${tx.portfolio_id}|${day(tx)}`
      const renamed = isRenameIn(tx) ? renameStash.get(renameKey) : undefined
      if (renamed?.length === 1) {
        queue.push(...scaleLots(renamed[0], quantity))
        renameStash.delete(renameKey)
        continue
      }
      // Rückübertrag ins selbe Depot, sonst Übertrag aus einem anderen Depot
      // mit gleicher Stückzahl kurz davor oder danach
      let source = stash.find(entry => entry.key === key && entry.date <= day(tx) && lotsQuantity(entry.lots) > EPS)
      if (!source) {
        source = stash.find(entry =>
          entry.portfolioId !== tx.portfolio_id &&
          entry.symbol === symbol &&
          lotsQuantity(entry.lots) > EPS &&
          daysBetween(entry.date, day(tx)) <= CROSS_DEPOT_TRANSFER_DAYS &&
          Math.abs(entry.quantity - quantity) <= Math.max(EPS, quantity * 0.001),
        )
      }
      if (source) {
        const { taken, missing } = takeLots(source.lots, quantity)
        queue.push(...taken)
        if (missing > EPS) {
          const amount = bookedAmount(tx)
          queue.push({ quantity: missing, unitCost: amount > 0 ? amount / quantity : null, acquired: day(tx) })
        }
        continue
      }
      const amount = bookedAmount(tx)
      queue.push({ quantity, unitCost: amount > 0 ? amount / quantity : null, acquired: day(tx) })
      continue
    }

    const { taken, missing } = takeLots(queue, quantity)

    if (tx.type === 'sell') {
      // Erlös nach Verkaufsgebühren. Einbehaltene Steuer steckt beim Import mit
      // in fee, mindert den Gewinn aber nicht.
      const proceedsTotal = bookedAmount(tx) - orderCosts(tx).fee
      const perShare = proceedsTotal / quantity
      sales.push({
        id: tx.id,
        portfolioId: tx.portfolio_id,
        symbol,
        name: tx.name || names.get(key) || symbol,
        date: day(tx),
        parts: taken.map(lot => ({
          quantity: lot.quantity,
          cost: lot.unitCost === null ? null : lot.unitCost * lot.quantity,
          proceeds: perShare * lot.quantity,
          acquired: lot.acquired,
        })),
        unmatched: missing,
      })
      continue
    }

    // transfer_out: Depotübertrag oder Umbenennung, keine Veräußerung
    if (isRenameOut(tx)) {
      const renameKey = `${tx.portfolio_id}|${day(tx)}`
      renameStash.set(renameKey, [...(renameStash.get(renameKey) || []), taken])
    } else if (taken.length > 0) {
      stash.push({ key, portfolioId: tx.portfolio_id, symbol, date: day(tx), quantity, lots: taken })
    }
  }

  const open: OpenLot[] = []
  for (const [key, queue] of queues) {
    const [portfolioId, symbol] = key.split('|')
    for (const lot of queue) {
      if (lot.quantity <= EPS) continue
      open.push({ portfolioId, symbol, name: names.get(key) || symbol, quantity: lot.quantity, unitCost: lot.unitCost, acquired: lot.acquired })
    }
  }
  return { sales, open }
}

// ─── Jahreswerte je Depot ─────────────────────────────────────────────────

/** Ab dem Tag ist ein privates Veräußerungsgeschäft steuerfrei (mehr als ein Jahr gehalten) */
export function taxFreeFrom(acquired: string): string {
  const date = new Date(`${acquired}T00:00:00Z`)
  date.setUTCFullYear(date.getUTCFullYear() + 1)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

/** Bestandsschutz: Aktien vor 2009 gekauft sind beim Verkauf steuerfrei */
const ABGELTUNGSTEUER_START = '2009-01-01'

export interface DepotTaxYear {
  portfolioId: string
  year: number
  /** Aktienveräußerungen, positiv */
  stockGains: number
  stockLosses: number
  /** Fonds (nach Teilfreistellung) und sonstige Wertpapiere, positiv */
  otherGains: number
  otherLosses: number
  /** Dividenden und Ausschüttungen brutto nach Teilfreistellung */
  dividends: number
  interest: number
  /** Durch Teilfreistellung steuerfrei (Gewinne und Erträge, abzüglich Verluste) */
  exempted: number
  /** Aktien-Altbestand vor 2009, steuerfrei */
  grandfathered: number
  /** § 23: Gewinn innerhalb der Haltefrist (Gewinne minus Verluste) */
  privateShortTerm: number
  /** § 23: Gewinn nach Ablauf der Haltefrist, steuerfrei */
  privateLongTerm: number
  /** Verlusttöpfe zu Jahresbeginn */
  carryInStock: number
  carryInOther: number
  /** Nach Verrechnung, vor Freibetrag */
  taxableBeforeAllowance: number
  /** Davon Aktiengewinne (für die Verlustbescheinigung anderer Banken) */
  taxableStockPart: number
  /** Verlusttöpfe zum Jahresende */
  carryOutStock: number
  carryOutOther: number
  /** Steuern laut Bank (Saldo aus Abzügen und Erstattungen, inkl. Quellensteuer) */
  withheld: number
  sales: number
  /** Verkäufe, bei denen Kauf oder Einstand fehlt (Gewinn unvollständig) */
  incompleteSales: number
}

function emptyYear(portfolioId: string, year: number): DepotTaxYear {
  return {
    portfolioId, year,
    stockGains: 0, stockLosses: 0, otherGains: 0, otherLosses: 0, dividends: 0, interest: 0,
    exempted: 0, grandfathered: 0, privateShortTerm: 0, privateLongTerm: 0,
    carryInStock: 0, carryInOther: 0, taxableBeforeAllowance: 0, taxableStockPart: 0,
    carryOutStock: 0, carryOutOther: 0, withheld: 0, sales: 0, incompleteSales: 0,
  }
}

export interface PrivateLot extends OpenLot {
  taxFreeFrom: string
}

export interface TaxReport {
  years: number[]
  rows: DepotTaxYear[]
  /** Offene, direkt gehaltene Kryptowerte mit Ende der Haltefrist */
  privateLots: PrivateLot[]
  /** Verkäufe im Jahr je Depot, für die Detailansicht */
  sales: TaxReportSale[]
}

export interface TaxReportSale {
  id: string
  portfolioId: string
  year: number
  date: string
  symbol: string
  name: string
  label: string
  pot: TaxPot
  /** Gewinn vor Teilfreistellung, null = unvollständig */
  gain: number | null
  /** Steuerlich angesetzt (nach Teilfreistellung, ohne Altbestand), null = unvollständig */
  taxableGain: number | null
}

/**
 * Jahreswerte je Depot bis einschließlich throughYear. Die Verlusttöpfe laufen
 * von Jahr zu Jahr weiter, wie bei der Bank ohne Verlustbescheinigung.
 */
export function computeTaxReport(
  transactions: readonly TaxTransaction[],
  classOf: (symbol: string) => TaxClass,
  portfolioIds: readonly string[],
  throughYear: number,
): TaxReport {
  const { sales, open } = walkFifo(transactions)
  const rows = new Map<string, DepotTaxYear>()
  const rowFor = (portfolioId: string, year: number) => {
    const key = `${portfolioId}|${year}`
    let row = rows.get(key)
    if (!row) {
      row = emptyYear(portfolioId, year)
      rows.set(key, row)
    }
    return row
  }

  let firstYear = throughYear
  for (const tx of transactions) {
    const year = yearOf(day(tx))
    if (year > 1990 && year < firstYear) firstYear = year
  }

  const reportSales: TaxReportSale[] = []
  for (const sale of sales) {
    const year = yearOf(sale.date)
    if (year > throughYear) continue
    const cls = classOf(sale.symbol)
    const row = rowFor(sale.portfolioId, year)
    row.sales += 1
    const incomplete = sale.unmatched > EPS || sale.parts.some(part => part.cost === null)
    if (incomplete) row.incompleteSales += 1

    let gain = 0
    let taxableGain = 0
    for (const part of sale.parts) {
      if (part.cost === null) continue
      const partGain = part.proceeds - part.cost
      gain += partGain
      if (cls.pot === 'privat') {
        if (sale.date >= taxFreeFrom(part.acquired)) row.privateLongTerm += partGain
        else {
          row.privateShortTerm += partGain
          taxableGain += partGain
        }
      } else if (cls.pot === 'aktien') {
        if (part.acquired < ABGELTUNGSTEUER_START) {
          row.grandfathered += partGain
          continue
        }
        taxableGain += partGain
        if (partGain >= 0) row.stockGains += partGain
        else row.stockLosses -= partGain
      } else {
        const taxable = partGain * (1 - cls.exemption)
        row.exempted += partGain - taxable
        taxableGain += taxable
        if (taxable >= 0) row.otherGains += taxable
        else row.otherLosses -= taxable
      }
    }
    reportSales.push({
      id: sale.id,
      portfolioId: sale.portfolioId,
      year,
      date: sale.date,
      symbol: sale.symbol,
      name: sale.name,
      label: cls.label,
      pot: cls.pot,
      gain: incomplete && sale.parts.every(part => part.cost === null) ? null : gain,
      taxableGain: incomplete && sale.parts.every(part => part.cost === null) ? null : taxableGain,
    })
  }

  for (const tx of transactions) {
    const date = day(tx)
    const year = yearOf(date)
    if (year > throughYear || !tx.portfolio_id) continue

    if (tx.type === 'dividend') {
      const cls = classOf(normSymbol(tx.symbol))
      const net = bookedAmount(tx)
      const taxes = noteTax(tx.notes) + noteWithholding(tx.notes)
      const gross = net + taxes
      const row = rowFor(tx.portfolio_id, year)
      const taxable = gross * (1 - cls.exemption)
      row.dividends += taxable
      row.exempted += gross - taxable
      row.withheld += taxes
      continue
    }

    if (tx.type === 'sell') {
      const tax = orderCosts(tx).tax
      if (tax > 0) rowFor(tx.portfolio_id, year).withheld += tax
      continue
    }

    if (tx.type !== 'cash_deposit' && tx.type !== 'cash_withdrawal') continue
    const amount = bookedAmount(tx)

    if (isInterestCredit(tx)) {
      // Scalable bucht Zinsen netto ("Steuern: 0.13€"), Trade Republic brutto
      // mit eigener Steuerzeile ("Steuer 0.13€" nur als Hinweis)
      const scalableTax = /(?:^|· )Steuern: [\d.]+ ?€/.test(tx.notes || '') ? noteTax(tx.notes) : 0
      const row = rowFor(tx.portfolio_id, year)
      row.interest += amount + scalableTax
      row.withheld += scalableTax
      continue
    }

    const kind = cashFlowKind(tx)
    if (kind === 'tax') {
      rowFor(tx.portfolio_id, year).withheld += tx.type === 'cash_withdrawal' ? amount : -amount
    } else if (kind === 'dividend_correction') {
      // Zurückgebuchte Dividende mindert die Erträge
      const cls = classOf(normSymbol(tx.symbol))
      const row = rowFor(tx.portfolio_id, year)
      row.dividends -= amount * (1 - cls.exemption)
      row.exempted -= amount * cls.exemption
    }
  }

  // Verrechnung je Depot, Jahr für Jahr mit Verlustvortrag
  const years: number[] = []
  for (let year = firstYear; year <= throughYear; year++) years.push(year)
  const ordered: DepotTaxYear[] = []
  for (const portfolioId of portfolioIds) {
    let carryStock = 0
    let carryOther = 0
    for (const year of years) {
      const row = rowFor(portfolioId, year)
      row.carryInStock = carryStock
      row.carryInOther = carryOther
      let stockNet = row.stockGains - row.stockLosses - carryStock
      let otherNet = row.otherGains + row.dividends + row.interest - row.otherLosses - carryOther
      carryStock = 0
      carryOther = 0
      if (stockNet < 0) {
        carryStock = -stockNet
        stockNet = 0
      }
      if (otherNet < 0) {
        // Allgemeine Verluste dürfen auch Aktiengewinne mindern
        const offset = Math.min(-otherNet, stockNet)
        stockNet -= offset
        otherNet += offset
        carryOther = -otherNet
        otherNet = 0
      }
      row.taxableBeforeAllowance = stockNet + otherNet
      row.taxableStockPart = stockNet
      row.carryOutStock = carryStock
      row.carryOutOther = carryOther
      ordered.push(row)
    }
  }

  const privateLots: PrivateLot[] = open
    .filter(lot => classOf(lot.symbol).pot === 'privat')
    .map(lot => ({ ...lot, taxFreeFrom: taxFreeFrom(lot.acquired) }))
    .sort((a, b) => a.taxFreeFrom.localeCompare(b.taxFreeFrom))

  return { years, rows: ordered, privateLots, sales: reportSales.sort((a, b) => b.date.localeCompare(a.date)) }
}

// ─── Freibetrag und Steuersatz ────────────────────────────────────────────

export interface TaxSettings {
  /** Zusammenveranlagung (doppelter Sparerpauschbetrag) */
  joint: boolean
  /** Kirchensteuer in Prozent: 0, 8 (Bayern, Baden-Württemberg) oder 9 */
  churchTax: 0 | 8 | 9
  /** Freistellungsauftrag je Depot in Euro */
  exemptionOrders: Record<string, number>
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = { joint: false, churchTax: 0, exemptionOrders: {} }

/** Sparerpauschbetrag: 1.000 € ab 2023, davor 801 € */
export function saverAllowance(year: number, joint: boolean): number {
  const single = year >= 2023 ? 1000 : 801
  return joint ? single * 2 : single
}

/** Freigrenze für private Veräußerungsgeschäfte: 1.000 € ab 2024, davor 600 € */
export function privateSalesExemptionLimit(year: number): number {
  return year >= 2024 ? 1000 : 600
}

/**
 * Abgeltungsteuer mit Solidaritätszuschlag und Kirchensteuer als Anteil am
 * Ertrag. Mit Kirchensteuer sinkt die Kapitalertragsteuer auf 25 / (1 + 0,25 k).
 */
export function capitalGainsTaxRate(churchTax: 0 | 8 | 9): number {
  const k = churchTax / 100
  const kapest = 0.25 / (1 + 0.25 * k)
  return kapest * (1 + 0.055 + k)
}

export interface AllowanceResult {
  /** Freistellungsauftrag dieser Bank */
  order: number
  used: number
  left: number
  /** Über dem Freistellungsauftrag, darauf zieht die Bank Steuer ab */
  taxable: number
  tax: number
}

export function applyAllowance(row: DepotTaxYear, order: number, rate: number): AllowanceResult {
  const used = Math.min(row.taxableBeforeAllowance, order)
  const taxable = row.taxableBeforeAllowance - used
  return { order, used, left: order - used, taxable, tax: taxable * rate }
}

// ─── Hinweise über alle Banken ────────────────────────────────────────────

export interface LossCertificateHint {
  /** Depot mit Verlusttopf, dort die Bescheinigung beantragen */
  portfolioId: string
  stockLoss: number
  otherLoss: number
  /** So viel ließe sich in der Steuererklärung mit Gewinnen anderer Banken verrechnen */
  offsettable: number
  saving: number
}

export interface ReallocationHint {
  /** Über dem Freistellungsauftrag versteuert, in Summe */
  taxedAbove: number
  /** Ungenutzter Freibetrag bei anderen Banken plus nicht verteilter Rest */
  unusedElsewhere: number
  movable: number
  saving: number
}

export interface TaxYearSummary {
  allowance: number
  ordersTotal: number
  /** Nicht per Freistellungsauftrag verteilt, nur über die Steuererklärung nutzbar */
  unassigned: number
  used: number
  left: number
  taxable: number
  tax: number
  withheld: number
  carryOutStock: number
  carryOutOther: number
  byDepot: Map<string, AllowanceResult>
  lossCertificates: LossCertificateHint[]
  reallocation: ReallocationHint | null
  privateShortTerm: number
  privateLongTerm: number
  privateLimit: number
}

export function summarizeTaxYear(
  rows: readonly DepotTaxYear[],
  year: number,
  settings: TaxSettings,
): TaxYearSummary {
  const yearRows = rows.filter(row => row.year === year)
  const rate = capitalGainsTaxRate(settings.churchTax)
  const allowance = saverAllowance(year, settings.joint)
  const byDepot = new Map<string, AllowanceResult>()
  let ordersTotal = 0
  let used = 0
  let left = 0
  let taxable = 0
  let withheld = 0
  let carryOutStock = 0
  let carryOutOther = 0
  let privateShortTerm = 0
  let privateLongTerm = 0
  for (const row of yearRows) {
    const order = Math.max(0, settings.exemptionOrders[row.portfolioId] || 0)
    const result = applyAllowance(row, order, rate)
    byDepot.set(row.portfolioId, result)
    ordersTotal += order
    used += result.used
    left += result.left
    taxable += result.taxable
    withheld += row.withheld
    carryOutStock += row.carryOutStock
    carryOutOther += row.carryOutOther
    privateShortTerm += row.privateShortTerm
    privateLongTerm += row.privateLongTerm
  }
  const unassigned = Math.max(0, allowance - ordersTotal)

  // Verlustbescheinigung: Verluste bei Bank A, versteuerte Gewinne bei Bank B.
  // Aktienverluste nur gegen Aktiengewinne der anderen Banken.
  const lossCertificates: LossCertificateHint[] = []
  for (const row of yearRows) {
    if (row.carryOutStock < 0.5 && row.carryOutOther < 0.5) continue
    let otherTaxable = 0
    let otherStockTaxable = 0
    for (const other of yearRows) {
      if (other.portfolioId === row.portfolioId) continue
      const result = byDepot.get(other.portfolioId)!
      otherTaxable += result.taxable
      // Der Freibetrag geht zuerst auf den Rest, die Aktiengewinne bleiben übrig
      otherStockTaxable += Math.min(other.taxableStockPart, result.taxable)
    }
    if (otherTaxable < 0.5) continue
    const stockPart = Math.min(row.carryOutStock, otherStockTaxable)
    const otherPart = Math.min(row.carryOutOther, otherTaxable - stockPart)
    const offsettable = stockPart + Math.max(0, otherPart)
    if (offsettable < 0.5) continue
    lossCertificates.push({
      portfolioId: row.portfolioId,
      stockLoss: row.carryOutStock,
      otherLoss: row.carryOutOther,
      offsettable,
      saving: offsettable * rate,
    })
  }

  // Freistellungsaufträge umverteilen: versteuert bei einer Bank, frei bei einer anderen
  let reallocation: ReallocationHint | null = null
  if (taxable >= 0.5) {
    let unusedElsewhere = unassigned
    for (const row of yearRows) {
      const result = byDepot.get(row.portfolioId)!
      if (result.taxable < 0.5) unusedElsewhere += result.left
    }
    const movable = Math.min(taxable, unusedElsewhere)
    if (movable >= 0.5) reallocation = { taxedAbove: taxable, unusedElsewhere, movable, saving: movable * rate }
  }

  return {
    allowance,
    ordersTotal,
    unassigned,
    used,
    left,
    taxable,
    tax: taxable * rate,
    withheld,
    carryOutStock,
    carryOutOther,
    byDepot,
    lossCertificates,
    reallocation,
    privateShortTerm,
    privateLongTerm,
    privateLimit: privateSalesExemptionLimit(year),
  }
}
