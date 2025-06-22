// src/lib/CurrencyContext.tsx - ERWEITERTE VERSION

'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

type Currency = 'USD' | 'EUR'
type FinancialUnit = 'millions' | 'billions' | 'auto'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  financialUnit: FinancialUnit
  setFinancialUnit: (unit: FinancialUnit) => void
  
  // Bestehende Funktionen
  formatCurrency: (amount: number, type?: 'currency' | 'number') => string
  formatAxisValue: (value: number) => string
  formatNumber: (value: number) => string
  
  // ✅ NEUE professionelle Funktionen
  formatFinancialNumber: (value: number) => string
  getFinancialUnitLabel: () => string
  getCurrentUnit: (value: number) => 'millions' | 'billions'
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD')
  const [financialUnit, setFinancialUnit] = useState<FinancialUnit>('auto')

  // Bestehende Funktionen (unverändert)
  const formatCurrency = (amount: number, type: 'currency' | 'number' = 'currency'): string => {
    if (type === 'number') {
      return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: currency === 'USD' ? 0 : 2,
    }).format(amount)
  }

  const formatAxisValue = (value: number): string => {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(0)}M`
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K`
    }
    return value.toString()
  }

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('de-DE').format(value)
  }

  // ✅ NEUE professionelle Financial Formatierung
  const getCurrentUnit = (value: number): 'millions' | 'billions' => {
    if (financialUnit === 'millions') return 'millions'
    if (financialUnit === 'billions') return 'billions'
    
    // Auto: Bestimme basierend auf Größe
    return Math.abs(value) >= 1e9 ? 'billions' : 'millions'
  }

  const formatFinancialNumber = (value: number): string => {
    if (!value && value !== 0) return '–'
    
    const unit = getCurrentUnit(value)
    
    if (unit === 'billions') {
      return (value / 1e9).toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    } else {
      return (value / 1e6).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })
    }
  }

  const getFinancialUnitLabel = (): string => {
    const currencyLabel = currency === 'USD' ? 'USD' : 'EUR'
    
    if (financialUnit === 'millions') return `Mio. ${currencyLabel}`
    if (financialUnit === 'billions') return `Mrd. ${currencyLabel}`
    
    // Auto: Verwende meist Milliarden für große Unternehmen
    return `Mrd. ${currencyLabel}`
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        financialUnit,
        setFinancialUnit,
        formatCurrency,
        formatAxisValue,
        formatNumber,
        formatFinancialNumber,
        getFinancialUnitLabel,
        getCurrentUnit,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}