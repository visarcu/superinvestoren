// Adapter: nutzt den existierenden /api/portfolio/import-auto Endpoint,
// der bereits alle 12 Parser (CSV/PDF/XLSX) serverseitig ansteuert und
// PDF via `pdf-parse`, XLSX via `xlsx` extrahiert.
//
// Unser Job hier: Response → NormalizedTransaction[].

import type { ImportBrokerId } from '@/lib/importBrokerConfig'
import type { NormalizedTransaction } from './types'

export class ParserNotImplementedError extends Error {
  constructor(brokerId: string) {
    super(`Parser für ${brokerId} ist noch nicht angeschlossen.`)
  }
}

/**
 * Die Parser haben alle leicht unterschiedliche Felder. Wir picken die
 * gemeinsame Untermenge heraus und mappen auf unsere NormalizedTransaction.
 */
function normalizeRaw(raw: any): NormalizedTransaction {
  // Typ kann bei einigen Parsern englisch, bei anderen deutsch sein — wir mappen beides
  const rawType = String(raw.type ?? '').toLowerCase()
  const typeMap: Record<string, NormalizedTransaction['type']> = {
    buy: 'buy',
    kauf: 'buy',
    sell: 'sell',
    verkauf: 'sell',
    dividend: 'dividend',
    dividende: 'dividend',
    cash_deposit: 'cash_deposit',
    deposit: 'cash_deposit',
    einzahlung: 'cash_deposit',
    cash_withdrawal: 'cash_withdrawal',
    withdrawal: 'cash_withdrawal',
    auszahlung: 'cash_withdrawal',
    transfer_in: 'transfer_in',
    transfer_out: 'transfer_out',
  }
  const type = typeMap[rawType] ?? 'buy'

  // Fees können unter verschiedenen Keys liegen
  const fees = Number(raw.fee ?? raw.fees ?? 0) || 0

  // Name-Fallback-Kette
  const name =
    raw.name ?? raw.companyName ?? raw.instrumentName ?? raw.description ?? raw.isin ?? 'Unbekannt'

  return {
    type,
    isin: raw.isin || null,
    symbol: raw.symbol || raw.ticker || null,
    name: String(name),
    quantity: Number(raw.quantity ?? 0) || 0,
    price: Number(raw.price ?? 0) || 0,
    fees,
    date: String(raw.date ?? ''),
    currency: raw.currency || 'EUR',
    notes: raw.notes || undefined,
  }
}

export async function parseFile(
  _brokerId: ImportBrokerId,
  file: File
): Promise<{ transactions: NormalizedTransaction[]; raw: any }> {
  const fd = new FormData()
  fd.append('files', file)

  const res = await fetch('/api/portfolio/import-auto', {
    method: 'POST',
    body: fd,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new Error(errBody?.error || `Parser antwortete mit HTTP ${res.status}`)
  }

  const data = await res.json()
  const rawTxs: any[] = Array.isArray(data.transactions) ? data.transactions : []

  if (rawTxs.length === 0) {
    throw new Error('Keine Transaktionen in der Datei gefunden')
  }

  const normalized = rawTxs.map(normalizeRaw).filter(t => t.date) // ohne Datum nicht brauchbar

  return {
    transactions: normalized,
    raw: data,
  }
}
