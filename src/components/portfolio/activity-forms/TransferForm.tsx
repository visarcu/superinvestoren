// src/components/portfolio/activity-forms/TransferForm.tsx
'use client'

import React, { useState } from 'react'
import TickerSearch, { type SearchedStock } from '@/components/portfolio/TickerSearch'
import Logo from '@/components/Logo'
import { type Holding } from '@/hooks/usePortfolio'
import { checkDuplicateTransaction } from '@/lib/duplicateCheck'
import {
  CheckIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface TransferFormProps {
  portfolioId: string
  direction: 'in' | 'out'
  holdings: Holding[]
  onAddTransfer: (params: {
    direction: 'in' | 'out'
    stock: { symbol: string; name: string }
    quantity: number
    price: number
    date: string
    notes?: string
  }) => Promise<void>
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  onSuccess: () => void
}

export default function TransferForm({
  portfolioId,
  direction,
  holdings,
  onAddTransfer,
  formatCurrency,
  formatStockPrice,
  onSuccess
}: TransferFormProps) {
  const [selectedStock, setSelectedStock] = useState<SearchedStock | null>(null)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const existingHolding = selectedStock
    ? holdings.find(h => h.symbol === selectedStock.ticker)
    : null

  const handleSelectExistingHolding = (holding: Holding) => {
    setSelectedStock({ ticker: holding.symbol, name: holding.name })
    if (direction === 'out') {
      setPrice(holding.purchase_price.toFixed(2))
      setQuantity(holding.quantity.toString())
    }
  }

  const handleSubmit = async () => {
    if (!selectedStock || !quantity || !price) return

    setSubmitting(true)
    try {
      const qty = parseFloat(quantity.replace(',', '.'))
      const prc = parseFloat(price.replace(',', '.'))
      const txType = direction === 'in' ? 'transfer_in' : 'transfer_out'

      const duplicate = await checkDuplicateTransaction({
        portfolioId,
        type: txType,
        symbol: selectedStock.ticker,
        date,
        quantity: qty,
        price: prc,
      })
      if (duplicate) {
        const label = direction === 'in' ? 'Einbuchung' : 'Ausbuchung'
        const confirmed = window.confirm(
          `Eine ähnliche ${label} existiert bereits:\n` +
          `${selectedStock.ticker} — ${qty} Stk. @ ${prc.toFixed(2)}€ am ${new Date(date).toLocaleDateString('de-DE')}\n\n` +
          `Trotzdem hinzufügen?`
        )
        if (!confirmed) {
          setSubmitting(false)
          return
        }
      }

      await onAddTransfer({
        direction,
        stock: { symbol: selectedStock.ticker, name: selectedStock.name },
        quantity: qty,
        price: prc,
        date,
        notes: notes || undefined
      })
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const accent = direction === 'in' ? 'violet' : 'red'
  const submitClass = direction === 'in'
    ? 'bg-violet-500/90 hover:bg-violet-500 text-white'
    : 'bg-orange-500/90 hover:bg-orange-500 text-white'

  return (
    <div className="space-y-4">
      {/* Hinweis */}
      <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-[11px] ${
        direction === 'in'
          ? 'bg-violet-500/[0.06] border-violet-500/[0.15] text-violet-200/90'
          : 'bg-orange-500/[0.06] border-orange-500/[0.15] text-orange-200/90'
      }`}>
        <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <p>
          {direction === 'in'
            ? 'Einbuchung: Aktien von einem anderen Depot hierhin übertragen. Der Einstandskurs wird als Kaufpreis übernommen.'
            : 'Ausbuchung: Aktien von diesem Depot zu einem anderen übertragen. Es wird kein Gewinn/Verlust realisiert.'
          }
        </p>
      </div>

      {/* Aktienauswahl */}
      {direction === 'out' ? (
        <Field label="Position auswählen">
          {holdings.length === 0 ? (
            <p className="text-[12px] text-white/40 px-1">Keine Positionen im Depot</p>
          ) : selectedStock ? (
            <TickerSearch
              selected={selectedStock}
              onSelect={setSelectedStock}
              onClear={() => setSelectedStock(null)}
              accent={accent}
            />
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.04] p-1">
              {holdings.filter(h => h.symbol !== 'CASH').map(h => (
                <button
                  key={h.id}
                  onClick={() => handleSelectExistingHolding(h)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
                >
                  <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-semibold text-white">{h.symbol}</span>
                    <p className="text-[10px] text-white/40 truncate">{h.name}</p>
                  </div>
                  <span className="text-[11px] text-white/50 tabular-nums">{h.quantity} Stk.</span>
                </button>
              ))}
            </div>
          )}
        </Field>
      ) : (
        <Field label="Aktie">
          <TickerSearch
            selected={selectedStock}
            onSelect={setSelectedStock}
            onClear={() => setSelectedStock(null)}
            accent={accent}
            autoFocus
          />
        </Field>
      )}

      {selectedStock && existingHolding && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] ${
          direction === 'in'
            ? 'bg-violet-500/[0.06] border border-violet-500/[0.15] text-violet-200/90'
            : 'bg-orange-500/[0.06] border border-orange-500/[0.15] text-orange-200/90'
        }`}>
          <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {direction === 'in'
              ? `Bereits ${existingHolding.quantity} Stk. im Portfolio (Ø ${formatStockPrice(existingHolding.purchase_price_display)})`
              : `Bestand: ${existingHolding.quantity} Stk. · Ø ${formatStockPrice(existingHolding.purchase_price_display)}`
            }
          </span>
        </div>
      )}

      {selectedStock && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Anzahl">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={quantity}
                onChange={setQuantity}
                placeholder={direction === 'out' && existingHolding ? existingHolding.quantity.toString() : 'z.B. 10'}
                accent={accent}
              />
            </Field>
            <Field label="Einstandskurs" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={price}
                onChange={setPrice}
                placeholder={existingHolding ? existingHolding.purchase_price.toFixed(2) : '0,00'}
                accent={accent}
              />
            </Field>
          </div>

          <Field label="Datum">
            <Input type="date" value={date} onChange={setDate} accent={accent} />
          </Field>

          <Field label="Notiz (optional)">
            <Input
              type="text"
              value={notes}
              onChange={setNotes}
              placeholder={direction === 'in' ? 'z.B. Übertrag von Trade Republic' : 'z.B. Übertrag zu Scalable Capital'}
              accent={accent}
            />
          </Field>

          {direction === 'out' && existingHolding && parseFloat(quantity.replace(',', '.')) > existingHolding.quantity && (
            <div className="px-3 py-2 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] text-[11px] text-red-300">
              Achtung: Mehr Stücke als im Bestand ({existingHolding.quantity} Stk.)
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedStock || !quantity || !price}
            className={`w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${submitClass}`}
          >
            {submitting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CheckIcon className="w-4 h-4" />
            )}
            {direction === 'in' ? 'Einbuchung erfassen' : 'Ausbuchung erfassen'}
          </button>
        </>
      )}
    </div>
  )
}

// === Shared UI ==============================================================

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

const ACCENT_FOCUS: Record<'violet' | 'red' | 'emerald' | 'blue' | 'neutral', string> = {
  violet: 'focus:border-violet-400/50',
  red: 'focus:border-orange-400/50',
  emerald: 'focus:border-emerald-400/50',
  blue: 'focus:border-blue-400/50',
  neutral: 'focus:border-white/[0.15]',
}

function Input({
  type = 'text',
  value,
  onChange,
  accent = 'neutral',
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
  accent?: 'violet' | 'red' | 'emerald' | 'blue' | 'neutral'
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      {...rest}
      className={`w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none ${ACCENT_FOCUS[accent]} transition-colors tabular-nums`}
    />
  )
}
