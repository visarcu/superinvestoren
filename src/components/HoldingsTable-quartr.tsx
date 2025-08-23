// src/components/HoldingsTable-quartr.tsx - QUARTR-STYLE HOLDINGS TABLE
'use client'

import React from 'react'
import { 
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PencilIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Holding {
  id: string
  symbol: string
  name: string
  quantity: number
  purchase_price_display: number
  current_price_display: number
  currency_aware?: boolean
}

interface HoldingsTableProps {
  holdings: Holding[]
  onAddPosition: () => void
  onEditHolding: (holding: Holding) => void
  onDeleteHolding: (holding: Holding) => void
  onViewStock: (symbol: string) => void
  formatStockPrice: (price: number) => string
  formatCurrency: (amount: number) => string
}

export default function HoldingsTableQuartr({ 
  holdings, 
  onAddPosition,
  onEditHolding,
  onDeleteHolding,
  onViewStock,
  formatStockPrice,
  formatCurrency
}: HoldingsTableProps) {
  
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Portfolio Holdings</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {holdings.length} Positionen
          </p>
        </div>
        <button 
          onClick={onAddPosition}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          Position hinzufügen
        </button>
      </div>

      {holdings.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-zinc-800/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Unternehmen
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Anzahl
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Ø Kaufpreis
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Aktueller Preis
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Marktwert
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Gewinn/Verlust
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {holdings.map((holding) => {
                const currentValue = holding.quantity * holding.current_price_display
                const purchaseValue = holding.quantity * holding.purchase_price_display
                const gainLoss = currentValue - purchaseValue
                const gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0
                
                return (
                  <tr key={holding.id} className="hover:bg-neutral-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                            {holding.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-neutral-900 dark:text-white">
                            {holding.symbol}
                          </p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                            {holding.name}
                          </p>
                          {holding.currency_aware && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span className="text-xs text-blue-500">Währungsangepasst</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="text-right px-6 py-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {holding.quantity.toLocaleString('de-DE')}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Aktien</p>
                    </td>
                    
                    <td className="text-right px-6 py-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {formatStockPrice(holding.purchase_price_display)}
                      </p>
                    </td>
                    
                    <td className="text-right px-6 py-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {formatStockPrice(holding.current_price_display)}
                      </p>
                    </td>
                    
                    <td className="text-right px-6 py-4">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(currentValue)}
                      </p>
                    </td>
                    
                    <td className="text-right px-6 py-4">
                      <div className="space-y-1">
                        <p className={`font-semibold ${gainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(gainLoss)}
                        </p>
                        <div className={`text-sm flex items-center justify-end gap-1 ${gainLossPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {gainLossPercent >= 0 ? (
                            <ArrowTrendingUpIcon className="w-3 h-3" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-3 h-3" />
                          )}
                          {Math.abs(gainLossPercent).toFixed(2)}%
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onViewStock(holding.symbol)}
                          className="p-1.5 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                          title="Aktie analysieren"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditHolding(holding)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                          title="Position bearbeiten"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteHolding(holding)}
                          className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          title="Position löschen"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusIcon className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Keine Positionen
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Fügen Sie Ihre erste Position hinzu, um mit der Portfolio-Analyse zu beginnen.
          </p>
          <button 
            onClick={onAddPosition}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Position hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}