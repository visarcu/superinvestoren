'use client'

import React, { useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import TickerSearch, { type SearchedStock } from '@/components/portfolio/TickerSearch'

interface AddPositionModalProps {
  open: boolean
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const MAX_CASE = 1000

export default function AddPositionModal({ open, onClose }: AddPositionModalProps) {
  const { addPosition, portfolio } = usePortfolio()

  const [stock, setStock] = useState<SearchedStock | null>(null)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(todayISO())
  const [fees, setFees] = useState('')
  const [investmentCase, setInvestmentCase] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStock(null)
    setQuantity('')
    setPrice('')
    setDate(todayISO())
    setFees('')
    setInvestmentCase('')
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    if (!stock) {
      setError('Bitte Aktie auswählen')
      return
    }
    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))
    const fee = fees ? parseFloat(fees.replace(',', '.')) : 0
    if (isNaN(qty) || qty <= 0) {
      setError('Stückzahl muss größer 0 sein')
      return
    }
    if (isNaN(px) || px <= 0) {
      setError('Preis muss größer 0 sein')
      return
    }
    if (isNaN(fee) || fee < 0) {
      setError('Gebühren ungültig')
      return
    }

    setSaving(true)
    try {
      await addPosition({
        stock: { symbol: stock.ticker, name: stock.name },
        quantity: qty,
        purchasePrice: px,
        purchaseDate: date,
        fees: fee,
        investmentCase: investmentCase.trim() || undefined,
      })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const totalValue = (() => {
    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))
    const fee = fees ? parseFloat(fees.replace(',', '.')) : 0
    if (isNaN(qty) || isNaN(px)) return null
    return qty * px + (isNaN(fee) ? 0 : fee)
  })()

  return (
    <Modal
      open={open}
      title="Neue Position"
      subtitle={portfolio ? `In Depot: ${portfolio.name}` : 'Wähle ein Depot'}
      onClose={handleClose}
    >
      <div className="space-y-4">
        {/* Aktie suchen */}
        <Field label="Aktie">
          <TickerSearch
            selected={stock}
            onSelect={setStock}
            onClear={() => setStock(null)}
            autoFocus
          />
        </Field>

        {/* Stückzahl + Preis nebeneinander */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stückzahl">
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
              value={price}
              onChange={setPrice}
              placeholder="z.B. 145,30"
            />
          </Field>
        </div>

        {/* Datum + Gebühren */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kaufdatum">
            <Input type="date" value={date} onChange={setDate} max={todayISO()} />
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

        {/* Live-Summary */}
        {totalValue !== null && totalValue > 0 && (
          <div className="text-[11px] text-white/40 px-1">
            Gesamtkosten:{' '}
            <span className="text-white/70 font-medium tabular-nums">
              {totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </span>
          </div>
        )}

        {/* Investment-Case */}
        <Field
          label="Investment-Case"
          hint={`Optional · ${investmentCase.length}/${MAX_CASE} Zeichen`}
          hintRight
        >
          <textarea
            value={investmentCase}
            onChange={e => setInvestmentCase(e.target.value.slice(0, MAX_CASE))}
            placeholder={`Warum kaufst du diese Aktie? Z.B. "Defensive Position in Tech, KGV unter 20, starker Cashflow."`}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors resize-none"
          />
        </Field>

        {error && (
          <div className="text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !stock}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? 'Speichere…' : 'Position hinzufügen'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({
  label,
  hint,
  hintRight,
  suffix,
  children,
}: {
  label: string
  hint?: string
  hintRight?: boolean
  suffix?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</label>
        {hint && (
          <span className={`text-[10px] text-white/25 ${hintRight ? '' : 'ml-2'}`}>{hint}</span>
        )}
        {suffix && <span className="text-[10px] text-white/25 ml-2">{suffix}</span>}
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
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors tabular-nums"
    />
  )
}
