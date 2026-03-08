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
  color: string
  bg: string
  description: string
  needsHoldings: boolean
}[] = [
  {
    key: 'buy',
    label: 'Kauf',
    icon: ArrowDownTrayIcon,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
    description: 'Aktie kaufen oder aufstocken',
    needsHoldings: false
  },
  {
    key: 'sell',
    label: 'Verkauf',
    icon: ArrowUpTrayIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40',
    description: 'Position ganz oder teilweise verkaufen',
    needsHoldings: true
  },
  {
    key: 'dividend',
    label: 'Dividende',
    icon: BanknotesIcon,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
    description: 'Dividendenzahlung erfassen',
    needsHoldings: true
  },
  {
    key: 'deposit',
    label: 'Einzahlung',
    icon: PlusIcon,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
    description: 'Geld ins Depot einzahlen',
    needsHoldings: false
  },
  {
    key: 'withdrawal',
    label: 'Auszahlung',
    icon: MinusIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40',
    description: 'Geld vom Depot auszahlen',
    needsHoldings: false
  },
  {
    key: 'transfer_in',
    label: 'Einbuchung',
    icon: ArrowsRightLeftIcon,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40',
    description: 'Depotübertrag: Aktie hierhin übertragen',
    needsHoldings: false
  },
  {
    key: 'transfer_out',
    label: 'Ausbuchung',
    icon: ArrowsRightLeftIcon,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
    description: 'Depotübertrag: Aktie woanders hin',
    needsHoldings: true
  }
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto" onClick={handleClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl relative"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {step === 'form' && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 text-neutral-500" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {step === 'type'
                ? 'Aktivität hinzufügen'
                : selectedConfig?.label || ''
              }
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <div className="space-y-2">
            {ACTIVITY_TYPES.map(type => {
              const Icon = type.icon
              const disabled = type.needsHoldings && holdings.length === 0

              return (
                <button
                  key={type.key}
                  onClick={() => !disabled && handleSelectType(type.key)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed border-neutral-200 dark:border-neutral-800'
                      : type.bg
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type.bg.split(' ')[0]}`}>
                    <Icon className={`w-5 h-5 ${type.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-neutral-900 dark:text-white text-sm">{type.label}</span>
                    <p className="text-xs text-neutral-500 mt-0.5">{type.description}</p>
                  </div>
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
