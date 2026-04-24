'use client'

import React, { useEffect, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import type { Transaction } from '../_lib/types'

interface EditTransactionModalProps {
  transaction: Transaction | null
  onClose: () => void
}

const TYPE_LABELS: Record<string, string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  cash_deposit: 'Einzahlung',
  cash_withdrawal: 'Auszahlung',
  transfer_in: 'Transfer rein',
  transfer_out: 'Transfer raus',
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const { updateTransaction, formatCurrency } = usePortfolio()

  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (transaction) {
      setQuantity(String(transaction.quantity))
      setPrice(String(transaction.price))
      setFee(transaction.fee ? String(transaction.fee) : '')
      setDate(transaction.date?.slice(0, 10) || todayISO())
      setNotes(transaction.notes ?? '')
      setError(null)
    }
  }, [transaction])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!transaction) return
    setError(null)

    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))
    const fe = fee ? parseFloat(fee.replace(',', '.')) : 0

    if (isNaN(qty) || qty <= 0) {
      setError('Menge muss größer 0 sein')
      return
    }
    if (isNaN(px) || px < 0) {
      setError('Preis ungültig')
      return
    }
    if (isNaN(fe) || fe < 0) {
      setError('Gebühren ungültig')
      return
    }
    if (!date) {
      setError('Datum fehlt')
      return
    }

    setSaving(true)
    try {
      await updateTransaction(transaction.id, {
        date,
        quantity: qty,
        price: px,
        fee: fe,
        notes: notes.trim() || null,
        total_value: qty * px,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const preview = (() => {
    const qty = parseFloat(quantity.replace(',', '.'))
    const px = parseFloat(price.replace(',', '.'))
    if (isNaN(qty) || isNaN(px)) return null
    return qty * px
  })()

  const isCashType = transaction?.type === 'cash_deposit' || transaction?.type === 'cash_withdrawal'
  const typeLabel = transaction ? TYPE_LABELS[transaction.type] ?? transaction.type : ''

  return (
    <Modal
      open={!!transaction}
      title="Transaktion bearbeiten"
      subtitle={transaction ? `${typeLabel}${transaction.symbol && transaction.symbol !== 'CASH' ? ` · ${transaction.symbol}` : ''}` : ''}
      onClose={handleClose}
    >
      {transaction && (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.15] px-4 py-2.5 text-[11px] text-amber-300/80 leading-relaxed">
            Änderungen an Transaktionen synchronisieren sich <span className="font-semibold">nicht</span> automatisch mit deinen Holdings. Kontrolliere bei Bedarf die Position separat.
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!isCashType && (
              <Field label="Menge">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={setQuantity}
                />
              </Field>
            )}
            <Field label={isCashType ? 'Betrag' : 'Preis pro Stück'} suffix="€">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum">
              <Input type="date" value={date} onChange={setDate} max={todayISO()} />
            </Field>
            <Field label="Gebühren (optional)" suffix="€">
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={fee}
                onChange={setFee}
              />
            </Field>
          </div>

          <Field label="Notiz (optional)">
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 200))}
              placeholder="z.B. Broker-ID, Quellensteuer-Hinweis"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors"
            />
          </Field>

          {preview !== null && preview > 0 && (
            <div className="text-[11px] text-white/40 px-1">
              Transaktionsvolumen:{' '}
              <span className="text-white/80 font-medium tabular-nums">
                {formatCurrency(preview)}
              </span>
            </div>
          )}

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
              {saving ? 'Speichere…' : 'Speichern'}
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
