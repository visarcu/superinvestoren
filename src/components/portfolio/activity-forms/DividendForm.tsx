// src/components/portfolio/activity-forms/DividendForm.tsx
'use client'

import React, { useState } from 'react'
import Logo from '@/components/Logo'
import { type Holding } from '@/hooks/usePortfolio'
import { checkDuplicateTransaction } from '@/lib/duplicateCheck'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

interface DividendFormProps {
  portfolioId: string
  holdings: Holding[]
  onAddDividend: (holdingId: string, params: {
    amount: number
    date: string
  }) => Promise<void>
  formatCurrency: (amount: number) => string
  onSuccess: () => void
}

export default function DividendForm({
  portfolioId,
  holdings,
  onAddDividend,
  formatCurrency,
  onSuccess
}: DividendFormProps) {
  const [selectedHoldingId, setSelectedHoldingId] = useState('')
  const [amount, setAmount] = useState('')
  const [dividendDate, setDividendDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const selectedHolding = holdings.find(h => h.id === selectedHoldingId)

  const handleSubmit = async () => {
    if (!selectedHoldingId || !amount) return

    setSubmitting(true)
    try {
      const amt = parseFloat(amount)

      // Duplikat-Prüfung
      if (selectedHolding) {
        const perSharePrice = amt / selectedHolding.quantity
        const duplicate = await checkDuplicateTransaction({
          portfolioId,
          type: 'dividend',
          symbol: selectedHolding.symbol,
          date: dividendDate,
          quantity: selectedHolding.quantity,
          price: perSharePrice,
        })
        if (duplicate) {
          const confirmed = window.confirm(
            `Eine ähnliche Dividende existiert bereits:\n` +
            `${selectedHolding.symbol} — ${amt.toFixed(2)}€ am ${new Date(dividendDate).toLocaleDateString('de-DE')}\n\n` +
            `Trotzdem hinzufügen?`
          )
          if (!confirmed) {
            setSubmitting(false)
            return
          }
        }
      }

      await onAddDividend(selectedHoldingId, {
        amount: amt,
        date: dividendDate
      })
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const amountNum = parseFloat(amount) || 0
  const perShare = selectedHolding && amountNum > 0
    ? amountNum / selectedHolding.quantity
    : null

  return (
    <div className="space-y-4">
      {/* Position waehlen */}
      <div>
        <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-2">Position</label>

        {/* Ausgewählte Position */}
        {selectedHolding && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/50 bg-blue-500/5">
            <Logo ticker={selectedHolding.symbol} alt={selectedHolding.symbol} className="w-7 h-7" padding="none" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-neutral-900 dark:text-white text-sm">{selectedHolding.symbol}</span>
              <p className="text-xs text-neutral-500 truncate">{selectedHolding.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-neutral-900 dark:text-white">{selectedHolding.quantity} Stk.</p>
              <button
                onClick={() => setSelectedHoldingId('')}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-800/30"
              >
                Ändern
              </button>
            </div>
          </div>
        )}

        {/* Auswahlliste — nur sichtbar wenn noch nichts gewählt */}
        {!selectedHolding && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {holdings.map(h => (
              <button
                key={h.id}
                onClick={() => { setSelectedHoldingId(h.id); setAmount('') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/50 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all text-left"
              >
                <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">{h.symbol}</span>
                  <p className="text-xs text-neutral-500 truncate">{h.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-900 dark:text-white">{h.quantity} Stk.</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedHolding && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Gesamtbetrag (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Datum</label>
              <input
                type="date"
                value={dividendDate}
                onChange={(e) => setDividendDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Zusammenfassung */}
          {amount && amountNum > 0 && (
            <div className="bg-neutral-100 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Dividende gesamt</span>
                <span className="text-blue-400 font-medium">+{formatCurrency(amountNum)}</span>
              </div>
              {perShare !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Pro Aktie</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{formatCurrency(perShare)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !amount || amountNum <= 0}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird hinzugefuegt...</>
            ) : (
              <><CheckIcon className="w-4 h-4" />Dividende erfassen</>
            )}
          </button>
        </>
      )}
    </div>
  )
}
