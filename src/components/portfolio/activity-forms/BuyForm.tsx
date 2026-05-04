// src/components/portfolio/activity-forms/BuyForm.tsx
'use client'

import React, { useState } from 'react'
import TickerSearch, { type SearchedStock } from '@/components/portfolio/TickerSearch'
import { type Holding } from '@/hooks/usePortfolio'
import { checkDuplicateTransaction } from '@/lib/duplicateCheck'
import {
  CheckIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface BuyFormProps {
  portfolioId: string
  holdings: Holding[]
  isPremium: boolean
  holdingsCount: number
  maxFreePositions: number
  onAddPosition: (params: {
    stock: { symbol: string; name: string }
    quantity: number
    purchasePrice: number
    purchaseDate: string
    fees?: number
  }) => Promise<void>
  onTopUpPosition: (holding: Holding, params: {
    quantity: number
    price: number
    date: string
    fees?: number
  }) => Promise<void>
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  onSuccess: () => void
  onPremiumRequired: () => void
}

export default function BuyForm({
  portfolioId,
  holdings,
  onAddPosition,
  onTopUpPosition,
  formatCurrency,
  formatStockPrice,
  onSuccess,
}: BuyFormProps) {
  const [selectedStock, setSelectedStock] = useState<SearchedStock | null>(null)
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [fees, setFees] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Erkennen ob die Aktie schon im Portfolio ist
  const existingHolding = selectedStock
    ? holdings.find(h => h.symbol === selectedStock.ticker)
    : null

  const isTopUp = !!existingHolding

  const handleSubmit = async () => {
    if (!selectedStock || !quantity || !purchasePrice) return

    setSubmitting(true)
    try {
      const qty = parseFloat(quantity.replace(',', '.'))
      const prc = parseFloat(purchasePrice.replace(',', '.'))
      const feeNum = parseFloat(fees.replace(',', '.')) || 0
      const duplicate = await checkDuplicateTransaction({
        portfolioId,
        type: 'buy',
        symbol: selectedStock.ticker,
        date: purchaseDate,
        quantity: qty,
        price: prc + (feeNum / qty),
      })
      if (duplicate) {
        const confirmed = window.confirm(
          `Eine ähnliche Transaktion existiert bereits:\n` +
          `${selectedStock.ticker} — ${qty} Stk. @ ${prc.toFixed(2)}€ am ${new Date(purchaseDate).toLocaleDateString('de-DE')}\n\n` +
          `Trotzdem hinzufügen?`
        )
        if (!confirmed) {
          setSubmitting(false)
          return
        }
      }

      if (isTopUp && existingHolding) {
        await onTopUpPosition(existingHolding, {
          quantity: qty,
          price: prc,
          date: purchaseDate,
          fees: feeNum
        })
      } else {
        await onAddPosition({
          stock: { symbol: selectedStock.ticker, name: selectedStock.name },
          quantity: qty,
          purchasePrice: prc,
          purchaseDate,
          fees: feeNum
        })
      }
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const topUpPreview = isTopUp && existingHolding && quantity && purchasePrice
    ? (() => {
        const newQty = parseFloat(quantity.replace(',', '.'))
        const newPrice = parseFloat(purchasePrice.replace(',', '.')) + ((parseFloat(fees.replace(',', '.')) || 0) / newQty)
        const totalQty = existingHolding.quantity + newQty
        const avgPrice = ((existingHolding.quantity * existingHolding.purchase_price) + (newQty * newPrice)) / totalQty
        return { totalQty, avgPrice }
      })()
    : null

  const investAmount = quantity && purchasePrice
    ? parseFloat(quantity.replace(',', '.')) * parseFloat(purchasePrice.replace(',', '.'))
    : null
  const feeAmount = fees ? parseFloat(fees.replace(',', '.')) : 0

  return (
    <div className="space-y-4">
      {/* Aktiensuche */}
      <Field label="Aktie">
        <TickerSearch
          selected={selectedStock}
          onSelect={setSelectedStock}
          onClear={() => setSelectedStock(null)}
          accent="emerald"
          autoFocus
        />
      </Field>

      {/* Aufstock-Hinweis */}
      {selectedStock && isTopUp && existingHolding && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.15] text-[11px] text-blue-300/90">
          <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Bereits {existingHolding.quantity} Stk. im Portfolio (Ø {formatStockPrice(existingHolding.purchase_price_display)}) — wird aufgestockt
          </span>
        </div>
      )}

      {selectedStock && (
        <>
          {/* Anzahl + Kaufpreis */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Anzahl">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={quantity}
                onChange={setQuantity}
                placeholder="z.B. 10"
              />
            </Field>
            <Field label="Kaufpreis je Stück" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={purchasePrice}
                onChange={setPurchasePrice}
                placeholder="z.B. 145,30"
              />
            </Field>
          </div>

          {/* Datum + Gebühren */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kaufdatum">
              <Input
                type="date"
                value={purchaseDate}
                onChange={setPurchaseDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </Field>
            <Field label="Gebühren (optional)" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={fees}
                onChange={setFees}
                placeholder="0,00"
              />
            </Field>
          </div>

          {/* Zusammenfassung */}
          {investAmount !== null && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 space-y-1.5">
              <Row label="Investition" value={formatCurrency(investAmount)} />
              {feeAmount > 0 && (
                <Row label="Gebühren" value={formatCurrency(feeAmount)} muted />
              )}
              <div className="pt-1.5 border-t border-white/[0.04]">
                <Row label="Gesamt" value={formatCurrency(investAmount + feeAmount)} bold />
              </div>
              {topUpPreview && (
                <div className="pt-1.5 border-t border-white/[0.04] space-y-1.5">
                  <Row
                    label="Neue Gesamtmenge"
                    value={`${topUpPreview.totalQty} Stk.`}
                    accent="blue"
                  />
                  <Row
                    label="Neuer Ø Preis"
                    value={formatStockPrice(topUpPreview.avgPrice)}
                    accent="blue"
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !quantity || !purchasePrice}
            className="w-full py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird hinzugefügt…</>
            ) : isTopUp ? (
              <><CheckIcon className="w-4 h-4" />Position aufstocken</>
            ) : (
              <><CheckIcon className="w-4 h-4" />Position hinzufügen</>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// === Shared UI-Bausteine (Glassmorphism) ===================================

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
        <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
          {label}
        </label>
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
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 transition-colors tabular-nums"
    />
  )
}

function Row({
  label,
  value,
  bold,
  muted,
  accent,
}: {
  label: string
  value: string
  bold?: boolean
  muted?: boolean
  accent?: 'blue' | 'red'
}) {
  const labelColor = accent === 'blue'
    ? 'text-blue-400/90'
    : muted
      ? 'text-white/40'
      : 'text-white/55'
  const valueColor = bold
    ? 'text-white font-semibold'
    : muted
      ? 'text-white/60'
      : 'text-white/80'
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className={labelColor}>{label}</span>
      <span className={`tabular-nums ${valueColor}`}>{value}</span>
    </div>
  )
}
