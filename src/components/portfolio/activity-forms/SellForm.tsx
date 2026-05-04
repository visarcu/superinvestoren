// src/components/portfolio/activity-forms/SellForm.tsx
'use client'

import React, { useState } from 'react'
import Logo from '@/components/Logo'
import { type Holding } from '@/hooks/usePortfolio'
import { checkDuplicateTransaction } from '@/lib/duplicateCheck'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

interface SellFormProps {
  portfolioId: string
  holdings: Holding[]
  onSellPosition: (holdingId: string, params: {
    quantity: number
    price: number
    date: string
  }) => Promise<void>
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  onSuccess: () => void
}

export default function SellForm({
  portfolioId,
  holdings,
  onSellPosition,
  formatCurrency,
  formatStockPrice,
  onSuccess
}: SellFormProps) {
  const [selectedHoldingId, setSelectedHoldingId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const selectedHolding = holdings.find(h => h.id === selectedHoldingId)

  const handleSubmit = async () => {
    if (!selectedHoldingId || !quantity || !sellPrice) return

    setSubmitting(true)
    try {
      const qty = parseFloat(quantity.replace(',', '.'))
      const prc = parseFloat(sellPrice.replace(',', '.'))

      const duplicate = await checkDuplicateTransaction({
        portfolioId,
        type: 'sell',
        symbol: selectedHolding!.symbol,
        date: sellDate,
        quantity: qty,
        price: prc,
      })
      if (duplicate) {
        const confirmed = window.confirm(
          `Eine ähnliche Transaktion existiert bereits:\n` +
          `${selectedHolding!.symbol} Verkauf — ${qty} Stk. @ ${prc.toFixed(2)}€ am ${new Date(sellDate).toLocaleDateString('de-DE')}\n\n` +
          `Trotzdem hinzufügen?`
        )
        if (!confirmed) {
          setSubmitting(false)
          return
        }
      }

      await onSellPosition(selectedHoldingId, {
        quantity: qty,
        price: prc,
        date: sellDate
      })
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const sellQuantity = parseFloat(quantity.replace(',', '.')) || 0
  const sellPriceNum = parseFloat(sellPrice.replace(',', '.')) || 0
  const isFullSell = selectedHolding && sellQuantity >= selectedHolding.quantity
  const gainLoss = selectedHolding && sellQuantity > 0 && sellPriceNum > 0
    ? (sellPriceNum - selectedHolding.purchase_price_display) * sellQuantity
    : null

  return (
    <div className="space-y-4">
      <Field label="Position">
        {selectedHolding ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.15]">
            <Logo ticker={selectedHolding.symbol} alt={selectedHolding.symbol} className="w-6 h-6" padding="none" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white truncate">{selectedHolding.symbol}</p>
              <p className="text-[10px] text-white/40 truncate">{selectedHolding.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/80 tabular-nums">{selectedHolding.quantity} Stk.</p>
              <p className="text-[10px] text-white/40 tabular-nums">Ø {formatStockPrice(selectedHolding.purchase_price_display)}</p>
            </div>
            <button
              onClick={() => { setSelectedHoldingId(''); setQuantity(''); setSellPrice('') }}
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
                onClick={() => { setSelectedHoldingId(h.id); setQuantity(''); setSellPrice('') }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
              >
                <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold text-white">{h.symbol}</span>
                  <p className="text-[10px] text-white/40 truncate">{h.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/80 tabular-nums">{h.quantity} Stk.</p>
                  <p className="text-[10px] text-white/40 tabular-nums">Ø {formatStockPrice(h.purchase_price_display)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Field>

      {selectedHolding && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Anzahl" suffix={`max ${selectedHolding.quantity}`}>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                max={selectedHolding.quantity.toString()}
                step="any"
                value={quantity}
                onChange={(v) => {
                  const num = parseFloat(v.replace(',', '.'))
                  if (!isNaN(num) && num > selectedHolding.quantity) {
                    setQuantity(selectedHolding.quantity.toString())
                  } else {
                    setQuantity(v)
                  }
                }}
                placeholder={selectedHolding.quantity.toString()}
              />
            </Field>
            <Field label="Verkaufspreis" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={sellPrice}
                onChange={setSellPrice}
                placeholder="0,00"
              />
            </Field>
          </div>

          <Field label="Verkaufsdatum">
            <Input
              type="date"
              value={sellDate}
              onChange={setSellDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </Field>

          {quantity && sellPrice && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-1.5">
              <Row label="Erlös" value={formatCurrency(sellQuantity * sellPriceNum)} />
              {gainLoss !== null && (
                <Row
                  label="Gewinn / Verlust"
                  value={`${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss)}`}
                  valueClass={gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  bold
                />
              )}
              {isFullSell && (
                <p className="text-[11px] text-amber-300/80 pt-1">Position wird vollständig verkauft</p>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !quantity || !sellPrice || sellQuantity <= 0}
            className="w-full py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird verkauft…</>
            ) : (
              <><CheckIcon className="w-4 h-4" />{isFullSell ? 'Vollverkauf' : 'Verkaufen'}</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// === Shared UI =============================================================

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
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-red-400/50 transition-colors tabular-nums"
    />
  )
}

function Row({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-white/55">{label}</span>
      <span className={`tabular-nums ${valueClass ?? (bold ? 'text-white font-semibold' : 'text-white/80')}`}>{value}</span>
    </div>
  )
}
