// src/components/portfolio/activity-forms/BuyForm.tsx
'use client'

import React, { useState } from 'react'
import SearchTickerInput from '@/components/SearchTickerInput'
import Logo from '@/components/Logo'
import { stocks } from '@/data/stocks'
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
  isPremium,
  holdingsCount,
  maxFreePositions,
  onAddPosition,
  onTopUpPosition,
  formatCurrency,
  formatStockPrice,
  onSuccess,
  onPremiumRequired
}: BuyFormProps) {
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null)
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [fees, setFees] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Erkennen ob die Aktie schon im Portfolio ist
  const existingHolding = selectedStock
    ? holdings.find(h => h.symbol === selectedStock.symbol)
    : null

  const isTopUp = !!existingHolding

  const handleSubmit = async () => {
    if (!selectedStock || !quantity || !purchasePrice) return

    // Premium-Check nur bei neuen Positionen
    if (!isTopUp && !isPremium && holdingsCount >= maxFreePositions) {
      onPremiumRequired()
      return
    }

    setSubmitting(true)
    try {
      // Duplikat-Prüfung
      const qty = parseFloat(quantity)
      const prc = parseFloat(purchasePrice)
      const duplicate = await checkDuplicateTransaction({
        portfolioId,
        type: 'buy',
        symbol: selectedStock.symbol,
        date: purchaseDate,
        quantity: qty,
        price: prc + ((parseFloat(fees) || 0) / qty),
      })
      if (duplicate) {
        const confirmed = window.confirm(
          `Eine ähnliche Transaktion existiert bereits:\n` +
          `${selectedStock.symbol} — ${qty} Stk. @ ${prc.toFixed(2)}€ am ${new Date(purchaseDate).toLocaleDateString('de-DE')}\n\n` +
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
          fees: parseFloat(fees) || 0
        })
      } else {
        await onAddPosition({
          stock: selectedStock,
          quantity: qty,
          purchasePrice: prc,
          purchaseDate,
          fees: parseFloat(fees) || 0
        })
      }
      onSuccess()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Vorschau gewichteter Durchschnitt bei Aufstockung
  const topUpPreview = isTopUp && existingHolding && quantity && purchasePrice
    ? (() => {
        const newQty = parseFloat(quantity)
        const newPrice = parseFloat(purchasePrice) + ((parseFloat(fees) || 0) / newQty)
        const totalQty = existingHolding.quantity + newQty
        const avgPrice = ((existingHolding.quantity * existingHolding.purchase_price) + (newQty * newPrice)) / totalQty
        return { totalQty, avgPrice }
      })()
    : null

  return (
    <div className="space-y-4">
      {/* Aktiensuche */}
      <div>
        <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-2">Aktie suchen</label>
        <SearchTickerInput
          onSelect={(ticker) => {
            const stock = stocks.find(s => s.ticker === ticker)
            if (stock) setSelectedStock({ symbol: stock.ticker, name: stock.name })
          }}
          placeholder="z.B. AAPL oder Apple"
          className="w-full"
          inputClassName="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          dropdownClassName="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          itemClassName="px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-200 dark:border-neutral-800 last:border-0 text-neutral-900 dark:text-white cursor-pointer"
        />
      </div>

      {/* Ausgewaehlte Aktie */}
      {selectedStock && (
        <div className={`p-3 rounded-lg border ${isTopUp ? 'bg-blue-500/10 border-blue-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <div className="flex items-center gap-3">
            <Logo ticker={selectedStock.symbol} alt={selectedStock.symbol} className="w-8 h-8" padding="none" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-neutral-900 dark:text-white text-sm">{selectedStock.symbol}</span>
                {isTopUp && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">
                    Aufstocken
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">{selectedStock.name}</p>
            </div>
            <button
              onClick={() => setSelectedStock(null)}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Ändern
            </button>
          </div>
          {isTopUp && existingHolding && (
            <div className="mt-2 pt-2 border-t border-blue-500/20 flex items-center gap-2 text-xs text-blue-400">
              <InformationCircleIcon className="w-3.5 h-3.5" />
              <span>Bereits {existingHolding.quantity} Stk. im Portfolio (Ø {formatStockPrice(existingHolding.purchase_price_display)})</span>
            </div>
          )}
        </div>
      )}

      {selectedStock && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Anzahl</label>
              <input
                type="number" min="0" step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Kaufpreis (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="150,00"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Gebühren (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 dark:text-neutral-400 mb-1">Kaufdatum</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Zusammenfassung */}
          {quantity && purchasePrice && (
            <div className="bg-neutral-100 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Investition</span>
                <span className="text-neutral-900 dark:text-white font-medium">
                  {formatCurrency(parseFloat(quantity) * parseFloat(purchasePrice))}
                </span>
              </div>
              {fees && parseFloat(fees) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Gebühren</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{formatCurrency(parseFloat(fees))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-1.5 border-t border-neutral-200 dark:border-neutral-700/50">
                <span className="text-neutral-500">Gesamt</span>
                <span className="text-neutral-900 dark:text-white font-semibold">
                  {formatCurrency((parseFloat(quantity) * parseFloat(purchasePrice)) + (parseFloat(fees) || 0))}
                </span>
              </div>

              {/* Aufstocken-Vorschau */}
              {topUpPreview && (
                <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-700/50 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-500">Neue Gesamtmenge</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{topUpPreview.totalQty} Stk.</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-500">Neuer Ø Preis</span>
                    <span className="text-neutral-900 dark:text-white font-medium">{formatStockPrice(topUpPreview.avgPrice)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !quantity || !purchasePrice}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {submitting ? (
              <><ArrowPathIcon className="w-4 h-4 animate-spin" />Wird hinzugefügt...</>
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
