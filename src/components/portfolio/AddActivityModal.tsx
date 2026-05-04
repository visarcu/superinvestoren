// src/components/portfolio/AddActivityModal.tsx
'use client'

import React, { useState } from 'react'
import { type Holding } from '@/hooks/usePortfolio'
import BuyForm from './activity-forms/BuyForm'
import SellForm from './activity-forms/SellForm'
import DividendForm from './activity-forms/DividendForm'
import CashForm from './activity-forms/CashForm'
import TransferForm from './activity-forms/TransferForm'
import {
  XMarkIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  PlusIcon,
  MinusIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

type ActivityType = 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'

interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  holdings: Holding[]
  isPremium: boolean
  holdingsCount: number
  cashPosition: number
  formatCurrency: (amount: number) => string
  formatStockPrice: (price: number) => string
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

const ACTIVITY_TYPES: {
  key: ActivityType
  label: string
  icon: typeof ArrowDownTrayIcon
  accentDot: string
  description: string
  needsHoldings: boolean
}[] = [
  { key: 'buy',          label: 'Kauf',        icon: ArrowDownTrayIcon,  accentDot: 'bg-emerald-400', description: 'Aktie kaufen oder aufstocken', needsHoldings: false },
  { key: 'sell',         label: 'Verkauf',     icon: ArrowUpTrayIcon,    accentDot: 'bg-red-400',     description: 'Position ganz oder teilweise verkaufen', needsHoldings: true },
  { key: 'dividend',     label: 'Dividende',   icon: BanknotesIcon,      accentDot: 'bg-blue-400',    description: 'Dividendenzahlung erfassen', needsHoldings: true },
  { key: 'deposit',      label: 'Einzahlung',  icon: PlusIcon,           accentDot: 'bg-emerald-400', description: 'Geld ins Depot einzahlen', needsHoldings: false },
  { key: 'withdrawal',   label: 'Auszahlung',  icon: MinusIcon,          accentDot: 'bg-red-400',     description: 'Geld vom Depot auszahlen', needsHoldings: false },
  { key: 'transfer_in',  label: 'Einbuchung',  icon: ArrowsRightLeftIcon, accentDot: 'bg-violet-400', description: 'Depotübertrag: Aktie hierhin übertragen', needsHoldings: false },
  { key: 'transfer_out', label: 'Ausbuchung',  icon: ArrowsRightLeftIcon, accentDot: 'bg-orange-400', description: 'Depotübertrag: Aktie woanders hin', needsHoldings: true },
]

const FREE_USER_POSITION_LIMIT = 2

export default function AddActivityModal({
  isOpen,
  onClose,
  portfolioId,
  holdings,
  isPremium,
  holdingsCount,
  cashPosition,
  formatCurrency,
  formatStockPrice,
  onAddPosition,
  onTopUpPosition,
  onSellPosition,
  onAddDividend,
  onAddCash,
  onAddTransfer,
  onComplete,
  onPremiumRequired
}: AddActivityModalProps) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null)

  if (!isOpen) return null

  const handleSelectType = (type: ActivityType) => {
    setSelectedType(type)
    setStep('form')
  }

  const handleBack = () => {
    setStep('type')
    setSelectedType(null)
  }

  const handleSuccess = () => {
    setStep('type')
    setSelectedType(null)
    onClose()
    onComplete()
  }

  const handleClose = () => {
    setStep('type')
    setSelectedType(null)
    onClose()
  }

  const selectedConfig = selectedType ? ACTIVITY_TYPES.find(t => t.key === selectedType) : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] my-auto overflow-hidden flex flex-col max-h-[min(90vh,800px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.04] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {step === 'form' && (
              <button
                onClick={handleBack}
                className="p-1.5 -ml-1.5 hover:bg-white/[0.06] rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 text-white/40 hover:text-white" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-white tracking-tight truncate">
                {step === 'type' ? 'Aktivität hinzufügen' : selectedConfig?.label || ''}
              </h2>
              <p className="text-[12px] text-white/30 mt-0.5 truncate">
                {step === 'type' ? 'Wähle den Typ deiner Buchung' : selectedConfig?.description}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors flex-shrink-0 text-white/40 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <div className="space-y-1.5">
            {ACTIVITY_TYPES.map(type => {
              const Icon = type.icon
              const disabled = type.needsHoldings && holdings.length === 0

              return (
                <button
                  key={type.key}
                  onClick={() => !disabled && handleSelectType(type.key)}
                  disabled={disabled}
                  className={`group w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed border-white/[0.04] bg-white/[0.01]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 relative">
                    <Icon className="w-4 h-4 text-white/80" />
                    <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${type.accentDot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[13px] text-white">{type.label}</span>
                    <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{type.description}</p>
                  </div>
                  <ArrowLeftIcon className="w-3.5 h-3.5 text-white/30 rotate-180 group-hover:text-white/70 transition-colors flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && selectedType === 'buy' && (
          <BuyForm
            portfolioId={portfolioId}
            holdings={holdings}
            isPremium={isPremium}
            holdingsCount={holdingsCount}
            maxFreePositions={FREE_USER_POSITION_LIMIT}
            onAddPosition={onAddPosition}
            onTopUpPosition={onTopUpPosition}
            formatCurrency={formatCurrency}
            formatStockPrice={formatStockPrice}
            onSuccess={handleSuccess}
            onPremiumRequired={onPremiumRequired}
          />
        )}

        {step === 'form' && selectedType === 'sell' && (
          <SellForm
            portfolioId={portfolioId}
            holdings={holdings}
            onSellPosition={onSellPosition}
            formatCurrency={formatCurrency}
            formatStockPrice={formatStockPrice}
            onSuccess={handleSuccess}
          />
        )}

        {step === 'form' && selectedType === 'dividend' && (
          <DividendForm
            portfolioId={portfolioId}
            holdings={holdings}
            onAddDividend={onAddDividend}
            formatCurrency={formatCurrency}
            onSuccess={handleSuccess}
          />
        )}

        {step === 'form' && selectedType === 'deposit' && (
          <CashForm
            direction="deposit"
            cashPosition={cashPosition}
            onAddCash={onAddCash}
            formatCurrency={formatCurrency}
            onSuccess={handleSuccess}
          />
        )}

        {step === 'form' && selectedType === 'withdrawal' && (
          <CashForm
            direction="withdrawal"
            cashPosition={cashPosition}
            onAddCash={onAddCash}
            formatCurrency={formatCurrency}
            onSuccess={handleSuccess}
          />
        )}

        {step === 'form' && selectedType === 'transfer_in' && (
          <TransferForm
            portfolioId={portfolioId}
            direction="in"
            holdings={holdings}
            onAddTransfer={onAddTransfer}
            formatCurrency={formatCurrency}
            formatStockPrice={formatStockPrice}
            onSuccess={handleSuccess}
          />
        )}

        {step === 'form' && selectedType === 'transfer_out' && (
          <TransferForm
            portfolioId={portfolioId}
            direction="out"
            holdings={holdings}
            onAddTransfer={onAddTransfer}
            formatCurrency={formatCurrency}
            formatStockPrice={formatStockPrice}
            onSuccess={handleSuccess}
          />
        )}
        </div>
      </div>
    </div>
  )
}
