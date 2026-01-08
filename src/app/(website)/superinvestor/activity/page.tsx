'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarIcon,
  ChevronDownIcon,
  FireIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorAvatar from '@/components/InvestorAvatar'
import { useCurrency } from '@/lib/CurrencyContext'
import { CurrencyProvider } from '@/lib/CurrencyContext'

// Types
interface Position {
  cusip: string
  ticker?: string
  name: string
  shares: number
  value: number
}

interface HoldingSnapshot {
  data: {
    date: string
    positions: Position[]
  }
}

interface InvestorActivity {
  slug: string
  name: string
  period: string
  topBuys: string[]
  topSells: string[]
}

// Utility functions
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

function getTicker(position: Position): string {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  if (stock?.ticker) return stock.ticker
  return position.cusip.replace(/0+$/, '')
}

function getCompanyName(position: Position): string {
  const ticker = getTicker(position)
  const stock = stocks.find(s => s.ticker === ticker || s.cusip === position.cusip)
  return stock?.name || position.name || ticker
}

// Investor name mapping (comprehensive)
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  gates: 'Bill Gates Foundation',
  ark_investment_management: 'Catherine Wood',
  burry: 'Michael Burry',
  klarman: 'Seth Klarman',
  icahn: 'Carl Icahn',
  einhorn: 'David Einhorn',
  druckenmiller: 'Stanley Druckenmiller',
  thiel: 'Peter Thiel',
  akre: 'Chuck Akre',
  miller: 'Bill Miller',
  tepper: 'David Tepper',
  coleman: 'Chase Coleman',
  gayner: 'Thomas Gayner',
  ainslie: 'Lee Ainslie',
  hohn: 'Chris Hohn',
  yacktman: 'Don Yacktman',
  polen: 'Polen Capital',
  viking: 'Viking Global',
  cantillon: 'Cantillon Capital',
  jensen: 'Jensen Investment',
  russo: 'Thomas Russo',
  armitage: 'John Armitage',
  mandel: 'Stephen Mandel',
  ellenbogen: 'Jon Ellenbogen',
  vinall: 'Robert Vinall',
  greenhaven: 'Edgar Wachenheim',
  abrams: 'David Abrams',
  martin: 'Fred Martin',
  kantesaria: 'Dev Kantesaria',
  kahn: 'Kahn Brothers',
  train: 'Lindsell Train',
  burn: 'Harry Burn',
  dorsey: 'Pat Dorsey',
  chou: 'Francis Chou',
  lawrence: 'Bryan Lawrence',
  greenberg: 'Glenn Greenberg',
  roepers: 'Alex Roepers',
  munger: 'Charlie Munger',
  spier: 'Guy Spier',
  pabrai: 'Mohnish Pabrai'
}

function ActivityPageContent() {
  const [selectedQuarter, setSelectedQuarter] = useState('Q3 2025')

  const investorActivityData = useMemo(() => {
    const investorActivities: InvestorActivity[] = []

    // Process each investor
    Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
      const snaps = snapshots as HoldingSnapshot[]
      if (!snaps || snaps.length < 2) return

      const latest = snaps[snaps.length - 1]
      const previous = snaps[snaps.length - 2]
      
      if (!latest?.data?.date || getPeriodFromDate(latest.data.date) !== selectedQuarter) return

      const investorName = investorNames[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

      // Create maps for current and previous positions
      const currentPositions = new Map<string, Position>()
      const previousPositions = new Map<string, Position>()
      
      latest.data.positions?.forEach(p => {
        const ticker = getTicker(p)
        if (ticker) {
          currentPositions.set(ticker, p)
        }
      })
      
      previous.data.positions?.forEach(p => {
        const ticker = getTicker(p)
        if (ticker) {
          previousPositions.set(ticker, p)
        }
      })

      // Find changes and rank by transaction value
      const allTransactions: { ticker: string; value: number; type: 'buy' | 'sell' }[] = []
      const allTickers = new Set([...currentPositions.keys(), ...previousPositions.keys()])
      
      allTickers.forEach(ticker => {
        const current = currentPositions.get(ticker)
        const prev = previousPositions.get(ticker)
        
        const currentShares = current?.shares || 0
        const prevShares = prev?.shares || 0
        const deltaShares = currentShares - prevShares
        
        if (Math.abs(deltaShares) < 100) return // Ignore small changes
        
        // Use better price calculation based on available positions
        let transactionValue = 0
        
        if (deltaShares > 0) {
          // Buy: use current position for price calculation
          const pricePerShare = current ? current.value / current.shares : (prev ? prev.value / prev.shares : 0)
          transactionValue = Math.abs(deltaShares * pricePerShare)
        } else {
          // Sell: calculate using the difference in position values
          const currentValue = current?.value || 0
          const prevValue = prev?.value || 0
          transactionValue = Math.abs(prevValue - currentValue)
        }
        
        if (transactionValue < 100000) return // Min $100K transaction for individual investors
        
        allTransactions.push({
          ticker,
          value: transactionValue,
          type: deltaShares > 0 ? 'buy' : 'sell'
        })
      })

      // Sort all transactions by value and take top 10
      const topTransactions = allTransactions
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        
      const topBuys = topTransactions
        .filter(t => t.type === 'buy')
        .map(t => t.ticker)
        
      const topSells = topTransactions
        .filter(t => t.type === 'sell')
        .map(t => t.ticker)

      if (topBuys.length > 0 || topSells.length > 0) {
        investorActivities.push({
          slug,
          name: investorName,
          period: selectedQuarter,
          topBuys,
          topSells
        })
      }
    })

    return investorActivities.sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedQuarter])

  const TickerPill = ({ ticker, type }: { ticker: string; type: 'buy' | 'sell' }) => (
    <Link
      href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 ${
        type === 'buy'
          ? 'bg-brand/10 text-brand-light border border-green-500/30 hover:bg-brand/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
      }`}
    >
      {ticker}
    </Link>
  )

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative bg-black pt-16 pb-10">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-full text-sm font-medium mb-6">
              <FireIcon className="w-4 h-4 text-orange-400" />
              Super-Investor Aktivität
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Investor <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">Aktivität</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Welche Aktien kaufen und verkaufen die Top-Investoren gerade? 
              Entdecke die Aktivität jedes Investors im aktuellen Quartal.
            </p>
          </div>

          {/* Quarter Selection */}
          <div className="flex justify-center mb-12">
            <div className="relative">
              <button className="flex items-center gap-3 px-6 py-3 bg-[#161618] border border-white/10 rounded-xl text-white font-medium hover:bg-[#1A1A1D] transition-all duration-200">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                {selectedQuarter}
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6 hover:bg-[#1A1A1D] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-white">Aktive Investoren</h3>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {investorActivityData.length}
            </p>
            <p className="text-sm text-gray-500">Mit Transaktionen</p>
          </div>

          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6 hover:bg-[#1A1A1D] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-brand-light" />
              </div>
              <h3 className="text-lg font-medium text-white">Käufe</h3>
            </div>
            <p className="text-2xl font-bold text-brand-light">
              {investorActivityData.reduce((sum, investor) => sum + investor.topBuys.length, 0)}
            </p>
            <p className="text-sm text-gray-500">Neue Positionen</p>
          </div>

          <div className="bg-[#161618] border border-white/[0.06] rounded-2xl p-6 hover:bg-[#1A1A1D] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-white">Verkäufe</h3>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {investorActivityData.reduce((sum, investor) => sum + investor.topSells.length, 0)}
            </p>
            <p className="text-sm text-gray-500">Reduzierte Positionen</p>
          </div>
        </div>

        {/* Activity Table - Dataroma Style */}
        <div className="bg-[#161618] border border-white/[0.06] rounded-2xl overflow-hidden hover:bg-[#1A1A1D] hover:border-white/[0.1] transition-all duration-300">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <FireIcon className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white">Portfolio Manager Aktivität</h3>
                <p className="text-sm text-gray-500">Top Käufe/Verkäufe in {selectedQuarter}</p>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0F0F11] border-b border-white/[0.1]">
                <tr className="text-sm text-gray-400">
                  <th className="text-left px-6 py-4 font-semibold tracking-wide">Portfolio Manager - Firm</th>
                  <th className="text-center px-6 py-4 font-semibold tracking-wide">Period</th>
                  <th className="text-left px-6 py-4 font-semibold tracking-wide">Top 10 Käufe/Verkäufe</th>
                </tr>
              </thead>
              <tbody>
                {investorActivityData.map((investor) => (
                  <tr key={investor.slug} className="border-b border-white/[0.04] hover:bg-[#1A1A1D]/30 transition-all duration-200">
                    <td className="px-6 py-6">
                      <Link
                        href={`/superinvestor/${investor.slug}`}
                        className="flex items-center gap-4 group hover:text-brand-light transition-colors"
                      >
                        <InvestorAvatar
                          name={investor.name}
                          imageUrl={`/images/${investor.slug}.png`}
                          size="sm"
                          className="ring-1 ring-white/5"
                        />
                        <div>
                          <div className="font-semibold text-white group-hover:text-brand-light transition-colors">
                            {investor.name}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="inline-flex items-center px-3 py-1 bg-white/5 text-gray-300 rounded-lg text-sm font-medium">
                        {investor.period}
                      </span>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-3">
                        {investor.topBuys.length > 0 && (
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide min-w-[60px] pt-1">KÄUFE:</span>
                            <div className="flex flex-wrap gap-2">
                              {investor.topBuys.map((ticker) => (
                                <TickerPill key={`${investor.slug}-buy-${ticker}`} ticker={ticker} type="buy" />
                              ))}
                            </div>
                          </div>
                        )}
                        {investor.topSells.length > 0 && (
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide min-w-[70px] pt-1">VERKÄUFE:</span>
                            <div className="flex flex-wrap gap-2">
                              {investor.topSells.map((ticker) => (
                                <TickerPill key={`${investor.slug}-sell-${ticker}`} ticker={ticker} type="sell" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main export with Currency Provider
export default function ActivityPage() {
  return (
    <CurrencyProvider>
      <ActivityPageContent />
    </CurrencyProvider>
  )
}