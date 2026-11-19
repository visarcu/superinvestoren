'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  CalendarIcon,
  FireIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import InvestorAvatar from '@/components/InvestorAvatar'
import { CurrencyProvider } from '@/lib/CurrencyContext'

import type { ActivityData } from '@/lib/superinvestorActivity'

function ActivityPageContent({ data }: { data: ActivityData }) {
  const availableQuarters = data.quarters
  const [selectedQuarter, setSelectedQuarter] = useState(availableQuarters[0] || '')
  const investorActivityData = data.byQuarter[selectedQuarter] ?? []

  const TickerPill = ({ ticker, type, linked }: { ticker: string; type: 'buy' | 'sell'; linked: boolean }) => {
    const className = `inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      type === 'buy'
        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/50'
        : 'bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50'
    }`
    // Unbekannte Kürzel (CUSIP-Reste) nicht verlinken – dafür gibt es keine Aktienseite
    if (!linked) return <span className={className}>{ticker}</span>
    return (
      <Link href={`/aktie/${ticker.toLowerCase()}`} className={className}>
        {ticker}
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <FireIcon className="w-6 h-6 text-neutral-500" />
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Investor Aktivität</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Käufe und Verkäufe der Top-Investoren nach Quartal.
          </p>
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
                                <TickerPill key={`${investor.slug}-buy-${ticker}`} ticker={ticker} type="buy" linked={!investor.unresolved.includes(ticker)} />
                              ))}
                            </div>
                          </div>
                        )}
                        {investor.topSells.length > 0 && (
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide min-w-[60px] pt-1.5">Verkäufe:</span>
                            <div className="flex flex-wrap gap-2">
                              {investor.topSells.map((ticker) => (
                                <TickerPill key={`${investor.slug}-sell-${ticker}`} ticker={ticker} type="sell" linked={!investor.unresolved.includes(ticker)} />
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
export default function ActivityClient({ data }: { data: ActivityData }) {
  return (
    <CurrencyProvider>
      <ActivityPageContent data={data} />
    </CurrencyProvider>
  )
}
