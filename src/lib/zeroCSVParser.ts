// src/lib/zeroCSVParser.ts — Parser für finanzen.net Zero CSV-Export
// Format: Orders-Export (Käufe/Verkäufe), Semikolon-getrennt, deutsche Zahlenformatierung.
// Dividenden + Cash-Bewegungen werden von Zero separat exportiert — hier nicht enthalten.
//
// Header (Zeile 1):
//   Name;ISIN;WKN;Anzahl;Anzahl storniert;Status;Orderart;Limit;Stop;
//   Erstellt Datum;Erstellt Zeit;Gültig bis;Richtung;Wert;Wert storniert;
//   Mindermengenzuschlag;Ausführung Datum;Ausführung Zeit;Ausführung Kurs;
//   Anzahl ausgeführt;Anzahl offen;Gestrichen Datum;Gestrichen Zeit

import type { ParsedTransaction, CSVParseResult, MappedTransactionType } from './scalableCSVParser'

// === Helpers ===

function parseGermanNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  const cleaned = value.trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Konvertiert deutsches Datum "DD.MM.YYYY" nach ISO "YYYY-MM-DD".
 */
function parseGermanDate(dateStr: string): string | null {
  const parts = dateStr.trim().split('.')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return `${yyyy.padStart(4, '0')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/**
 * Prüft, ob eine CSV-Datei das Zero-Format hat.
 * Erkennungsmerkmal: Header enthält die charakteristischen deutschen Spalten.
 */
export function isZeroCSV(csvContent: string): boolean {
  const firstLine = csvContent.split('\n')[0] || ''
  // Zero-Header enthält diese eindeutigen Spaltennamen
  return (
    firstLine.includes('Ausführung Datum') &&
    firstLine.includes('Ausführung Kurs') &&
    firstLine.includes('Orderart') &&
    firstLine.includes('Richtung')
  )
}

/**
 * Zero CSV-Export parsen.
 */
export function parseZeroCSV(csvContent: string): CSVParseResult {
  const lines = csvContent.split('\n').filter(l => l.trim())
  const transactions: ParsedTransaction[] = []
  const skipped: CSVParseResult['skipped'] = []
  const isinSet = new Set<string>()
  const typeCounts: Record<string, number> = {}

  if (lines.length < 2) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: [],
      summary: { total: 0, imported: 0, skipped: 0, byType: {} },
    }
  }

  // Header-Indizes ermitteln (defensiv, falls Zero das Format ändert)
  const header = parseCSVLine(lines[0])
  const idx = {
    name: header.indexOf('Name'),
    isin: header.indexOf('ISIN'),
    wkn: header.indexOf('WKN'),
    status: header.indexOf('Status'),
    orderart: header.indexOf('Orderart'),
    richtung: header.indexOf('Richtung'),
    wert: header.indexOf('Wert'),
    fee: header.indexOf('Mindermengenzuschlag'),
    execDate: header.indexOf('Ausführung Datum'),
    execTime: header.indexOf('Ausführung Zeit'),
    execPrice: header.indexOf('Ausführung Kurs'),
    execQty: header.indexOf('Anzahl ausgeführt'),
  }

  // Fallback-Prüfung: wenn wichtige Spalten fehlen, abbrechen
  if (idx.isin < 0 || idx.execDate < 0 || idx.execPrice < 0 || idx.richtung < 0) {
    return {
      transactions: [],
      uniqueISINs: [],
      skipped: [{ row: 1, reason: 'Zero-Header nicht erkannt', data: lines[0].substring(0, 120) }],
      summary: { total: 0, imported: 0, skipped: 1, byType: {} },
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    if (row.length < Math.max(...Object.values(idx)) + 1) {
      skipped.push({ row: i + 1, reason: 'Unvollständige Zeile', data: lines[i].substring(0, 80) })
      continue
    }

    const status = row[idx.status]
    if (status !== 'ausgeführt') {
      skipped.push({ row: i + 1, reason: `Status: ${status || 'unbekannt'}`, data: row[idx.name] || '' })
      continue
    }

    const name = row[idx.name].replace(/^"|"$/g, '')
    const isin = row[idx.isin]
    const richtung = row[idx.richtung]
    const orderart = row[idx.orderart]
    const execDate = row[idx.execDate]
    const execTime = row[idx.execTime] || ''
    const execPrice = parseGermanNumber(row[idx.execPrice])
    const execQty = parseGermanNumber(row[idx.execQty])
    const fee = idx.fee >= 0 ? parseGermanNumber(row[idx.fee]) : 0
    const wert = parseGermanNumber(row[idx.wert])

    const date = parseGermanDate(execDate)
    if (!date) {
      skipped.push({ row: i + 1, reason: 'Ungültiges Datum', data: `${name} (${execDate})` })
      continue
    }

    if (!isin) {
      skipped.push({ row: i + 1, reason: 'ISIN fehlt', data: name })
      continue
    }

    if (execQty <= 0 || execPrice <= 0) {
      skipped.push({ row: i + 1, reason: 'Ungültige Menge/Preis', data: name })
      continue
    }

    // Type-Mapping
    let mappedType: MappedTransactionType | null = null
    if (richtung === 'Kauf') {
      mappedType = 'buy'
    } else if (richtung === 'Verkauf') {
      mappedType = 'sell'
    } else {
      skipped.push({ row: i + 1, reason: `Unbekannte Richtung: ${richtung}`, data: name })
      continue
    }

    isinSet.add(isin)

    const notes: string[] = []
    if (orderart === 'Sparplan') notes.push('Sparplan')
    if (orderart === 'Bruchstücke') notes.push('Bruchstücke-Verkauf')
    if (fee > 0) notes.push(`Gebühr: ${fee.toFixed(2)}€`)
    notes.push('CSV-Import (finanzen.net Zero)')

    const parsed: ParsedTransaction = {
      date,
      time: execTime || undefined,
      type: mappedType,
      isin,
      name,
      quantity: execQty,
      price: execPrice,
      totalValue: Math.abs(wert),
      fee,
      tax: 0,
      notes: notes.join(' · '),
      originalType: orderart || richtung,
    }

    transactions.push(parsed)
    typeCounts[mappedType] = (typeCounts[mappedType] || 0) + 1
  }

  return {
    transactions,
    uniqueISINs: Array.from(isinSet),
    skipped,
    summary: {
      total: lines.length - 1,
      imported: transactions.length,
      skipped: skipped.length,
      byType: typeCounts,
    },
  }
}
