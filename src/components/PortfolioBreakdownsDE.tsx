// src/components/PortfolioBreakdownsDE.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  ChartPieIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CurrencyEuroIcon,
  ScaleIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { 
  getStockProfiles
} from '@/lib/portfolioData'
import { useCurrency } from '@/lib/CurrencyContext'

interface Holding {
  symbol: string
  name: string
  value: number
  quantity: number
  purchase_price: number
}

interface BreakdownItem {
  name: string
  value: number
  valueEUR?: number
  percentage: number
  holdings: string[]
}

interface PortfolioBreakdownsDEProps {
  holdings: Holding[]
  totalValue: number
  cashPosition: number
  currency?: 'EUR' | 'USD'
}

// Helper function für Exchange Rate Caching
function getCachedExchangeRate(pair: string): number | null {
  if (typeof window === 'undefined') return null
  
  const cached = localStorage.getItem(`fx_${pair}`)
  if (!cached) return null
  
  const data = JSON.parse(cached)
  if (Date.now() > data.expires) {
    localStorage.removeItem(`fx_${pair}`)
    return null
  }
  
  return data.rate
}

function cacheExchangeRate(pair: string, rate: number) {
  if (typeof window === 'undefined') return
  
  const cache = {
    rate,
    timestamp: Date.now(),
    expires: Date.now() + (60 * 60 * 1000) // 1 Stunde Cache
  }
  localStorage.setItem(`fx_${pair}`, JSON.stringify(cache))
}

async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    // Use secure exchange rate API
    const response = await fetch(`/api/exchange-rate?from=${from}&to=${to}`)
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.rate) {
        return data.rate
      }
    }
    
    // Fallback rates wenn API nicht funktioniert
    const fallbackRates: { [key: string]: number } = {
      'EURUSD': 1.08,
      'USDEUR': 0.93,
      'GBPUSD': 1.27,
      'USDGBP': 0.79,
      'CHFUSD': 1.13,
      'USDCHF': 0.88
    }
    
    return fallbackRates[`${from}${to}`] || 1
  } catch (error) {
    console.error('Error fetching exchange rate:', error)
    return 1
  }
}

export default function PortfolioBreakdownsDE({ 
  holdings, 
  totalValue, 
  cashPosition,
  currency = 'EUR'
}: PortfolioBreakdownsDEProps) {
  const { formatCurrency } = useCurrency()
  const [activeBreakdown, setActiveBreakdown] = useState<'asset' | 'sector' | 'country' | 'currency' | 'cap'>('asset')
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map())
  const [showAll, setShowAll] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(0.93) // USD to EUR
  const [displayCurrency] = useState<'EUR' | 'USD'>(currency)

  useEffect(() => {
    loadData()
  }, [holdings])

  const loadData = async () => {
    if (holdings.length === 0) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Lade Exchange Rate
      let rate = getCachedExchangeRate('USDEUR')
      if (!rate) {
        rate = await getExchangeRate('USD', 'EUR')
        cacheExchangeRate('USDEUR', rate)
      }
      setExchangeRate(rate)

      // Lade Stock Profiles
      const symbols = holdings.map(h => h.symbol)
      const profileData = await getStockProfiles(symbols)
      setProfiles(profileData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number): string => {
    // Handle invalid values
    if (!value || isNaN(value) || !isFinite(value)) {
      const symbol = displayCurrency === 'EUR' ? '€' : '$'
      return `${symbol}0,00`
    }
    
    // Handle invalid exchange rate
    const validExchangeRate = exchangeRate && !isNaN(exchangeRate) && isFinite(exchangeRate) ? exchangeRate : 0.93
    const convertedValue = displayCurrency === 'EUR' ? value * validExchangeRate : value
    
    // Handle converted value edge cases
    if (!convertedValue || isNaN(convertedValue) || !isFinite(convertedValue)) {
      const symbol = displayCurrency === 'EUR' ? '€' : '$'
      return `${symbol}0,00`
    }
    
    // Nutze den CurrencyContext formatter wenn möglich
    if (formatCurrency) {
      try {
        return formatCurrency(convertedValue)
      } catch (error) {
        console.warn('CurrencyContext formatCurrency error:', error)
      }
    }
    
    // Fallback
    const symbol = displayCurrency === 'EUR' ? '€' : '$'
    return `${symbol}${convertedValue.toLocaleString('de-DE', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  const getBreakdownData = (): BreakdownItem[] => {
    if (loading) return []

    let data: BreakdownItem[] = []
    
    switch (activeBreakdown) {
      case 'sector':
        // For now, create a simple sector breakdown from profiles
        const sectorMap = new Map<string, number>()
        holdings.forEach(holding => {
          const profile = profiles.get(holding.symbol)
          const sector = profile?.sector || 'Unknown'
          const value = holding.value || 0
          sectorMap.set(sector, (sectorMap.get(sector) || 0) + value)
        })
        data = Array.from(sectorMap.entries()).map(([sector, value]) => ({
          name: sector,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
          holdings: holdings.filter(h => profiles.get(h.symbol)?.sector === sector).map(h => h.symbol)
        }))
        break
      case 'country':
        const countryMap = new Map<string, number>()
        holdings.forEach(holding => {
          const profile = profiles.get(holding.symbol)
          const country = profile?.country || 'Unknown'
          const value = holding.value || 0
          countryMap.set(country, (countryMap.get(country) || 0) + value)
        })
        data = Array.from(countryMap.entries()).map(([country, value]) => ({
          name: country,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
          holdings: holdings.filter(h => profiles.get(h.symbol)?.country === country).map(h => h.symbol)
        }))
        break
      case 'cap':
        const getMarketCapCategory = (marketCap: number) => {
          if (marketCap > 200000000000) return 'Mega Cap (>$200B)'
          if (marketCap > 10000000000) return 'Large Cap ($10B-$200B)'
          if (marketCap > 2000000000) return 'Mid Cap ($2B-$10B)'
          if (marketCap > 300000000) return 'Small Cap ($300M-$2B)'
          return 'Micro Cap (<$300M)'
        }
        const capMap = new Map<string, number>()
        holdings.forEach(holding => {
          const profile = profiles.get(holding.symbol)
          const category = profile?.marketCap ? getMarketCapCategory(profile.marketCap) : 'Unknown'
          const value = holding.value || 0
          capMap.set(category, (capMap.get(category) || 0) + value)
        })
        data = Array.from(capMap.entries()).map(([category, value]) => ({
          name: category,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
          holdings: holdings.filter(h => {
            const profile = profiles.get(h.symbol)
            return profile?.marketCap ? getMarketCapCategory(profile.marketCap) === category : category === 'Unknown'
          }).map(h => h.symbol)
        }))
        break
      case 'currency':
        const currencyMap = new Map<string, number>()
        holdings.forEach(holding => {
          const profile = profiles.get(holding.symbol)
          const currency = profile?.currency || 'Unknown'
          const value = holding.value || 0
          currencyMap.set(currency, (currencyMap.get(currency) || 0) + value)
        })
        if (cashPosition > 0) {
          currencyMap.set('EUR', (currencyMap.get('EUR') || 0) + cashPosition)
        }
        data = Array.from(currencyMap.entries()).map(([currency, value]) => ({
          name: currency,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
          holdings: currency === 'EUR' && cashPosition > 0 
            ? [...holdings.filter(h => profiles.get(h.symbol)?.currency === currency).map(h => h.symbol), 'EUR']
            : holdings.filter(h => profiles.get(h.symbol)?.currency === currency).map(h => h.symbol)
        }))
        break
      case 'asset':
        const stockValue = holdings.reduce((sum, h) => {
          const value = h.value && !isNaN(h.value) && isFinite(h.value) ? h.value : 0
          return sum + value
        }, 0)
        const validCashPosition = cashPosition && !isNaN(cashPosition) && isFinite(cashPosition) ? cashPosition : 0
        
        data = [
          {
            name: 'Aktien',
            value: stockValue,
            percentage: totalValue > 0 ? (stockValue / totalValue) * 100 : 0,
            holdings: holdings.map(h => h.symbol).filter(Boolean)
          },
          {
            name: 'Bargeld',
            value: validCashPosition,
            percentage: totalValue > 0 ? (validCashPosition / totalValue) * 100 : 0,
            holdings: ['EUR']
          }
        ].filter(item => item.value > 0)
        break
    }

    // Berechne Prozentsätze mit robuster Fehlerbehandlung
    const total = activeBreakdown === 'asset' || activeBreakdown === 'currency' 
      ? totalValue 
      : totalValue - cashPosition

    // Prevent division by zero
    const validTotal = total && total > 0 ? total : 1
    const validExchangeRate = exchangeRate && !isNaN(exchangeRate) && isFinite(exchangeRate) ? exchangeRate : 0.93

    // Ensure data is an array before mapping
    if (!Array.isArray(data)) {
      console.warn('PortfolioBreakdownsDE: data is not an array:', data)
      return []
    }

    return data.map(item => {
      // Validate item.value
      const itemValue = item.value && !isNaN(item.value) && isFinite(item.value) ? item.value : 0
      
      return {
        name: translateName(item.name),
        value: itemValue,
        valueEUR: itemValue * validExchangeRate,
        percentage: (itemValue / validTotal) * 100,
        holdings: item.holdings || []
      }
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
  }

  const translateName = (name: string): string => {
    const translations: { [key: string]: string } = {
      // Sektoren
      'Technology': 'Technologie',
      'Healthcare': 'Gesundheit',
      'Financial Services': 'Finanzdienstleistungen',
      'Consumer Cyclical': 'Zyklische Konsumgüter',
      'Consumer Defensive': 'Defensive Konsumgüter',
      'Industrials': 'Industrie',
      'Energy': 'Energie',
      'Utilities': 'Versorger',
      'Real Estate': 'Immobilien',
      'Communication Services': 'Kommunikation',
      'Basic Materials': 'Grundstoffe',
      'Other': 'Sonstige',
      // Market Caps
      'Mega Cap (>$200B)': 'Mega Cap (>200 Mrd.)',
      'Large Cap ($10B-$200B)': 'Large Cap (10-200 Mrd.)',
      'Mid Cap ($2B-$10B)': 'Mid Cap (2-10 Mrd.)',
      'Small Cap ($300M-$2B)': 'Small Cap (300 Mio.-2 Mrd.)',
      'Micro Cap (<$300M)': 'Micro Cap (<300 Mio.)',
      // Länder
      'United States': 'Vereinigte Staaten',
      'Germany': 'Deutschland',
      'United Kingdom': 'Großbritannien',
      'France': 'Frankreich',
      'Switzerland': 'Schweiz',
      'Netherlands': 'Niederlande',
      'Japan': 'Japan',
      'China': 'China',
      'Canada': 'Kanada',
      'Unknown': 'Unbekannt',
      // Assets
      'Stocks': 'Aktien',
      'Cash': 'Bargeld'
    }
    return translations[name] || name
  }

  const getCountryFlag = (country: string): string => {
    const countryMap: { [key: string]: string } = {
      'Vereinigte Staaten': '🇺🇸',
      'Deutschland': '🇩🇪',
      'Großbritannien': '🇬🇧',
      'Frankreich': '🇫🇷',
      'Schweiz': '🇨🇭',
      'Niederlande': '🇳🇱',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'Kanada': '🇨🇦'
    }
    return countryMap[country] || '🌍'
  }

  const breakdownData = getBreakdownData()
  const displayData = showAll ? breakdownData : breakdownData.slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-6 h-6 text-brand-light animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Portfolio-Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab Buttons - kompakter, ohne Box-Container */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveBreakdown('asset')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeBreakdown === 'asset'
              ? 'bg-brand text-white'
              : 'bg-theme-secondary/20 text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <ChartPieIcon className="w-4 h-4" />
          Anlageklasse
        </button>
        <button
          onClick={() => setActiveBreakdown('sector')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeBreakdown === 'sector'
              ? 'bg-brand text-white'
              : 'bg-theme-secondary/20 text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" />
          Branchen
        </button>
        <button
          onClick={() => setActiveBreakdown('country')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeBreakdown === 'country'
              ? 'bg-brand text-white'
              : 'bg-theme-secondary/20 text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <GlobeAltIcon className="w-4 h-4" />
          Länder
        </button>
        <button
          onClick={() => setActiveBreakdown('currency')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeBreakdown === 'currency'
              ? 'bg-brand text-white'
              : 'bg-theme-secondary/20 text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <CurrencyEuroIcon className="w-4 h-4" />
          Währungen
        </button>
        <button
          onClick={() => setActiveBreakdown('cap')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeBreakdown === 'cap'
              ? 'bg-brand text-white'
              : 'bg-theme-secondary/20 text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <ScaleIcon className="w-4 h-4" />
          Marktkapitalisierung
        </button>
      </div>

      {/* Content - EINE flache Card, keine verschachtelten Boxes */}
      <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
        {/* Empty State */}
        {holdings.length === 0 && (
          <div className="py-12 text-center">
            <img
              src="/illustrations/undraw_investing_uzcu.svg"
              alt="Portfolio Breakdown"
              className="w-40 h-40 mx-auto mb-6 opacity-85"
            />
            <h3 className="text-lg font-semibold text-theme-primary mb-2">
              Keine Positionen vorhanden
            </h3>
            <p className="text-theme-secondary text-sm max-w-sm mx-auto">
              Füge Aktien zu deinem Portfolio hinzu, um die Aufschlüsselung zu sehen.
            </p>
          </div>
        )}

        {/* Items als flache Liste */}
        {holdings.length > 0 && (
        <div className="divide-y divide-theme/5">
          {displayData.map((item, index) => (
            <div
              key={index}
              className="px-5 py-4 hover:bg-theme-secondary/5 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {activeBreakdown === 'country' && (
                    <span className="text-xl">{getCountryFlag(item.name)}</span>
                  )}
                  <div>
                    <p className="font-medium text-theme-primary">{item.name}</p>
                    <p className="text-xs text-theme-muted">
                      {item.holdings.length} {item.holdings.length === 1 ? 'Position' : 'Positionen'}
                      {item.holdings.length <= 4 && item.holdings.length > 0 && (
                        <span className="ml-1">· {item.holdings.join(', ')}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-theme-primary">{formatValue(item.value)}</p>
                  <p className="text-sm text-brand-light">
                    {item.percentage && !isNaN(item.percentage) && isFinite(item.percentage)
                      ? item.percentage.toFixed(1)
                      : '0.0'}%
                  </p>
                </div>
              </div>

              {/* Progress Bar - subtiler */}
              <div className="h-1.5 bg-theme-secondary/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{
                    width: `${item.percentage || 0}%`,
                    opacity: 1 - (index * 0.1)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Show More Button falls nötig */}
        {holdings.length > 0 && breakdownData.length > 6 && (
          <div className="px-5 py-3 border-t border-theme/5">
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-sm text-brand-light hover:text-green-300 transition-colors"
            >
              {showAll ? 'Weniger anzeigen' : `${breakdownData.length - 6} weitere anzeigen`}
            </button>
          </div>
        )}
      </div>

      {/* Portfolio-Analyse - kompakte Zeile statt große Box */}
      <div className="flex items-start gap-3 px-4 py-3 bg-theme-secondary/10 rounded-lg">
        <SparklesIcon className="w-4 h-4 text-brand-light flex-shrink-0 mt-0.5" />
        <div className="text-sm text-theme-secondary">
          {activeBreakdown === 'asset' && (
            <span>
              <span className="text-theme-primary font-medium">
                Bargeldanteil: {totalValue > 0 ? (cashPosition / totalValue * 100).toFixed(1) : '0.0'}%
              </span>
              {' · '}
              {totalValue > 0 && cashPosition / totalValue > 0.3
                ? 'Hohe Bargeldposition - erwägen Sie mehr Investitionen.'
                : totalValue > 0 && cashPosition / totalValue < 0.05
                ? 'Niedrige Barreserve.'
                : 'Ausgewogene Bargeldposition.'}
            </span>
          )}
          {activeBreakdown === 'sector' && breakdownData[0] && (
            <span>
              <span className="text-theme-primary font-medium">
                Top: {breakdownData[0].name} ({breakdownData[0].percentage?.toFixed(1) || 0}%)
              </span>
              {' · '}
              {breakdownData.length < 3 ? 'Erwägen Sie mehr Branchendiversifikation.' : 'Diversifiziert über ' + breakdownData.length + ' Branchen.'}
            </span>
          )}
          {activeBreakdown === 'country' && (
            <span>
              <span className="text-theme-primary font-medium">
                {breakdownData.length} {breakdownData.length === 1 ? 'Land' : 'Länder'}
              </span>
              {' · '}
              {breakdownData[0]?.percentage > 80 ? 'Konzentriert - mehr internationale Diversifikation erwägen.' : 'Geografisch diversifiziert.'}
            </span>
          )}
          {activeBreakdown === 'currency' && (
            <span>
              <span className="text-theme-primary font-medium">
                {breakdownData.length} {breakdownData.length === 1 ? 'Währung' : 'Währungen'}
              </span>
              {' · '}
              Wechselkurs: 1 USD = {exchangeRate?.toFixed(4) || '0.93'} EUR
            </span>
          )}
          {activeBreakdown === 'cap' && breakdownData[0] && (
            <span>
              <span className="text-theme-primary font-medium">
                Hauptsächlich {breakdownData[0].name}
              </span>
              {' · '}
              {breakdownData.length === 1 ? 'Konzentriert auf eine Größenklasse.' : 'Diversifiziert über ' + breakdownData.length + ' Größenklassen.'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}