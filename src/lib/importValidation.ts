// src/lib/importValidation.ts — Prüfung der Import-Zeilen vor dem ersten Insert
//
// portfolio_transactions hat feste Grenzen (symbol varchar(10), type mit
// CHECK-Constraint, numerische Pflichtfelder NOT NULL). Verletzt eine einzige
// Zeile davon die Grenzen, lehnt Postgres den ganzen Batch ab. Früher lief der
// Import in Batches ohne Rollback weiter bis zum Fehler — beim TR-Depot
// e8ff32b0 blieben so 550 von 710 Buchungen stehen, weil eine ISIN
// (DE000SJ27CZ4, 12 Zeichen) als Symbol eingetippt worden war.
// Deshalb: alles vorher prüfen und bei Fehlern gar nichts schreiben.

/** Länge der Spalte portfolio_transactions.symbol */
export const SYMBOL_MAX_LENGTH = 10
/** Länge der Spalte portfolio_transactions.name */
export const NAME_MAX_LENGTH = 255

/** Erlaubte Werte laut CHECK-Constraint portfolio_transactions_type_check */
const ALLOWED_TYPES = new Set([
  'buy', 'sell', 'dividend', 'cash_deposit', 'cash_withdrawal', 'transfer_in', 'transfer_out',
])

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/

export function looksLikeISIN(value: string): boolean {
  return ISIN_PATTERN.test(value.trim().toUpperCase())
}

/**
 * Prüft eine manuell eingegebene Ticker-Zuordnung. Gibt den Fehlertext
 * zurück oder null, wenn die Eingabe gespeichert werden kann. Leere Eingabe
 * ist kein Fehler — die ISIN bleibt dann einfach unaufgelöst.
 */
export function validateManualSymbol(input: string): string | null {
  const value = input.trim().toUpperCase()
  if (!value) return null
  if (looksLikeISIN(value)) {
    return 'Das ist eine ISIN, kein Ticker. Feld leer lassen, um die Buchungen zu überspringen.'
  }
  if (/\s/.test(value)) return 'Ticker ohne Leerzeichen eingeben.'
  if (value.length > SYMBOL_MAX_LENGTH) {
    return `Höchstens ${SYMBOL_MAX_LENGTH} Zeichen (eingegeben: ${value.length}).`
  }
  return null
}

export interface ImportRowInput {
  type: string
  symbol?: string
  isin?: string
  name?: string
  date: string
  quantity: number
  price: number
  totalValue: number
  fee?: number
}

export interface ImportValidationIssue {
  /** ISIN der betroffenen Buchungen, sonst Symbol, sonst Zeilenbeschreibung */
  key: string
  isin?: string
  symbol?: string
  name?: string
  message: string
  /** Anzahl betroffener Buchungen */
  count: number
  /** Beispiel-Datum der ersten betroffenen Buchung */
  firstDate?: string
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

function rowProblems(tx: ImportRowInput): string[] {
  const problems: string[] = []
  // Ungetrimmt prüfen: geschrieben wird das Symbol genau so
  const symbol = tx.symbol || ''

  if (!symbol.trim()) {
    problems.push('Symbol fehlt')
  } else if (symbol.length > SYMBOL_MAX_LENGTH) {
    problems.push(
      looksLikeISIN(symbol)
        ? `Symbol „${symbol}“ ist eine ISIN (${symbol.length} Zeichen, max. ${SYMBOL_MAX_LENGTH})`
        : `Symbol „${symbol}“ hat ${symbol.length} Zeichen (max. ${SYMBOL_MAX_LENGTH})`
    )
  }
  if (!ALLOWED_TYPES.has(tx.type)) problems.push(`unbekannter Buchungstyp „${tx.type}“`)
  if (!tx.date || !isValidDate(tx.date)) problems.push(`ungültiges Datum „${tx.date || ''}“`)
  if (!Number.isFinite(tx.quantity)) problems.push('Stückzahl fehlt')
  if (!Number.isFinite(tx.price)) problems.push('Kurs fehlt')
  if (!Number.isFinite(tx.totalValue)) problems.push('Betrag fehlt')
  if (tx.fee != null && !Number.isFinite(tx.fee)) problems.push('Gebühr ungültig')
  return problems
}

/**
 * Prüft alle Zeilen gegen die Grenzen der Tabelle. Fehler werden je ISIN
 * (bzw. Symbol) und Problem zusammengefasst, damit die Liste im UI kurz
 * bleibt, auch wenn ein Wertpapier hunderte Buchungen hat.
 */
export function validateImportRows(rows: ImportRowInput[]): ImportValidationIssue[] {
  const issues = new Map<string, ImportValidationIssue>()
  for (const tx of rows) {
    const problems = rowProblems(tx)
    if (problems.length === 0) continue
    const message = problems.join(', ')
    const key = tx.isin || tx.symbol || `${tx.date} ${tx.type} ${tx.name || ''}`.trim()
    const mapKey = `${key}|${message}`
    const existing = issues.get(mapKey)
    if (existing) {
      existing.count++
      if (tx.date && (!existing.firstDate || tx.date < existing.firstDate)) existing.firstDate = tx.date
    } else {
      issues.set(mapKey, {
        key,
        isin: tx.isin || undefined,
        symbol: tx.symbol || undefined,
        name: tx.name || undefined,
        message,
        count: 1,
        firstDate: tx.date || undefined,
      })
    }
  }
  return [...issues.values()]
}

/** Kurztext für Fehlermeldungen außerhalb der Vorschau-Liste */
export function describeValidationIssues(issues: ImportValidationIssue[], limit = 5): string {
  const parts = issues.slice(0, limit).map(i => {
    const label = i.isin ? `${i.isin}${i.name ? ` (${i.name})` : ''}` : i.key
    return `${label}: ${i.message} — ${i.count} Buchung${i.count === 1 ? '' : 'en'}`
  })
  if (issues.length > limit) parts.push(`… und ${issues.length - limit} weitere`)
  return parts.join(' · ')
}
