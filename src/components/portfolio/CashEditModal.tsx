'use client'

import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface CashEditModalProps {
  open: boolean
  cashPosition: number
  formatCurrency: (value: number) => string
  onClose: () => void
  onSave: (newAmount: number) => Promise<void>
}

export default function CashEditModal({ open, cashPosition, formatCurrency, onClose, onSave }: CashEditModalProps) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) setAmount(cashPosition.toString())
  }, [open, cashPosition])

  if (!open) return null

  const handleSave = async () => {
    if (amount === '') return
    try {
      await onSave(parseFloat(amount) || 0)
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="terminal-glass-strong rounded-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-theme">
            <div>
              <h2 className="text-[17px] font-semibold text-theme-primary tracking-tight">Cash-Position</h2>
              <p className="text-[12px] text-theme-muted mt-0.5">Bestand anpassen</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-hover transition-colors"
              aria-label="Schließen"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Aktueller Stand */}
            <div className="rounded-xl border border-theme bg-theme-secondary px-4 py-3.5">
              <div className="text-[11px] uppercase tracking-wider text-theme-muted font-medium">Aktuell</div>
              <div className="text-[22px] font-semibold text-theme-primary tabular-nums mt-1">
                {formatCurrency(cashPosition)}
              </div>
            </div>

            {/* Neuer Betrag */}
            <div>
              <label className="block text-[12px] font-medium text-theme-secondary mb-2">
                Neuer Cash-Betrag (EUR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 px-4 py-3 bg-theme-input border border-theme rounded-xl text-theme-primary text-[15px] tabular-nums placeholder:text-theme-muted focus:outline-none focus:border-teal-400/50 transition-colors"
                  autoFocus
                />
                {cashPosition !== 0 && (
                  <button
                    onClick={() => setAmount('0')}
                    className="px-3 py-3 text-[12px] font-medium text-theme-secondary border border-theme hover:bg-theme-hover hover:text-theme-primary rounded-xl transition-colors whitespace-nowrap"
                  >
                    Auf 0
                  </button>
                )}
              </div>
            </div>

            {/* Änderungs-Preview */}
            {amount && parseFloat(amount) !== cashPosition && (
              <div className="rounded-xl border border-theme bg-theme-secondary px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-theme-muted">Änderung</span>
                  <span
                    className={`text-[14px] font-medium tabular-nums ${
                      parseFloat(amount) > cashPosition ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {parseFloat(amount) > cashPosition ? '+' : ''}
                    {formatCurrency(parseFloat(amount) - cashPosition)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-theme flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-[13px] font-medium text-theme-secondary hover:text-theme-primary border border-theme hover:bg-theme-hover rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={amount === '' || parseFloat(amount) === cashPosition}
              className="flex-1 py-2.5 text-[13px] font-medium bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 disabled:bg-theme-secondary disabled:text-theme-muted disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
