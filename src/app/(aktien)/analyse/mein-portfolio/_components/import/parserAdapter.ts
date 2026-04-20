// Adapter: jeder Broker-Parser hat sein eigenes Output-Schema.
// Hier wird das in unsere einheitliche NormalizedTransaction übersetzt.
//
// Aktuell implementiert: scalable (CSV) als Beispiel.
// Weitere Parser (TR, Flatex, Smartbroker, ING, Freedom24, Trading212, Zero, Comdirect)
// werden in Folge-Sessions inkrementell hier eingebunden.

import { parseScalableCSV, type ParsedTransaction as ScalableTx } from '@/lib/scalableCSVParser'
import type { ImportBrokerId } from '@/lib/importBrokerConfig'
import type { NormalizedTransaction } from './types'

export class ParserNotImplementedError extends Error {
  constructor(brokerId: string) {
    super(`Parser für ${brokerId} ist in dieser Session noch nicht angeschlossen — kommt in Folge-Session.`)
  }
}

async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Datei konnte nicht gelesen werden'))
    reader.readAsText(file, 'utf-8')
  })
}

function fromScalable(tx: ScalableTx): NormalizedTransaction {
  // Scalable nutzt eigene Type-Strings → auf unsere Vereinheitlichung mappen
  const typeMap: Record<string, NormalizedTransaction['type']> = {
    buy: 'buy',
    sell: 'sell',
    dividend: 'dividend',
    cash_deposit: 'cash_deposit',
    cash_withdrawal: 'cash_withdrawal',
    transfer_in: 'transfer_in',
    transfer_out: 'transfer_out',
  }
  return {
    type: typeMap[tx.type] ?? 'buy',
    isin: tx.isin || null,
    symbol: tx.symbol || null,
    name: tx.name || tx.isin || 'Unbekannt',
    quantity: tx.quantity,
    price: tx.price,
    fees: tx.fee || 0,
    date: tx.date,
    currency: 'EUR', // Scalable rechnet alles in EUR
    notes: tx.notes,
  }
}

export async function parseFile(
  brokerId: ImportBrokerId,
  file: File
): Promise<{ transactions: NormalizedTransaction[]; raw: any }> {
  if (brokerId === 'scalable') {
    const text = await fileToText(file)
    const result = parseScalableCSV(text)
    if (!result.transactions || result.transactions.length === 0) {
      throw new Error('Keine Transaktionen in der Datei gefunden')
    }
    return {
      transactions: result.transactions.map(fromScalable),
      raw: result,
    }
  }

  throw new ParserNotImplementedError(brokerId)
}
