'use client'

import React, { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import type { Transaction } from '../_lib/types'

interface DeleteTransactionModalProps {
  transaction: Transaction | null
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  cash_deposit: 'Einzahlung',
  cash_withdrawal: 'Auszahlung',
  transfer_in: 'Transfer rein',
  transfer_out: 'Transfer raus',
}

export default function DeleteTransactionModal({ transaction, onClose }: DeleteTransactionModalProps) {
  const { deleteTransaction, formatCurrency } = usePortfolio()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (deleting) return
    setError(null)
    onClose()
  }

  const handleDelete = async () => {
    if (!transaction) return
    setError(null)
    setDeleting(true)
    try {
      await deleteTransaction(transaction.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  const typeLabel = transaction ? TYPE_LABELS[transaction.type] ?? transaction.type : ''
  const value = transaction ? transaction.total_value || transaction.price * transaction.quantity : 0

  return (
    <Modal
      open={!!transaction}
      title="Transaktion löschen"
      subtitle={transaction ? `${typeLabel}${transaction.symbol && transaction.symbol !== 'CASH' ? ` · ${transaction.symbol}` : ''}` : ''}
      onClose={handleClose}
      size="sm"
    >
      {transaction && (
        <div className="space-y-4">
          <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] px-4 py-3 text-[12px] text-red-300/90 leading-relaxed">
            Realisierte Gewinne, Dividenden-Statistik und XIRR werden neu berechnet. Holdings passen sich <span className="font-semibold">nicht</span> automatisch an.
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-2">
            <SummaryRow label="Typ" value={typeLabel} />
            {transaction.symbol && transaction.symbol !== 'CASH' && (
              <SummaryRow label="Symbol" value={transaction.symbol} />
            )}
            {transaction.quantity > 0 && (
              <SummaryRow
                label="Menge"
                value={transaction.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
              />
            )}
            <SummaryRow label="Betrag" value={formatCurrency(value)} />
            <SummaryRow
              label="Datum"
              value={new Date(transaction.date).toLocaleDateString('de-DE')}
            />
          </div>

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={handleClose}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-5 py-2.5 rounded-xl bg-red-500/90 text-white text-[12px] font-semibold hover:bg-red-500 transition-all disabled:opacity-50"
            >
              {deleting ? 'Lösche…' : 'Transaktion löschen'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-[13px] font-semibold text-white/85 tabular-nums">{value}</span>
    </div>
  )
}
