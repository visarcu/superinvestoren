'use client'

import React, { useMemo, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from './Modal'
import TickerSearch, { type SearchedStock } from './TickerSearch'

interface AddActivityModalProps {
  open: boolean
  onClose: () => void
  /** Vorausgewählter Activity-Typ (Default: 'sell') */
  defaultActivity?: ActivityType
  /** Vorausgewähltes Holding (z.B. wenn aus Stock-Detail-Page geöffnet) */
  defaultHoldingId?: string
}

type ActivityType = 'sell' | 'topup' | 'dividend' | 'cash' | 'transfer'

const ACTIVITIES: { key: ActivityType; label: string }[] = [
  { key: 'sell', label: 'Verkauf' },
  { key: 'topup', label: 'Aufstocken' },
  { key: 'dividend', label: 'Dividende' },
  { key: 'cash', label: 'Cash' },
  { key: 'transfer', label: 'Transfer' },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AddActivityModal({
  open,
  onClose,
  defaultActivity = 'sell',
  defaultHoldingId,
}: AddActivityModalProps) {
  const {
    holdings,
    portfolio,
    sellPosition,
    topUpPosition,
    addDividend,
    addCash,
    addTransfer,
    formatCurrency,
  } = usePortfolio()

  const [activity, setActivity] = useState<ActivityType>(defaultActivity)
  const [holdingId, setHoldingId] = useState<string>(defaultHoldingId ?? '')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [fees, setFees] = useState('')
  const [date, setDate] = useState(todayISO())
  const [cashDirection, setCashDirection] = useState<'deposit' | 'withdraw'>('deposit')
  const [transferDirection, setTransferDirection] = useState<'in' | 'out'>('in')
  const [transferStock, setTransferStock] = useState<SearchedStock | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedHolding = useMemo(
    () => holdings.find(h => h.id === holdingId),
    [holdings, holdingId]
  )

  const reset = () => {
    setHoldingId(defaultHoldingId ?? '')
    setQuantity('')
    setPrice('')
    setAmount('')
    setFees('')
    setDate(todayISO())
    setTransferStock(null)
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const switchActivity = (a: ActivityType) => {
    if (saving) return
    setActivity(a)
    setError(null)
  }

  const submit = async () => {
    setError(null)
    setSaving(true)
    try {
      switch (activity) {
        case 'sell': {
          if (!selectedHolding) throw new Error('Position auswählen')
          const qty = parseFloat(quantity.replace(',', '.'))
          const px = parseFloat(price.replace(',', '.'))
          if (isNaN(qty) || qty <= 0) throw new Error('Stückzahl ungültig')
          if (qty > selectedHolding.quantity)
            throw new Error(`Maximal ${selectedHolding.quantity} Stk. verkaufbar`)
          if (isNaN(px) || px <= 0) throw new Error('Verkaufspreis ungültig')
          await sellPosition(selectedHolding.id, { quantity: qty, price: px, date })
          break
        }
        case 'topup': {
          if (!selectedHolding) throw new Error('Position auswählen')
          const qty = parseFloat(quantity.replace(',', '.'))
          const px = parseFloat(price.replace(',', '.'))
          const fee = fees ? parseFloat(fees.replace(',', '.')) : 0
          if (isNaN(qty) || qty <= 0) throw new Error('Stückzahl ungültig')
          if (isNaN(px) || px <= 0) throw new Error('Kaufpreis ungültig')
          if (isNaN(fee) || fee < 0) throw new Error('Gebühren ungültig')
          await topUpPosition(selectedHolding, { quantity: qty, price: px, date, fees: fee })
          break
        }
        case 'dividend': {
          if (!selectedHolding) throw new Error('Position auswählen')
          const amt = parseFloat(amount.replace(',', '.'))
          if (isNaN(amt) || amt <= 0) throw new Error('Betrag ungültig')
          await addDividend(selectedHolding.id, { amount: amt, date })
          break
        }
        case 'cash': {
          const amt = parseFloat(amount.replace(',', '.'))
          if (isNaN(amt) || amt <= 0) throw new Error('Betrag ungültig')
          const signed = cashDirection === 'deposit' ? amt : -amt
          await addCash(signed, date)
          break
        }
        case 'transfer': {
          if (!transferStock) throw new Error('Aktie auswählen')
          const qty = parseFloat(quantity.replace(',', '.'))
          const px = parseFloat(price.replace(',', '.'))
          if (isNaN(qty) || qty <= 0) throw new Error('Stückzahl ungültig')
          if (isNaN(px) || px <= 0) throw new Error('Kurs ungültig')
          await addTransfer({
            direction: transferDirection,
            stock: { symbol: transferStock.ticker, name: transferStock.name },
            quantity: qty,
            price: px,
            date,
          })
          break
        }
      }
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Aktivität hinzufügen"
      subtitle={portfolio ? `In Depot: ${portfolio.name}` : 'Wähle ein Depot'}
      onClose={handleClose}
      size="md"
    >
      {/* Activity-Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1 mb-5 overflow-x-auto">
        {ACTIVITIES.map(a => (
          <button
            key={a.key}
            onClick={() => switchActivity(a.key)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors whitespace-nowrap ${
              activity === a.key
                ? 'bg-white/[0.08] text-white'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* Sell + TopUp + Dividend brauchen Position-Auswahl */}
        {(activity === 'sell' || activity === 'topup' || activity === 'dividend') && (
          <Field label="Position">
            {holdings.length === 0 ? (
              <p className="text-[12px] text-white/30 px-1">Noch keine Positionen vorhanden.</p>
            ) : (
              <select
                value={holdingId}
                onChange={e => setHoldingId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/[0.15] transition-colors"
              >
                <option value="">Bitte wählen…</option>
                {holdings.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.symbol} — {h.name} ({h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.)
                  </option>
                ))}
              </select>
            )}
            {selectedHolding && (
              <p className="text-[10px] text-white/30 mt-1">
                Aktueller Bestand: {selectedHolding.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk. ·
                Wert {formatCurrency(selectedHolding.value)}
              </p>
            )}
          </Field>
        )}

        {/* Sell-spezifisch */}
        {activity === 'sell' && selectedHolding && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Verkaufte Stückzahl">
              <Input
                type="number"
                value={quantity}
                onChange={setQuantity}
                placeholder={`max ${selectedHolding.quantity}`}
                step="any"
                min="0"
                max={String(selectedHolding.quantity)}
              />
            </Field>
            <Field label="Verkaufspreis je Stück" suffix="€">
              <Input
                type="number"
                value={price}
                onChange={setPrice}
                placeholder="z.B. 145,30"
                step="any"
                min="0"
              />
            </Field>
          </div>
        )}

        {/* TopUp-spezifisch */}
        {activity === 'topup' && selectedHolding && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zusätzliche Stückzahl">
                <Input type="number" value={quantity} onChange={setQuantity} placeholder="z.B. 5" step="any" min="0" />
              </Field>
              <Field label="Kaufpreis je Stück" suffix="€">
                <Input type="number" value={price} onChange={setPrice} placeholder="z.B. 145,30" step="any" min="0" />
              </Field>
            </div>
            <Field label="Gebühren (optional)" suffix="€">
              <Input type="number" value={fees} onChange={setFees} placeholder="0,00" step="any" min="0" />
            </Field>
          </>
        )}

        {/* Dividend-spezifisch */}
        {activity === 'dividend' && selectedHolding && (
          <Field label="Dividenden-Betrag (Brutto)" suffix="€">
            <Input type="number" value={amount} onChange={setAmount} placeholder="z.B. 12,50" step="any" min="0" />
          </Field>
        )}

        {/* Cash-spezifisch */}
        {activity === 'cash' && (
          <>
            <Field label="Richtung">
              <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setCashDirection('deposit')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    cashDirection === 'deposit' ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/30'
                  }`}
                >
                  + Einzahlung
                </button>
                <button
                  type="button"
                  onClick={() => setCashDirection('withdraw')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    cashDirection === 'withdraw' ? 'bg-red-500/15 text-red-400' : 'text-white/30'
                  }`}
                >
                  − Auszahlung
                </button>
              </div>
            </Field>
            <Field label="Betrag" suffix="€">
              <Input type="number" value={amount} onChange={setAmount} placeholder="z.B. 1.000,00" step="any" min="0" />
            </Field>
          </>
        )}

        {/* Transfer-spezifisch */}
        {activity === 'transfer' && (
          <>
            <Field label="Richtung">
              <div className="flex items-center gap-1 bg-white/[0.02] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setTransferDirection('in')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    transferDirection === 'in' ? 'bg-blue-500/15 text-blue-400' : 'text-white/30'
                  }`}
                >
                  ← Einbuchung (Eingehender Übertrag)
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDirection('out')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                    transferDirection === 'out' ? 'bg-rose-500/15 text-rose-400' : 'text-white/30'
                  }`}
                >
                  → Ausbuchung
                </button>
              </div>
            </Field>
            <Field label="Aktie">
              <TickerSearch selected={transferStock} onSelect={setTransferStock} onClear={() => setTransferStock(null)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stückzahl">
                <Input type="number" value={quantity} onChange={setQuantity} placeholder="z.B. 10" step="any" min="0" />
              </Field>
              <Field label="Historischer Kurs" suffix="€">
                <Input type="number" value={price} onChange={setPrice} placeholder="z.B. 145,30" step="any" min="0" />
              </Field>
            </div>
          </>
        )}

        {/* Datum für alle */}
        <Field label="Datum">
          <Input type="date" value={date} onChange={setDate} max={todayISO()} />
        </Field>

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
            onClick={submit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? 'Speichere…' : 'Hinzufügen'}
          </button>
        </div>
      </div>
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
      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/15 focus:outline-none focus:border-white/[0.15] transition-colors tabular-nums"
    />
  )
}
