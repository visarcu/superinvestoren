'use client'

import React, { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface BrokerCreditModalProps {
  open: boolean
  brokerCredit: number
  formatCurrency: (value: number) => string
  onClose: () => void
  onSave: (amount: number) => Promise<void>
}

export default function BrokerCreditModal({ open, brokerCredit, formatCurrency, onClose, onSave }: BrokerCreditModalProps) {
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (open) setAmount(brokerCredit.toString())
  }, [open, brokerCredit])

  if (!open) return null

  const handleSave = async () => {
    try {
      await onSave(parseFloat(amount) || 0)
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="terminal-glass-strong rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-theme-primary">Wertpapierkredit</h2>
          <button onClick={onClose} className="p-1 hover:bg-theme-hover rounded transition-colors">
            <XMarkIcon className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-400/90">
              Trage hier deinen aktuellen Wertpapierkredit (WPK) von Scalable ein — als negativen Betrag, z.B. <span className="font-mono">-12502</span>. Dieser Wert erscheint separat und beeinflusst nicht die Cash-Position.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Aktueller Kredit</label>
            <div className="p-3 bg-theme-secondary rounded-lg">
              <span className="text-lg font-bold text-red-400">{formatCurrency(brokerCredit)}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-2">Kreditbetrag (EUR, negativ)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="-12502.00"
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-red-400/50 focus:border-transparent"
            />
            <p className="text-xs text-theme-muted mt-1.5">0 eingeben um den Kredit zu entfernen</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={amount === '' || parseFloat(amount) === brokerCredit}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Speichern
            </button>
            <button onClick={onClose} className="flex-1 py-2 border border-theme hover:bg-theme-hover text-theme-primary rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
