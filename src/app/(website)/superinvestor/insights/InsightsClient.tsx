'use client'
// Market Insights (Client-Teil). Alle Berechnungen laufen auf dem Server
// (page.tsx → lib/superinvestorInsightsData); hier wird nur angezeigt.

import React, { useState, useRef, useEffect, useMemo, memo } from 'react'
import Link from 'next/link'
import {
  ChartBarIcon,
  CalendarIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  StarIcon,
  EyeIcon,
  BoltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

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

import { investorNames, formatCurrencyGerman } from '@/utils/insightsFormat'
import type { InsightsData } from '@/lib/superinvestorInsightsData'

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
  rightLabel?: string
  showValue?: boolean
}
const StockItem = memo<StockItemProps>(({
  ticker,
  count,
  value,
  name,
  rightLabel = 'Investoren',
  showValue = false
}) => (
  <Link
    href={`/aktie/${ticker.toLowerCase()}`}
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
          {name || ticker}
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
export default function MarketInsightsClient({ data }: { data: InsightsData }) {
  // Hero Animation
  const [heroRef, heroVisible] = useIntersectionObserver(0.3)

  // Alle Zeiträume rechnet die Server-Seite vor (lib/superinvestorInsightsData)
  const actualLatestQuarter = data.latestQuarter
  const quarterOptions = data.options
  const [selectedPeriod, setSelectedPeriod] = useState('latest')
  const period = data.byPeriod[selectedPeriod] ?? data.byPeriod.latest

  const dataSourceStats = period.dataSourceStats
  const topBuys = period.topBuys
  const { topOwned, biggestInvestments, topSectors, researchGems } = data
  const { usValue, internationalValue, usPercentage, intlPercentage } = data.geographicExposure

  return (
    <div className="min-h-screen bg-dark">
      
      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <ChartBarIcon className="w-6 h-6 text-neutral-500" />
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Market Insights</h1>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
                <span>{dataSourceStats.investorsWithData} von {dataSourceStats.totalInvestors} Investoren</span>
              </div>
            </div>

            <p className="text-sm text-neutral-400 mb-3">
              Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              <span>{dataSourceStats.filingsInPeriod} Filings</span>
              <span className="text-neutral-600">•</span>
              <span>{quarterOptions.find(opt => opt.id === selectedPeriod)?.label || 'Aktueller Zeitraum'}</span>
              <span className="text-neutral-600">•</span>
              <span>Update: {dataSourceStats.lastUpdated.split('-').reverse().join('.')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {period.topBuysTotalUnique || topBuys.filter(buy => buy.count > 0).length}
            </p>
            <p className="text-sm text-neutral-500">Gekaufte Aktien</p>
          </div>

          <div className="p-4">
            <p className="text-2xl font-semibold text-white">
              {data.topOwnedTotalUnique || topOwned.length}
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
                    name={data.stockNames[item.ticker]}
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
                  name={data.stockNames[item.ticker]}
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
                const bigBetsData = data.bigBets;

                return (
                  <div className="space-y-0">
                    {bigBetsData.slice(0, 8).map((bet) => (
                      <Link
                        key={bet.ticker}
                        href={`/aktie/${bet.ticker.toLowerCase()}`}
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
                const contrarianData = data.contrarian;

                return (
                  <div className="space-y-0">
                    {contrarianData.length > 0 ? (
                      <>
                        {contrarianData.slice(0, 8).map((pick) => (
                          <Link
                            key={`${pick.ticker}-${pick.investor}`}
                            href={`/aktie/${pick.ticker.toLowerCase()}`}
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
              href={`/aktie/${stock.ticker.toLowerCase()}`}
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
              href={`/aktie/${stock.ticker.toLowerCase()}`}
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
              href={`/aktie/${etf.ticker.toLowerCase()}`}
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
                const activityData = data.investorActivity;

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
                const bigMoves = data.bigMoves;

                const formatSignedValueChange = (move: BigMove) => {
                  const formatted = formatCurrencyGerman(move.valueChange, false);
                  return move.valueChange > 0 ? `+${formatted}` : formatted;
                };

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
                              {formatSignedValueChange(move)}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {move.type === 'buy' ? '+' : '-'}
                              {move.portfolioPointChange.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %-Pkt.
                            </div>
                          </div>
                        </Link>
                      );
                    }
                    )}
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
