'use client'

import React, { useEffect, useState } from 'react'
import type { Holding } from '@/hooks/usePortfolio'
import Logo from '@/components/Logo'
import { ArrowPathIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface TopUpPositionModalProps {
  holding: Holding | null
  onClose: () => void
  onTopUp: (
    holding: Holding,
    params: { quantity: number; price: number; date: string; fees?: number }
  ) => Promise<void>
  formatStockPrice: (price: number) => string
}

export default function TopUpPositionModal({ holding, onClose, onTopUp, formatStockPrice }: TopUpPositionModalProps) {
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [fees, setFees] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (holding) {
      setQuantity('')
      setPrice('')
      setFees('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [holding])

  if (!holding) return null

  const handleTopUp = async () => {
    if (!quantity || !price) return
    setSaving(true)
    try {
      await onTopUp(holding, {
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        date,
        fees: parseFloat(fees) || 0,
      })
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="terminal-glass-strong rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-theme-primary">Position aufstocken</h2>
          <button onClick={onClose} className="p-1 hover:bg-theme-hover rounded transition-colors">
            <XMarkIcon className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>
        <div className="bg-theme-secondary rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Logo ticker={holding.symbol} alt={holding.symbol} className="w-10 h-10" padding="none" />
            <div>
              <div className="font-semibold text-theme-primary">{holding.symbol}</div>
              <div className="text-sm text-theme-muted">{holding.name}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-theme-muted">Aktuelle Menge</p>
              <p className="font-semibold text-theme-primary">{holding.quantity} Stück</p>
            </div>
            <div>
              <p className="text-theme-muted">Ø Kaufpreis</p>
              <p className="font-semibold text-theme-primary">{formatStockPrice(holding.purchase_price_display)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Zusätzliche Anzahl</label>
            <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="z.B. 5"
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Kaufpreis pro Aktie (EUR)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="z.B. 495.00"
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Gebühren (optional, EUR)</label>
            <input type="number" min="0" step="0.01" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">Kaufdatum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400 focus:border-transparent" />
          </div>
          {quantity && price && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-sm text-emerald-400 font-medium mb-2">Nach Aufstockung:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-theme-muted">Neue Menge</p>
                  <p className="font-semibold text-theme-primary">{(holding.quantity + parseFloat(quantity || '0')).toFixed(0)} Stück</p>
                </div>
                <div>
                  <p className="text-theme-muted">Neuer Ø Preis</p>
                  <p className="font-semibold text-theme-primary">
                    {formatStockPrice(
                      ((holding.quantity * holding.purchase_price_display) +
                       (parseFloat(quantity || '0') * parseFloat(price || '0'))) /
                      (holding.quantity + parseFloat(quantity || '0'))
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={handleTopUp} disabled={saving || !quantity || !price}
              className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving ? <><ArrowPathIcon className="w-4 h-4 animate-spin" />Aufstocken...</> : <><PlusIcon className="w-4 h-4" />Aufstocken</>}
            </button>
            <button onClick={onClose} disabled={saving}
              className="flex-1 py-2 border border-theme hover:bg-theme-hover disabled:opacity-50 text-theme-primary rounded-lg transition-colors">
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
