// src/components/portfolio/activity-forms/CashForm.tsx
'use client'

import React, { useState } from 'react'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

interface CashFormProps {
  direction: 'deposit' | 'withdrawal'
  cashPosition: number
  onAddCash: (amount: number, date?: string) => Promise<void>
  formatCurrency: (amount: number) => string
  onSuccess: () => void
}

export default function CashForm({
  direction,
  cashPosition,
  onAddCash,
  formatCurrency,
  onSuccess
}: CashFormProps) {
  const [amount, setAmount] = useState('')
  const [cashDate, setCashDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const isDeposit = direction === 'deposit'
  const amountNum = parseFloat(amount) || 0

  const handleSubmit = async () => {
    if (!amount || amountNum <= 0) return

    // Bei Auszahlung pruefen ob genug Cash vorhanden
    if (!isDeposit && amountNum > cashPosition) {
      alert('Nicht genug Cash-Guthaben vorhanden.')
      return
    }

    setSubmitting(true)
    try {
      const signedAmount = isDeposit ? amountNum : -amountNum
      await onAddCash(signedAmount, cashDate)
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const newCashPosition = isDeposit
    ? cashPosition + amountNum
    : cashPosition - amountNum

  return (
    <div className="space-y-4">
      {/* Aktueller Stand */}
      <div className="bg-neutral-100 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700/50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Aktuelles Cash-Guthaben</span>
          <span className="text-sm font-medium text-neutral-900 dark:text-white">{formatCurrency(cashPosition)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">
            Betrag (EUR)
          </label>
          <input
            type="number" min="0" step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={`w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 ${
              isDeposit ? 'focus:ring-emerald-400' : 'focus:ring-red-400'
            } focus:border-transparent`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Datum</label>
          <input
            type="date"
            value={cashDate}
            onChange={(e) => setCashDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 ${
              isDeposit ? 'focus:ring-emerald-400' : 'focus:ring-red-400'
            } focus:border-transparent`}
          />
        </div>
      </div>

      {/* Vorschau */}
      {amountNum > 0 && (
        <div className="bg-neutral-100 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700/50 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">{isDeposit ? 'Einzahlung' : 'Auszahlung'}</span>
            <span className={`font-medium ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isDeposit ? '+' : '-'}{formatCurrency(amountNum)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm pt-1.5 border-t border-neutral-200 dark:border-neutral-700/50">
            <span className="text-neutral-500">Neuer Stand</span>
            <span className="text-neutral-900 dark:text-white font-semibold">{formatCurrency(newCashPosition)}</span>
          </div>
          {!isDeposit && amountNum > cashPosition && (
            <p className="text-xs text-red-400 mt-1">Nicht genug Cash-Guthaben</p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || amountNum <= 0 || (!isDeposit && amountNum > cashPosition)}
        className={`w-full py-2.5 ${
          isDeposit
            ? 'bg-emerald-500 hover:bg-emerald-400'
            : 'bg-red-500 hover:bg-red-400'
        } disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium`}
      >
        {submitting ? (
          <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird verarbeitet...</>
        ) : (
          <><CheckIcon className="w-4 h-4" />{isDeposit ? 'Einzahlung buchen' : 'Auszahlung buchen'}</>
        )}
      </button>
    </div>
  )
}
