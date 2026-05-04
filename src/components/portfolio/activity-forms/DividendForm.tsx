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
      const amt = parseFloat(amount.replace(',', '.'))

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

  const amountNum = parseFloat(amount.replace(',', '.')) || 0
  const perShare = selectedHolding && amountNum > 0
    ? amountNum / selectedHolding.quantity
    : null

  return (
    <div className="space-y-4">
      <Field label="Position">
        {selectedHolding ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.15]">
            <Logo ticker={selectedHolding.symbol} alt={selectedHolding.symbol} className="w-6 h-6" padding="none" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{selectedHolding.symbol}</p>
              <p className="text-[10px] text-white/40 truncate">{selectedHolding.name}</p>
            </div>
            <p className="text-[11px] text-white/80 tabular-nums">{selectedHolding.quantity} Stk.</p>
            <button
              onClick={() => setSelectedHoldingId('')}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]"
            >
              Ändern
            </button>
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.04] p-1">
            {holdings.map(h => (
              <button
                key={h.id}
                onClick={() => { setSelectedHoldingId(h.id); setAmount('') }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
              >
                <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold text-white">{h.symbol}</span>
                  <p className="text-[10px] text-white/40 truncate">{h.name}</p>
                </div>
                <p className="text-[11px] text-white/80 tabular-nums">{h.quantity} Stk.</p>
              </button>
            ))}
          </div>
        )}
      </Field>

      {selectedHolding && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gesamtbetrag" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={amount}
                onChange={setAmount}
                placeholder="0,00"
              />
            </Field>
            <Field label="Datum">
              <Input
                type="date"
                value={dividendDate}
                onChange={setDividendDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </Field>
          </div>

          {amountNum > 0 && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-white/55">Dividende gesamt</span>
                <span className="text-blue-400 font-semibold tabular-nums">+{formatCurrency(amountNum)}</span>
              </div>
              {perShare !== null && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-white/55">Pro Aktie</span>
                  <span className="text-white/80 tabular-nums">{formatCurrency(perShare)}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !amount || amountNum <= 0}
            className="w-full py-2.5 rounded-xl bg-blue-500/90 hover:bg-blue-500 text-white text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird hinzugefügt…</>
            ) : (
              <><CheckIcon className="w-4 h-4" />Dividende erfassen</>
            )}
          </button>
        </>
      )}
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

function Input({
  type = 'text',
  value,
  onChange,
  ...rest
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: 'decimal' | 'numeric' | 'text'
  step?: string
  min?: string
  max?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      {...rest}
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 transition-colors tabular-nums"
    />
  )
}
