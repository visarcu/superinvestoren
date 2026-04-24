'use client'

import React, { useEffect, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import type { Holding } from '../_lib/types'

interface EditPositionModalProps {
  holding: Holding | null
  onClose: () => void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function EditPositionModal({ holding, onClose }: EditPositionModalProps) {
  const { updatePosition, formatCurrency } = usePortfolio()

  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Formular beim Öffnen mit Holding-Daten vorbefüllen
  useEffect(() => {
    if (holding) {
      setQuantity(String(holding.quantity))
      setPrice(String(holding.purchase_price_display))
      setDate(holding.purchase_date?.slice(0, 10) || todayISO())
      setError(null)
    }
  }, [holding])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!holding) return
    setError(null)

    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))

    if (isNaN(qty) || qty <= 0) {
      setError('Stückzahl muss größer 0 sein')
      return
    }
    if (isNaN(px) || px <= 0) {
      setError('Kaufpreis muss größer 0 sein')
      return
    }
    if (!date) {
      setError('Kaufdatum fehlt')
      return
    }

    setSaving(true)
    try {
      await updatePosition(holding.id, {
        quantity: qty,
        purchase_price: px,
        purchase_date: date,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // Live-Preview Kostenbasis
  const preview = (() => {
    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))
    if (isNaN(qty) || isNaN(px)) return null
    return { costBasis: qty * px }
  })()

  return (
    <Modal
      open={!!holding}
      title="Position bearbeiten"
      subtitle={holding ? `${holding.symbol} · ${holding.name}` : ''}
      onClose={handleClose}
    >
      {holding && (
        <div className="space-y-4">
          {/* Stückzahl + Kaufpreis */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stückzahl">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={quantity}
                onChange={setQuantity}
              />
            </Field>
            <Field label="Ø Kaufpreis" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={price}
                onChange={setPrice}
              />
            </Field>
          </div>

          {/* Kaufdatum */}
          <Field label="Kaufdatum">
            <Input type="date" value={date} onChange={setDate} max={todayISO()} />
          </Field>

          {/* Live-Preview */}
          {preview && preview.costBasis > 0 && (
            <div className="text-[11px] text-white/40 px-1">
              Kostenbasis:{' '}
              <span className="text-white/80 font-medium tabular-nums">
                {formatCurrency(preview.costBasis)}
              </span>
              {holding && (
                <span className="text-white/25 ml-2">
                  · vorher {formatCurrency(holding.purchase_price_display * holding.quantity)}
                </span>
              )}
            </div>
          )}

          <div className="text-[11px] text-white/30 px-1 leading-relaxed">
            Die zugehörige Buy-Transaktion wird automatisch auf die neuen Werte synchronisiert.
          </div>

          {error && (
            <div className="text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

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
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {saving ? 'Speichere…' : 'Änderungen speichern'}
            </button>
          </div>
        </div>
      )}
    </Modal>
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
        <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
          {label}
        </label>
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
