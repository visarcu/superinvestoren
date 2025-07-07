// src/contexts/CurrencyContext.tsx
'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type CurrencyFormat = 'DE' | 'EN'

interface CurrencyContextType {
  format: CurrencyFormat
  setFormat: (format: CurrencyFormat) => void
  formatLargeNumber: (value: number, options?: { 
    compact?: boolean
    precision?: number 
    showCurrency?: boolean
  }) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [format, setFormat] = useState<CurrencyFormat>('DE')

  const formatLargeNumber = (
    value: number, 
    options: { 
      compact?: boolean
      precision?: number 
      showCurrency?: boolean
    } = {}
  ): string => {
    const { compact = true, precision = 1, showCurrency = true } = options

    if (!compact) {
      // Normale Formatierung
      if (format === 'DE') {
        return new Intl.NumberFormat('de-DE', {
          style: showCurrency ? 'currency' : 'decimal',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(value)
      } else {
        return new Intl.NumberFormat('en-US', {
          style: showCurrency ? 'currency' : 'decimal',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(value)
      }
    }

    // Kompakte Formatierung für große Zahlen
    const absValue = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    
    if (format === 'DE') {
      // Deutsche Formatierung
      if (absValue >= 1000000000000) {
        // Billionen (deutsch) = Trillions (englisch)
        return `${sign}${(absValue / 1000000000000).toFixed(precision)} Bio.${showCurrency ? ' $' : ''}`
      } else if (absValue >= 1000000000) {
        // Milliarden (deutsch) = Billions (englisch)
        return `${sign}${(absValue / 1000000000).toFixed(precision)} Mrd.${showCurrency ? ' $' : ''}`
      } else if (absValue >= 1000000) {
        // Millionen
        return `${sign}${(absValue / 1000000).toFixed(precision)} Mio.${showCurrency ? ' $' : ''}`
      } else if (absValue >= 1000) {
        // Tausend
        return `${sign}${(absValue / 1000).toFixed(precision)}k${showCurrency ? ' $' : ''}`
      } else {
        return `${sign}${absValue.toFixed(0)}${showCurrency ? ' $' : ''}`
      }
    } else {
      // Englische Formatierung  
      if (absValue >= 1000000000000) {
        return `${sign}$${(absValue / 1000000000000).toFixed(precision)}T`
      } else if (absValue >= 1000000000) {
        return `${sign}$${(absValue / 1000000000).toFixed(precision)}B`
      } else if (absValue >= 1000000) {
        return `${sign}$${(absValue / 1000000).toFixed(precision)}M`
      } else if (absValue >= 1000) {
        return `${sign}$${(absValue / 1000).toFixed(precision)}K`
      } else {
        return `${sign}$${absValue.toFixed(0)}`
      }
    }
  }

  return (
    <CurrencyContext.Provider value={{ format, setFormat, formatLargeNumber }}>
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

// Legacy compatibility - falls du die alte formatCurrency function ersetzt
export function formatCurrency(amount: number, currency: 'EUR' | 'USD' = 'USD', format: CurrencyFormat = 'DE') {
  if (format === 'DE') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  }
}