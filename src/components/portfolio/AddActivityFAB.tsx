// src/components/portfolio/AddActivityFAB.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { type Holding, type Portfolio } from '@/hooks/usePortfolio'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import AddActivityModal from './AddActivityModal'

interface AddActivityFABProps {
  portfolioId: string
  holdings: Holding[]
  isPremium: boolean
  holdingsCount: number
  cashPosition: number
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
  isAllDepotsView: boolean
  allPortfolios?: Portfolio[]
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
  onSellPosition: (holdingId: string, params: {
    quantity: number
    price: number
    date: string
  }) => Promise<void>
  onAddDividend: (holdingId: string, params: {
    amount: number
    date: string
  }) => Promise<void>
  onAddCash: (amount: number, date?: string) => Promise<void>
  onComplete: () => void
  onPremiumRequired: () => void
}

export default function AddActivityFAB({
  portfolioId,
  holdings,
  isPremium,
  holdingsCount,
  cashPosition,
  formatCurrency,
  formatStockPrice,
  isAllDepotsView,
  allPortfolios = [],
  onAddPosition,
  onTopUpPosition,
  onSellPosition,
  onAddDividend,
  onAddCash,
  onComplete,
  onPremiumRequired
}: AddActivityFABProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDepotPicker, setShowDepotPicker] = useState(false)

  const handleFABClick = () => {
    if (isAllDepotsView && allPortfolios.length > 0) {
      // In "Alle Depots": Depot-Auswahl anzeigen
      setShowDepotPicker(true)
    } else {
      // Einzeldepot: Direkt Aktivität-Modal öffnen
      setIsModalOpen(true)
    }
  }

  const handleSelectDepot = (depotId: string) => {
    setShowDepotPicker(false)
    // Zum gewählten Depot navigieren — dort funktioniert der FAB normal
    router.push(`/analyse/portfolio/dashboard?depot=${depotId}`)
  }

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 group">
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
          Aktivität hinzufügen
        </div>
        <button
          onClick={handleFABClick}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
        >
          <PlusIcon className="w-7 h-7" />
        </button>
      </div>

      {/* Depot-Auswahl Modal (nur in "Alle Depots" Ansicht) */}
      {showDepotPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowDepotPicker(false)}>
          <div className="min-h-full flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-sm w-full border border-neutral-200 dark:border-neutral-800 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Depot wählen</h2>
                <button
                  onClick={() => setShowDepotPicker(false)}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              <p className="text-sm text-neutral-500 mb-4">
                In welches Depot soll die Aktivität?
              </p>
              <div className="space-y-2">
                {allPortfolios.map(pf => {
                  const brokerColor = getBrokerColor(pf.broker_type, pf.broker_color)
                  const brokerName = getBrokerDisplayName(pf.broker_type, pf.broker_name)
                  return (
                    <button
                      key={pf.id}
                      onClick={() => handleSelectDepot(pf.id)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-neutral-200 dark:border-neutral-700/50"
                      >
                        <span
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: brokerColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-neutral-900 dark:text-white text-sm">{pf.name}</span>
                        <p className="text-xs text-neutral-500">{brokerName}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aktivität-Modal (Einzeldepot) */}
      <AddActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        portfolioId={portfolioId}
        holdings={holdings}
        isPremium={isPremium}
        holdingsCount={holdingsCount}
        cashPosition={cashPosition}
        formatCurrency={formatCurrency}
        formatStockPrice={formatStockPrice}
        onAddPosition={onAddPosition}
        onTopUpPosition={onTopUpPosition}
        onSellPosition={onSellPosition}
        onAddDividend={onAddDividend}
        onAddCash={onAddCash}
        onComplete={onComplete}
        onPremiumRequired={onPremiumRequired}
      />
    </>
  )
}
