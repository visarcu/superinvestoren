// components/LatestGuruTrades.tsx
'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  PlusIcon,
  MinusIcon,
  UserIcon,
  CalendarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { useCurrency } from '@/lib/CurrencyContext'

// Investor Namen Mapping - ERWEITERT mit allen Investoren
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  gates: 'Bill Gates Foundation',
  einhorn: 'David Einhorn',
  ackman: 'Bill Ackman',
  miller: 'Bill Miller',
  burry: 'Michael Burry',
  icahn: 'Carl Icahn',
  loeb: 'Daniel Loeb',
  tepper: 'David Tepper',
  dalio: 'Ray Dalio',
  klarman: 'Seth Klarman',
  soros: 'George Soros',
  bloomstran: 'Christopher Bloomstran',
  // Füge hier alle weiteren Investoren aus deiner holdings/index.ts hinzu
  torray: 'Torray Investment Partners',
  davis: 'Christopher Davis',
  greenhaven: 'Edgar Wachenheim III',
  hawkins: 'Mason Hawkins',
  peltz: 'Nelson Peltz',
  fisher: 'Ken Fisher',
  dodgecox: 'Dodge & Cox',
  pzena: 'Richard Pzena',
  weitz: 'Wallace Weitz',
  gayner: 'Thomas Gayner',
  akre: 'Chuck Akre',
  russo: 'Thomas Russo',
  smith: 'Terry Smith',
  watsa: 'Prem Watsa',
  dorsey: 'Pat Dorsey',
  hohn: 'Chris Hohn',
  coleman: 'Chase Coleman',
  greenberg: 'Glenn Greenberg',
  mandel: 'Stephen Mandel',
  marks: 'Howard Marks',
  rogers: 'John Rogers',
  spier: 'Guy Spier'
}

// Investor Images - Echte Bilder aus public/images
const getInvestorImage = (slug: string): string => {
  // Mapping zu den tatsächlichen Dateinamen in public/images
  const imageMap: Record<string, string> = {
    buffett: 'buffett.png',
    gates: 'gates.png',
    einhorn: 'einhorn.png',
    ackman: 'ackman.png',
    miller: 'miller.png',
    burry: 'burry.png',
    icahn: 'icahn.png',
    loeb: 'loeb.png',
    tepper: 'tepper.png',
    dalio: 'dalio.png',
    klarman: 'klarman.png',
    soros: 'soros.png',
    bloomstran: 'bloomstran.png',
    dodgecox: 'dodgecox.png',
    fisher: 'fisher.png',
    greenhaven: 'greenhaven.png',
    peltz: 'peltz.png',
    pzena: 'pzena.png',
    smith: 'smith.png',
    watsa: 'watsa.png',
    dorsey: 'dorsey.png',
    hohn: 'hohn.png',
    coleman: 'coleman.png',
    greenberg: 'greenberg.png',
    mandel: 'mandel.png',
    marks: 'marks.png',
    rogers: 'rogers.png',
    spier: 'spier.png',
    akre: 'akre.png',
    russo: 'russo.png',
    gayner: 'gayner.png',
    weitz: 'weitz.png'
  }
  
  return imageMap[slug] ? `/images/${imageMap[slug]}` : '/images/default-investor.png'
}

interface Trade {
  investor: string
  investorName: string
  investorImage: string
  type: 'NEW' | 'ADD' | 'REDUCE' | 'SOLD'
  ticker: string
  name: string
  shares: number
  value: number
  dollarChange?: number // NEU: Absolute Dollar-Änderung
  percentChange?: number
  date: string
  quarterKey: string
}

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const ticker = getTicker(position)
  const stock = stocks.find(s => s.ticker === ticker)
  return stock?.name || position.name || 'Unknown'
}

function calculateTrades(): Trade[] {
  const investorBestTrade = new Map<string, Trade>()
  
  console.log('Available investors:', Object.keys(holdingsHistory))
  
  Object.entries(holdingsHistory).forEach(([investorSlug, snapshots]) => {
    if (!snapshots || snapshots.length < 2) {
      console.log(`Skipping ${investorSlug}: Not enough snapshots (${snapshots?.length || 0})`)
      return
    }
    
    const currentSnapshot = snapshots[snapshots.length - 1]
    const previousSnapshot = snapshots[snapshots.length - 2]
    
    if (!currentSnapshot?.data?.positions || !previousSnapshot?.data?.positions) {
      console.log(`Skipping ${investorSlug}: Missing positions data`)
      return
    }
    
    console.log(`Processing ${investorSlug}: ${currentSnapshot.quarter} vs ${previousSnapshot.quarter}`)
    
    const currentPositions = new Map<string, any>()
    const previousPositions = new Map<string, any>()
    const investorTrades: Trade[] = []
    
    // Map für aktuelle Positionen
    currentSnapshot.data.positions.forEach((pos: any) => {
      const ticker = getTicker(pos)
      if (ticker) {
        currentPositions.set(ticker, pos)
      }
    })
    
    // Map für vorherige Positionen
    previousSnapshot.data.positions.forEach((pos: any) => {
      const ticker = getTicker(pos)
      if (ticker) {
        previousPositions.set(ticker, pos)
      }
    })
    
    // Neue Positionen (NEW)
    currentPositions.forEach((currentPos, ticker) => {
      if (!previousPositions.has(ticker) && currentPos.value > 1000000) {
        investorTrades.push({
          investor: investorSlug,
          investorName: investorNames[investorSlug] || investorSlug,
          investorImage: getInvestorImage(investorSlug),
          type: 'NEW',
          ticker,
          name: getStockName(currentPos),
          shares: currentPos.shares,
          value: currentPos.value,
          dollarChange: currentPos.value, // Neue Position = voller Wert
          date: currentSnapshot.data.date,
          quarterKey: currentSnapshot.quarter
        })
      }
    })
    
    // Erhöhte Positionen (ADD) und Reduzierte (REDUCE)
    currentPositions.forEach((currentPos, ticker) => {
      const previousPos = previousPositions.get(ticker)
      if (previousPos) {
        const sharesDelta = currentPos.shares - previousPos.shares
        const valueDelta = currentPos.value - previousPos.value
        const percentChange = ((sharesDelta / previousPos.shares) * 100)
        
        // Berechne Dollar-Änderung basierend auf aktuellem Kurs
        const pricePerShare = currentPos.value / currentPos.shares
        const dollarChange = Math.abs(sharesDelta * pricePerShare)
        
        if (Math.abs(percentChange) > 5 && dollarChange > 1000000) {
          investorTrades.push({
            investor: investorSlug,
            investorName: investorNames[investorSlug] || investorSlug,
            investorImage: getInvestorImage(investorSlug),
            type: sharesDelta > 0 ? 'ADD' : 'REDUCE',
            ticker,
            name: getStockName(currentPos),
            shares: Math.abs(sharesDelta),
            value: currentPos.value,
            dollarChange: dollarChange,
            percentChange: Math.abs(percentChange),
            date: currentSnapshot.data.date,
            quarterKey: currentSnapshot.quarter
          })
        }
      }
    })
    
    // Verkaufte Positionen (SOLD)
    previousPositions.forEach((previousPos, ticker) => {
      if (!currentPositions.has(ticker) && previousPos.value > 1000000) {
        investorTrades.push({
          investor: investorSlug,
          investorName: investorNames[investorSlug] || investorSlug,
          investorImage: getInvestorImage(investorSlug),
          type: 'SOLD',
          ticker,
          name: getStockName(previousPos),
          shares: previousPos.shares,
          value: previousPos.value,
          dollarChange: previousPos.value, // Verkauft = voller vorheriger Wert
          date: currentSnapshot.data.date,
          quarterKey: currentSnapshot.quarter
        })
      }
    })
    
    // Wähle den Trade mit der größten Dollar-Bewegung
    if (investorTrades.length > 0) {
      const bestTrade = investorTrades.sort((a, b) => {
        // Sortiere nach Dollar-Änderung (größte zuerst)
        return (b.dollarChange || 0) - (a.dollarChange || 0)
      })[0]
      
      console.log(`Best trade for ${investorSlug}: ${bestTrade.ticker} ${bestTrade.type} ${(bestTrade.dollarChange || 0).toLocaleString()}`)
      investorBestTrade.set(investorSlug, bestTrade)
    }
  })
  
  // Konvertiere Map zu Array und sortiere nach Datum
  const finalTrades = Array.from(investorBestTrade.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
  
  console.log(`Found ${investorBestTrade.size} investors with trades, showing top 5`)
  
  return finalTrades
}

function getDaysAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'heute'
  if (diffDays === 1) return 'gestern'
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`
  return `vor ${Math.floor(diffDays / 30)} Monaten`
}

export default function LatestGuruTrades({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { formatStockPrice, formatPercentage, formatMarketCap } = useCurrency()
  const latestTrades = useMemo(() => calculateTrades(), [])
  
  const getTradeColor = (type: Trade['type']) => {
    switch(type) {
      case 'NEW':
      case 'ADD':
        return 'text-green-400'
      case 'REDUCE':
      case 'SOLD':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }
  
  const getTradeIcon = (type: Trade['type']) => {
    switch(type) {
      case 'NEW':
        return <PlusIcon className="w-3 h-3" />
      case 'ADD':
        return <ArrowTrendingUpIcon className="w-3 h-3" />
      case 'REDUCE':
        return <ArrowTrendingDownIcon className="w-3 h-3" />
      case 'SOLD':
        return <MinusIcon className="w-3 h-3" />
      default:
        return null
    }
  }
  
  const getTradeLabel = (type: Trade['type']) => {
    switch(type) {
      case 'NEW':
        return 'Neu'
      case 'ADD':
        return 'Aufgestockt'
      case 'REDUCE':
        return 'Reduziert'
      case 'SOLD':
        return 'Verkauft'
      default:
        return ''
    }
  }
  
  // Kompakte Version für Sidebar
  if (variant === 'compact') {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl">
        <div className="p-4 border-b border-theme/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-green-400" />
              <h3 className="text-sm font-bold text-theme-primary">Superinvestoren Trades</h3>
            </div>
            <Link
              href="/superinvestor/insights"
              className="text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              Alle →
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-theme/5">
          {latestTrades.slice(0, 5).map((trade, index) => (
            <div key={`${trade.investor}-${trade.ticker}-${index}`} className="p-3 hover:bg-theme-hover transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={trade.investorImage}
                  alt={trade.investorName}
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-investor.png'
                  }}
                />
                <Link
                  href={`/superinvestor/${trade.investor}`}
                  className="text-xs font-medium text-theme-primary hover:text-green-400 transition-colors truncate flex-1"
                >
                  {trade.investorName}
                </Link>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Logo
                    ticker={trade.ticker}
                    alt={`${trade.ticker} Logo`}
                    className="w-6 h-6 rounded"
                    padding="none"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-theme-primary">{trade.ticker}</span>
                    <span className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-xs ${
                      trade.type === 'NEW' || trade.type === 'ADD'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getTradeIcon(trade.type)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-theme-primary">
                    {formatMarketCap((trade.dollarChange || trade.value))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // Volle Version für Main Content
  return (
    <div className="bg-theme-card border border-theme/10 rounded-xl">
      {/* Header */}
      <div className="p-6 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-theme-primary">Guru Trades</h3>
              <p className="text-sm text-theme-muted">Aktuelle Super-Investor Bewegungen</p>
            </div>
          </div>
          <Link
            href="/superinvestor/insights"
            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
          >
            Alle ansehen
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
      
      {/* Trades List */}
      <div className="divide-y divide-theme/10">
        {latestTrades.length > 0 ? (
          latestTrades.map((trade, index) => (
            <div key={`${trade.investor}-${trade.ticker}-${index}`} className="p-4 hover:bg-theme-hover transition-colors">
              {/* Investor Info */}
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src={trade.investorImage}
                  alt={trade.investorName}
                  className="w-8 h-8 rounded-full object-cover border border-theme/20"
                  onError={(e) => {
                    // Fallback falls Bild nicht gefunden
                    (e.target as HTMLImageElement).src = '/images/default-investor.png'
                  }}
                />
                <div className="flex-1">
                  <Link
                    href={`/superinvestor/${trade.investor}`}
                    className="text-sm font-semibold text-theme-primary hover:text-green-400 transition-colors"
                  >
                    {trade.investorName}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-theme-muted">
                    <CalendarIcon className="w-3 h-3" />
                    {getDaysAgo(trade.date)}
                  </div>
                </div>
              </div>
              
              {/* Trade Details */}
              <div className="flex items-center gap-3">
                {/* Stock Logo */}
                <Logo
                  ticker={trade.ticker}
                  alt={`${trade.ticker} Logo`}
                  className="w-10 h-10 rounded-lg"
                  padding="small"
                />
                
                {/* Stock Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/analyse/stocks/${trade.ticker.toLowerCase()}`}
                      className="font-bold text-theme-primary hover:text-green-400 transition-colors"
                    >
                      {trade.ticker}
                    </Link>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                      trade.type === 'NEW' || trade.type === 'ADD'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getTradeIcon(trade.type)}
                      {getTradeLabel(trade.type)}
                    </span>
                  </div>
                  <div className="text-xs text-theme-muted truncate max-w-[200px]">
                    {trade.name}
                  </div>
                </div>
                
                {/* Value/Change */}
                <div className="text-right">
                  <div className="text-sm font-bold text-theme-primary">
                    {formatMarketCap((trade.dollarChange || trade.value))}
                  </div>
                  {trade.percentChange && (
                    <div className={`text-xs ${getTradeColor(trade.type)}`}>
                      {trade.type === 'ADD' ? '+' : trade.type === 'REDUCE' ? '-' : ''}{formatPercentage(trade.percentChange, false)}
                    </div>
                  )}
                  <div className="text-xs text-theme-muted">
                    {trade.shares.toLocaleString('de-DE')} Aktien
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-theme-muted">
            <UserIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Keine aktuellen Trades verfügbar</p>
          </div>
        )}
      </div>
    </div>
  )
}