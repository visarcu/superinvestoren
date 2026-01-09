// src/app/superinvestor/insights/page.tsx - REFACTORED
'use client'

import React, { useState, useRef, useEffect, useMemo, memo } from 'react'
import Link from 'next/link'
import {
  ChartBarIcon,
  CalendarIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  StarIcon,
  EyeIcon,
  BoltIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'
import Logo from '@/components/Logo'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

// Import Types
import type {
  Position,
  HoldingSnapshot,
  QuarterOption,
  SectorAnalysis,
  GeographicExposure,
  BuySellBalance,
  ActivityData,
  BigMove,
  ConcentrationData,
  BigBetData,
  ContrarianData,
} from '@/types/insights'

// Import Calculation Functions
import {
  preprocessedData,
  investorNames,
  formatCurrencyGerman,
  getTicker,
  getSmartLatestQuarter,
  calculateTopBuys,
  calculateTopOwned,
  calculateBiggestInvestments,
  calculateDataSourceStats,
  calculateMomentumShifts,
  calculateExitTracker,
  calculateNewDiscoveries,
  calculateResearchGems,
  calculateSectorNetFlows,
  calculateBuySellBalance,
  calculateTopSectors,
  calculateGeographicExposure,
  getStockName,
  calculationCache,
} from '@/utils/insightsCalculations'

// Hook für Intersection Observer (nur für Hero)
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
  
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])
  
  return [ref, isVisible] as const
}

// MEMOIZED Quarter Selector
interface QuarterSelectorProps {
  options: QuarterOption[]
  selected: string
  onSelect: (id: string) => void
}

const QuarterSelector = memo<QuarterSelectorProps>(({ 
  options, 
  selected, 
  onSelect 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ 
    top: 0, 
    left: 0, 
    width: 0,
    maxHeight: 400 
  })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selectedOption = options.find(opt => opt.id === selected)
  
  const updateDropdownPosition = () => {
    if (!buttonRef.current) return
    
    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const dropdownHeight = Math.min(400, options.length * 60 + 40)
    
    setDropdownPosition({
      top: 0,
      left: 0,
      width: Math.max(280, rect.width),
      maxHeight: Math.min(dropdownHeight, spaceBelow - 20)
    })
  }

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition()
      const handleReposition = () => {
        if (isOpen) updateDropdownPosition()
      }
      
      window.addEventListener('scroll', handleReposition, true)
      window.addEventListener('resize', handleReposition)
      
      return () => {
        window.removeEventListener('scroll', handleReposition, true)
        window.removeEventListener('resize', handleReposition)
      }
    }
  }, [isOpen, options.length])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const dropdownContent = isOpen && (
    <div 
      style={{ 
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        width: `${Math.max(280, dropdownPosition.width)}px`,
        maxHeight: `${dropdownPosition.maxHeight}px`
      }}
      className="absolute backdrop-blur-md border rounded-xl shadow-2xl z-[100] mt-2"
    >
      <div style={{ borderColor: 'var(--border-color)' }} className="p-3 border-b">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-theme-secondary" />
          <span className="text-sm font-medium text-theme-secondary">Zeitraum wählen</span>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-2">
        <div className="space-y-1">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-colors duration-200 ${
                selected === option.id 
                  ? 'bg-brand/80 text-white shadow-md' 
                  : 'text-theme-secondary hover:bg-theme-hover hover:text-white'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs opacity-75 mt-1">{option.description}</div>
              {option.quarters.length > 1 && (
                <div className="text-xs opacity-60 mt-1">
                  {option.quarters.length} Quartale
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--bg-card)' 
      }} className="p-3 border-t bg-opacity-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>ESC zum Schließen</span>
          <span>{options.length} Optionen</span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 hover:bg-theme-hover border rounded-lg text-sm text-theme-secondary hover:text-white transition-colors duration-200 hover:scale-105 hover:shadow-lg min-w-[160px]"
        >
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{selectedOption?.label || 'Wählen'}</span>
          <ChevronDownIcon 
            className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </div>
      {dropdownContent}
    </>
  )
})

QuarterSelector.displayName = 'QuarterSelector'

// MEMOIZED Stock Item Component
interface StockItemProps {
  ticker: string
  count: number
  value?: number
  name?: string
  linkTo?: string
  rightLabel?: string
  showValue?: boolean
}
const StockItem = memo<StockItemProps & { index?: number }>(({ 
  ticker, 
  count, 
  value, 
  name, 
  linkTo = 'super-investors',
  rightLabel = 'Investoren',
  showValue = false,
  index 
}) => (
  <Link
    href={`/analyse/stocks/${ticker.toLowerCase()}/${linkTo}`}
    style={{ 
      backgroundColor: 'var(--bg-card)',
      borderBottom: index !== undefined && index < 14 ? '1px solid rgba(255,255,255,0.03)' : 'none'
    }}
    className="flex justify-between items-center p-3 rounded-lg hover:bg-theme-hover transition-colors group"
  >

    <div className="flex items-center gap-3">
      <div className="w-8 h-8 relative">
        <Logo
          ticker={ticker}
          alt={`${ticker} Logo`}
          className="w-full h-full"
          padding="none"
        />
      </div>
      <div>
        <p className="text-white font-medium group-hover:text-brand-light transition-colors">
          {ticker}
        </p>
        <p className="text-gray-500 text-xs truncate max-w-[120px]">
          {name || preprocessedData.nameMap.get(ticker) || ticker}
        </p>
      </div>
    </div>
    <div className="text-right">
      <span className="text-brand-light text-sm font-semibold bg-brand/20 px-2 py-1 rounded">
        {showValue && value ? formatCurrencyGerman(value, false) : count}
      </span>
      <p className="text-xs text-gray-500">{rightLabel}</p>
    </div>
  </Link>
))

StockItem.displayName = 'StockItem'
export default function MarketInsightsPage() {
  // Loading State - NEU HIER EINFÜGEN
  const [isLoading, setIsLoading] = useState(true)
  
  // Hero Animation
  const [heroRef, heroVisible] = useIntersectionObserver(0.3)
 
  // Smart Latest Quarter mit Caching
  const actualLatestQuarter = useMemo(() => getSmartLatestQuarter(), [])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600) // Reduziert auf 600ms
    
    return () => clearTimeout(timer)
  }, [])

  // Quarter Options
  const quarterOptions: QuarterOption[] = useMemo(() => [
    {
      id: 'latest',
      label: actualLatestQuarter,
      quarters: [actualLatestQuarter],
      description: 'Neuestes Quartal (≥50% Investoren)'
    },
    {
      id: 'last2',
      label: 'Letzte 2 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 2),
      description: `${preprocessedData.allQuarters.slice(0, 2).join(' + ')}`
    },
    {
      id: 'last3',
      label: 'Letzte 3 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 3),
      description: `${preprocessedData.allQuarters.slice(0, 3).join(', ')}`
    },
    ...preprocessedData.allQuarters.slice(0, 6).map(quarter => ({
      id: quarter,
      label: quarter,
      quarters: [quarter],
      description: 'Einzelnes Quartal'
    })),
    {
      id: 'all',
      label: 'Alle Zeit',
      quarters: preprocessedData.allQuarters,
      description: 'Alle verfügbaren Quartale'
    }
  ], [actualLatestQuarter])

  // State für Filter
  const [selectedPeriod, setSelectedPeriod] = useState('latest')
  const [sectorPeriod, setSectorPeriod] = useState('last2') 

  // Loading Effect - NEU HIER EINFÜGEN
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    
    return () => clearTimeout(timer)
  }, [])

  // Data Source Stats
  const dataSourceStats = useMemo(() => {



    const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
    const quarters = selectedOption?.quarters || [actualLatestQuarter]
    return calculateDataSourceStats(quarters)
  }, [selectedPeriod, quarterOptions, actualLatestQuarter])
  // Main calculations with caching
  const topBuys = useMemo(() => {
    const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
    const quarters = selectedOption?.quarters || [actualLatestQuarter]
    return calculateTopBuys(quarters)
  }, [selectedPeriod, quarterOptions, actualLatestQuarter])
  const topOwned = useMemo(() => calculateTopOwned(), [])
  const biggestInvestments = useMemo(() => calculateBiggestInvestments(), [])

  // Sektor-Analyse mit Caching
  const topSectors = useMemo(() => {
    const cacheKey = 'topSectors'
    if (calculationCache.has(cacheKey)) {
      return calculationCache.get(cacheKey)
    }
    
    const sectorAnalysis = new Map<string, { value: number, count: number }>()
    
    preprocessedData.activeInvestors.forEach(slug => {
      const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      
      latest.positions.forEach((p: Position) => {
        const sector = getSectorFromPosition({
          cusip: p.cusip,
          ticker: getTicker(p)
        })
        
        const germanSector = translateSector(sector)
        
        const current = sectorAnalysis.get(germanSector)
        
        if (current) {
          current.value += p.value
          current.count += 1
        } else {
          sectorAnalysis.set(germanSector, { value: p.value, count: 1 })
        }
      })
    })

    const result: SectorAnalysis[] = Array.from(sectorAnalysis.entries())
      .map(([sector, { value, count }]) => ({ sector, value, count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      
    calculationCache.set(cacheKey, result)
    return result
  }, [])

  // Geographic Exposure mit Caching
  const { usValue, internationalValue, usPercentage, intlPercentage } = useMemo(() => {
    const cacheKey = 'geographicExposure'
    if (calculationCache.has(cacheKey)) {
      return calculationCache.get(cacheKey)
    }
    
    let usValue = 0
    let internationalValue = 0
    
    preprocessedData.activeInvestors.forEach(slug => {
      const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      
      latest.positions.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (!ticker) return
        
        const isInternational = ticker.includes('.') || 
          ['ASML', 'TSM', 'NESN', 'BABA', 'TCEHY', 'UL', 'NVO', 'NVSEF', 'SAP'].includes(ticker)
        
        if (isInternational) {
          internationalValue += p.value
        } else {
          usValue += p.value
        }
      })
    })
    
    const totalValue = usValue + internationalValue
    const usPercentage = totalValue > 0 ? (usValue / totalValue) * 100 : 0
    const intlPercentage = totalValue > 0 ? (internationalValue / totalValue) * 100 : 0
    
    const result: GeographicExposure = { usValue, internationalValue, usPercentage, intlPercentage }
    calculationCache.set(cacheKey, result)
    return result
  }, [])

  const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
const targetQuarters = selectedOption?.quarters || [actualLatestQuarter]

  const momentumShifts = useMemo(() => 
    calculateMomentumShifts(targetQuarters), [targetQuarters]
  );
  
  const exitTracker = useMemo(() => 
    calculateExitTracker(targetQuarters), [targetQuarters]
  );
  
  const newDiscoveries = useMemo(() => 
    calculateNewDiscoveries(targetQuarters), [targetQuarters]
  );
  
  const researchGems = useMemo(() => 
    calculateResearchGems(), []
  );

  const buySellBalance = useMemo(() => {
    const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
    const quarters = selectedOption?.quarters || [actualLatestQuarter]
    // Erweitere auf 4 Quartale für historische Analyse
    const allAvailableQuarters = preprocessedData.allQuarters
    const startIndex = allAvailableQuarters.indexOf(quarters[0])
    const quartersForBalance = startIndex >= 0 ? 
      allAvailableQuarters.slice(startIndex, startIndex + 4) : 
      allAvailableQuarters.slice(0, 4)
    return calculateBuySellBalance(quartersForBalance)
  }, [selectedPeriod, quarterOptions, actualLatestQuarter, preprocessedData.allQuarters]);

  const sectorNetFlows = useMemo(() => {
    const selectedOption = quarterOptions.find(opt => opt.id === sectorPeriod)
    const quarters = selectedOption?.quarters || preprocessedData.allQuarters.slice(0, 2)
    return calculateSectorNetFlows(quarters)
  }, [sectorPeriod, quarterOptions])

  return (
    <div className="min-h-screen bg-dark">
      
      {/* Header - Quartr Style */}
      <section className="bg-dark pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zur Übersicht
            </Link>
          </div>

          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">Market Insights</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>{dataSourceStats.investorsWithData} von {dataSourceStats.totalInvestors} Investoren</span>
                </div>
              </div>
              
              <p className="text-lg text-neutral-400 max-w-4xl leading-relaxed mb-6">
                Detaillierte Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
                Entdecke Trends, Sektoren und Investment-Patterns der Super-Investoren.
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium">📋 {dataSourceStats.filingsInPeriod} Filings</span>
                  <span>•</span>
                  <span>{quarterOptions.find(opt => opt.id === selectedPeriod)?.label || 'Aktueller Zeitraum'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📅 Letztes Update: {dataSourceStats.lastUpdated.split('-').reverse().join('.')}</span>
                </div>
              </div>
            </div>
          </div>

      
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Stats Overview - Quartr Style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">
                  {(topBuys as any).totalUniqueStocks || topBuys.filter(buy => buy.count > 0).length}
                </p>
                <p className="text-sm text-neutral-400">Gekaufte Aktien</p>
                <p className="text-xs text-neutral-500">
                  {dataSourceStats.investorsWithData} Investoren • {quarterOptions.find(opt => opt.id === selectedPeriod)?.label}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">
                  {(topOwned as any).totalUniqueStocks || topOwned.length}
                </p>
                <p className="text-sm text-neutral-400">Beliebte Aktien</p>
                <p className="text-xs text-neutral-500">Von 5+ Investoren gehalten</p>
              </div>
            </div>
          </div>
          
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">
                  {Math.round(biggestInvestments.reduce((sum, inv) => sum + inv.value, 0) / 1_000_000_000)}
                </p>
                <p className="text-sm text-neutral-400">Mrd. $ Investment</p>
                <p className="text-xs text-neutral-500">Top 20 Positionen</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-white">
                  {topSectors.length}
                </p>
                <p className="text-sm text-neutral-400">Top Sektoren</p>
                <p className="text-xs text-neutral-500">Nach Investment-Volumen</p>
              </div>
            </div>
          </div>
        </div>

{/* ZENTRALES DROPDOWN FÜR ANALYSE-ZEITRAUM - Quartr Style */}
<div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Globaler Analyse-Zeitraum</h3>
                <p className="text-xs text-neutral-400">
                  Beeinflusst: Top Käufe • Momentum Shifts • Exit Tracker • New Discoveries
                </p>
              </div>
            </div>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-xl text-sm font-medium cursor-pointer transition-all bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-700 focus:outline-none focus:border-neutral-600"
            >
              {quarterOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          
          {/* Top Käufe Chart */}
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">





        <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Top Käufe</h3>
                  <p className="text-sm text-neutral-400">Meist gekaufte Aktien</p>
                </div>
              </div>
              <div className="relative inline-block">
  <select
    value={selectedPeriod}
    onChange={(e) => setSelectedPeriod(e.target.value)}
    className="appearance-none px-3 py-2 pr-8 rounded-lg text-sm bg-neutral-800 border border-neutral-700 text-white hover:border-neutral-600 focus:outline-none cursor-pointer"
  >
    {quarterOptions.map(option => (
      <option 
        key={option.id} 
        value={option.id}
      >
        {option.label}
      </option>
    ))}
  </select>
  
  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
    <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
  </div>
</div>
            </div>

            <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-800 pb-3">
              <span>
                📊 {dataSourceStats.filingsInPeriod} Filings aus {quarterOptions.find(opt => opt.id === selectedPeriod)?.description}
              </span>
              <span>
                {dataSourceStats.investorsWithData} aktive Investoren
              </span>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topBuys.length > 0 ? (
                topBuys.slice(0, 15).map((item) => (
                  <StockItem
                    key={item.ticker}
                    ticker={item.ticker}
                    count={item.count}
                    rightLabel="Investoren"
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Käufe in diesem Zeitraum</p>
                  <p className="text-xs mt-1">Versuche einen anderen Zeitraum</p>
                </div>
              )}
            </div>
          </div>

          {/* Beliebteste Aktien - Quartr Style */}
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                <FireIcon className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Beliebteste Aktien</h3>
                <p className="text-sm text-neutral-400">Meist gehaltene Positionen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topOwned.slice(0, 15).map((item) => (
                <StockItem
                  key={item.ticker}
                  ticker={item.ticker}
                  count={item.count}
                  rightLabel="Portfolios"
                />
              ))}
            </div>
          </div>

          {/* Größte Investments - Quartr Style */}
          <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Größte Investments</h3>
                <p className="text-sm text-neutral-400">Nach Dollar-Volumen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {biggestInvestments.slice(0, 15).map((item) => (
                <StockItem
                  key={item.ticker}
                  ticker={item.ticker}
                  count={0}
                  value={item.value}
                  name={item.name}
                  rightLabel="Wert"
                  showValue={true}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Investment Strategien - Quartr Style */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
              <StarIcon className="w-4 h-4" />
              Investment Strategien
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">
              Konsensus vs.
              <span className="text-emerald-400"> Contrarian Picks</span>
            </h2>
            <p className="text-neutral-400 max-w-3xl mx-auto">
              Links: Aktien mit breitem Konsensus und hoher Portfolio-Gewichtung. 
              Rechts: Seltene Überzeugungen weniger Investoren.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Konsensus-Aktien - Quartr Style */}
            <div className="bg-neutral-900/50 rounded-lg overflow-hidden border border-neutral-800">
              <div className="p-6 border-b border-neutral-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Konsensus-Aktien</h3>
                    <p className="text-sm text-neutral-400">Hohe Portfolio-Gewichtung bei mehreren Investoren</p>
                  </div>
                </div>
              </div>

              {(() => {
                const bigBetsData: BigBetData[] = [];

                const stockData = new Map<string, {
                  investors: Array<{ slug: string; name: string; percent: number; value: number }>;
                  totalValue: number;
                  maxPercent: number;
                  name: string;
                }>();

                Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
                  if (!snaps || snaps.length === 0) return;
                  
                  const latest = snaps[snaps.length - 1]?.data;
                  if (!latest?.positions) return;

                  const totalPortfolioValue = latest.positions.reduce((sum, p) => sum + p.value, 0);
                  
                  const mergedPositions = new Map<string, { value: number; name: string }>();
                  latest.positions.forEach((p: Position) => {
                    const ticker = getTicker(p);
                    if (!ticker) return;
                    
                    const current = mergedPositions.get(ticker);
                    if (current) {
                      current.value += p.value;
                    } else {
                      mergedPositions.set(ticker, { 
                        value: p.value, 
                        name: getStockName(p) 
                      });
                    }
                  });

                  mergedPositions.forEach(({ value, name }, ticker) => {
                    const percent = (value / totalPortfolioValue) * 100;
                    
                    if (percent >= 3) {
                      const current = stockData.get(ticker);
                      
                      if (current) {
                        current.investors.push({
                          slug: investorSlug,
                          name: investorNames[investorSlug] || investorSlug,
                          percent,
                          value
                        });
                        current.totalValue += value;
                        current.maxPercent = Math.max(current.maxPercent, percent);
                      } else {
                        stockData.set(ticker, {
                          investors: [{
                            slug: investorSlug,
                            name: investorNames[investorSlug] || investorSlug,
                            percent,
                            value
                          }],
                          totalValue: value,
                          maxPercent: percent,
                          name
                        });
                      }
                    }
                  });
                });

                stockData.forEach((data, ticker) => {
                  if (data.investors.length >= 2) {
                    const topInvestor = data.investors.sort((a, b) => b.percent - a.percent)[0];
                    
                    bigBetsData.push({
                      ticker,
                      name: data.name,
                      maxPortfolioPercent: data.maxPercent,
                      ownershipCount: data.investors.length,
                      totalValue: data.totalValue,
                      topInvestor: topInvestor.name
                    });
                  }
                });

                bigBetsData.sort((a, b) => b.maxPortfolioPercent - a.maxPortfolioPercent);

                return (
                  <div className="p-6 max-h-96 overflow-y-auto">
                    <div className="space-y-3">
                      {bigBetsData.slice(0, 8).map((bet) => (
                        <Link
                          key={bet.ticker}
                          href={`/analyse/stocks/${bet.ticker.toLowerCase()}/super-investors`}
                          className="block p-3 bg-neutral-800/50 border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 relative">
                                <Logo
                                  ticker={bet.ticker}
                                  alt={`${bet.ticker} Logo`}
                                  className="w-full h-full"
                                  padding="none"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-white group-hover:text-brand-light transition-colors">
                                  {bet.ticker}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                  {bet.name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-brand-light font-bold text-lg">
                                {bet.maxPortfolioPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {bet.ownershipCount} Investoren
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-theme-secondary">{bet.ownershipCount} Investoren</span>
                            <span className="text-theme-secondary">
                              {formatCurrencyGerman(bet.totalValue, false)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Contrarian Picks - Quartr Style */}
            <div className="bg-neutral-900/50 rounded-lg overflow-hidden border border-neutral-800">
              <div className="p-6 border-b border-neutral-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Contrarian Picks</h3>
                    <p className="text-sm text-neutral-400">Wenige Investoren, hohe Überzeugung</p>
                  </div>
                </div>
              </div>

              {(() => {
                const contrarianData: ContrarianData[] = [];

                const ownershipCount = new Map<string, number>();
                Object.values(holdingsHistory).forEach(snaps => {
                  if (!snaps || snaps.length === 0) return;
                  
                  const latest = snaps[snaps.length - 1]?.data;
                  if (!latest?.positions) return;
                  
                  const seen = new Set<string>();
                  latest.positions.forEach((p: Position) => {
                    const ticker = getTicker(p);
                    if (ticker && !seen.has(ticker)) {
                      seen.add(ticker);
                      ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1);
                    }
                  });
                });

                Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
                  if (!snaps || snaps.length === 0) return;
                  
                  const latest = snaps[snaps.length - 1]?.data;
                  if (!latest?.positions) return;

                  const totalPortfolioValue = latest.positions.reduce((sum, p) => sum + p.value, 0);
                  
                  const mergedPositions = new Map<string, { value: number; name: string }>();
                  latest.positions.forEach((p: Position) => {
                    const ticker = getTicker(p);
                    if (!ticker) return;
                    
                    const current = mergedPositions.get(ticker);
                    if (current) {
                      current.value += p.value;
                    } else {
                      mergedPositions.set(ticker, { 
                        value: p.value, 
                        name: getStockName(p) 
                      });
                    }
                  });

                  mergedPositions.forEach(({ value, name }, ticker) => {
                    const percent = (value / totalPortfolioValue) * 100;
                    const totalOwners = ownershipCount.get(ticker) || 0;
                    
                    if (percent >= 4 && totalOwners <= 2) {
                      contrarianData.push({
                        ticker,
                        name,
                        portfolioPercent: percent,
                        investor: investorNames[investorSlug] || investorSlug,
                        value,
                        ownershipCount: totalOwners
                      });
                    }
                  });
                });

                contrarianData.sort((a, b) => b.portfolioPercent - a.portfolioPercent);

                return (
                  <div className="p-6 max-h-96 overflow-y-auto">
                    {contrarianData.length > 0 ? (
                      <div className="space-y-3">
                        {contrarianData.slice(0, 8).map((pick) => (
                          <Link
                            key={`${pick.ticker}-${pick.investor}`}
                            href={`/analyse/stocks/${pick.ticker.toLowerCase()}/super-investors`}
                            className="block p-3 bg-neutral-800/50 border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 relative">
                                  <Logo
                                    ticker={pick.ticker}
                                    alt={`${pick.ticker} Logo`}
                                    className="w-full h-full"
                                    padding="none"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-white group-hover:text-brand-light transition-colors">
                                    {pick.ticker}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {pick.name}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-brand-light font-bold text-lg">
                                  {pick.portfolioPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  {pick.ownershipCount} Investor{pick.ownershipCount !== 1 ? 'en' : ''}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-green-300 font-medium">{pick.investor}</span>
                              <span className="text-theme-secondary">
                                {formatCurrencyGerman(pick.value, false)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <BoltIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Keine Contrarian Picks gefunden</p>
                        <p className="text-xs mt-1">Kriterium: Mehr als 4% des Portfolios + ≤2 Investoren</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="mt-8 p-4 bg-neutral-800/50 border border-neutral-800 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-400">
              <div>
                <strong className="text-emerald-400">Konsensus-Aktien:</strong> Mindestens 3% Portfolio-Gewichtung bei 2+ Investoren. 
                Zeigt breiten Konsensus mit hoher Überzeugung.
              </div>
              <div>
                <strong className="text-emerald-400">Contrarian Picks:</strong> Mindestens 4% Portfolio-Gewichtung bei max. 2 Investoren. 
                Zeigt seltene, aber starke Überzeugungen.
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Konzentration Analysis */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
              <ShieldCheckIcon className="w-4 h-4" />
              Portfolio Konzentration
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">
              Konzentration vs.
              <span className="text-emerald-400"> Diversifikation</span>
            </h2>
            <p className="text-neutral-400">
              Wer setzt auf wenige große Positionen vs. breite Diversifikation?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const concentrationData: ConcentrationData[] = [];

              ['buffett', 'ackman', 'smith', 'gates', 'marks', 'icahn', 'einhorn', 'loeb', 'tepper'].forEach(slug => {
                const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
                if (!snaps || snaps.length === 0) return;

                const latest = snaps[snaps.length - 1]?.data;
                if (!latest?.positions) return;

                const mergedMap = new Map<string, number>();
                latest.positions.forEach((p: Position) => {
                  const ticker = getTicker(p) || p.cusip;
                  mergedMap.set(ticker, (mergedMap.get(ticker) || 0) + p.value);
                });

                const sortedPositions = Array.from(mergedMap.values()).sort((a, b) => b - a);
                const totalValue = sortedPositions.reduce((sum, val) => sum + val, 0);
                
                if (totalValue === 0) return;

                const herfindahl = sortedPositions.reduce((sum, value) => {
                  const percentage = value / totalValue;
                  return sum + (percentage * percentage);
                }, 0);

                const top3Value = sortedPositions.slice(0, 3).reduce((sum, val) => sum + val, 0);
                const top3Percentage = (top3Value / totalValue) * 100;

                let type: 'high' | 'medium' | 'low';
                if (herfindahl > 0.2) type = 'high';
                else if (herfindahl > 0.1) type = 'medium';
                else type = 'low';

                concentrationData.push({
                  investor: investorNames[slug] || slug,
                  concentration: herfindahl,
                  top3Percentage,
                  totalPositions: sortedPositions.length,
                  type
                });
              });

              concentrationData.sort((a, b) => b.concentration - a.concentration);

              return concentrationData.map((data) => (
                <div
                  key={data.investor}
                  className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{data.investor}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.type === 'high' ? 'bg-neutral-800 text-emerald-400' :
                      data.type === 'medium' ? 'bg-neutral-800 text-neutral-400' :
                      'bg-neutral-800 text-neutral-500'
                    }`}>
                      {data.type === 'high' ? 'Konzentriert' :
                       data.type === 'medium' ? 'Ausgewogen' : 'Diversifiziert'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-neutral-400 text-sm">Konzentrations-Index</span>
                      <span className="text-white font-semibold">{(data.concentration * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          data.type === 'high' ? 'bg-emerald-500' :
                          data.type === 'medium' ? 'bg-neutral-500' : 'bg-neutral-400'
                        }`}
                        style={{ width: `${Math.min(data.concentration * 100 * 5, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Top 3 Holdings:</span>
                      <span className={`font-semibold ${
                        data.top3Percentage > 60 ? 'text-brand-light' :
                        data.top3Percentage > 40 ? 'text-gray-400' : 'text-gray-300'
                      }`}>
                        {data.top3Percentage.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Gesamt-Positionen:</span>
                      <span className="text-white font-semibold">{data.totalPositions}</span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>


        {/* Sektor-Analyse - Quartr Style */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
              <BuildingOfficeIcon className="w-4 h-4" />
              Sektor-Analyse
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">
              Investment
              <span className="text-emerald-400"> Sektoren</span>
            </h2>
            <p className="text-neutral-400">
              Wie die Super-Investoren ihr Kapital auf verschiedene Wirtschaftssektoren verteilen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topSectors.map((sector: SectorAnalysis) => (
              <div
                key={sector.sector}
                className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{sector.sector}</h3>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 text-sm">Gesamt-Wert:</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatCurrencyGerman(sector.value)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400 text-sm">Positionen:</span>
                    <span className="text-white font-semibold">{sector.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


{/* ========== ADVANCED INSIGHTS SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
      <BoltIcon className="w-4 h-4" />
      Advanced Insights
    </div>
    <h2 className="text-3xl font-semibold text-white mb-4">
      Momentum & 
      <span className="text-emerald-400"> Timing Signals</span>
    </h2>
    <p className="text-neutral-400 max-w-3xl mx-auto">
      Fortgeschrittene Analysen zu Trendwenden, Exits und neuen Entdeckungen der Super-Investoren
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    {/* Momentum Shifts - Quartr Style */}
    <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
          <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Momentum Shifts</h3>
          <p className="text-sm text-neutral-400">Von Verkauf zu Kauf gedreht</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {momentumShifts.length > 0 ? (
          momentumShifts.map((shift, index) => (
            <Link
              key={shift.ticker}
              href={`/analyse/stocks/${shift.ticker.toLowerCase()}/super-investors`}
              className="block p-3 bg-neutral-800/50 border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 relative">
                    <Logo
                      ticker={shift.ticker}
                      alt={`${shift.ticker} Logo`}
                      className="w-full h-full"
                      padding="none"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-white group-hover:text-brand-light transition-colors">
                      {shift.ticker}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                      {shift.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <ArrowUpIcon className="w-3 h-3 text-brand-light" />
                    <span className="text-brand-light font-bold">
                      {shift.shifters.length}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">Umgedreht</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 truncate">
                {shift.shifters.slice(0, 2).join(', ')}
                {shift.shifters.length > 2 && ` +${shift.shifters.length - 2}`}
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ArrowTrendingUpIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Momentum Shifts gefunden</p>
            <p className="text-xs mt-1">Mindestens 2 Quartale nötig</p>
          </div>
        )}
      </div>
    </div>

    {/* Exit Tracker - Quartr Style */}
    <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
          <ArrowDownIcon className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Exit Tracker</h3>
          <p className="text-sm text-neutral-400">Komplett verkaufte Positionen</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {exitTracker.length > 0 ? (
          exitTracker.map((exit, index) => (
            <div
              key={exit.ticker}
              className="block p-3 bg-neutral-800/50 border border-neutral-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 relative">
                    <Logo
                      ticker={exit.ticker}
                      alt={`${exit.ticker} Logo`}
                      className="w-full h-full"
                      padding="none"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {exit.ticker}
                    </p>
                    <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                      {exit.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 font-semibold">
                    {exit.exitedBy.length}
                  </div>
                  <div className="text-xs text-neutral-500">Exits</div>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">
                  ⌀ {exit.avgHoldingPeriod.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Quartale
                </span>
                <span className="text-neutral-500">
                  {formatCurrencyGerman(exit.totalValueExited, false)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ArrowDownIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Exits in diesem Zeitraum</p>
          </div>
        )}
      </div>
    </div>

    {/* New Discoveries - Quartr Style */}
    <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
          <StarIcon className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">New Discoveries</h3>
          <p className="text-sm text-neutral-400">Erstmalige Käufe</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {newDiscoveries.length > 0 ? (
          newDiscoveries.map((discovery, index) => (
            <Link
              key={discovery.ticker}
              href={`/analyse/stocks/${discovery.ticker.toLowerCase()}/super-investors`}
              className="block p-3 bg-neutral-800/50 border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 relative">
                    <Logo
                      ticker={discovery.ticker}
                      alt={`${discovery.ticker} Logo`}
                      className="w-full h-full"
                      padding="none"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                      {discovery.ticker}
                    </p>
                    <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                      {discovery.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-semibold">
                    {discovery.discoveredBy.length}
                  </div>
                  <div className="text-xs text-neutral-500">Neu dabei</div>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 truncate max-w-[150px]">
                  {discovery.discoveredBy.slice(0, 2).join(', ')}
                </span>
                <span className="text-emerald-400">
                  ⌀ {formatCurrencyGerman(discovery.avgPosition, false)}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <StarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine neuen Entdeckungen</p>
            <p className="text-xs mt-1">Min. 2 Investoren & 5M Position</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

{/* ========== SPECIAL INSIGHTS SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
      <EyeIcon className="w-4 h-4" />
      Special Insights
    </div>
    <h2 className="text-3xl font-semibold text-white mb-4">
      Hidden Gems, 
      <span className="text-neutral-400"> Deutsche Aktien</span> &
      <span className="text-neutral-400"> ETFs</span>
    </h2>
    <p className="text-neutral-400 max-w-3xl mx-auto">
      Small-Mid Caps, deutsche Unternehmen und beliebte ETFs in Superinvestor-Portfolios
    </p>
  </div>
  
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    {/* Unknown Stocks */}
    <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
          <span className="text-xl">💎</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Hidden Gems</h3>
          <p className="text-sm text-neutral-400">Unbekannte Small-Mid Caps</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {researchGems.unknownStocks.length > 0 ? (
          researchGems.unknownStocks.map((stock, index) => (
            <Link
              key={stock.ticker}
              href={`/analyse/stocks/${stock.ticker.toLowerCase()}/super-investors`}
              className="block p-4 border border-neutral-700 rounded-lg hover:border-neutral-600 hover:bg-neutral-800/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">
                    {stock.ticker}
                  </h4>
                  <p className="text-sm text-neutral-400 mt-1">
                    {stock.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded">
                      {stock.investorCount} Investor{stock.investorCount !== 1 ? 'en' : ''}
                    </span>
                    {stock.totalValue > 0 && (
                      <span className="text-xs text-neutral-500">
                        ${(stock.totalValue / 1000000).toFixed(0)}M
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xl text-neutral-500">
                  #{index + 1}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <span className="text-3xl mb-2 block">💎</span>
            <p className="text-sm">Keine Hidden Gems gefunden</p>
            <p className="text-xs mt-1">Nur 1-3 Investoren, nicht bekannt</p>
          </div>
        )}
      </div>
    </div>

    {/* German Stocks */}
    <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
          <span className="text-xl">🇩🇪</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Deutsche Aktien</h3>
          <p className="text-sm text-neutral-400">Deutsche Unternehmen bei US-Giganten</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {researchGems.germanStocks.length > 0 ? (
          researchGems.germanStocks.map((stock, index) => (
            <Link
              key={stock.ticker}
              href={`/analyse/stocks/${stock.ticker.toLowerCase()}/super-investors`}
              className="block p-4 border border-neutral-700 rounded-lg hover:border-neutral-600 hover:bg-neutral-800/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">
                    {stock.ticker}
                  </h4>
                  <p className="text-sm text-neutral-400 mt-1">
                    {stock.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded">
                      {stock.investorCount} Investor{stock.investorCount !== 1 ? 'en' : ''}
                    </span>
                    {stock.totalValue > 0 && (
                      <span className="text-xs text-neutral-500">
                        ${(stock.totalValue / 1000000).toFixed(0)}M
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xl text-neutral-500">
                  #{index + 1}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <span className="text-3xl mb-2 block">🇩🇪</span>
            <p className="text-sm">Keine deutschen Aktien gefunden</p>
            <p className="text-xs mt-1">Erweitere die deutsche Aktien-Liste</p>
          </div>
        )}
      </div>
    </div>

    {/* Popular ETFs */}
    <div className="bg-neutral-900/50 border border-neutral-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-neutral-800 rounded-lg">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Beliebte ETFs</h3>
          <p className="text-sm text-neutral-400">ETF-Favoriten der Superinvestoren</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {researchGems.popularETFs.length > 0 ? (
          researchGems.popularETFs.map((etf, index) => (
            <Link
              key={etf.ticker}
              href={`/analyse/stocks/${etf.ticker.toLowerCase()}/super-investors`}
              className="block p-4 border border-neutral-700 rounded-lg hover:border-neutral-600 hover:bg-neutral-800/50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">
                    {etf.ticker}
                  </h4>
                  <p className="text-sm text-neutral-400 mt-1">
                    {etf.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded">
                      {etf.investorCount} Investor{etf.investorCount !== 1 ? 'en' : ''}
                    </span>
                    {etf.category && (
                      <span className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded">
                        {etf.category}
                      </span>
                    )}
                    {etf.totalValue > 0 && (
                      <span className="text-xs text-neutral-500">
                        ${(etf.totalValue / 1000000).toFixed(0)}M
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xl text-neutral-500">
                  #{index + 1}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <span className="text-3xl mb-2 block">📊</span>
            <p className="text-sm">Keine ETFs gefunden</p>
            <p className="text-xs mt-1">Erweitere die ETF-Suche</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

{/* ========== BUY/SELL BALANCE SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
      <ScaleIcon className="w-4 h-4" />
      Market Sentiment
    </div>
    <h2 className="text-3xl font-semibold text-white mb-4">
      Buy/Sell Balance
    </h2>
    <p className="text-neutral-400 max-w-2xl mx-auto">
      Aggregate Kauf- und Verkaufsaktivitäten aller Superinvestoren zur Bestimmung der Marktstimmung
    </p>
  </div>

  <div className="max-w-6xl mx-auto">
    {/* Current Quarter Balance - OHNE äußere Box */}
    {buySellBalance.length > 0 && (
      <>
        {/* Header Zeile */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center">
              <ScaleIcon className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {buySellBalance[0].quarter} Market Sentiment
              </h3>
              <p className="text-sm text-neutral-500">
                Neuestes verfügbares Quartal
              </p>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-full text-sm font-semibold border ${
            buySellBalance[0].sentiment === 'bullish'
              ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' :
            buySellBalance[0].sentiment === 'bearish'
              ? 'bg-red-900/30 text-red-400 border-red-800/50' :
              'bg-neutral-800 text-neutral-400 border-neutral-700'
          }`}>
            {buySellBalance[0].sentiment === 'bullish' ? '📈 Bullish Market' :
             buySellBalance[0].sentiment === 'bearish' ? '📉 Bearish Market' : '⚖️ Neutral Market'}
          </div>
        </div>

        {/* Stats Grid - ohne extra Card drumrum */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Käufe */}
          <div className="p-6 rounded-xl border border-emerald-800/30 bg-emerald-900/10">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Käufe</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {formatCurrencyGerman(buySellBalance[0].totalBuys, false)}
            </div>
            <div className="text-sm text-emerald-400/60">
              {buySellBalance[0].buysCount} Positionen
            </div>
          </div>

          {/* Verkäufe */}
          <div className="p-6 rounded-xl border border-red-800/30 bg-red-900/10">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownIcon className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Verkäufe</span>
            </div>
            <div className="text-3xl font-bold text-red-400">
              {formatCurrencyGerman(buySellBalance[0].totalSells, false)}
            </div>
            <div className="text-sm text-red-400/60">
              {buySellBalance[0].sellsCount} Positionen
            </div>
          </div>

          {/* Netto - neutral styling */}
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center gap-2 mb-2">
              <ScaleIcon className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-400">Netto-Flow</span>
            </div>
            <div className={`text-3xl font-bold ${
              buySellBalance[0].netFlow > 0
                ? 'text-emerald-400'
                : buySellBalance[0].netFlow < 0
                ? 'text-red-400'
                : 'text-neutral-400'
            }`}>
              {buySellBalance[0].netFlow > 0 ? '+' : ''}{formatCurrencyGerman(buySellBalance[0].netFlow, false)}
            </div>
            <div className="text-sm text-neutral-500">
              {buySellBalance[0].netFlow > 0 ? 'Netto-Käufe' : buySellBalance[0].netFlow < 0 ? 'Netto-Verkäufe' : 'Ausgeglichen'}
            </div>
          </div>
        </div>

        {/* Historischer Trend - Divider statt Box */}
        <div className="border-t border-neutral-800 pt-8">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="w-5 h-5 text-neutral-500" />
            <h4 className="text-lg font-semibold text-white">
              Historischer Trend
            </h4>
            <span className="text-sm text-neutral-500">
              (Letzte 4 Quartale)
            </span>
          </div>

          {/* Trend Cards - kleiner, weniger prominent */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {buySellBalance.map((quarter, index) => (
              <div key={quarter.quarter} className={`p-4 rounded-lg border transition-all ${
                index === 0
                  ? 'border-neutral-700 bg-neutral-800'
                  : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-500">
                    {quarter.quarter}
                  </span>
                  {index === 0 && (
                    <span className="text-xs px-2 py-0.5 bg-neutral-700 text-neutral-300 rounded">
                      Aktuell
                    </span>
                  )}
                </div>

                <div className={`text-lg font-bold ${
                  quarter.netFlow > 0 ? 'text-emerald-400' :
                  quarter.netFlow < 0 ? 'text-red-400' :
                  'text-neutral-400'
                }`}>
                  {quarter.netFlow > 0 ? '+' : ''}{formatCurrencyGerman(quarter.netFlow, true)}
                </div>

                <div className="text-xs text-neutral-600 mt-1">
                  {quarter.sentiment === 'bullish' ? '📈 Bullish' :
                   quarter.sentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
</div>

{/* ========== SECTOR NET FLOWS SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
      <ArrowTrendingUpIcon className="w-4 h-4" />
      Sector Analysis
    </div>
    <h2 className="text-3xl font-semibold text-white mb-4">
      Sektor
      <span className="text-emerald-400"> Net Flows</span>
    </h2>
    <p className="text-neutral-400 max-w-3xl mx-auto mb-6">
      Kapitalzu- und -abflüsse nach Wirtschaftssektoren im Zeitvergleich
    </p>
    
    {/* DROPDOWN FÜR SECTOR FLOWS */}
    <div className="flex justify-center">
      <div className="relative inline-block">
        <select
          value={sectorPeriod}
          onChange={(e) => setSectorPeriod(e.target.value)}
          className="appearance-none pl-10 pr-10 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-700 focus:outline-none focus:border-neutral-600 min-w-[200px]"
        >
          {quarterOptions.filter(option => option.quarters.length >= 2).map(option => (
            <option 
              key={option.id} 
              value={option.id}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <CalendarIcon className="w-4 h-4 text-neutral-400" />
        </div>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
        </div>
      </div>
    </div>
  </div>

  <div className="max-w-6xl mx-auto">
    {/* Sector Flows - OHNE äußere Box */}
    {sectorNetFlows.size > 0 ? (
      <div className="space-y-8">
        {/* Sortiere und teile in Zuflüsse und Abflüsse */}
        {(() => {
          const sorted = Array.from(sectorNetFlows.entries())
            .sort(([,a], [,b]) => b - a);

          const inflows = sorted.filter(([,flow]) => flow > 0);
          const outflows = sorted.filter(([,flow]) => flow < 0);

          return (
            <>
              {/* Zuflüsse */}
              {inflows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-emerald-400 mb-4 flex items-center gap-2">
                    <ArrowUpIcon className="w-4 h-4" />
                    Kapitalzuflüsse
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inflows.map(([sector, flow]) => (
                      <div
                        key={sector}
                        className="p-4 rounded-lg border border-emerald-800/30 bg-emerald-900/10 hover:border-emerald-700/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-white">{sector}</span>
                          <span className="text-emerald-400 font-semibold">
                            +{formatCurrencyGerman(flow, false)}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((flow / Math.max(...inflows.map(([,f]) => f))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abflüsse */}
              {outflows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-400 mb-4 flex items-center gap-2">
                    <ArrowDownIcon className="w-4 h-4" />
                    Kapitalabflüsse
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {outflows.map(([sector, flow]) => (
                      <div
                        key={sector}
                        className="p-4 rounded-lg border border-red-800/30 bg-red-900/10 hover:border-red-700/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-white">{sector}</span>
                          <span className="text-red-400 font-semibold">
                            -{formatCurrencyGerman(Math.abs(flow), false)}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((Math.abs(flow) / Math.max(...outflows.map(([,f]) => Math.abs(f)))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Stats - Divider statt Box */}
              <div className="pt-6 border-t border-neutral-800">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {formatCurrencyGerman(inflows.reduce((sum, [,flow]) => sum + flow, 0), false)}
                    </div>
                    <div className="text-xs text-neutral-500">Gesamt-Zuflüsse</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {formatCurrencyGerman(Math.abs(outflows.reduce((sum, [,flow]) => sum + flow, 0)), false)}
                    </div>
                    <div className="text-xs text-neutral-500">Gesamt-Abflüsse</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {inflows.length + outflows.length}
                    </div>
                    <div className="text-xs text-neutral-500">Aktive Sektoren</div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    ) : (
      <div className="text-center py-12 text-neutral-500">
        <ArrowTrendingUpIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Keine Sektor-Flows in diesem Zeitraum</p>
        <p className="text-xs mt-1">Wähle mindestens 2 Quartale für Vergleich</p>
      </div>
    )}
  </div>
</div>

<br />
<br />

        {/* Recent Activity Tracking - Quartr Style */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
              <ClockIcon className="w-4 h-4" />
              Recent Activity
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">
              Aktivitäts-
              <span className="text-emerald-400">Tracking</span>
            </h2>
            <p className="text-neutral-400 mb-4">
              Welche Investoren sind am aktivsten? Wer kauft und verkauft am meisten?
            </p>
            <p className="text-sm text-neutral-500">
              📊 Analysiert werden die letzten 3 Quartale • Nur signifikante Änderungen von mehr als 100 Aktien/2% Portfolio-Gewichtung
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Most Active Investors - Quartr Style */}
            <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Aktivste Investoren</h3>
                  <p className="text-sm text-neutral-400">Portfolio-Änderungen der letzten 3 Quartale</p>
                </div>
              </div>

              {(() => {
                const activityData: ActivityData[] = [];

                Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
                  if (!snaps || snaps.length < 2) return;

                  let totalChanges = 0;
                  let buys = 0;
                  let sells = 0;
                  let lastActivity = '';

                  const recentSnaps = snaps.slice(-3);

                  for (let i = 1; i < recentSnaps.length; i++) {
                    const current = recentSnaps[i].data;
                    const previous = recentSnaps[i - 1].data;
                    lastActivity = current.date;

                    const prevMap = new Map<string, number>();
                    previous.positions?.forEach((p: Position) => {
                      const ticker = getTicker(p);
                      if (ticker) {
                        prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares);
                      }
                    });

                    const seen = new Set<string>();
                    current.positions?.forEach((p: Position) => {
                      const ticker = getTicker(p);
                      if (!ticker || seen.has(ticker)) return;
                      seen.add(ticker);

                      const prevShares = prevMap.get(ticker) || 0;
                      const delta = p.shares - prevShares;

                      if (Math.abs(delta) > 100) {
                        totalChanges++;
                        if (delta > 0) buys++;
                        else sells++;
                      }
                    });

                    prevMap.forEach((prevShares, ticker) => {
                      if (!seen.has(ticker) && prevShares > 100) {
                        totalChanges++;
                        sells++;
                      }
                    });
                  }

                  if (totalChanges > 0) {
                    activityData.push({
                      investor: investorNames[slug] || slug,
                      changes: totalChanges,
                      buys,
                      sells,
                      lastActivity
                    });
                  }
                });

                activityData.sort((a, b) => b.changes - a.changes);

                return (
                  <div className="space-y-4">
                   {activityData.slice(0, 6).map((data, index) => (
                   <Link
                   key={data.investor}
                   href={`/superinvestor/${Object.keys(investorNames).find(key => investorNames[key] === data.investor) || 'buffett'}`}
                   style={{ 
                     backgroundColor: 'var(--bg-card)',
                     borderBottom: index < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                   }}
                   className="flex items-center justify-between p-4 rounded-lg hover:bg-theme-hover transition-colors group"
                 >
                 
                        <div>
                          <h4 className="font-semibold text-white group-hover:text-brand-light transition-colors">
                            {data.investor}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Letztes Update: {data.lastActivity.split('-').reverse().join('.')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-brand-light font-bold text-lg mb-1">
                            {data.changes}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">Änderungen</div>
                          <div className="flex gap-3 text-xs">
                            <span className="text-brand-light flex items-center gap-1">
                              <ArrowUpIcon className="w-3 h-3" />
                              {data.buys}
                            </span>
                            <span className="text-red-400 flex items-center gap-1">
                              <ArrowDownIcon className="w-3 h-3" />
                              {data.sells}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Recent Big Moves - Quartr Style */}
            <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Große Bewegungen</h3>
                  <p className="text-sm text-neutral-400">Portfolio-Gewichtung Änderungen größer 2%</p>
                </div>
              </div>

              {(() => {
                const bigMoves: BigMove[] = [];

                Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
                  if (!snaps || snaps.length < 2) return;

                  const recent = snaps.slice(-2);
                  if (recent.length < 2) return;

                  const current = recent[1].data;
                  const previous = recent[0].data;

                  const prevTotalValue = previous.positions?.reduce((sum, p) => sum + p.value, 0) || 0;
                  const currTotalValue = current.positions?.reduce((sum, p) => sum + p.value, 0) || 0;

                  if (prevTotalValue === 0 || currTotalValue === 0) return;

                  const prevMap = new Map<string, number>();
                  previous.positions?.forEach((p: Position) => {
                    const ticker = getTicker(p);
                    if (ticker) {
                      prevMap.set(ticker, p.value / prevTotalValue * 100);
                    }
                  });

                  current.positions?.forEach((p: Position) => {
                    const ticker = getTicker(p);
                    if (!ticker) return;

                    const currentPercent = (p.value / currTotalValue) * 100;
                    const previousPercent = prevMap.get(ticker) || 0;
                    const change = currentPercent - previousPercent;

                    if (Math.abs(change) > 2 && currentPercent > 1) {
                      bigMoves.push({
                        investor: investorNames[slug] || slug,
                        ticker,
                        type: change > 0 ? 'buy' : 'sell',
                        percentChange: Math.abs(change),
                        value: p.value,
                        date: current.date
                      });
                    }
                  });
                });

                bigMoves.sort((a, b) => b.percentChange - a.percentChange);

                return (
                  <div className="space-y-4">
                  {bigMoves.slice(0, 6).map((move, index) => {
                    const investorSlug = Object.keys(investorNames).find(key => investorNames[key] === move.investor) || 'buffett';
                    
                    return (
                      <Link
                        key={`${move.investor}-${move.ticker}-${index}`}
                        href={`/superinvestor/${investorSlug}`}
                        style={{ 
                          backgroundColor: 'var(--bg-card)',
                          borderBottom: index < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                        }}
                        className="flex items-center justify-between p-4 rounded-lg hover:bg-theme-hover transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 relative">
                            <Logo
                              ticker={move.ticker}
                              alt={`${move.ticker} Logo`}
                              className="w-full h-full"
                              padding="none"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white group-hover:text-brand-light transition-colors">
                              {move.ticker}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {move.investor} • {move.type === 'buy' ? 'Gekauft' : 'Verkauft'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-bold text-lg mb-1 ${
                            move.type === 'buy' ? 'text-brand-light' : 'text-red-400'
                          }`}>
                            {move.type === 'buy' ? '+' : '-'}{move.percentChange.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                          </div>
                          <div className="text-xs text-gray-600">Portfolio-Gewichtung</div>
                          <div className="text-xs text-gray-500">
                            {formatCurrencyGerman(move.value, false)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          </div>
        </div>


        {/* Geographic Exposure - Quartr Style */}
        <section>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-full text-sm font-medium mb-6">
              <GlobeAltIcon className="w-4 h-4" />
              Geographic Exposure
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">
              Globale
              <span className="text-emerald-400"> Diversifikation</span>
            </h2>
            <p className="text-neutral-400">
              Verteilung zwischen US-amerikanischen und internationalen Investments
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-900/50 rounded-lg p-8 border border-neutral-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="3"
                        strokeDasharray={`${usPercentage}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-neutral-400">{usPercentage.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">🇺🇸 US-Märkte</h3>
                  <p className="text-neutral-400 font-semibold">
                    {formatCurrencyGerman(usValue)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray={`${intlPercentage}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-emerald-400">{intlPercentage.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">🌍 International</h3>
                  <p className="text-emerald-400 font-semibold">
                    {formatCurrencyGerman(internationalValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}