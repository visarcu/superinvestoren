// src/lib/portfolio/cashFlows.ts
//
// Was hinter einer Kontobewegung steckt. Die Importe speichern Zinsen,
// Gebühren und Steuerbuchungen als Ein- oder Auszahlung und schreiben die Art
// in die Notiz. "Frisches Geld" zählte deshalb Zinsen als Einzahlung, und in
// der Gesamtrendite fehlten Kreditzinsen und Abogebühren ganz.

export interface CashFlowTransaction {
  type: string
  symbol?: string | null
  name?: string | null
  total_value?: number | string | null
  quantity?: number | string | null
  price?: number | string | null
  fee?: number | string | null
  notes?: string | null
}

/** external = Geld vom oder zum Bankkonto */
export type CashFlowKind = 'external' | 'interest' | 'fee' | 'tax' | 'dividend_correction'

const num = (value: number | string | null | undefined) => Number(value) || 0

const amountOf = (tx: CashFlowTransaction) => {
  const total = num(tx.total_value)
  return total > 0 ? total : Math.abs(num(tx.quantity) * num(tx.price))
}

export function isCashFlow(tx: CashFlowTransaction): boolean {
  return tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
}

export function cashFlowKind(tx: CashFlowTransaction): CashFlowKind {
  const note = (tx.notes || '').trim()
  const name = (tx.name || '').trim()
  if (/^zinsen\b/i.test(note) || /^interest payment\b/i.test(note) || /^(zinsen|interest( on cash)?)$/i.test(name)) return 'interest'
  if (/^(erstattung )?steuer(ausgleich|erstattung|n)?\b/i.test(note)) return 'tax'
  // "Gebühren: 3.45€" an einer Einzahlung ist nur ein Hinweis, die Gebühr
  // selbst steht als eigene Auszahlung im Depot
  if (/^gebührenerstattung\b/i.test(note)) return 'fee'
  if (tx.type === 'cash_withdrawal' && /^gebühr\b/i.test(note)) return 'fee'
  // Zurückgebuchte Dividende: Auszahlung, die an einem Wertpapier hängt
  const symbol = (tx.symbol || '').trim().toUpperCase()
  if (tx.type === 'cash_withdrawal' && symbol !== '' && symbol !== 'CASH') return 'dividend_correction'
  return 'external'
}

/** Betrag mit Vorzeichen aus Sicht des Kontos */
export function signedCashAmount(tx: CashFlowTransaction): number {
  return tx.type === 'cash_withdrawal' ? -amountOf(tx) : amountOf(tx)
}

export interface CashFlowTotals {
  /** Einzahlungen vom Bankkonto */
  deposits: number
  /** Auszahlungen aufs Bankkonto, positiv */
  withdrawals: number
  /** Guthaben- und Kreditzinsen, netto */
  interest: number
  /** Gebühren außerhalb von Orders (Abo, Einzahlungen), negativ */
  fees: number
  /** Steuerbuchungen aufs Konto (Erstattung positiv) */
  taxes: number
  /** Zurückgebuchte Dividenden, negativ */
  dividendCorrections: number
}

export function sumCashFlows(transactions: readonly CashFlowTransaction[]): CashFlowTotals {
  const totals: CashFlowTotals = { deposits: 0, withdrawals: 0, interest: 0, fees: 0, taxes: 0, dividendCorrections: 0 }
  for (const tx of transactions) {
    if (!isCashFlow(tx)) continue
    const amount = signedCashAmount(tx)
    switch (cashFlowKind(tx)) {
      case 'interest': totals.interest += amount; break
      case 'fee': totals.fees += amount; break
      case 'tax': totals.taxes += amount; break
      case 'dividend_correction': totals.dividendCorrections += amount; break
      default:
        if (amount >= 0) totals.deposits += amount
        else totals.withdrawals -= amount
    }
  }
  return totals
}

/**
 * Kosten einer Order. Die Importe legen Gebühr und Steuer zusammen in `fee` ab
 * und nennen die Steuer in der Notiz ("Steuern: 25.19€", "Steuer 25.19€").
 */
export function orderCosts(tx: CashFlowTransaction): { fee: number; tax: number } {
  const total = Math.abs(num(tx.fee))
  if (total === 0) return { fee: 0, tax: 0 }
  const match = (tx.notes || '').match(/(?:^|· )Steuern?:? ([\d.]+) ?€/)
  const tax = match ? Math.min(num(match[1]), total) : 0
  return { fee: Math.max(0, total - tax), tax }
}

/** Ordergebühren und Steuern aller Käufe und Verkäufe, beides positiv */
export function sumOrderCosts(transactions: readonly CashFlowTransaction[]): { fees: number; taxes: number } {
  let fees = 0
  let taxes = 0
  for (const tx of transactions) {
    if (tx.type !== 'buy' && tx.type !== 'sell') continue
    const costs = orderCosts(tx)
    fees += costs.fee
    taxes += costs.tax
  }
  return { fees, taxes }
}
