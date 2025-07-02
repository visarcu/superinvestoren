// src/app/superinvestor/insights/page.tsx - VOLLSTÄNDIG mit korrekter Sektor-Zuordnung
'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

// Animation Hook
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return [ref, isVisible] as const;
};

// CountUp Hook
const useCountUp = (end: number, duration = 2000, shouldStart = false) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, shouldStart]);
  
  return count;
};

// Investor Namen Mapping
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  smith: 'Terry Smith', 
  gates: 'Bill Gates',
  marks: 'Howard Marks',
  icahn: 'Carl Icahn',
  einhorn: 'David Einhorn',
  loeb: 'Daniel Loeb',
  cooperman: 'Leon Cooperman',
  sosin: 'Howard Sosin',
  duan: 'Li Lu',
  lou: 'Daniel Lou',
  munger: 'Charlie Munger',
  gregaIexander: 'Greg Alexander',
  peltz: 'Nelson Peltz',
  abrams: 'David Abrams',
  tepper: 'David Tepper',
  berkowitz: 'Bruce Berkowitz',
  ginzlis: 'Leon Ginzlis',
  polen: 'Polen Capital',
  gayner: 'Tom Gayner',
  ketterer: 'Andreas Ketterer',
  viking: 'Viking Global',
  jensen: 'Bill Jensen'
};

// Deutsche Währungsformatierung
function formatCurrencyGerman(amount: number, showCurrency = true) {
  const suffix = showCurrency ? ' $' : ''
  
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)} Mrd.${suffix}`
  } else if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} Mio.${suffix}`
  } else if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)} Tsd.${suffix}`
  }
  return `${amount.toFixed(0)}${suffix}`
}

function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// Quarter-Funktionen
function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

// Quarter-Filter-Typen und Komponente
interface QuarterOption {
  id: string
  label: string
  quarters: string[]
  description: string
}

function QuarterSelector({ 
  options, 
  selected, 
  onSelect 
}: { 
  options: QuarterOption[]
  selected: string
  onSelect: (id: string) => void 
}) {
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
      className="absolute bg-gray-800/95 backdrop-blur-md border border-gray-600/80 rounded-xl shadow-2xl z-[100] mt-2"
      style={{
        width: `${Math.max(280, dropdownPosition.width)}px`,
        maxHeight: `${dropdownPosition.maxHeight}px`
      }}
    >
      <div className="p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Zeitraum wählen</span>
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
              className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all duration-200 ${
                selected === option.id 
                  ? 'bg-green-600/80 text-white shadow-md' 
                  : 'text-gray-300 hover:bg-gray-700/60 hover:text-white'
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

      <div className="p-3 border-t border-gray-700/50 bg-gray-800/50">
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600/60 rounded-lg text-sm text-gray-300 hover:text-white transition-all duration-200 hover:scale-105 hover:shadow-lg min-w-[160px]"
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
}

function calculateDataSourceStats(targetQuarters: string[]) {
  const stats = {
    totalInvestors: 0,
    investorsWithData: 0,
    totalFilings: 0,
    filingsInPeriod: 0,
    lastUpdated: '',
    quarters: targetQuarters
  }

  const activeInvestors = Object.entries(holdingsHistory).filter(([slug, snaps]) => {
    return snaps && snaps.length > 0 && snaps[snaps.length - 1]?.data?.positions?.length > 0
  })

  stats.totalInvestors = activeInvestors.length

  let latestDate = ''
  activeInvestors.forEach(([slug, snaps]) => {
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

export default function MarketInsightsPage() {
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartsRef, chartsVisible] = useIntersectionObserver(0.3);
  const [sectorsRef, sectorsVisible] = useIntersectionObserver(0.1);

  // Alle verfügbaren Quartale ermitteln
  const latestDatesPerInvestor = Object.values(holdingsHistory)
    .map(snaps => {
      if (!snaps || snaps.length === 0) return null
      const latest = snaps[snaps.length - 1]?.data
      return latest?.date || null
    })
    .filter(Boolean) as string[]
  
  const latestDate = latestDatesPerInvestor.sort().pop() || ''
  const actualLatestQuarter = latestDate ? getPeriodFromDate(latestDate) : 'Q1 2025'
  
  const allQuarters = Array.from(new Set(
    Object.values(holdingsHistory)
      .flatMap(snaps => {
        if (!snaps) return []
        return snaps.map(snap => getPeriodFromDate(snap.data.date))
      })
      .filter(Boolean)
  )).sort().reverse()

  // Quarter-Filter-Optionen
  const quarterOptions: QuarterOption[] = [
    {
      id: 'latest',
      label: actualLatestQuarter,
      quarters: [actualLatestQuarter],
      description: 'Neuestes Quartal'
    },
    {
      id: 'last2',
      label: 'Letzte 2 Quartale',
      quarters: allQuarters.slice(0, 2),
      description: `${allQuarters.slice(0, 2).join(' + ')}`
    },
    {
      id: 'last3',
      label: 'Letzte 3 Quartale',
      quarters: allQuarters.slice(0, 3),
      description: `${allQuarters.slice(0, 3).join(', ')}`
    },
    ...allQuarters.slice(0, 6).map(quarter => ({
      id: quarter,
      label: quarter,
      quarters: [quarter],
      description: 'Einzelnes Quartal'
    })),
    {
      id: 'all',
      label: 'Alle Zeit',
      quarters: allQuarters,
      description: 'Alle verfügbaren Quartale'
    }
  ]

  // State für Filter
  const [selectedPeriod, setSelectedPeriod] = useState('latest')
  const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
  const targetQuarters = selectedOption?.quarters || [actualLatestQuarter]

  const dataSourceStats = calculateDataSourceStats(targetQuarters)

  // Top-Käufe Berechnung
  const buyCounts = new Map<string, number>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return
    
    snaps.forEach((snap, idx) => {
      const currentQuarter = getPeriodFromDate(snap.data.date)
      
      if (!targetQuarters.includes(currentQuarter)) return
      
      const cur = snap.data
      
      if (idx > 0) {
        const prev = snaps[idx - 1].data
        
        const prevMap = new Map<string, number>()
        prev.positions?.forEach((p: any) => {
          const ticker = getTicker(p)
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
          }
        })

        const seen = new Set<string>()
        cur.positions?.forEach((p: any) => {
          const ticker = getTicker(p)
          if (!ticker || seen.has(ticker)) return
          seen.add(ticker)

          const prevShares = prevMap.get(ticker) || 0
          const delta = p.shares - prevShares

          if (delta > 0) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      } else {
        const seen = new Set<string>()
        cur.positions?.forEach((p: any) => {
          const ticker = getTicker(p)
          if (ticker && !seen.has(ticker)) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      }
    })
  })

  const topBuys = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  // Beliebteste Aktien
  const ownershipCount = new Map<string, number>()
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    const seen = new Set<string>()
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker && !seen.has(ticker)) {
        seen.add(ticker)
        ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1)
      }
    })
  })

  const topOwned = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  // Größte Investments
  const investmentTotals = new Map<string, { value: number, name: string }>()

  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
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

  const biggestInvestments = Array.from(investmentTotals.entries())
    .map(([ticker, { value, name }]) => ({ ticker, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  // Name-Lookup
  const nameMap: Record<string, string> = {}

  stocks.forEach(s => { 
    nameMap[s.ticker] = s.name 
  })

  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
      const ticker = getTicker(p)
      if (ticker && !nameMap[ticker]) {
        nameMap[ticker] = getStockName(p)
      }
    })
  })

  // ✅ FIXED: Sektor-Analyse mit korrekter Sektor-Zuordnung
  const sectorAnalysis = new Map<string, { value: number, count: number }>()
  
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return
    
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    
    latest.positions.forEach((p: any) => {
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

  const topSectors = Array.from(sectorAnalysis.entries())
    .map(([sector, { value, count }]) => ({ sector, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  // Geographic Exposure - mit verbesserter Logik
  const getGeographicExposure = () => {
    let usValue = 0
    let internationalValue = 0
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length === 0) return
      
      const latest = snaps[snaps.length - 1]?.data
      if (!latest?.positions) return
      
      latest.positions.forEach((p: any) => {
        const ticker = getTicker(p)
        if (!ticker) return
        
        // Einfache Heuristik: Ticker mit Punkten sind oft internationale Aktien
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
    
    return { usValue, internationalValue, usPercentage, intlPercentage }
  }

  const { usValue, internationalValue, usPercentage, intlPercentage } = getGeographicExposure()

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Header */}
      <section className="bg-gray-950 noise-bg pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zur Übersicht
            </Link>
          </div>

          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            <div className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-6 h-6 text-green-400" />
                  <h1 className="text-3xl font-bold text-white">Market Insights</h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>{dataSourceStats.investorsWithData} von {dataSourceStats.totalInvestors} Investoren</span>
                </div>
              </div>
              
              <p className="text-lg text-gray-400 max-w-4xl leading-relaxed mb-4">
                Detaillierte Analysen der Käufe, Verkäufe und Bewegungen der besten Investoren der Welt.
                Entdecke Trends, Sektoren und Investment-Patterns der Super-Investoren.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span>📋 {dataSourceStats.filingsInPeriod} Filings • {selectedOption?.label || 'Aktueller Zeitraum'}</span>
                <span>📅 Letztes Update: {dataSourceStats.lastUpdated.split('-').reverse().join('.')}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <strong className="text-green-400">Aktivste Investoren:</strong> Anzahl signifikanter Portfolio-Änderungen in den letzten 3 Quartalen.
                Gezählt werden Käufe/Verkäufe von mehr als 100 Aktien.
              </div>
              <div>
                <strong className="text-green-400">Große Bewegungen:</strong> Änderungen der Portfolio-Gewichtung von mehr als 2% zwischen den letzten beiden Quartalen.
                Zeigt die dramatischsten Umschichtungen.
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Stats Overview */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topBuys.filter(buy => buy.count > 0).length, 2000, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Gekaufte Aktien</p>
                <p className="text-gray-600 text-xs">
                  {dataSourceStats.investorsWithData} Investoren • {selectedOption?.label}
                </p>
              </div>
            </div>
          </div>
          
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FireIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topOwned.length, 2200, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Beliebte Aktien</p>
                <p className="text-gray-600 text-xs">Von 2+ Investoren gehalten</p>
              </div>
            </div>
          </div>
          
          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(Math.round(biggestInvestments.reduce((sum, inv) => sum + inv.value, 0) / 1_000_000_000), 2400, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Mrd. $ Investment</p>
                <p className="text-gray-600 text-xs">Top 20 Positionen</p>
              </div>
            </div>
          </div>

          <div className={`bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
            statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`} style={{ transitionDelay: '600ms' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <BuildingOfficeIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white numeric">
                  {useCountUp(topSectors.length, 2600, statsVisible)}
                </p>
                <p className="text-gray-400 text-sm">Top Sektoren</p>
                <p className="text-gray-600 text-xs">Nach Investment-Volumen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Charts Grid */}
        <div ref={chartsRef} className={`grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 transform transition-all duration-1000 ${
          chartsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          
          {/* Top Käufe Chart */}
          <div className="relative bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200 overflow-visible">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Top Käufe</h3>
                  <p className="text-sm text-gray-400">Meist gekaufte Aktien</p>
                </div>
              </div>
              <QuarterSelector
                options={quarterOptions}
                selected={selectedPeriod}
                onSelect={setSelectedPeriod}
              />
            </div>

            {selectedOption && (
              <div className="mb-4 flex items-center justify-between text-xs text-gray-500 border-b border-gray-800/50 pb-3">
                <span>
                  📊 {dataSourceStats.filingsInPeriod} Filings aus {selectedOption.description}
                </span>
                <span>
                  {dataSourceStats.investorsWithData} aktive Investoren
                </span>
              </div>
            )}
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topBuys.length > 0 ? (
                topBuys.slice(0, 15).map((item, idx) => (
                  <Link
                    key={item.ticker}
                    href={`/analyse/stocks/${item.ticker.toLowerCase()}/super-investors`}
                    className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 relative">
                        <Logo
                          ticker={item.ticker}
                          alt={`${item.ticker} Logo`}
                          className="w-full h-full"
                          padding="none"
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                          {item.ticker}
                        </p>
                        <p className="text-gray-500 text-xs truncate max-w-[120px]">
                          {nameMap[item.ticker] || item.ticker}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 text-sm font-semibold bg-green-500/20 px-2 py-1 rounded">
                        {item.count}
                      </span>
                      <p className="text-xs text-gray-500">Investoren</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Keine Käufe in diesem Zeitraum</p>
                </div>
              )}
            </div>
          </div>

          {/* Beliebteste Aktien */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <FireIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Beliebteste Aktien</h3>
                <p className="text-sm text-gray-400">Meist gehaltene Positionen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {topOwned.slice(0, 15).map((item, idx) => (
                <Link
                  key={item.ticker}
                  href={`/analyse/stocks/${item.ticker.toLowerCase()}/super-investors`}
                  className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                      <Logo
                        ticker={item.ticker}
                        alt={`${item.ticker} Logo`}
                        className="w-full h-full"
                        padding="none"
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                        {item.ticker}
                      </p>
                      <p className="text-gray-500 text-xs truncate max-w-[120px]">
                        {nameMap[item.ticker] || item.ticker}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 text-sm font-semibold bg-green-500/20 px-2 py-1 rounded">
                      {item.count}
                    </span>
                    <p className="text-xs text-gray-500">Portfolios</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Größte Investments */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Größte Investments</h3>
                <p className="text-sm text-gray-400">Nach Dollar-Volumen</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {biggestInvestments.slice(0, 15).map((item, idx) => (
                <Link
                  key={item.ticker}
                  href={`/analyse/stocks/${item.ticker.toLowerCase()}/super-investors`}
                  className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 relative">
                      <Logo
                        ticker={item.ticker}
                        alt={`${item.ticker} Logo`}
                        className="w-full h-full"
                        padding="none"
                      />
                    </div>
                    <div>
                      <p className="text-white font-medium group-hover:text-green-400 transition-colors">
                        {item.ticker}
                      </p>
                      <p className="text-gray-500 text-xs truncate max-w-[120px]">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 text-sm font-semibold bg-green-500/20 px-2 py-1 rounded">
                      {formatCurrencyGerman(item.value, false)}
                    </span>
                    <p className="text-xs text-gray-500">Wert</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Investment Strategien */}
        <div ref={sectorsRef} className={`mb-16 transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              <StarIcon className="w-4 h-4" />
              Investment Strategien
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Konsensus vs.
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Contrarian Picks</span>
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Links: Aktien mit breitem Konsensus und hoher Portfolio-Gewichtung. 
              Rechts: Seltene Überzeugungen weniger Investoren.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Konsensus-Aktien */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <StarIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Konsensus-Aktien</h3>
                    <p className="text-sm text-gray-400">Hohe Portfolio-Gewichtung bei mehreren Investoren</p>
                  </div>
                </div>
              </div>

              {(() => {
                const bigBetsData: Array<{
                  ticker: string;
                  name: string;
                  maxPortfolioPercent: number;
                  ownershipCount: number;
                  totalValue: number;
                  topInvestor: string;
                }> = [];

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
                  latest.positions.forEach(p => {
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
                      {bigBetsData.slice(0, 8).map((bet, index) => (
                        <Link
                          key={bet.ticker}
                          href={`/analyse/stocks/${bet.ticker.toLowerCase()}/super-investors`}
                          className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
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
                                {bet.maxPortfolioPercent.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {bet.ownershipCount} Investoren
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-gray-400">{bet.ownershipCount} Investoren</span>
                            <span className="text-gray-400">
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

            {/* Contrarian Picks */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-sm">
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <BoltIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Contrarian Picks</h3>
                    <p className="text-sm text-gray-400">Wenige Investoren, hohe Überzeugung</p>
                  </div>
                </div>
              </div>

              {(() => {
                const contrarianData: Array<{
                  ticker: string;
                  name: string;
                  portfolioPercent: number;
                  investor: string;
                  value: number;
                  ownershipCount: number;
                }> = [];

                const ownershipCount = new Map<string, number>();
                Object.values(holdingsHistory).forEach(snaps => {
                  if (!snaps || snaps.length === 0) return;
                  
                  const latest = snaps[snaps.length - 1]?.data;
                  if (!latest?.positions) return;
                  
                  const seen = new Set<string>();
                  latest.positions.forEach((p: any) => {
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
                  latest.positions.forEach(p => {
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
                        {contrarianData.slice(0, 8).map((pick, index) => (
                          <Link
                            key={`${pick.ticker}-${pick.investor}`}
                            href={`/analyse/stocks/${pick.ticker.toLowerCase()}/super-investors`}
                            className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
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
                                  {pick.portfolioPercent.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  {pick.ownershipCount} Investor{pick.ownershipCount !== 1 ? 'en' : ''}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-green-300 font-medium">{pick.investor}</span>
                              <span className="text-gray-400">
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

          <div className="mt-8 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
              <div>
                <strong className="text-green-400">Konsensus-Aktien:</strong> Mindestens 3% Portfolio-Gewichtung bei 2+ Investoren. 
                Zeigt breiten Konsensus mit hoher Überzeugung.
              </div>
              <div>
                <strong className="text-green-400">Contrarian Picks:</strong> Mindestens 4% Portfolio-Gewichtung bei max. 2 Investoren. 
                Zeigt seltene, aber starke Überzeugungen.
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Konzentration Analysis */}
        <div className={`mb-16 transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              <ShieldCheckIcon className="w-4 h-4" />
              Portfolio Konzentration
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Konzentration vs.
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Diversifikation</span>
            </h2>
            <p className="text-gray-400">
              Wer setzt auf wenige große Positionen vs. breite Diversifikation?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(() => {
              const concentrationData: Array<{
                investor: string;
                concentration: number;
                top3Percentage: number;
                totalPositions: number;
                type: 'high' | 'medium' | 'low';
              }> = [];

              ['buffett', 'ackman', 'smith', 'gates', 'marks', 'icahn', 'einhorn', 'loeb', 'cooperman', 'tepper'].forEach(slug => {
                const snaps = holdingsHistory[slug];
                if (!snaps || snaps.length === 0) return;

                const latest = snaps[snaps.length - 1]?.data;
                if (!latest?.positions) return;

                const mergedMap = new Map<string, number>();
                latest.positions.forEach(p => {
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

              return concentrationData.map((data, index) => (
                <div
                  key={data.investor}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{data.investor}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.type === 'high' ? 'bg-green-500/20 text-green-400' :
                      data.type === 'medium' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-gray-600/20 text-gray-300'
                    }`}>
                      {data.type === 'high' ? 'Konzentriert' :
                       data.type === 'medium' ? 'Ausgewogen' : 'Diversifiziert'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Konzentrations-Index</span>
                      <span className="text-white font-semibold">{(data.concentration * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          data.type === 'high' ? 'bg-green-500' :
                          data.type === 'medium' ? 'bg-gray-500' : 'bg-gray-600'
                        }`}
                        style={{ width: `${Math.min(data.concentration * 100 * 5, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Top 3 Holdings:</span>
                      <span className={`font-semibold ${
                        data.top3Percentage > 60 ? 'text-green-400' :
                        data.top3Percentage > 40 ? 'text-gray-400' : 'text-gray-300'
                      }`}>
                        {data.top3Percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Gesamt-Positionen:</span>
                      <span className="text-white font-semibold">{data.totalPositions}</span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Recent Activity Tracking */}
        <div className={`mb-16 transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              <ClockIcon className="w-4 h-4" />
              Recent Activity
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Aktivitäts-
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">Tracking</span>
            </h2>
            <p className="text-gray-400 mb-4">
              Welche Investoren sind am aktivsten? Wer kauft und verkauft am meisten?
            </p>
            <p className="text-sm text-gray-500">
              📊 Analysiert werden die letzten 3 Quartale • Nur signifikante Änderungen von mehr als 100 Aktien/2% Portfolio-Gewichtung
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Most Active Investors */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Aktivste Investoren</h3>
                  <p className="text-sm text-gray-400">Portfolio-Änderungen der letzten 3 Quartale</p>
                </div>
              </div>

              {(() => {
                const activityData: Array<{
                  investor: string;
                  changes: number;
                  buys: number;
                  sells: number;
                  lastActivity: string;
                }> = [];

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
                    previous.positions?.forEach((p: any) => {
                      const ticker = getTicker(p);
                      if (ticker) {
                        prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares);
                      }
                    });

                    const seen = new Set<string>();
                    current.positions?.forEach((p: any) => {
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
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
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

            {/* Recent Big Moves */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <BoltIcon className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Große Bewegungen</h3>
                  <p className="text-sm text-gray-400">Portfolio-Gewichtung Änderungen größer 2%</p>
                </div>
              </div>

              {(() => {
                const bigMoves: Array<{
                  investor: string;
                  ticker: string;
                  type: 'buy' | 'sell';
                  percentChange: number;
                  value: number;
                  date: string;
                }> = [];

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
                  previous.positions?.forEach((p: any) => {
                    const ticker = getTicker(p);
                    if (ticker) {
                      prevMap.set(ticker, p.value / prevTotalValue * 100);
                    }
                  });

                  current.positions?.forEach((p: any) => {
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
                        <div key={`${move.investor}-${move.ticker}-${index}`} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/analyse/stocks/${move.ticker.toLowerCase()}/super-investors`}
                              className="w-8 h-8 relative hover:scale-110 transition-transform"
                            >
                              <Logo
                                ticker={move.ticker}
                                alt={`${move.ticker} Logo`}
                                className="w-full h-full"
                                padding="none"
                              />
                            </Link>
                            <div>
                              <Link
                                href={`/analyse/stocks/${move.ticker.toLowerCase()}/super-investors`}
                                className="font-semibold text-white hover:text-green-400 transition-colors"
                              >
                                {move.ticker}
                              </Link>
                              <Link
                                href={`/superinvestor/${investorSlug}`}
                                className="block text-xs text-gray-500 hover:text-green-400 transition-colors"
                              >
                                {move.investor}
                              </Link>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`font-bold text-lg ${
                              move.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {move.type === 'buy' ? '+' : '-'}{move.percentChange.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600 mb-1">Portfolio-Gewichtung</div>
                            <div className="text-xs text-gray-500">
                              {formatCurrencyGerman(move.value, false)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Sektor-Analyse */}
        <section className={`mb-16 transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              <BuildingOfficeIcon className="w-4 h-4" />
              Sektor-Analyse
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Investment
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Sektoren</span>
            </h2>
            <p className="text-gray-400">
              Wie die Super-Investoren ihr Kapital auf verschiedene Wirtschaftssektoren verteilen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topSectors.map((sector, index) => (
              <div
                key={sector.sector}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{sector.sector}</h3>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Gesamt-Wert:</span>
                    <span className="text-green-400 font-semibold">
                      {formatCurrencyGerman(sector.value)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Positionen:</span>
                    <span className="text-white font-semibold">{sector.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Geographic Exposure */}
        <section className={`transform transition-all duration-1000 ${
          sectorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              <GlobeAltIcon className="w-4 h-4" />
              Geographic Exposure
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Globale
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Diversifikation</span>
            </h2>
            <p className="text-gray-400">
              Verteilung zwischen US-amerikanischen und internationalen Investments
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
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
                      <span className="text-2xl font-bold text-gray-400">{usPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">🇺🇸 US-Märkte</h3>
                  <p className="text-gray-400 font-semibold">
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
                      <span className="text-2xl font-bold text-green-400">{intlPercentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">🌍 International</h3>
                  <p className="text-green-400 font-semibold">
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