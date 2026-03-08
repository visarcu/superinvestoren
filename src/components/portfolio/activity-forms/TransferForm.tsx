// src/components/portfolio/activity-forms/TransferForm.tsx
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
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null)
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Bei Ausbuchung: Nur existierende Holdings anzeigen
  const existingHolding = selectedStock
    ? holdings.find(h => h.symbol === selectedStock.symbol)
    : null

  const handleSelectExistingHolding = (holding: Holding) => {
    setSelectedStock({ symbol: holding.symbol, name: holding.name })
    // Bei Ausbuchung: Einstandskurs als Default
    if (direction === 'out') {
      setPrice(holding.purchase_price.toFixed(2))
      setQuantity(holding.quantity.toString())
    }
  }

  const handleSubmit = async () => {
    if (!selectedStock || !quantity || !price) return

    setSubmitting(true)
    try {
      const qty = parseFloat(quantity)
      const prc = parseFloat(price)
      const txType = direction === 'in' ? 'transfer_in' : 'transfer_out'

      // Duplikat-Prüfung
      const duplicate = await checkDuplicateTransaction({
        portfolioId,
        type: txType,
        symbol: selectedStock.symbol,
        date,
        quantity: qty,
        price: prc,
      })
      if (duplicate) {
        const label = direction === 'in' ? 'Einbuchung' : 'Ausbuchung'
        const confirmed = window.confirm(
          `Eine ähnliche ${label} existiert bereits:\n` +
          `${selectedStock.symbol} — ${qty} Stk. @ ${prc.toFixed(2)}€ am ${new Date(date).toLocaleDateString('de-DE')}\n\n` +
          `Trotzdem hinzufügen?`
        )
        if (!confirmed) {
          setSubmitting(false)
          return
        }
      }

      await onAddTransfer({
        direction,
        stock: selectedStock,
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

  return (
    <div className="space-y-4">
      {/* Hinweis */}
      <div className={`p-3 rounded-lg border text-xs ${
        direction === 'in'
          ? 'bg-violet-500/5 border-violet-500/20 text-violet-300'
          : 'bg-orange-500/5 border-orange-500/20 text-orange-300'
      }`}>
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {direction === 'in'
              ? 'Einbuchung: Aktien von einem anderen Depot hierhin übertragen. Der Einstandskurs wird als Kaufpreis übernommen.'
              : 'Ausbuchung: Aktien von diesem Depot zu einem anderen übertragen. Es wird kein Gewinn/Verlust realisiert.'
            }
          </p>
        </div>
      </div>

      {/* Aktienauswahl */}
      {direction === 'out' ? (
        // Bei Ausbuchung: Aus bestehenden Holdings wählen
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Position auswählen</label>
          {holdings.length === 0 ? (
            <p className="text-sm text-neutral-500">Keine Positionen im Depot</p>
          ) : selectedStock ? (
            <div className="p-3 rounded-lg border bg-orange-500/10 border-orange-500/30">
              <div className="flex items-center gap-3">
                <Logo ticker={selectedStock.symbol} alt={selectedStock.symbol} className="w-8 h-8" padding="none" />
                <div className="flex-1">
                  <span className="font-semibold text-neutral-900 dark:text-white text-sm">{selectedStock.symbol}</span>
                  <p className="text-xs text-neutral-500">{selectedStock.name}</p>
                </div>
                <button onClick={() => setSelectedStock(null)} className="text-xs text-neutral-400 hover:text-neutral-200">
                  Ändern
                </button>
              </div>
              {existingHolding && (
                <div className="mt-2 pt-2 border-t border-orange-500/20 text-xs text-orange-400">
                  Bestand: {existingHolding.quantity} Stk. · Ø {formatStockPrice(existingHolding.purchase_price_display)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {holdings.filter(h => h.symbol !== 'CASH').map(h => (
                <button
                  key={h.id}
                  onClick={() => handleSelectExistingHolding(h)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-neutral-700/50 hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors text-left"
                >
                  <Logo ticker={h.symbol} alt={h.symbol} className="w-7 h-7" padding="none" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{h.symbol}</span>
                    <p className="text-xs text-neutral-500 truncate">{h.name}</p>
                  </div>
                  <span className="text-xs text-neutral-400">{h.quantity} Stk.</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Bei Einbuchung: Aktiensuche (wie BuyForm)
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">Aktie suchen</label>
          {selectedStock ? (
            <div className="p-3 rounded-lg border bg-violet-500/10 border-violet-500/30">
              <div className="flex items-center gap-3">
                <Logo ticker={selectedStock.symbol} alt={selectedStock.symbol} className="w-8 h-8" padding="none" />
                <div className="flex-1">
                  <span className="font-semibold text-neutral-900 dark:text-white text-sm">{selectedStock.symbol}</span>
                  <p className="text-xs text-neutral-500">{selectedStock.name}</p>
                </div>
                <button onClick={() => setSelectedStock(null)} className="text-xs text-neutral-400 hover:text-neutral-200">
                  Ändern
                </button>
              </div>
              {existingHolding && (
                <div className="mt-2 pt-2 border-t border-violet-500/20 flex items-center gap-2 text-xs text-violet-400">
                  <InformationCircleIcon className="w-3.5 h-3.5" />
                  <span>Bereits {existingHolding.quantity} Stk. im Portfolio (Ø {formatStockPrice(existingHolding.purchase_price_display)})</span>
                </div>
              )}
            </div>
          ) : (
            <SearchTickerInput
              onSelect={(ticker) => {
                const stock = stocks.find(s => s.ticker === ticker)
                if (stock) setSelectedStock({ symbol: stock.ticker, name: stock.name })
              }}
              placeholder="z.B. AAPL oder Apple"
              className="w-full"
              inputClassName="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              dropdownClassName="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              itemClassName="px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-200 dark:border-neutral-800 last:border-0 text-neutral-900 dark:text-white cursor-pointer"
            />
          )}
        </div>
      )}

      {/* Felder nur anzeigen wenn Aktie gewählt */}
      {selectedStock && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Anzahl</label>
              <input
                type="number" min="0" step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={direction === 'out' && existingHolding ? existingHolding.quantity.toString() : '100'}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Einstandskurs (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={existingHolding ? existingHolding.purchase_price.toFixed(2) : '0.00'}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Notiz (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={direction === 'in' ? 'z.B. Übertrag von Trade Republic' : 'z.B. Übertrag zu Scalable Capital'}
              className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-neutral-500"
            />
          </div>

          {/* Ausbuchung Warnung: Mehr als verfügbar */}
          {direction === 'out' && existingHolding && parseFloat(quantity) > existingHolding.quantity && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              Achtung: Mehr Stücke als im Bestand ({existingHolding.quantity} Stk.)
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedStock || !quantity || !price}
            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
              direction === 'in'
                ? 'bg-violet-600 hover:bg-violet-700 text-white disabled:bg-neutral-800 disabled:text-neutral-600'
                : 'bg-orange-600 hover:bg-orange-700 text-white disabled:bg-neutral-800 disabled:text-neutral-600'
            }`}
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
