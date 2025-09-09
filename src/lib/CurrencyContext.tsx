// src/lib/CurrencyContext.tsx - FINALE VERSION MIT DEUTSCHEN FORMATIERUNGEN
'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD'
type FinancialUnit = 'millions' | 'billions' | 'auto'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (currency: Currency) => void
  financialUnit: FinancialUnit
  setFinancialUnit: (unit: FinancialUnit) => void
  
  // Bestehende Funktionen
  formatCurrency: (amount: number, type?: 'currency' | 'number') => string
  formatAxisValue: (value: number) => string
  formatAxisValueDE: (value: number) => string // NEU: Deutsche Version
  formatNumber: (value: number) => string
  
  // Professionelle Funktionen
  formatFinancialNumber: (value: number) => string
  getFinancialUnitLabel: () => string
  getCurrentUnit: (value: number) => 'millions' | 'billions'
  
  // Spezielle Funktionen für Aktienpreise
  formatStockPrice: (price: number, showCurrency?: boolean) => string
  formatPercentage: (value: number, showSign?: boolean) => string
  formatMarketCap: (value: number) => string // NEU: Für Marktkapitalisierung
  formatShares: (value: number) => string // NEU: Für Aktienanzahl (ohne Währung)
  
  // Neue Hilfsfunktionen
  getCurrencySymbol: (currency: Currency) => string
  detectCurrencyFromTicker: (ticker: string) => Currency
  detectCurrencyFromAPI: (reportedCurrency?: string) => Currency
}

// Neue Funktion für Währungssymbole
const getCurrencySymbol = (currency: Currency): string => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CHF': 'CHF',
    'CAD': 'C$',
    'AUD': 'A$'
  }
  return symbols[currency] || currency
}

// Ticker-basierte Währungserkennung (Fallback)
const detectCurrencyFromTicker = (ticker: string): Currency => {
  if (ticker.match(/\.(DE|PA|AS|MI|MC|BR|LI|VI|AT|CP|HE|PR|ZU)$/)) return 'EUR'
  if (ticker.endsWith('.L')) return 'EUR' // Unilever etc. berichten in EUR
  if (ticker.endsWith('.TO')) return 'CAD'
  if (ticker.endsWith('.T')) return 'JPY'
  if (ticker.endsWith('.SW') || ticker.endsWith('.S')) return 'CHF'
  if (ticker.endsWith('.AX')) return 'AUD'
  return 'USD'
}

// API-basierte Währungserkennung (Priorität)
const detectCurrencyFromAPI = (reportedCurrency?: string): Currency => {
  const currencyMap: Record<string, Currency> = {
    'USD': 'USD',
    'EUR': 'EUR',
    'GBP': 'GBP',
    'JPY': 'JPY',
    'CHF': 'CHF',
    'CAD': 'CAD',
    'AUD': 'AUD'
  }
  return (reportedCurrency && currencyMap[reportedCurrency]) || 'USD'
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('EUR') // EUR als Standard für deutsche Nutzer
  const [financialUnit, setFinancialUnit] = useState<FinancialUnit>('auto')

  // ✅ Formatierung für Währungsbeträge - MIT DEUTSCHER FORMATIERUNG
  const formatCurrency = (amount: number, type: 'currency' | 'number' = 'currency'): string => {
    if (type === 'number') {
      return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    }

    // Für große Beträge (Milliarden/Billionen)
    const absAmount = Math.abs(amount)
    
    if (absAmount >= 1e12) {
      // Billionen (deutsch) = Trillions (englisch)
      return `${(amount / 1e12).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Bio. ${getCurrencySymbol(currency)}`
    } else if (absAmount >= 1e9) {
      // Milliarden (deutsch) = Billions (englisch)
      return `${(amount / 1e9).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Mrd. ${getCurrencySymbol(currency)}`
    } else if (absAmount >= 1e6) {
      // Millionen
      return `${(amount / 1e6).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Mio. ${getCurrencySymbol(currency)}`
    }
    
    // Normale Beträge
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 0,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount)
  }

  // ENGLISCHE Achsen-Formatierung (für Kompatibilität) - MIT DEUTSCHEN DEZIMALZEICHEN
  const formatAxisValue = (value: number): string => {
    const absValue = Math.abs(value)
    
    if (absValue >= 1e9) {
      return `${(value / 1e9).toLocaleString('de-DE', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      })}B`
    } else if (absValue >= 1e6) {
      return `${(value / 1e6).toLocaleString('de-DE', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })}M`
    } else if (absValue >= 1e3) {
      return `${(value / 1e3).toLocaleString('de-DE', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })}K`
    }
    return value.toLocaleString('de-DE', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })
  }

  // ✅ DEUTSCHE Achsen-Formatierung (NEU) - MIT DEUTSCHEN DEZIMALZEICHEN
  const formatAxisValueDE = (value: number): string => {
    const absValue = Math.abs(value)
    
    if (absValue >= 1e12) {
      // Billionen (deutsch) = Trillions (englisch)
      return `${(value / 1e12).toLocaleString('de-DE', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      })} Bio.`
    } else if (absValue >= 1e9) {
      // Milliarden (deutsch) = Billions (englisch)
      return `${(value / 1e9).toLocaleString('de-DE', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      })} Mrd.`
    } else if (absValue >= 1e6) {
      // Millionen
      return `${(value / 1e6).toLocaleString('de-DE', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })} Mio.`
    } else if (absValue >= 1e3) {
      // Tausend
      return `${(value / 1e3).toLocaleString('de-DE', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })}k`
    }
    return value.toLocaleString('de-DE', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })
  }

  // ✅ MIT DEUTSCHER FORMATIERUNG
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('de-DE').format(value)
  }

  // Professionelle Financial Formatierung
  const getCurrentUnit = (value: number): 'millions' | 'billions' => {
    if (financialUnit === 'millions') return 'millions'
    if (financialUnit === 'billions') return 'billions'
    
    // Auto: Bestimme basierend auf Größe
    return Math.abs(value) >= 1e9 ? 'billions' : 'millions'
  }

  // ✅ MIT DEUTSCHER FORMATIERUNG
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

  // ✅ Spezielle Formatierung für Aktienpreise - MIT DEUTSCHER FORMATIERUNG
  const formatStockPrice = (price: number, showCurrency: boolean = true): string => {
    if (!price && price !== 0) return '–'
    
    // Deutsche Formatierung mit Komma als Dezimaltrennzeichen
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(price)
    
    if (showCurrency) {
      // Währungssymbol hinten (deutsche Konvention)
      return `${formatted} ${getCurrencySymbol(currency)}`
    }
    
    return formatted
  }

  // ✅ Prozentformatierung - MIT DEUTSCHER FORMATIERUNG
  const formatPercentage = (value: number, showSign: boolean = true): string => {
    if (!value && value !== 0) return '–'
    
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value))
    
    const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}${formatted}%`
  }

  // ✅ NEU: Spezielle Formatierung für Marktkapitalisierung - MIT DEUTSCHER FORMATIERUNG
  const formatMarketCap = (value: number): string => {
    if (!value && value !== 0) return '–'
    
    const absValue = Math.abs(value)
    const currencySymbol = getCurrencySymbol(currency)
    
    if (absValue >= 1e12) {
      // Billionen (deutsch) = Trillions (englisch)
      return `${(value / 1e12).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      })} Bio. ${currencySymbol}`
    } else if (absValue >= 1e9) {
      // Milliarden (deutsch) = Billions (englisch)
      return `${(value / 1e9).toLocaleString('de-DE', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      })} Mrd. ${currencySymbol}`
    } else if (absValue >= 1e6) {
      // Millionen
      return `${(value / 1e6).toLocaleString('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })} Mio. ${currencySymbol}`
    }
    
    // Normale Beträge (sollte bei Marktkapitalisierung nicht vorkommen)
    return `${value.toLocaleString('de-DE')} ${currencySymbol}`
  }

  // ✅ NEU: Formatierung für Aktienanzahl (ohne Währung) - MIT DEUTSCHER FORMATIERUNG
  const formatShares = (value: number): string => {
    if (!value && value !== 0) return '–'
    
    return new Intl.NumberFormat('de-DE').format(value)
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
        formatAxisValueDE,
        formatNumber,
        formatFinancialNumber,
        getFinancialUnitLabel,
        getCurrentUnit,
        formatStockPrice,
        formatPercentage,
        formatMarketCap,
        formatShares,
        getCurrencySymbol,
        detectCurrencyFromTicker,
        detectCurrencyFromAPI,
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