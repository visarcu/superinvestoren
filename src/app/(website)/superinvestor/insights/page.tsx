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
  StarIcon,
  EyeIcon,
  BoltIcon,
  ClockIcon,
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
  ActivityData,
  BigMove,
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
  calculateResearchGems,
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
          className="inline-flex items-center gap-2 px-4 py-2.5 hover:bg-theme-hover border rounded-lg text-sm text-theme-secondary hover:text-white transition-colors duration-200 min-w-[160px]"
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
const StockItem = memo<StockItemProps>(({
  ticker,
  count,
  value,
  name,
  linkTo = 'super-investors',
  rightLabel = 'Investoren',
  showValue = false
}) => (
  <Link
    href={`/analyse/stocks/${ticker.toLowerCase()}/${linkTo}`}
    className="flex justify-between items-center py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
  >
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 relative flex-shrink-0">
        <Logo
          ticker={ticker}
          alt={`${ticker} Logo`}
          className="w-full h-full"
          padding="none"
        />
      </div>
      <div>
        <p className="text-white text-sm font-medium group-hover:text-neutral-300 transition-colors">
          {ticker}
        </p>
        <p className="text-neutral-500 text-xs truncate max-w-[100px]">
          {name || preprocessedData.nameMap.get(ticker) || ticker}
        </p>
      </div>
    </div>
    <div className="text-right">
      <span className="text-neutral-300 text-sm font-medium">
        {showValue && value ? formatCurrencyGerman(value, false) : count}
      </span>
      <p className="text-xs text-neutral-500">{rightLabel}</p>
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

  const researchGems = useMemo(() =>
    calculateResearchGems(), []
  );

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
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-6 h-6 text-neutral-500" />
                  <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">Market Insights</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
                  <span>{dataSourceStats.investorsWithData} von {dataSourceStats.totalInvestors} Investoren</span>
                </div>
              </div>

              <p className="text-base text-neutral-400 max-w-3xl leading-relaxed mb-4">
                Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                <span>{dataSourceStats.filingsInPeriod} Filings</span>
                <span className="text-neutral-600">•</span>
                <span>{quarterOptions.find(opt => opt.id === selectedPeriod)?.label || 'Aktueller Zeitraum'}</span>
                <span className="text-neutral-600">•</span>
                <span>Update: {dataSourceStats.lastUpdated.split('-').reverse().join('.')}</span>
              </div>
            </div>
          </div>

      
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {(topBuys as any).totalUniqueStocks || topBuys.filter(buy => buy.count > 0).length}
            </p>
            <p className="text-sm text-neutral-500">Gekaufte Aktien</p>
          </div>

          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {(topOwned as any).totalUniqueStocks || topOwned.length}
            </p>
            <p className="text-sm text-neutral-500">Beliebte Aktien</p>
          </div>

          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {Math.round(biggestInvestments.reduce((sum, inv) => sum + inv.value, 0) / 1_000_000_000)} Mrd.
            </p>
            <p className="text-sm text-neutral-500">$ Investment</p>
          </div>

          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {topSectors.length}
            </p>
            <p className="text-sm text-neutral-500">Top Sektoren</p>
          </div>
        </div>

{/* Globaler Analyse-Zeitraum */}
<div className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-white font-medium">Analyse-Zeitraum</h3>
              <p className="text-xs text-neutral-500">
                Top Käufe, Momentum, Exits, Discoveries
              </p>
            </div>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="appearance-none px-4 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
          >
            {quarterOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">

          {/* Top Käufe */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <ArrowTrendingUpIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Top Käufe</h3>
            </div>

            <div className="space-y-0">
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
                <div className="text-center py-8 text-neutral-500">
                  <p className="text-sm">Keine Käufe in diesem Zeitraum</p>
                </div>
              )}
            </div>
          </div>

          {/* Beliebteste Aktien */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <FireIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Beliebteste Aktien</h3>
            </div>

            <div className="space-y-0">
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

          {/* Größte Investments */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <CurrencyDollarIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Größte Investments</h3>
            </div>

            <div className="space-y-0">
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

        {/* Investment Strategien */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Konsensus vs. Contrarian Picks
            </h2>
            <p className="text-sm text-neutral-500">
              Aktien mit breitem Konsensus vs. seltene Überzeugungen weniger Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Konsensus-Aktien */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <StarIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Konsensus-Aktien</h3>
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
                  <div className="space-y-0">
                    {bigBetsData.slice(0, 8).map((bet) => (
                      <Link
                        key={bet.ticker}
                        href={`/analyse/stocks/${bet.ticker.toLowerCase()}/super-investors`}
                        className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 relative flex-shrink-0">
                            <Logo
                              ticker={bet.ticker}
                              alt={`${bet.ticker} Logo`}
                              className="w-full h-full"
                              padding="none"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors">
                              {bet.ticker}
                            </p>
                            <p className="text-xs text-neutral-500 truncate max-w-[100px]">
                              {bet.name}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-neutral-300 text-sm font-medium">
                            {bet.maxPortfolioPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                          </div>
                          <div className="text-xs text-neutral-500">
                            {bet.ownershipCount} Investoren
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Contrarian Picks */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <BoltIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Contrarian Picks</h3>
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
                  <div className="space-y-0">
                    {contrarianData.length > 0 ? (
                      <>
                        {contrarianData.slice(0, 8).map((pick) => (
                          <Link
                            key={`${pick.ticker}-${pick.investor}`}
                            href={`/analyse/stocks/${pick.ticker.toLowerCase()}/super-investors`}
                            className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 relative flex-shrink-0">
                                <Logo
                                  ticker={pick.ticker}
                                  alt={`${pick.ticker} Logo`}
                                  className="w-full h-full"
                                  padding="none"
                                />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors">
                                  {pick.ticker}
                                </p>
                                <p className="text-xs text-neutral-500 truncate max-w-[100px]">
                                  {pick.investor}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-neutral-300 text-sm font-medium">
                                {pick.portfolioPercent.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                              </div>
                              <div className="text-xs text-neutral-500">
                                {formatCurrencyGerman(pick.value, false)}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-neutral-500">
                        <p className="text-sm">Keine Contrarian Picks gefunden</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>




{/* Special Insights */}
<div className="mb-20">
  <div className="mb-8 pb-4 border-b border-neutral-800">
    <h2 className="text-xl font-medium text-white mb-2">
      Hidden Gems, Deutsche Aktien & ETFs
    </h2>
    <p className="text-sm text-neutral-500">
      Small-Mid Caps, deutsche Unternehmen und beliebte ETFs
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

    {/* Hidden Gems */}
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
        <EyeIcon className="w-5 h-5 text-neutral-500" />
        <h3 className="text-base font-medium text-white">Hidden Gems</h3>
      </div>

      <div className="space-y-0">
        {researchGems.unknownStocks.length > 0 ? (
          researchGems.unknownStocks.map((stock) => (
            <Link
              key={stock.ticker}
              href={`/analyse/stocks/${stock.ticker.toLowerCase()}/super-investors`}
              className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-white group-hover:text-neutral-300">{stock.ticker}</p>
                <p className="text-xs text-neutral-500 truncate max-w-[120px]">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-300">{stock.investorCount}</p>
                <p className="text-xs text-neutral-500">Investoren</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p className="text-sm">Keine Hidden Gems</p>
          </div>
        )}
      </div>
    </div>

    {/* Deutsche Aktien */}
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
        <GlobeAltIcon className="w-5 h-5 text-neutral-500" />
        <h3 className="text-base font-medium text-white">Deutsche Aktien</h3>
      </div>

      <div className="space-y-0">
        {researchGems.germanStocks.length > 0 ? (
          researchGems.germanStocks.map((stock) => (
            <Link
              key={stock.ticker}
              href={`/analyse/stocks/${stock.ticker.toLowerCase()}/super-investors`}
              className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-white group-hover:text-neutral-300">{stock.ticker}</p>
                <p className="text-xs text-neutral-500 truncate max-w-[120px]">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-300">{stock.investorCount}</p>
                <p className="text-xs text-neutral-500">Investoren</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p className="text-sm">Keine deutschen Aktien</p>
          </div>
        )}
      </div>
    </div>

    {/* Beliebte ETFs */}
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
        <ChartBarIcon className="w-5 h-5 text-neutral-500" />
        <h3 className="text-base font-medium text-white">Beliebte ETFs</h3>
      </div>

      <div className="space-y-0">
        {researchGems.popularETFs.length > 0 ? (
          researchGems.popularETFs.map((etf) => (
            <Link
              key={etf.ticker}
              href={`/analyse/stocks/${etf.ticker.toLowerCase()}/super-investors`}
              className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-white group-hover:text-neutral-300">{etf.ticker}</p>
                <p className="text-xs text-neutral-500 truncate max-w-[120px]">{etf.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-300">{etf.investorCount}</p>
                <p className="text-xs text-neutral-500">Investoren</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p className="text-sm">Keine ETFs</p>
          </div>
        )}
      </div>
    </div>
  </div>
</div>


        {/* Recent Activity */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Aktivitäts-Tracking
            </h2>
            <p className="text-sm text-neutral-500">
              Aktivste Investoren und größte Portfolio-Bewegungen der letzten 3 Quartale
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Aktivste Investoren */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <ClockIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Aktivste Investoren</h3>
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
                  <div className="space-y-0">
                    {activityData.slice(0, 6).map((data) => (
                      <Link
                        key={data.investor}
                        href={`/superinvestor/${Object.keys(investorNames).find(key => investorNames[key] === data.investor) || 'buffett'}`}
                        className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                      >
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-neutral-300">
                            {data.investor}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {data.lastActivity.split('-').reverse().join('.')}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-neutral-300 text-sm font-medium">
                            {data.changes}
                          </div>
                          <div className="flex gap-2 text-xs text-neutral-500">
                            <span className="text-emerald-400">{data.buys} K</span>
                            <span className="text-red-400">{data.sells} V</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Große Bewegungen */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <BoltIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Große Bewegungen</h3>
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
                  <div className="space-y-0">
                    {bigMoves.slice(0, 6).map((move, index) => {
                      const investorSlug = Object.keys(investorNames).find(key => investorNames[key] === move.investor) || 'buffett';

                      return (
                        <Link
                          key={`${move.investor}-${move.ticker}-${index}`}
                          href={`/superinvestor/${investorSlug}`}
                          className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 relative flex-shrink-0">
                              <Logo
                                ticker={move.ticker}
                                alt={`${move.ticker} Logo`}
                                className="w-full h-full"
                                padding="none"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white group-hover:text-neutral-300">
                                {move.ticker}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {move.investor}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              move.type === 'buy' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {move.type === 'buy' ? '+' : '-'}{move.percentChange.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                            </div>
                            <div className="text-xs text-neutral-500">
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


        {/* Geographic Exposure */}
        <section className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Globale Diversifikation
            </h2>
            <p className="text-sm text-neutral-500">
              Verteilung zwischen US-amerikanischen und internationalen Investments
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
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
        </section>

      </div>
    </div>
  )
}