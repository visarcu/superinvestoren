// src/components/portfolio/AddActivityFAB.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { type Holding, type Portfolio } from '@/hooks/usePortfolio'
import { getBrokerDisplayName, getBrokerColor, brokerTypeToLogoId } from '@/lib/brokerConfig'
import AddActivityModal from './AddActivityModal'
import { BrokerLogo } from './BrokerLogo'

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
  onAddTransfer: (params: {
    direction: 'in' | 'out'
    stock: { symbol: string; name: string }
    quantity: number
    price: number
    date: string
    notes?: string
  }) => Promise<void>
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
  onAddTransfer,
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
      {/* Floating Action Button — Premium weiß */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <div className="absolute bottom-full right-0 mb-2 px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 text-white text-[11px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
          Aktivität hinzufügen
        </div>
        <button
          onClick={handleFABClick}
          aria-label="Aktivität hinzufügen"
          className="w-12 h-12 bg-white hover:bg-neutral-100 text-neutral-950 rounded-full shadow-2xl transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95 ring-1 ring-black/5"
        >
          <PlusIcon className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* Depot-Auswahl Modal (nur in "Alle Depots" Ansicht) */}
      {showDepotPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50" onClick={() => setShowDepotPicker(false)}>
          <div className="min-h-full flex items-center justify-center p-4">
            <div
              className="bg-neutral-950 rounded-2xl max-w-sm w-full border border-neutral-800/80 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-[15px] font-semibold text-white tracking-tight">Depot wählen</h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">In welches Depot soll die Aktivität?</p>
                </div>
                <button
                  onClick={() => setShowDepotPicker(false)}
                  className="p-1.5 hover:bg-neutral-800/60 rounded-lg transition-colors flex-shrink-0"
                >
                  <XMarkIcon className="w-4.5 h-4.5 text-neutral-500 hover:text-neutral-300" />
                </button>
              </div>
              <div className="p-3 space-y-1">
                {allPortfolios.map(pf => {
                  const brokerColor = getBrokerColor(pf.broker_type, pf.broker_color)
                  const brokerName = getBrokerDisplayName(pf.broker_type, pf.broker_name)
                  const logoId = brokerTypeToLogoId(pf.broker_type)
                  return (
                    <button
                      key={pf.id}
                      onClick={() => handleSelectDepot(pf.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/80 transition-all text-left"
                    >
                      {logoId ? (
                        <BrokerLogo brokerId={logoId} size={34} />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 relative">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: brokerColor }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[13px] text-white truncate block">{pf.name}</span>
                        <p className="text-[11px] text-neutral-500 truncate">{brokerName}</p>
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
        onAddTransfer={onAddTransfer}
        onComplete={onComplete}
        onPremiumRequired={onPremiumRequired}
      />
    </>
  )
}
