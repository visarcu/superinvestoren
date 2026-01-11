'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarIcon,
  FireIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorAvatar from '@/components/InvestorAvatar'
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
  // Get available quarters from data
  const availableQuarters = useMemo(() => {
    const quarters = new Set<string>()
    Object.values(holdingsHistory).forEach(snapshots => {
      const snaps = snapshots as HoldingSnapshot[]
      if (!snaps || snaps.length === 0) return
      snaps.forEach(snap => {
        if (snap?.data?.date) {
          quarters.add(getPeriodFromDate(snap.data.date))
        }
      })
    })
    // Sort quarters descending (newest first)
    return Array.from(quarters).sort((a, b) => {
      const [qA, yA] = a.split(' ')
      const [qB, yB] = b.split(' ')
      if (yA !== yB) return parseInt(yB) - parseInt(yA)
      return parseInt(qB.replace('Q', '')) - parseInt(qA.replace('Q', ''))
    })
  }, [])

  const [selectedQuarter, setSelectedQuarter] = useState(availableQuarters[0] || 'Q3 2024')

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
      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
        type === 'buy'
          ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/50'
          : 'bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50'
      }`}
    >
      {ticker}
    </Link>
  )

  return (
    <div className="min-h-screen bg-dark">

      {/* Header - Simplified */}
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

          <div className="mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FireIcon className="w-6 h-6 text-neutral-500" />
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">Investor Aktivität</h1>
              </div>
            </div>

            <p className="text-base text-neutral-400 max-w-3xl leading-relaxed">
              Käufe und Verkäufe der Top-Investoren nach Quartal.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Quarter Selection */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-white font-medium">Zeitraum</h3>
              <p className="text-xs text-neutral-500">
                Wähle ein Quartal
              </p>
            </div>
          </div>

          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="appearance-none px-4 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
          >
            {availableQuarters.map(quarter => (
              <option key={quarter} value={quarter}>
                {quarter}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Overview - Simplified */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-500">Aktive Investoren</span>
            </div>
            <p className="text-2xl font-semibold text-white">
              {investorActivityData.length}
            </p>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-500">Käufe</span>
            </div>
            <p className="text-2xl font-semibold text-emerald-400">
              {investorActivityData.reduce((sum, investor) => sum + investor.topBuys.length, 0)}
            </p>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowTrendingDownIcon className="w-4 h-4 text-neutral-500" />
              <span className="text-sm text-neutral-500">Verkäufe</span>
            </div>
            <p className="text-2xl font-semibold text-red-400">
              {investorActivityData.reduce((sum, investor) => sum + investor.topSells.length, 0)}
            </p>
          </div>
        </div>

        {/* Activity Table */}
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-2">
            Portfolio Manager Aktivität
          </h2>
          <p className="text-sm text-neutral-500">
            Top Käufe und Verkäufe in {selectedQuarter}
          </p>
        </div>

        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-900 border-b border-neutral-800">
                <tr className="text-sm text-neutral-400">
                  <th className="text-left px-6 py-4 font-medium">Portfolio Manager</th>
                  <th className="text-center px-6 py-4 font-medium">Quartal</th>
                  <th className="text-left px-6 py-4 font-medium">Top 10 Käufe/Verkäufe</th>
                </tr>
              </thead>
              <tbody>
                {investorActivityData.map((investor) => (
                  <tr key={investor.slug} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-5">
                      <Link
                        href={`/superinvestor/${investor.slug}`}
                        className="flex items-center gap-4 group"
                      >
                        <InvestorAvatar
                          name={investor.name}
                          imageUrl={`/images/${investor.slug}.png`}
                          size="sm"
                          className="ring-1 ring-neutral-700"
                        />
                        <div>
                          <div className="font-medium text-white group-hover:text-neutral-300 transition-colors">
                            {investor.name}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center px-3 py-1 bg-neutral-800 text-neutral-300 rounded-lg text-sm">
                        {investor.period}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        {investor.topBuys.length > 0 && (
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide min-w-[60px] pt-1.5">Käufe:</span>
                            <div className="flex flex-wrap gap-2">
                              {investor.topBuys.map((ticker) => (
                                <TickerPill key={`${investor.slug}-buy-${ticker}`} ticker={ticker} type="buy" />
                              ))}
                            </div>
                          </div>
                        )}
                        {investor.topSells.length > 0 && (
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide min-w-[60px] pt-1.5">Verkäufe:</span>
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
                {investorActivityData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                      <FireIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Keine Aktivität für {selectedQuarter}</p>
                      <p className="text-xs mt-1">Wähle ein anderes Quartal</p>
                    </td>
                  </tr>
                )}
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
