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
  const amountNum = parseFloat(amount.replace(',', '.')) || 0

  const handleSubmit = async () => {
    if (!amount || amountNum <= 0) return

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

  const focusClass = isDeposit ? 'focus:border-emerald-400/50' : 'focus:border-red-400/50'
  const submitClass = isDeposit
    ? 'bg-emerald-500/90 hover:bg-emerald-500'
    : 'bg-red-500/90 hover:bg-red-500'

  return (
    <div className="space-y-4">
      {/* Aktueller Stand */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-white/55">Cash-Guthaben</span>
        <span className="text-[13px] font-semibold text-white tabular-nums">{formatCurrency(cashPosition)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Betrag" suffix="€">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0,00"
            className={`w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none ${focusClass} transition-colors tabular-nums`}
          />
        </Field>
        <Field label="Datum">
          <input
            type="date"
            value={cashDate}
            onChange={e => setCashDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={`w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none ${focusClass} transition-colors tabular-nums`}
          />
        </Field>
      </div>

      {amountNum > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/55">{isDeposit ? 'Einzahlung' : 'Auszahlung'}</span>
            <span className={`font-semibold tabular-nums ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
              {isDeposit ? '+' : '-'}{formatCurrency(amountNum)}
            </span>
          </div>
          <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[12px]">
            <span className="text-white/55">Neuer Stand</span>
            <span className="text-white font-semibold tabular-nums">{formatCurrency(newCashPosition)}</span>
          </div>
          {!isDeposit && amountNum > cashPosition && (
            <p className="text-[11px] text-red-300 pt-1">Nicht genug Cash-Guthaben</p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || amountNum <= 0 || (!isDeposit && amountNum > cashPosition)}
        className={`w-full py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${submitClass}`}
      >
        {submitting ? (
          <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird verarbeitet…</>
        ) : (
          <><CheckIcon className="w-4 h-4" />{isDeposit ? 'Einzahlung buchen' : 'Auszahlung buchen'}</>
        )}
      </button>
    </div>
  )
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string
  suffix?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</label>
        {suffix && <span className="text-[10px] text-white/25">{suffix}</span>}
      </div>
      {children}
    </div>
  )
}
