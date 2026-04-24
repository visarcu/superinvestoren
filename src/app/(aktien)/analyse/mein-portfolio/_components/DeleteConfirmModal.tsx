'use client'

import React, { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import type { Holding } from '../_lib/types'

interface DeleteConfirmModalProps {
  holding: Holding | null
  onClose: () => void
}

export default function DeleteConfirmModal({ holding, onClose }: DeleteConfirmModalProps) {
  const { deletePosition, formatCurrency } = usePortfolio()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (deleting) return
    setError(null)
    onClose()
  }

  const handleDelete = async () => {
    if (!holding) return
    setError(null)
    setDeleting(true)
    try {
      await deletePosition(holding.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal
      open={!!holding}
      title="Position löschen"
      subtitle={holding ? `${holding.symbol} · ${holding.name}` : ''}
      onClose={handleClose}
      size="sm"
    >
      {holding && (
        <div className="space-y-4">
          <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] px-4 py-3 flex gap-3">
            <svg
              className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <p className="text-[12px] text-red-300/90 leading-relaxed">
              Die Position wird aus dem Depot entfernt. Die Transaktionshistorie
              (Buy/Sell/Dividenden) bleibt erhalten und fließt weiter in Realisierte
              Gewinne & Dividenden-Statistik ein.
            </p>
          </div>

          {/* Position-Zusammenfassung */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-2">
            <SummaryRow
              label="Stückzahl"
              value={holding.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
            />
            <SummaryRow
              label="Ø Kaufpreis"
              value={formatCurrency(holding.purchase_price_display)}
            />
            <SummaryRow label="Aktueller Wert" value={formatCurrency(holding.value)} />
            <SummaryRow
              label="Rendite"
              value={`${holding.gain_loss >= 0 ? '+' : ''}${formatCurrency(holding.gain_loss)}`}
              valueClass={holding.gain_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}
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
              {deleting ? 'Lösche…' : 'Position löschen'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/40 uppercase tracking-wider">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${valueClass ?? 'text-white/85'}`}>
        {value}
      </span>
    </div>
  )
}
