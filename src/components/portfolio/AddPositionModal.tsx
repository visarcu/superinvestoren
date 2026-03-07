// src/components/portfolio/AddPositionModal.tsx
'use client'

import React, { useState } from 'react'
import SearchTickerInput from '@/components/SearchTickerInput'
import { stocks } from '@/data/stocks'
import {
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

interface AddPositionModalProps {
  isOpen: boolean
  onClose: () => void
  onAddStock: (params: {
    stock: { symbol: string; name: string }
    quantity: number
    purchasePrice: number
    purchaseDate: string
    fees?: number
  }) => Promise<void>
  onAddCash: (amount: number) => Promise<void>
  formatCurrency: (amount: number) => string
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onAddStock,
  onAddCash,
  formatCurrency
}: AddPositionModalProps) {
  const [positionType, setPositionType] = useState<'stock' | 'cash'>('stock')
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null)
  const [quantity, setQuantity] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [fees, setFees] = useState('')
  const [cashAmount, setCashAmount] = useState('')
  const [adding, setAdding] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setSelectedStock(null)
    setQuantity('')
    setPurchasePrice('')
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setFees('')
    setCashAmount('')
    setPositionType('stock')
  }

  const handleSubmit = async () => {
    setAdding(true)
    try {
      if (positionType === 'stock') {
        if (!selectedStock || !quantity || !purchasePrice) return
        await onAddStock({
          stock: selectedStock,
          quantity: parseFloat(quantity),
          purchasePrice: parseFloat(purchasePrice),
          purchaseDate,
          fees: parseFloat(fees) || 0
        })
      } else {
        if (!cashAmount) return
        await onAddCash(parseFloat(cashAmount))
      }
      reset()
      onClose()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setAdding(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Position hinzufügen</h2>
          <button onClick={handleClose} className="p-1 hover:bg-neutral-800/30 rounded transition-colors">
            <XMarkIcon className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-3">Was möchtest du hinzufügen?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPositionType('stock')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  positionType === 'stock'
                    ? 'border-green-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-neutral-700 hover:border-neutral-600 text-neutral-400'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <ChartBarIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">Aktie</span>
                </div>
              </button>
              <button
                onClick={() => setPositionType('cash')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  positionType === 'cash'
                    ? 'border-green-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-neutral-700 hover:border-neutral-600 text-neutral-400'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  <span className="font-medium text-sm">Cash</span>
                </div>
              </button>
            </div>
          </div>

          {positionType === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-2">Cash-Betrag (EUR)</label>
              <input
                type="number" min="0" step="0.01"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="1.000,00"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
          )}

          {positionType === 'stock' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Aktie suchen</label>
                <SearchTickerInput
                  onSelect={(ticker) => {
                    const stock = stocks.find(s => s.ticker === ticker)
                    if (stock) setSelectedStock({ symbol: stock.ticker, name: stock.name })
                  }}
                  placeholder="z.B. AAPL oder Apple"
                  className="w-full"
                  inputClassName="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-theme-muted"
                  dropdownClassName="absolute z-10 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  itemClassName="px-4 py-3 hover:bg-neutral-800/50 transition-colors border-b border-neutral-800 last:border-0 text-white cursor-pointer"
                />
              </div>

              {selectedStock && (
                <div className="p-3 bg-emerald-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-sm text-emerald-400">Ausgewählt:</p>
                      <p className="font-semibold text-white">{selectedStock.symbol} - {selectedStock.name}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Anzahl</label>
                <input
                  type="number" min="0" step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Kaufpreis pro Aktie (EUR)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="150,00"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Gebühren (optional, EUR)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Kaufdatum</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Zusammenfassung vor Bestätigung */}
          {positionType === 'stock' && selectedStock && quantity && purchasePrice && (
            <div className="bg-neutral-800/30 border border-neutral-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">Investition</span>
                <span className="text-white font-medium">
                  {formatCurrency(parseFloat(quantity) * parseFloat(purchasePrice))}
                </span>
              </div>
              {fees && parseFloat(fees) > 0 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-neutral-400">Gebühren</span>
                  <span className="text-neutral-300">{formatCurrency(parseFloat(fees))}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-neutral-700/50">
                <span className="text-neutral-400">Gesamt</span>
                <span className="text-white font-semibold">
                  {formatCurrency((parseFloat(quantity) * parseFloat(purchasePrice)) + (parseFloat(fees) || 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={adding || (positionType === 'stock' && (!selectedStock || !quantity || !purchasePrice))}
              className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {adding ? (
                <><ArrowPathIcon className="w-4 h-4 animate-spin" />Hinzufügen...</>
              ) : (
                'Position hinzufügen'
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={adding}
              className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
