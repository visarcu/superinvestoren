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
      const qty = parseFloat(quantity)
      const prc = parseFloat(sellPrice)

      // Duplikat-Prüfung
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

  const sellQuantity = parseFloat(quantity) || 0
  const sellPriceNum = parseFloat(sellPrice) || 0
  const isFullSell = selectedHolding && sellQuantity >= selectedHolding.quantity
  const gainLoss = selectedHolding && sellQuantity > 0 && sellPriceNum > 0
    ? (sellPriceNum - selectedHolding.purchase_price_display) * sellQuantity
    : null

  return (
    <div className="space-y-4">
      {/* Position waehlen */}
      <div>
        <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-2">Position</label>

        {/* Ausgewählte Position */}
        {selectedHolding && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/50 bg-red-500/5">
            <Logo ticker={selectedHolding.symbol} alt={selectedHolding.symbol} className="w-7 h-7" padding="none" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-neutral-900 dark:text-white text-sm">{selectedHolding.symbol}</span>
              <p className="text-xs text-neutral-500 truncate">{selectedHolding.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm text-neutral-900 dark:text-white">{selectedHolding.quantity} Stk.</p>
                <p className="text-xs text-neutral-500">Ø {formatStockPrice(selectedHolding.purchase_price_display)}</p>
              </div>
              <button
                onClick={() => { setSelectedHoldingId(''); setQuantity(''); setSellPrice('') }}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-1 rounded hover:bg-neutral-800/30"
              >
                Ändern
              </button>
            </div>
          </div>
        )}

        {/* Auswahlliste — nur sichtbar wenn noch nichts gewählt */}
        {!selectedHolding && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {holdings.map(h => (
              <button
                key={h.id}
                onClick={() => { setSelectedHoldingId(h.id); setQuantity(''); setSellPrice('') }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/50 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all text-left"
              >
                <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">{h.symbol}</span>
                  <p className="text-xs text-neutral-500 truncate">{h.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-900 dark:text-white">{h.quantity} Stk.</p>
                  <p className="text-xs text-neutral-500">Ø {formatStockPrice(h.purchase_price_display)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedHolding && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">
                Anzahl <span className="text-neutral-500">(max {selectedHolding.quantity})</span>
              </label>
              <input
                type="number"
                min="1"
                max={selectedHolding.quantity}
                step="1"
                value={quantity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (val > selectedHolding.quantity) {
                    setQuantity(selectedHolding.quantity.toString())
                  } else {
                    setQuantity(e.target.value)
                  }
                }}
                placeholder={selectedHolding.quantity.toString()}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Verkaufspreis (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Verkaufsdatum</label>
            <input
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-400 focus:border-transparent"
            />
          </div>

          {/* Zusammenfassung */}
          {quantity && sellPrice && (
            <div className="bg-neutral-100 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Erloes</span>
                <span className="text-neutral-900 dark:text-white font-medium">
                  {formatCurrency(sellQuantity * sellPriceNum)}
                </span>
              </div>
              {gainLoss !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">G/V</span>
                  <span className={`font-medium ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                  </span>
                </div>
              )}
              {isFullSell && (
                <p className="text-xs text-amber-400 mt-1">Position wird vollstaendig verkauft</p>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !quantity || !sellPrice || sellQuantity <= 0}
            className="w-full py-2.5 bg-red-500 hover:bg-red-400 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird verkauft...</>
            ) : (
              <><CheckIcon className="w-4 h-4" />{isFullSell ? 'Vollverkauf' : 'Verkaufen'}</>
            )}
          </button>
        </>
      )}
    </div>
  )
}
