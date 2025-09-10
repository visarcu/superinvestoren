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
  SparklesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { 
  getStockProfiles,
  calculateSectorBreakdown,
  calculateCountryBreakdown,
  calculateMarketCapBreakdown,
  calculateCurrencyBreakdown
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

    let data: any[] = []
    
    switch (activeBreakdown) {
      case 'sector':
        data = calculateSectorBreakdown(holdings, profiles)
        break
      case 'country':
        data = calculateCountryBreakdown(holdings, profiles)
        break
      case 'cap':
        data = calculateMarketCapBreakdown(holdings, profiles)
        break
      case 'currency':
        data = calculateCurrencyBreakdown(holdings, profiles, cashPosition)
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
            holdings: holdings.map(h => h.symbol).filter(Boolean)
          },
          {
            name: 'Bargeld',
            value: validCashPosition,
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

    return data.map(item => {
      // Validate item.value
      const itemValue = item.value && !isNaN(item.value) && isFinite(item.value) ? item.value : 0
      
      return {
        name: translateName(item.sector || item.country || item.category || item.currency || item.name),
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

  const getSectorColor = (sector: string): string => {
    const colors: { [key: string]: string } = {
      'Technologie': '#3b82f6',
      'Gesundheit': '#ef4444',
      'Finanzdienstleistungen': '#8b5cf6',
      'Zyklische Konsumgüter': '#f59e0b',
      'Defensive Konsumgüter': '#ec4899',
      'Industrie': '#6b7280',
      'Energie': '#84cc16',
      'Versorger': '#06b6d4',
      'Immobilien': '#a855f7',
      'Kommunikation': '#14b8a6',
      'Grundstoffe': '#f97316',
      'Sonstige': '#94a3b8'
    }
    return colors[sector] || '#94a3b8'
  }

  const breakdownData = getBreakdownData()
  const displayData = showAll ? breakdownData : breakdownData.slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Portfolio-Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-theme-primary">Portfolio-Aufschlüsselung</h2>
      </div>

      {/* Breakdown Type Selector */}
      <div className="flex gap-2 p-1 bg-theme-card rounded-lg border border-theme/10 overflow-x-auto">
        <button
          onClick={() => setActiveBreakdown('asset')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
            activeBreakdown === 'asset'
              ? 'bg-green-500 text-white'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <ChartPieIcon className="w-4 h-4" />
          Anlageklasse
        </button>
        <button
          onClick={() => setActiveBreakdown('sector')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
            activeBreakdown === 'sector'
              ? 'bg-green-500 text-white'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <BuildingOfficeIcon className="w-4 h-4" />
          Branchen
        </button>
        <button
          onClick={() => setActiveBreakdown('country')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
            activeBreakdown === 'country'
              ? 'bg-green-500 text-white'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <GlobeAltIcon className="w-4 h-4" />
          Länder
        </button>
        <button
          onClick={() => setActiveBreakdown('currency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
            activeBreakdown === 'currency'
              ? 'bg-green-500 text-white'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <CurrencyEuroIcon className="w-4 h-4" />
          Währungen
        </button>
        <button
          onClick={() => setActiveBreakdown('cap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap ${
            activeBreakdown === 'cap'
              ? 'bg-green-500 text-white'
              : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30'
          }`}
        >
          <ScaleIcon className="w-4 h-4" />
          Marktkapitalisierung
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Chart */}
        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <h3 className="text-lg font-semibold text-theme-primary mb-4">
            {activeBreakdown === 'asset' && 'Vermögensaufteilung'}
            {activeBreakdown === 'sector' && 'Branchenverteilung'}
            {activeBreakdown === 'country' && 'Geografische Verteilung'}
            {activeBreakdown === 'cap' && 'Marktkapitalisierung'}
            {activeBreakdown === 'currency' && 'Währungsverteilung'}
          </h3>
          
          {/* Bar Chart Visualization */}
          <div className="space-y-3">
            {displayData.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-theme-secondary flex items-center gap-2">
                    {activeBreakdown === 'country' && (
                      <span>{getCountryFlag(item.name)}</span>
                    )}
                    {item.name}
                  </span>
                  <span className="font-semibold text-theme-primary">
                    {item.percentage && !isNaN(item.percentage) && isFinite(item.percentage) ? item.percentage.toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="relative h-8 bg-theme-secondary/30 rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-lg transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: activeBreakdown === 'sector' 
                        ? getSectorColor(item.name)
                        : activeBreakdown === 'asset' && item.name === 'Aktien'
                        ? '#10b981'
                        : activeBreakdown === 'asset' && item.name === 'Bargeld'
                        ? '#3b82f6'
                        : `hsl(${index * 60}, 70%, 50%)`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-theme-muted mt-1">
                  <span>{item.holdings.length} {item.holdings.length === 1 ? 'Position' : 'Positionen'}</span>
                  <span>{formatValue(item.value)}</span>
                </div>
              </div>
            ))}
            
            {breakdownData.length > 6 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-2 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                {showAll ? 'Weniger anzeigen' : `${breakdownData.length - 6} weitere anzeigen`}
              </button>
            )}
          </div>

          {/* Summary Stats */}
          <div className="mt-6 pt-4 border-t border-theme/10 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-theme-muted">Kategorien gesamt</p>
              <p className="text-lg font-semibold text-theme-primary">{breakdownData.length}</p>
            </div>
            <div>
              <p className="text-xs text-theme-muted">Größte Position</p>
              <p className="text-lg font-semibold text-green-400">
                {breakdownData[0]?.percentage && !isNaN(breakdownData[0].percentage) && isFinite(breakdownData[0].percentage) ? breakdownData[0].percentage.toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Details</h3>
            <button
              onClick={() => loadData()}
              className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 text-theme-secondary" />
            </button>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {displayData.map((item, index) => (
              <div key={index} className="p-3 bg-theme-secondary/20 rounded-lg hover:bg-theme-secondary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {activeBreakdown === 'country' && (
                      <span className="text-2xl">{getCountryFlag(item.name)}</span>
                    )}
                    <div>
                      <p className="font-semibold text-theme-primary">{item.name}</p>
                      <p className="text-xs text-theme-muted">
                        {item.holdings.length} {item.holdings.length === 1 ? 'Position' : 'Positionen'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-theme-primary">
                      {formatValue(item.value)}
                    </p>
                    <p className="text-sm text-green-400">
                      {item.percentage && !isNaN(item.percentage) && isFinite(item.percentage) ? item.percentage.toFixed(2) : '0.00'}%
                    </p>
                  </div>
                </div>
                
                {/* Holdings Preview */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.holdings.slice(0, 4).map((symbol, i) => (
                    <span key={i} className="px-2 py-0.5 bg-theme-secondary/50 rounded text-xs text-theme-secondary">
                      {symbol}
                    </span>
                  ))}
                  {item.holdings.length > 4 && (
                    <span className="px-2 py-0.5 bg-theme-secondary/50 rounded text-xs text-theme-muted">
                      +{item.holdings.length - 4} weitere
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portfolio Insights */}
      <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
        <div className="flex items-start gap-3">
          <SparklesIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-theme-primary mb-2">
              Portfolio-Analyse
            </h4>
            <p className="text-sm text-theme-secondary">
              {activeBreakdown === 'sector' && breakdownData[0] && 
                `Ihr Portfolio hat ${breakdownData[0].percentage && !isNaN(breakdownData[0].percentage) ? breakdownData[0].percentage.toFixed(1) : '0.0'}% Exposure in ${breakdownData[0].name}. ${
                  breakdownData[0].percentage > 40 
                    ? 'Erwägen Sie eine Diversifizierung zur Risikominderung.'
                    : breakdownData.length < 5
                    ? 'Erwägen Sie eine Diversifizierung über mehr Branchen.'
                    : 'Gute Branchendiversifikation.'
                }`}
              {activeBreakdown === 'country' && 
                `Geografische Verteilung über ${breakdownData.length} ${breakdownData.length === 1 ? 'Land' : 'Länder'}. ${
                  breakdownData[0]?.percentage && !isNaN(breakdownData[0].percentage) && breakdownData[0].percentage > 80 
                    ? 'Erwägen Sie mehr internationale Diversifikation.'
                    : 'Gut diversifizierte geografische Allokation.'
                }`}
              {activeBreakdown === 'asset' && 
                `Bargeldanteil: ${totalValue && totalValue > 0 ? (cashPosition / totalValue * 100).toFixed(1) : '0.0'}%. ${
                  totalValue > 0 && cashPosition / totalValue > 0.3 
                    ? 'Hohe Bargeldposition - erwägen Sie mehr Investitionen für bessere Renditen.'
                    : totalValue > 0 && cashPosition / totalValue < 0.05
                    ? 'Niedrige Barreserve - halten Sie etwas Bargeld für Gelegenheiten bereit.'
                    : 'Ausgewogene Bargeldposition für Flexibilität.'
                }`}
              {activeBreakdown === 'cap' && breakdownData[0] &&
                `Hauptexposure in ${breakdownData[0].name} Unternehmen. ${
                  breakdownData.length === 1
                    ? 'Erwägen Sie eine Diversifizierung über verschiedene Marktkapitalisierungen.'
                    : 'Diversifizierte Marktkapitalisierung.'
                }`}
              {activeBreakdown === 'currency' && 
                `Währungsexposure über ${breakdownData.length} ${breakdownData.length === 1 ? 'Währung' : 'Währungen'}. ${
                  breakdownData.find(d => d.name !== 'EUR' && d.name !== 'USD')
                    ? `Fremdwährungsrisiko: ${breakdownData.filter(d => d.name !== 'EUR').reduce((sum, d) => {
                        const percentage = d.percentage && !isNaN(d.percentage) && isFinite(d.percentage) ? d.percentage : 0
                        return sum + percentage
                      }, 0).toFixed(1)}%.`
                    : 'Hauptsächlich EUR/USD Exposure - geringes Währungsrisiko.'
                }`}
            </p>
            
            {/* Wechselkurs Info */}
            {displayCurrency === 'EUR' && exchangeRate && (
              <p className="text-xs text-theme-muted mt-2">
                Aktueller Wechselkurs: 1 USD = {exchangeRate.toFixed(4)} EUR
              </p>
            )}
            
            {/* Wichtiger Disclaimer */}
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-yellow-600 mb-1">Wichtiger Hinweis</p>
                  <p className="text-xs text-theme-secondary leading-relaxed">
                    Die hier dargestellten Analysen und Empfehlungen dienen nur zu Informationszwecken und stellen keine Anlageberatung dar. 
                    Investmententscheidungen sollten immer auf Ihrer eigenen Recherche und Risikoeinschätzung basieren. 
                    Vergangene Performance ist kein Indikator für zukünftige Ergebnisse.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}