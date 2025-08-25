// src/app/superinvestor/insights/page.tsx - DESIGN UPDATED + THEME COLORS
'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback, memo, useDeferredValue } from 'react'
import PageLoader from '@/components/PageLoader' // <-- NEU
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
  InformationCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

// ========== TYPESCRIPT INTERFACES ==========
interface Position {
  cusip: string
  ticker?: string
  name?: string
  shares: number
  value: number
}

interface HoldingData {
  date: string
  positions: Position[]
}

interface HoldingSnapshot {
  data: HoldingData
}

interface TopBuyItem {
  ticker: string
  count: number
}

interface TopOwnedItem {
  ticker: string
  count: number
}

interface BiggestInvestmentItem {
  ticker: string
  name: string
  value: number
}

interface SectorAnalysis {
  sector: string
  value: number
  count: number
}

interface GeographicExposure {
  usValue: number
  internationalValue: number
  usPercentage: number
  intlPercentage: number
}

interface QuarterOption {
  id: string
  label: string
  quarters: string[]
  description: string
}

interface DataSourceStats {
  totalInvestors: number
  investorsWithData: number
  totalFilings: number
  filingsInPeriod: number
  lastUpdated: string
  quarters: string[]
}

// ========== PERFORMANCE OPTIMIERUNGEN ==========

// 1. CACHE für schwere Berechnungen
const calculationCache = new Map<string, any>()

// 2. Temporäre Hilfsfunktionen für Initialisierung
function getTickerTemp(position: Position, cusipToTickerMap: Map<string, string>): string | null {
  if (position.ticker) return position.ticker
  return cusipToTickerMap.get(position.cusip) || null
}

function getStockNameTemp(position: Position, cusipToTickerMap: Map<string, string>, nameMap: Map<string, string>): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const ticker = getTickerTemp(position, cusipToTickerMap)
  return ticker ? (nameMap.get(ticker) || position.name || position.cusip) : position.cusip
}

// 3. Optimierte Datenstrukturen vorab erstellen
const preprocessedData = (() => {
  const tickerMap = new Map<string, string>()
  const nameMap = new Map<string, string>()
  const cusipToTicker = new Map<string, string>()
  
  // Stocks-Daten vorverarbeiten
  stocks.forEach(stock => {
    tickerMap.set(stock.ticker, stock.name)
    nameMap.set(stock.ticker, stock.name)
    if (stock.cusip) {
      cusipToTicker.set(stock.cusip, stock.ticker)
    }
  })
  
  // Holdings-Daten einmal durchgehen
  const activeInvestors = new Set<string>()
  const allQuarters = new Set<string>()
  
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (latest?.positions?.length > 0) {
      activeInvestors.add(slug)
    }
    
    snaps.forEach(snap => {
      if (snap?.data?.date) {
        const quarter = getPeriodFromDate(snap.data.date)
        allQuarters.add(quarter)
        
        // Ticker-Namen aus Holdings extrahieren
        snap.data.positions?.forEach((position: Position) => {
          const ticker = getTickerTemp(position, cusipToTicker)
          if (ticker && position.name && !nameMap.has(ticker)) {
            nameMap.set(ticker, getStockNameTemp(position, cusipToTicker, nameMap))
          }
        })
      }
    })
  })
  
  return {
    tickerMap,
    nameMap,
    cusipToTicker,
    activeInvestors: Array.from(activeInvestors),
    allQuarters: Array.from(allQuarters).sort().reverse()
  }
})()

// 4. Finale Hilfsfunktionen (nach preprocessedData Initialisierung)
function getTicker(position: Position): string | null {
  if (position.ticker) return position.ticker
  return preprocessedData.cusipToTicker.get(position.cusip) || null
}

function getStockName(position: Position): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const ticker = getTicker(position)
  return ticker ? (preprocessedData.nameMap.get(ticker) || position.name || position.cusip) : position.cusip
}

function getPeriodFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function formatCurrencyGerman(amount: number, showCurrency = true): string {
  const suffix = showCurrency ? ' $' : ''
  
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd.${suffix}`
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio.${suffix}`
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tsd.${suffix}`
  }
  return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`
}

function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// 4. Data Processing Functions (NICHT memo, da keine React Komponenten)
function getSmartLatestQuarter(): string {
  const cacheKey = 'smartLatestQuarter'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }
  
  const totalActiveInvestors = preprocessedData.activeInvestors.length
  const requiredThreshold = Math.ceil(totalActiveInvestors * 0.5)
  
  const quarterCounts = new Map<string, number>()
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps) return
    
    snaps.forEach(snap => {
      if (snap?.data?.date) {
        const quarter = getPeriodFromDate(snap.data.date)
        quarterCounts.set(quarter, (quarterCounts.get(quarter) || 0) + 1)
      }
    })
  })
  
  const sortedQuarters = Array.from(quarterCounts.entries())
    .sort(([a], [b]) => {
      const [qA, yearA] = a.split(' ')
      const [qB, yearB] = b.split(' ')
      
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA)
      return parseInt(qB.substring(1)) - parseInt(qA.substring(1))
    })
  
  for (const [quarter, count] of sortedQuarters) {
    if (count >= requiredThreshold) {
      calculationCache.set(cacheKey, quarter)
      return quarter
    }
  }
  
  const fallbackQuarter = sortedQuarters[0]?.[0] || 'Q1 2025'
  calculationCache.set(cacheKey, fallbackQuarter)
  return fallbackQuarter
}

// 5. Optimierte Berechnungsfunktionen mit Caching
function calculateTopBuys(targetQuarters: string[]): TopBuyItem[] {
 // const cacheKey = `topBuys-${targetQuarters.join('-')}`
  //if (calculationCache.has(cacheKey)) {
  //  return calculationCache.get(cacheKey)
 // }
  
  const buyCounts = new Map<string, number>()
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return
    
    snaps.forEach((snap, idx) => {
      const currentQuarter = getPeriodFromDate(snap.data.date)
      if (!targetQuarters.includes(currentQuarter)) return
      
      const cur = snap.data
      
      if (idx > 0) {
        const prev = snaps[idx - 1].data
        
        const prevMap = new Map<string, number>()
        prev.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
          }
        })

        const seen = new Set<string>()
        cur.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (!ticker || seen.has(ticker)) return
          seen.add(ticker)

          const prevShares = prevMap.get(ticker) || 0
          const delta = p.shares - prevShares

          if (delta > 0) {
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      } else {
        const seen = new Set<string>()
        cur.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (ticker && !seen.has(ticker)) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      }
    })
  })

  const result = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  return result
}

function calculateTopOwned(): TopOwnedItem[] {

  const ownershipCount = new Map<string, number>()
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    const seen = new Set<string>()
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker && !seen.has(ticker)) {
        seen.add(ticker)
        ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1)
      }
    })
  })

  const result = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))
    

  return result
}

function calculateBiggestInvestments(): BiggestInvestmentItem[] {
  const cacheKey = 'biggestInvestments'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }
  
  const investmentTotals = new Map<string, { value: number, name: string }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker) return
      
      const name = getStockName(p)
      const current = investmentTotals.get(ticker)
      
      if (current) {
        current.value += p.value
      } else {
        investmentTotals.set(ticker, { value: p.value, name })
      }
    })
  })

  const result = Array.from(investmentTotals.entries())
    .map(([ticker, { value, name }]) => ({ ticker, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)
    
  calculationCache.set(cacheKey, result)
  return result
}

// Investor Namen Mapping
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  einhorn: 'David Einhorn',
  ackman: 'Bill Ackman',
  gates: 'Bill & Melinda Gates Foundation Trust',
  torray: 'Torray Investment Partners LLC',
  davis: 'Christoper Davis',
  altarockpartners: 'Mark Massey',
  greenhaven:'Edgar Wachenheim III',
  vinall:'Robert Vinall',
  meridiancontrarian: 'Meridian Contrarian Fund',
  hawkins:' Mason Hawkins',
  olstein:'Robert Olstein',
  peltz: 'Nelson Peltz',
  gregalexander:'Greg Alexander',
  miller: 'Bill Miller',
  tangen: 'Nicolai Tangen',
  burry:'Michael Burry',
  pabrai: 'Mohnish Pabrai',
  kantesaria: 'Dev Kantesaria',
  greenblatt: 'Joel Greenblatt',
  fisher: 'Ken Fisher',
  soros:'George Soros',
  haley:'Connor Haley',
  vandenberg: 'Arnold Van Den Berg',
  dodgecox:'Dodge & Cox',
  pzena:'Richard Pzena',
  mairspower:'Mairs & Power Inc',
  weitz: 'Wallace Weitz',
  yacktman:'Yacktman Asset Management LP',
  gayner:'Thomas Gayner',
  armitage:'John Armitage',
  burn: 'Harry Burn - Sound Shore',
  cantillon:'William von Mueffling - Cantillon Capital Management',
  jensen:'Eric Schoenstein - Jensen Investment Management',
  abrams: 'David Abrams - Abrams Capital Management',
  firsteagle: 'First Eagle Investment Management',
  polen: 'Polen Capital Management',
  tarasoff:'Josh Tarasoff',
  rochon: 'Francois Rochon',
  russo: 'Thomas Russo',
  akre: 'Chuck Akre',
  triplefrond:'Triple Frond Partners',
  whitman: 'Marty Whitman',
  patientcapital:'Samantha McLemore',
  klarman: 'Seth Klarman',
  makaira: 'Tom Bancroft',
  ketterer: 'Sarah Ketterer',
  train:'Lindsell Train',
  smith: 'Terry Smith',
  watsa: 'Prem Watsa',
  lawrence: 'Bryan Lawrence',
  dorsey: 'Pat Dorsey',
  hohn:'Chris Hohn',
  hong: 'Dennis Hong',
  kahn: 'Kahn Brothers Group',
  coleman: 'Chase Coleman',
  dalio:'Ray Dalio',
  loeb: 'Daniel Loeb',
  tepper: 'David Tepper',
  icahn: 'Carl Icahn',
  lilu: 'Li Lu',
  ainslie:'Lee Ainslie',
  greenberg:'Glenn Greenberg',
  mandel: 'Stephen Mandel',
  marks: 'Howard Marks',
  rogers:'John Rogers',
  ariel_appreciation: 'Ariel Appreciation Fund', 
  ariel_focus: 'Ariel Focus Fund', 
  cunniff: 'Ruane, Cunniff & Goldfarb L.P.',
  spier: 'Guy Spier',
}

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
                  ? 'bg-green-600/80 text-white shadow-md' 
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

function calculateDataSourceStats(targetQuarters: string[]): DataSourceStats {
  const stats: DataSourceStats = {
    totalInvestors: 0,
    investorsWithData: 0,
    totalFilings: 0,
    filingsInPeriod: 0,
    lastUpdated: '',
    quarters: targetQuarters
  }

  stats.totalInvestors = preprocessedData.activeInvestors.length

  let latestDate = ''
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps) return
    
    const hasDataInPeriod = snaps.some(snap => {
      const quarter = getPeriodFromDate(snap.data.date)
      return targetQuarters.includes(quarter)
    })
    
    if (hasDataInPeriod) {
      stats.investorsWithData++
    }

    stats.totalFilings += snaps.length
    
    snaps.forEach(snap => {
      const quarter = getPeriodFromDate(snap.data.date)
      if (targetQuarters.includes(quarter)) {
        stats.filingsInPeriod++
      }
      
      if (snap.data.date > latestDate) {
        latestDate = snap.data.date
      }
    })
  })

  stats.lastUpdated = latestDate
  return stats
}

// ab hier neue funktionen??

// 1. MOMENTUM SHIFTS - Trendwende Erkennung
function calculateMomentumShifts(targetQuarters: string[]): Array<{
  ticker: string;
  name: string;
  shifters: string[];
  fromSelling: number;
  toBuying: number;
  totalShift: number;
}> {
  if (targetQuarters.length < 2) return [];
  
  const shifts = new Map<string, {
    name: string;
    shifters: Set<string>;
    fromSelling: number;
    toBuying: number;
  }>();
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
    if (!snaps || snaps.length < 2) return;
    
    // Finde die letzten beiden relevanten Quartale
    const relevantSnaps = snaps.filter(snap => 
      targetQuarters.includes(getPeriodFromDate(snap.data.date))
    ).slice(-2);
    
    if (relevantSnaps.length < 2) return;
    
    const [older, newer] = relevantSnaps;
    
    // Positions-Maps erstellen
    const olderMap = new Map<string, number>();
    older.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (ticker) olderMap.set(ticker, p.shares);
    });
    
    const newerMap = new Map<string, number>();
    newer.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (ticker) newerMap.set(ticker, p.shares);
    });
    
    // Finde Momentum Shifts
    newerMap.forEach((newShares, ticker) => {
      const oldShares = olderMap.get(ticker) || 0;
      
      // War am Verkaufen (reduziert) und kauft jetzt (erhöht)
      if (oldShares > newShares * 1.2 && newShares > 0) {
        // Position wurde reduziert
      } else if (newShares > oldShares * 1.2) {
        // Position wurde erhöht nach vorheriger Reduktion
        const current = shifts.get(ticker) || {
          name: getStockName(newer.data.positions.find(p => getTicker(p) === ticker)!),
          shifters: new Set<string>(),
          fromSelling: oldShares,
          toBuying: newShares
        };
        
        current.shifters.add(investorNames[slug] || slug);
        shifts.set(ticker, current);
      }
    });
  });
  
  return Array.from(shifts.entries())
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      shifters: Array.from(data.shifters),
      fromSelling: data.fromSelling,
      toBuying: data.toBuying,
      totalShift: data.toBuying - data.fromSelling
    }))
    .filter(item => item.shifters.length >= 2)
    .sort((a, b) => b.shifters.length - a.shifters.length)
    .slice(0, 10);
}



// 2. EXIT TRACKER - Komplette Verkäufe
function calculateExitTracker(targetQuarters: string[]): Array<{
  ticker: string;
  name: string;
  exitedBy: string[];
  avgHoldingPeriod: number;
  totalValueExited: number;
}> {
  const exits = new Map<string, {
    name: string;
    exitedBy: string[];
    holdingPeriods: number[];
    totalValue: number;
  }>();
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
    if (!snaps || snaps.length < 2) return;
    
    const latest = snaps[snaps.length - 1];
    const previous = snaps[snaps.length - 2];
    
    if (!targetQuarters.includes(getPeriodFromDate(latest.data.date))) return;
    
    // Map für aktuelle Positionen
    const currentPositions = new Map<string, boolean>();
    latest.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (ticker) currentPositions.set(ticker, true);
    });
    
    // Finde Exits (war da, jetzt nicht mehr)
    previous.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (!ticker) return;
      
      if (!currentPositions.has(ticker) && p.value > 1000000) { // Min 1M Position
        // Berechne Holding Period
        let holdingPeriod = 1;
        for (let i = snaps.length - 3; i >= 0; i--) {
          const hasPosition = snaps[i].data.positions?.some(
            pos => getTicker(pos) === ticker
          );
          if (hasPosition) {
            holdingPeriod++;
          } else {
            break;
          }
        }
        
        const current = exits.get(ticker) || {
          name: getStockName(p),
          exitedBy: [],
          holdingPeriods: [],
          totalValue: 0
        };
        
        current.exitedBy.push(investorNames[slug] || slug);
        current.holdingPeriods.push(holdingPeriod);
        current.totalValue += p.value;
        
        exits.set(ticker, current);
      }
    });
  });
  
  return Array.from(exits.entries())
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      exitedBy: data.exitedBy,
      avgHoldingPeriod: data.holdingPeriods.reduce((a, b) => a + b, 0) / data.holdingPeriods.length,
      totalValueExited: data.totalValue
    }))
    .sort((a, b) => b.exitedBy.length - a.exitedBy.length)
    .slice(0, 10);
}

// 3. NEW DISCOVERIES - Brandneue Positionen
function calculateNewDiscoveries(targetQuarters: string[]): Array<{
  ticker: string;
  name: string;
  discoveredBy: string[];
  totalValue: number;
  avgPosition: number;
}> {
  const discoveries = new Map<string, {
    name: string;
    discoveredBy: Map<string, number>;
  }>();
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
    if (!snaps || snaps.length === 0) return;
    
    const latest = snaps[snaps.length - 1];
    if (!targetQuarters.includes(getPeriodFromDate(latest.data.date))) return;
    
    // Historische Positionen sammeln
    const historicalPositions = new Set<string>();
    for (let i = 0; i < snaps.length - 1; i++) {
      snaps[i].data.positions?.forEach((p: Position) => {
        const ticker = getTicker(p);
        if (ticker) historicalPositions.add(ticker);
      });
    }
    
    // Finde neue Positionen
    latest.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (!ticker) return;
      
      if (!historicalPositions.has(ticker) && p.value > 5000000) { // Min 5M für Relevanz
        const current = discoveries.get(ticker) || {
          name: getStockName(p),
          discoveredBy: new Map<string, number>()
        };
        
        current.discoveredBy.set(investorNames[slug] || slug, p.value);
        discoveries.set(ticker, current);
      }
    });
  });
  
  return Array.from(discoveries.entries())
    .map(([ticker, data]) => {
      const values = Array.from(data.discoveredBy.values());
      const totalValue = values.reduce((a, b) => a + b, 0);
      
      return {
        ticker,
        name: data.name,
        discoveredBy: Array.from(data.discoveredBy.keys()),
        totalValue,
        avgPosition: totalValue / values.length
      };
    })
    .filter(item => item.discoveredBy.length >= 2)
    .sort((a, b) => b.discoveredBy.length - a.discoveredBy.length)
    .slice(0, 10);
}

// 4. SECTOR ROTATION MATRIX - Zeigt Umschichtungen zwischen Sektoren

// 4. SECTOR NET FLOWS - Zeigt Zu- und Abflüsse pro Sektor
function calculateSectorNetFlows(targetQuarters: string[]): Map<string, number> {
  if (targetQuarters.length < 2) return new Map();
  
  const sectorFlows = new Map<string, number>();
  
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
    if (!snaps || snaps.length < 2) return;
    
    // Finde die letzten beiden relevanten Quartale
    const relevantSnaps = snaps.filter(snap => 
      targetQuarters.includes(getPeriodFromDate(snap.data.date))
    ).slice(-2);
    
    if (relevantSnaps.length < 2) return;
    
    const [older, newer] = relevantSnaps;
    
    // Sektor-Maps für beide Perioden
    const olderSectors = new Map<string, number>();
    const newerSectors = new Map<string, number>();
    
    older.data.positions?.forEach((p: Position) => {
      const sector = translateSector(getSectorFromPosition({
        cusip: p.cusip,
        ticker: getTicker(p)
      }));
      olderSectors.set(sector, (olderSectors.get(sector) || 0) + p.value);
    });
    
    newer.data.positions?.forEach((p: Position) => {
      const sector = translateSector(getSectorFromPosition({
        cusip: p.cusip,
        ticker: getTicker(p)
      }));
      newerSectors.set(sector, (newerSectors.get(sector) || 0) + p.value);
    });
    
    // Berechne Net Flows
    const allSectors = new Set([...olderSectors.keys(), ...newerSectors.keys()]);
    
    allSectors.forEach(sector => {
      const oldValue = olderSectors.get(sector) || 0;
      const newValue = newerSectors.get(sector) || 0;
      const flow = newValue - oldValue;
      
      sectorFlows.set(sector, (sectorFlows.get(sector) || 0) + flow);
    });
  });
  
  return sectorFlows;
}

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
        <p className="text-white font-medium group-hover:text-green-400 transition-colors">
          {ticker}
        </p>
        <p className="text-gray-500 text-xs truncate max-w-[120px]">
          {name || preprocessedData.nameMap.get(ticker) || ticker}
        </p>
      </div>
    </div>
    <div className="text-right">
      <span className="text-green-400 text-sm font-semibold bg-green-500/20 px-2 py-1 rounded">
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

  const sectorNetFlows = useMemo(() => {
    const selectedOption = quarterOptions.find(opt => opt.id === sectorPeriod)
    const quarters = selectedOption?.quarters || preprocessedData.allQuarters.slice(0, 2)
    return calculateSectorNetFlows(quarters)
  }, [sectorPeriod, quarterOptions])

  return (
    <div className="min-h-screen bg-dark dark:bg">
      
      {/* Header - Quartr Style */}
      <section className="bg-dark pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm group"
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
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold text-neutral-900 dark:text-white tracking-tight">Market Insights</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>{dataSourceStats.investorsWithData} von {dataSourceStats.totalInvestors} Investoren</span>
                </div>
              </div>
              
              <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-4xl leading-relaxed mb-6">
                Detaillierte Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
                Entdecke Trends, Sektoren und Investment-Patterns der Super-Investoren.
              </p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-500 dark:text-neutral-400">
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-neutral-900 dark:text-white">
                  {topBuys.filter(buy => buy.count > 0).length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Gekaufte Aktien</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  {dataSourceStats.investorsWithData} Investoren • {quarterOptions.find(opt => opt.id === selectedPeriod)?.label}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-neutral-900 dark:text-white">
                  {topOwned.length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Beliebte Aktien</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">Von 2+ Investoren gehalten</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-neutral-900 dark:text-white">
                  {Math.round(biggestInvestments.reduce((sum, inv) => sum + inv.value, 0) / 1_000_000_000)}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Mrd. $ Investment</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">Top 20 Positionen</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-neutral-900 dark:text-white">
                  {topSectors.length}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Top Sektoren</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">Nach Investment-Volumen</p>
              </div>
            </div>
          </div>
        </div>

{/* ZENTRALES DROPDOWN FÜR ANALYSE-ZEITRAUM - Quartr Style */}
<div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-neutral-900 dark:text-white font-semibold">Globaler Analyse-Zeitraum</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Beeinflusst: Top Käufe • Momentum Shifts • Exit Tracker • New Discoveries
                </p>
              </div>
            </div>
            
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700"
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">





        <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Top Käufe</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Meist gekaufte Aktien</p>
                </div>
              </div>
              <div className="relative inline-block">
  <select
    value={selectedPeriod}
    onChange={(e) => setSelectedPeriod(e.target.value)}
    className="appearance-none px-4 py-2.5 pr-10 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700"
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

            <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 pb-3">
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <FireIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Beliebteste Aktien</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Meist gehaltene Positionen</p>
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Größte Investments</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Nach Dollar-Volumen</p>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <StarIcon className="w-4 h-4" />
              Investment Strategien
            </div>
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
              Konsensus vs.
              <span className="text-emerald-600 dark:text-emerald-400"> Contrarian Picks</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Links: Aktien mit breitem Konsensus und hoher Portfolio-Gewichtung. 
              Rechts: Seltene Überzeugungen weniger Investoren.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Konsensus-Aktien - Quartr Style */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                    <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Konsensus-Aktien</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Hohe Portfolio-Gewichtung bei mehreren Investoren</p>
                  </div>
                </div>
              </div>

              {(() => {
                interface BigBetData {
                  ticker: string;
                  name: string;
                  maxPortfolioPercent: number;
                  ownershipCount: number;
                  totalValue: number;
                  topInvestor: string;
                }

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
                          className="block p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-yellow-300 dark:hover:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
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
                                <p className="font-bold text-white group-hover:text-green-400 transition-colors">
                                  {bet.ticker}
                                </p>
                                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                  {bet.name}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-green-400 font-bold text-lg">
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
            <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">Contrarian Picks</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Wenige Investoren, hohe Überzeugung</p>
                  </div>
                </div>
              </div>

              {(() => {
                interface ContrarianData {
                  ticker: string;
                  name: string;
                  portfolioPercent: number;
                  investor: string;
                  value: number;
                  ownershipCount: number;
                }

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
                            className="block p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
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
                                  <p className="font-bold text-white group-hover:text-green-400 transition-colors">
                                    {pick.ticker}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                    {pick.name}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-green-400 font-bold text-lg">
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

          <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
              <div>
                <strong className="text-emerald-600 dark:text-emerald-400">Konsensus-Aktien:</strong> Mindestens 3% Portfolio-Gewichtung bei 2+ Investoren. 
                Zeigt breiten Konsensus mit hoher Überzeugung.
              </div>
              <div>
                <strong className="text-emerald-600 dark:text-emerald-400">Contrarian Picks:</strong> Mindestens 4% Portfolio-Gewichtung bei max. 2 Investoren. 
                Zeigt seltene, aber starke Überzeugungen.
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Konzentration Analysis */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <ShieldCheckIcon className="w-4 h-4" />
              Portfolio Konzentration
            </div>
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
              Konzentration vs.
              <span className="text-emerald-600 dark:text-emerald-400"> Diversifikation</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Wer setzt auf wenige große Positionen vs. breite Diversifikation?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              interface ConcentrationData {
                investor: string;
                concentration: number;
                top3Percentage: number;
                totalPositions: number;
                type: 'high' | 'medium' | 'low';
              }

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
                  className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{data.investor}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.type === 'high' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                      data.type === 'medium' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' :
                      'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500'
                    }`}>
                      {data.type === 'high' ? 'Konzentriert' :
                       data.type === 'medium' ? 'Ausgewogen' : 'Diversifiziert'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-neutral-600 dark:text-neutral-400 text-sm">Konzentrations-Index</span>
                      <span className="text-neutral-900 dark:text-white font-semibold">{(data.concentration * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
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
                        data.top3Percentage > 60 ? 'text-green-400' :
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <BuildingOfficeIcon className="w-4 h-4" />
              Sektor-Analyse
            </div>
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
              Investment
              <span className="text-emerald-600 dark:text-emerald-400"> Sektoren</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Wie die Super-Investoren ihr Kapital auf verschiedene Wirtschaftssektoren verteilen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topSectors.map((sector: SectorAnalysis) => (
              <div
                key={sector.sector}
                className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{sector.sector}</h3>
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400 text-sm">Gesamt-Wert:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrencyGerman(sector.value)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400 text-sm">Positionen:</span>
                    <span className="text-neutral-900 dark:text-white font-semibold">{sector.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


{/* ========== ADVANCED INSIGHTS SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
      <BoltIcon className="w-4 h-4" />
      Advanced Insights
    </div>
    <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
      Momentum & 
      <span className="text-emerald-600 dark:text-emerald-400"> Timing Signals</span>
    </h2>
    <p className="text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
      Fortgeschrittene Analysen zu Trendwenden, Exits und neuen Entdeckungen der Super-Investoren
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    {/* Momentum Shifts - Quartr Style */}
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
          <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Momentum Shifts</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Von Verkauf zu Kauf gedreht</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {momentumShifts.length > 0 ? (
          momentumShifts.map((shift, index) => (
            <Link
              key={shift.ticker}
              href={`/analyse/stocks/${shift.ticker.toLowerCase()}/super-investors`}
              className="block p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors group"
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
                    <p className="font-bold text-white group-hover:text-green-400 transition-colors">
                      {shift.ticker}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[120px]">
                      {shift.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <ArrowUpIcon className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 font-bold">
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
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
          <ArrowDownIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Exit Tracker</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Komplett verkaufte Positionen</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {exitTracker.length > 0 ? (
          exitTracker.map((exit, index) => (
            <div
              key={exit.ticker}
              className="block p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg"
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
                    <p className="font-semibold text-neutral-900 dark:text-white">
                      {exit.ticker}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
                      {exit.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 dark:text-red-400 font-semibold">
                    {exit.exitedBy.length}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Exits</div>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400">
                  ⌀ {exit.avgHoldingPeriod.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Quartale
                </span>
                <span className="text-neutral-500 dark:text-neutral-400">
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
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
          <StarIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">New Discoveries</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Erstmalige Käufe</p>
        </div>
      </div>
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {newDiscoveries.length > 0 ? (
          newDiscoveries.map((discovery, index) => (
            <Link
              key={discovery.ticker}
              href={`/analyse/stocks/${discovery.ticker.toLowerCase()}/super-investors`}
              className="block p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-yellow-300 dark:hover:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
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
                    <p className="font-semibold text-neutral-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      {discovery.ticker}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[120px]">
                      {discovery.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-600 dark:text-yellow-400 font-semibold">
                    {discovery.discoveredBy.length}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">Neu dabei</div>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]">
                  {discovery.discoveredBy.slice(0, 2).join(', ')}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
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


{/* ========== SECTOR NET FLOWS SECTION - Quartr Style ========== */}
<div className="mb-16">
  <div className="text-center mb-12">
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
      <ArrowTrendingUpIcon className="w-4 h-4" />
      Sector Analysis
    </div>
    <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
      Sektor
      <span className="text-emerald-600 dark:text-emerald-400"> Net Flows</span>
    </h2>
    <p className="text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-6">
      Kapitalzu- und -abflüsse nach Wirtschaftssektoren im Zeitvergleich
    </p>
    
    {/* DROPDOWN FÜR SECTOR FLOWS */}
    <div className="flex justify-center">
      <div className="relative inline-block">
        <select
          value={sectorPeriod}
          onChange={(e) => setSectorPeriod(e.target.value)}
          className="appearance-none pl-10 pr-10 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700 min-w-[200px]"
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
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
      
      {sectorNetFlows.size > 0 ? (
        <div className="space-y-6">
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
                    <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                      <ArrowUpIcon className="w-4 h-4" />
                      Kapitalzuflüsse
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inflows.map(([sector, flow]) => (
                        <div 
                          key={sector}
                          className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-neutral-900 dark:text-white">{sector}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              +{formatCurrencyGerman(flow, false)}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
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
                    <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
                      <ArrowDownIcon className="w-4 h-4" />
                      Kapitalabflüsse
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {outflows.map(([sector, flow]) => (
                        <div 
                          key={sector}
                          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-neutral-900 dark:text-white">{sector}</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              {formatCurrencyGerman(Math.abs(flow), false)}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((Math.abs(flow) / Math.max(...outflows.map(([,f]) => Math.abs(f)))) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Summary Stats */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-400">
                        {formatCurrencyGerman(inflows.reduce((sum, [,flow]) => sum + flow, 0), false)}
                      </div>
                      <div className="text-xs text-gray-500">Gesamt-Zuflüsse</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">
                        {formatCurrencyGerman(Math.abs(outflows.reduce((sum, [,flow]) => sum + flow, 0)), false)}
                      </div>
                      <div className="text-xs text-gray-500">Gesamt-Abflüsse</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${
                        sectorNetFlows.size > 0 ? 'text-white' : 'text-gray-400'
                      }`}>
                        {inflows.length + outflows.length}
                      </div>
                      <div className="text-xs text-gray-500">Aktive Sektoren</div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <ArrowTrendingUpIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Keine Sektor-Flows in diesem Zeitraum</p>
          <p className="text-xs mt-1">Wähle mindestens 2 Quartale für Vergleich</p>
        </div>
      )}
    </div>
  </div>
</div>

<br />
<br />

        {/* Recent Activity Tracking - Quartr Style */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <ClockIcon className="w-4 h-4" />
              Recent Activity
            </div>
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
              Aktivitäts-
              <span className="text-emerald-600 dark:text-emerald-400">Tracking</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Welche Investoren sind am aktivsten? Wer kauft und verkauft am meisten?
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              📊 Analysiert werden die letzten 3 Quartale • Nur signifikante Änderungen von mehr als 100 Aktien/2% Portfolio-Gewichtung
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Most Active Investors - Quartr Style */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Aktivste Investoren</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Portfolio-Änderungen der letzten 3 Quartale</p>
                </div>
              </div>

              {(() => {
                interface ActivityData {
                  investor: string;
                  changes: number;
                  buys: number;
                  sells: number;
                  lastActivity: string;
                }

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
                          <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                            {data.investor}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Letztes Update: {data.lastActivity.split('-').reverse().join('.')}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg mb-1">
                            {data.changes}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">Änderungen</div>
                          <div className="flex gap-3 text-xs">
                            <span className="text-green-400 flex items-center gap-1">
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
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Große Bewegungen</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Portfolio-Gewichtung Änderungen größer 2%</p>
                </div>
              </div>

              {(() => {
                interface BigMove {
                  investor: string;
                  ticker: string;
                  type: 'buy' | 'sell';
                  percentChange: number;
                  value: number;
                  date: string;
                }

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
                            <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                              {move.ticker}
                            </h4>
                            <p className="text-xs text-gray-500">
                              {move.investor} • {move.type === 'buy' ? 'Gekauft' : 'Verkauft'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-bold text-lg mb-1 ${
                            move.type === 'buy' ? 'text-green-400' : 'text-red-400'
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium mb-6">
              <GlobeAltIcon className="w-4 h-4" />
              Geographic Exposure
            </div>
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-4">
              Globale
              <span className="text-emerald-600 dark:text-emerald-400"> Diversifikation</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Verteilung zwischen US-amerikanischen und internationalen Investments
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
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
                      <span className="text-2xl font-semibold text-neutral-600 dark:text-neutral-400">{usPercentage.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">🇺🇸 US-Märkte</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 font-semibold">
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
                      <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{intlPercentage.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">🌍 International</h3>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
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