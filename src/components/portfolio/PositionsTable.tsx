// src/components/portfolio/PositionsTable.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { type Holding } from '@/hooks/usePortfolio'
import {
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface PositionsTableProps {
  holdings: Holding[]
  cashPosition: number
  totalValue: number
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  formatPercentage: (value: number) => string
  onAddPosition: () => void
  onEditPosition: (holding: Holding) => void
  onDeletePosition: (holdingId: string) => void
  onTopUpPosition: (holding: Holding) => void
  onEditCash: () => void
  isAllDepotsView: boolean
}

export default function PositionsTable({
  holdings,
  cashPosition,
  totalValue,
  formatCurrency,
  formatStockPrice,
  formatPercentage,
  onAddPosition,
  onEditPosition,
  onDeletePosition,
  onTopUpPosition,
  onEditCash,
  isAllDepotsView
}: PositionsTableProps) {
  const router = useRouter()
  const sortedHoldings = [...holdings].sort((a, b) => b.value - a.value)

  const handleViewStock = (symbol: string) => {
    router.push(`/analyse/stocks/${symbol.toLowerCase()}`)
  }

  if (holdings.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-xl flex items-center justify-center">
          <BriefcaseIcon className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-base font-medium text-white mb-1">Keine Positionen</h3>
        <p className="text-neutral-500 text-sm mb-4">Füge deine erste Aktie hinzu</p>
        <button
          onClick={onAddPosition}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Position hinzufügen
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-400">Positionen</h2>
        {!isAllDepotsView && (
          <button
            onClick={onAddPosition}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Position</span>
          </button>
        )}
      </div>

      {/* Table Header */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-2 mb-2 text-xs text-neutral-500 font-medium">
        <div className="col-span-5">Aktie</div>
        <div className="col-span-2 text-right">Kurs</div>
        <div className="col-span-2 text-right">Wert</div>
        <div className="col-span-2 text-right">G/V</div>
        <div className="col-span-1"></div>
      </div>

      {/* Positions List */}
      <div className="space-y-0">
        {sortedHoldings.map((holding, index) => {
          const percentage = totalValue > 0 ? (holding.value / totalValue) * 100 : 0

          return (
            <div
              key={holding.id}
              className="group flex items-center justify-between py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
              onClick={() => handleViewStock(holding.symbol)}
            >
              {/* Left: Logo + Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="w-5 text-xs text-neutral-600 font-medium hidden sm:block">{index + 1}</span>
                <Logo ticker={holding.symbol} alt={holding.symbol} className="w-8 h-8" padding="none" />
                <div className="min-w-0">
                  <span className="font-medium text-white text-sm">{holding.symbol}</span>
                  <p className="text-xs text-neutral-500 truncate">
                    {holding.quantity.toLocaleString('de-DE')} × {formatStockPrice(holding.current_price_display)}
                  </p>
                </div>
              </div>

              {/* Right: Values */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-neutral-300">{formatStockPrice(holding.current_price_display)}</p>
                  <p className="text-xs text-neutral-600">EK: {formatStockPrice(holding.purchase_price_display)}</p>
                </div>

                <div className="text-right">
                  <p className="font-medium text-white text-sm">{formatCurrency(holding.value)}</p>
                  <span className="text-xs text-neutral-600">{percentage.toFixed(1)}%</span>
                </div>

                <div className="text-right min-w-[80px]">
                  <p className={`text-sm font-medium ${holding.gain_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {holding.gain_loss >= 0 ? '+' : ''}{formatCurrency(holding.gain_loss)}
                  </p>
                  <span className={`text-xs ${holding.gain_loss_percent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    {formatPercentage(holding.gain_loss_percent)}
                  </span>
                </div>

                {/* Actions */}
                {!isAllDepotsView && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTopUpPosition(holding) }}
                      className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                      title="Aufstocken"
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-emerald-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditPosition(holding) }}
                      className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-blue-400" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeletePosition(holding.id) }}
                      className="p-1.5 hover:bg-neutral-800 rounded transition-colors"
                      title="Löschen"
                    >
                      <XMarkIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Cash Row */}
        {cashPosition > 0 && (
          <div
            className="group flex items-center justify-between py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
            onClick={onEditCash}
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-xs text-neutral-600 font-medium hidden sm:block">{holdings.length + 1}</span>
              <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 text-neutral-400" />
              </div>
              <div>
                <span className="font-medium text-white text-sm">Cash</span>
                <p className="text-xs text-neutral-500">Verfügbar</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-white text-sm">{formatCurrency(cashPosition)}</p>
                <span className="text-xs text-neutral-600">
                  {totalValue > 0 ? ((cashPosition / totalValue) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
