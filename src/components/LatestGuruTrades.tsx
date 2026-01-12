// components/LatestGuruTrades.tsx
'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { useCurrency } from '@/lib/CurrencyContext'

// Investor Namen Mapping
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

// Investor Images
const getInvestorImage = (slug: string): string => {
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
  dollarChange?: number
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
  
  Object.entries(holdingsHistory).forEach(([investorSlug, snapshots]) => {
    if (!snapshots || snapshots.length < 2) return
    
    const currentSnapshot = snapshots[snapshots.length - 1]
    const previousSnapshot = snapshots[snapshots.length - 2]
    
    if (!currentSnapshot?.data?.positions || !previousSnapshot?.data?.positions) return
    
    const currentPositions = new Map<string, any>()
    const previousPositions = new Map<string, any>()
    const investorTrades: Trade[] = []
    
    currentSnapshot.data.positions.forEach((pos: any) => {
      const ticker = getTicker(pos)
      if (ticker) currentPositions.set(ticker, pos)
    })
    
    previousSnapshot.data.positions.forEach((pos: any) => {
      const ticker = getTicker(pos)
      if (ticker) previousPositions.set(ticker, pos)
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
          dollarChange: currentPos.value,
          date: currentSnapshot.data.date,
          quarterKey: currentSnapshot.quarter
        })
      }
    })
    
    // Erhöhte/Reduzierte Positionen
    currentPositions.forEach((currentPos, ticker) => {
      const previousPos = previousPositions.get(ticker)
      if (previousPos) {
        const sharesDelta = currentPos.shares - previousPos.shares
        const percentChange = ((sharesDelta / previousPos.shares) * 100)
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
          dollarChange: previousPos.value,
          date: currentSnapshot.data.date,
          quarterKey: currentSnapshot.quarter
        })
      }
    })
    
    if (investorTrades.length > 0) {
      const bestTrade = investorTrades.sort((a, b) => 
        (b.dollarChange || 0) - (a.dollarChange || 0)
      )[0]
      investorBestTrade.set(investorSlug, bestTrade)
    }
  })
  
  return Array.from(investorBestTrade.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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

interface Props {
  variant?: 'full' | 'compact' | 'dashboard'
  limit?: number
}

export default function LatestGuruTrades({ variant = 'full', limit }: Props) {
  const { formatPercentage, formatMarketCap } = useCurrency()
  const allTrades = useMemo(() => calculateTrades(), [])
  const latestTrades = limit ? allTrades.slice(0, limit) : allTrades.slice(0, 5)
  
  const getTradeLabel = (type: Trade['type']) => {
    switch(type) {
      case 'NEW': return 'Neu'
      case 'ADD': return 'Aufgestockt'
      case 'REDUCE': return 'Reduziert'
      case 'SOLD': return 'Verkauft'
      default: return ''
    }
  }
  
  const getTradeColor = (type: Trade['type']) => {
    return type === 'NEW' || type === 'ADD' ? 'text-positive' : 'text-negative'
  }

  // ===== DASHBOARD VARIANT - Clean & Minimal =====
  if (variant === 'dashboard') {
    return (
      <div className="space-y-0">
        {latestTrades.length > 0 ? (
          latestTrades.map((trade, index) => (
            <div key={`${trade.investor}-${trade.ticker}-${index}`} className="px-5 py-4 hover:bg-theme-hover/30 transition-colors border-b border-white/[0.04] last:border-b-0">
              {/* Single Row Layout */}
              <div className="flex items-center gap-3">
                <img
                  src={trade.investorImage}
                  alt={trade.investorName}
                  className="w-9 h-9 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-investor.png'
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/superinvestor/${trade.investor}`}
                      className="text-sm font-medium text-theme-primary hover:text-brand transition-colors truncate"
                    >
                      {trade.investorName}
                    </Link>
                    <span className="text-theme-muted">·</span>
                    <span className={`text-xs font-medium ${getTradeColor(trade.type)}`}>
                      {getTradeLabel(trade.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-theme-muted">
                    <Link
                      href={`/analyse/stocks/${trade.ticker.toLowerCase()}`}
                      className="font-medium text-theme-secondary hover:text-brand transition-colors"
                    >
                      {trade.ticker}
                    </Link>
                    <span>·</span>
                    <span className="truncate">{trade.name}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-theme-primary">
                    {formatMarketCap(trade.dollarChange || trade.value)}
                  </div>
                  <div className="text-xs text-theme-muted">
                    {getDaysAgo(trade.date)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-theme-muted">
            <p className="text-sm">Keine aktuellen Trades verfügbar</p>
          </div>
        )}
      </div>
    )
  }
  
  // ===== COMPACT VARIANT - Clean Sidebar =====
  if (variant === 'compact') {
    return (
      <div>
        <div className="px-4 py-3 border-b border-white/[0.04]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-theme-primary">Superinvestoren Trades</h3>
            <Link
              href="/superinvestor/insights"
              className="text-xs text-theme-muted hover:text-theme-primary transition-colors"
            >
              Alle →
            </Link>
          </div>
        </div>

        <div className="space-y-0">
          {latestTrades.slice(0, 5).map((trade, index) => (
            <div key={`${trade.investor}-${trade.ticker}-${index}`} className="px-4 py-3 hover:bg-theme-hover/30 transition-colors border-b border-white/[0.04] last:border-b-0">
              <div className="flex items-center gap-2.5">
                <img
                  src={trade.investorImage}
                  alt={trade.investorName}
                  className="w-7 h-7 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-investor.png'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/superinvestor/${trade.investor}`}
                      className="text-xs font-medium text-theme-primary hover:text-brand transition-colors truncate"
                    >
                      {trade.investorName}
                    </Link>
                    <span className={`text-xs ${getTradeColor(trade.type)}`}>
                      {getTradeLabel(trade.type)}
                    </span>
                  </div>
                  <div className="text-xs text-theme-muted">
                    <Link
                      href={`/analyse/stocks/${trade.ticker.toLowerCase()}`}
                      className="hover:text-brand transition-colors"
                    >
                      {trade.ticker}
                    </Link>
                  </div>
                </div>
                <div className="text-xs font-medium text-theme-secondary">
                  {formatMarketCap(trade.dollarChange || trade.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // ===== FULL VARIANT - Fey Style Clean =====
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wide">Guru Trades</h3>
        <Link
          href="/superinvestor/insights"
          className="text-xs text-theme-muted hover:text-brand-light flex items-center gap-1 transition-colors"
        >
          Alle ansehen
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      </div>

      {/* Trades List - Clean Table Style */}
      <div className="space-y-1">
        {latestTrades.length > 0 ? (
          latestTrades.map((trade, index) => (
            <div
              key={`${trade.investor}-${trade.ticker}-${index}`}
              className="flex items-center gap-4 py-3 px-4 rounded-lg hover:bg-theme-hover/50 transition-all duration-200 group"
            >
              {/* Investor Avatar */}
              <Link href={`/superinvestor/${trade.investor}`}>
                <img
                  src={trade.investorImage}
                  alt={trade.investorName}
                  className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-white/20 transition-all"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/default-investor.png'
                  }}
                />
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/superinvestor/${trade.investor}`}
                    className="text-sm font-medium text-theme-primary hover:text-brand-light transition-colors"
                  >
                    {trade.investorName}
                  </Link>
                  <span className="text-theme-muted text-xs">·</span>
                  <span className={`text-xs font-medium ${getTradeColor(trade.type)}`}>
                    {getTradeLabel(trade.type)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-theme-muted mt-0.5">
                  <Link
                    href={`/analyse/stocks/${trade.ticker.toLowerCase()}`}
                    className="font-medium hover:text-brand-light transition-colors"
                  >
                    {trade.ticker}
                  </Link>
                  <span>·</span>
                  <span className="truncate max-w-[200px]">{trade.name}</span>
                  <span>·</span>
                  <span>{getDaysAgo(trade.date)}</span>
                </div>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold text-theme-primary">
                  {formatMarketCap(trade.dollarChange || trade.value)}
                </div>
                {trade.percentChange && (
                  <div className={`text-xs font-medium ${getTradeColor(trade.type)}`}>
                    {trade.type === 'ADD' ? '+' : '-'}{formatPercentage(trade.percentChange, false)}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-theme-muted">
            <p className="text-sm">Keine aktuellen Trades verfügbar</p>
          </div>
        )}
      </div>
    </div>
  )
}