// Shared Types für den Import-Wizard.
import type { ImportBrokerId } from '@/lib/importBrokerConfig'

export type WizardStep =
  | 'broker'
  | 'instructions'
  | 'upload'
  | 'processing'
  | 'resolve'
  | 'cash'
  | 'preview'
  | 'importing'
  | 'done'

/**
 * Normalisierte Transaktion nach dem Parsing — Brücke zwischen
 * den verschiedenen Parser-Outputs (jeder Parser hat sein eigenes Schema)
 * und der einheitlichen Insert-Logik.
 */
export interface NormalizedTransaction {
  // Aus dem Parser
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  isin?: string | null
  symbol?: string | null     // Falls Parser den Ticker schon kennt (z.B. Freedom24-XLSX)
  name: string
  quantity: number
  price: number              // In Quote-Währung
  fees?: number
  date: string
  currency?: string          // 'EUR' / 'USD' / 'GBP' / 'GBp'
  notes?: string

  // Wird im Resolve-Step gesetzt
  resolvedTicker?: string | null
  resolvedSource?: 'cache' | 'master' | 'eodhd' | 'unknown'
}

export interface ImportState {
  step: WizardStep
  brokerId: ImportBrokerId | null
  file: File | null
  fileName: string
  // Roh-Output vom Parser (ungetypt — wir normalisieren in NormalizedTransaction)
  rawParseResult: any | null
  parseError: string | null
  transactions: NormalizedTransaction[]
  cashMode: 'include' | 'ignore'
  selectedTxIds: Set<number>      // Index-basierter Selection-State
  importSummary: {
    inserted: number
    skipped: number
    errors: string[]
  } | null
}
