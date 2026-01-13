// Überarbeitete Super-Investors Seite nach Dataroma Vorbild
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
import PositionTimingIntelligence from '@/components/PositionTimingIntelligence'
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  PlusIcon,
  MinusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  TrophyIcon,
  FireIcon,
  SparklesIcon,
  LockClosedIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface SuperInvestorData {
  ticker: string
  stockInfo: {
    name: string
    sector: string
    market: string
  }
  summary: {
    totalInvestors: number
    totalValue: number
    averagePosition: number
    increasingTrends: number
    decreasingTrends: number
    newPositions: number
    formattedTotalValue: string
    formattedAveragePosition: string
  }
  positions: Array<{
    investor: {
      slug: string
      name: string
      description: string
      avatar: string
      aum: number
    }
    position: {
      ticker: string
      shares: number
      value: number
      portfolioPercentage: number
      trend: 'increasing' | 'decreasing' | 'stable' | 'new'
      changeValue: number
      changeShares: number
      changeSharePercentage: number
      isNewPosition: boolean
      lastUpdated: string
      quarter: string
      formattedValue: string
      formattedShares: string
      formattedPortfolioPercentage: string
      formattedChangeValue: string
    }
  }>
}

interface SuperInvestorsClientProps {
  ticker: string
  initialStockName?: string
  isPremium?: boolean
}

// Premium Tab Lock Component - for locked tabs
const PremiumTabLock = ({ title, description }: { title: string, description: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-[#131316]/80 backdrop-blur-sm rounded-xl p-8 text-center max-w-md border border-white/[0.06]">
        <LockClosedIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-neutral-400 mb-4">{description}</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Premium freischalten <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}

export default function SuperInvestorsClient({ ticker, initialStockName, isPremium = false }: SuperInvestorsClientProps) {
  const [data, setData] = useState<SuperInvestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(271) // Default for AAPL
  const [activeTab, setActiveTab] = useState<'overview' | 'quarterly' | 'ownership' | 'intelligence'>('overview')

  // Free users limited positions
  const FREE_POSITIONS_LIMIT = 3

  useEffect(() => {
    async function fetchSuperInvestorData() {
      try {
        setLoading(true)
        console.log(`📊 Fetching super investor data for ${ticker} via API...`)

        const response = await fetch(`/api/stocks/${ticker}/super-investors`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Stock nicht gefunden')
          }
          throw new Error(`API Error: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
        console.log(`✅ Super investor data loaded for ${ticker}: ${result.summary.totalInvestors} investors`)

        // Fetch current price for timing intelligence
        try {
          const priceResponse = await fetch(`/api/quote/${ticker}`)
          if (priceResponse.ok) {
            const priceData = await priceResponse.json()
            if (priceData.price) {
              setCurrentPrice(priceData.price)
            }
          }
        } catch (priceError) {
          console.log('Could not fetch current price, using default')
        }

      } catch (err) {
        console.error('Error fetching super investor data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchSuperInvestorData()
  }, [ticker])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0B0F]">
        <div className="w-full px-6 lg:px-8 py-8">
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zu {initialStockName || ticker}
          </Link>

          <div className="space-y-8">
            <div className="animate-pulse">
              <div className="h-8 bg-white/[0.06] rounded-lg w-64 mb-4"></div>
              <div className="h-4 bg-white/[0.06] rounded w-96"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-[#131316] border border-white/[0.06] rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-white/[0.06] rounded w-20 mb-2"></div>
                  <div className="h-8 bg-white/[0.06] rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0B0F]">
        <div className="w-full px-6 lg:px-8 py-8">
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}`}
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors duration-200 mb-8 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zu {initialStockName || ticker}
          </Link>

          <div className="text-center py-12">
            <div className="mb-4">
              <UserGroupIcon className="w-16 h-16 mx-auto text-neutral-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {error || 'Keine Super-Investor-Daten verfügbar'}
            </h2>
            <p className="text-neutral-500">
              Für {ticker} konnten keine Super-Investor-Positionen gefunden werden.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const buyingInvestors = data.positions.filter(p => p.position.trend === 'increasing' || p.position.trend === 'new')
  const sellingInvestors = data.positions.filter(p => p.position.trend === 'decreasing')
  const topHolders = data.positions.slice(0, 10)

  // Positions to show for free users vs premium
  const visiblePositions = isPremium ? data.positions : data.positions.slice(0, FREE_POSITIONS_LIMIT)
  const hiddenPositionsCount = data.positions.length - FREE_POSITIONS_LIMIT

  return (
    <div className="min-h-screen bg-[#0A0B0F]">
      <div className="w-full px-6 lg:px-8 py-8">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors duration-200 mb-8 group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Zurück zu {data.stockInfo.name}
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Super-Investor Intelligence
            </h1>
            <p className="text-neutral-400 mb-6">
              Trades und News der erfolgreichsten Investoren zu <span className="font-semibold text-white">{data.stockInfo.name}</span> ({ticker})
            </p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#131316] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 font-medium">Investoren gesamt</p>
                  <p className="text-2xl font-bold text-white">{data.summary.totalInvestors}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                {data.summary.totalInvestors > 0 ? `${((data.summary.totalInvestors / 100) * 100).toFixed(1)}% der Top-Investoren` : 'Keine Daten'}
              </p>
            </div>

            {/* Gesamtwert - Blur for non-premium */}
            <div className="bg-[#131316] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-500 font-medium">Gesamtwert</p>
                  {isPremium ? (
                    <p className="text-2xl font-bold text-white">{data.summary.formattedTotalValue}</p>
                  ) : (
                    <div className="relative">
                      <p className="text-2xl font-bold text-white filter blur-sm select-none">{data.summary.formattedTotalValue}</p>
                      <div className="absolute inset-0 flex items-center">
                        <span className="flex items-center gap-1 text-xs text-neutral-500 bg-[#131316]/80 px-2 py-1 rounded">
                          <LockClosedIcon className="w-3 h-3" /> Premium
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {isPremium ? (
                <p className="text-xs text-neutral-500">
                  Ø {data.summary.formattedAveragePosition} pro Investor
                </p>
              ) : (
                <p className="text-xs text-neutral-500 filter blur-sm select-none">
                  Ø {data.summary.formattedAveragePosition} pro Investor
                </p>
              )}
            </div>

            <div className="bg-[#131316] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 font-medium">Kaufaktivität</p>
                  <p className="text-2xl font-bold text-emerald-400">{buyingInvestors.length}</p>
                </div>
              </div>
              <p className="text-xs text-emerald-400">
                +{data.summary.newPositions} neue Positionen
              </p>
            </div>

            <div className="bg-[#131316] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <ArrowDownIcon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 font-medium">Verkaufsaktivität</p>
                  <p className="text-2xl font-bold text-red-400">{sellingInvestors.length}</p>
                </div>
              </div>
              <p className="text-xs text-red-400">
                Positionen reduziert
              </p>
            </div>
          </div>

          {/* Activity Tabs */}
          <div className="border-b border-white/[0.06]">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-white/[0.12]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4" />
                  Portfolio Holdings
                </span>
              </button>
              <button
                onClick={() => setActiveTab('quarterly')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'quarterly'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-white/[0.12]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Quarterly Activity
                  {!isPremium && <LockClosedIcon className="w-3 h-3 text-neutral-500" />}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ownership')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'ownership'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-white/[0.12]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <TrophyIcon className="w-4 h-4" />
                  Top Holdings
                  {!isPremium && <LockClosedIcon className="w-3 h-3 text-neutral-500" />}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('intelligence')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'intelligence'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-white/[0.12]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4" />
                  Timing Intelligence
                  {!isPremium && <LockClosedIcon className="w-3 h-3 text-neutral-500" />}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'quarterly' && (
            !isPremium ? (
              <PremiumTabLock
                title="Quarterly Activity"
                description="Erhalte Zugang zu detaillierten Quartalsbewegungen aller Super-Investoren. Sehe wer kauft, verkauft und neue Positionen eröffnet."
              />
            ) : (
              <div className="space-y-8">
                {/* Buying Activity */}
                {buyingInvestors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <PlusIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        Kaufaktivität letztes Quartal
                      </h2>
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium">
                        {buyingInvestors.length} Investoren
                      </span>
                    </div>

                    <div className="space-y-3">
                      {buyingInvestors.map((position) => (
                        <div key={position.investor.slug} className="bg-[#131316] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Link href={`/superinvestor/${position.investor.slug}`}>
                                <InvestorAvatar
                                  name={position.investor.name}
                                  imageUrl={position.investor.avatar}
                                  size="md"
                                  className="hover:ring-2 hover:ring-emerald-400 transition-all duration-200 cursor-pointer"
                                />
                              </Link>

                              <div>
                                <Link
                                  href={`/superinvestor/${position.investor.slug}`}
                                  className="font-semibold text-white hover:text-emerald-400 transition-colors"
                                >
                                  {position.investor.name}
                                </Link>
                                <div className="flex items-center gap-4 text-sm text-neutral-500">
                                  <span>Aktien: {position.position.formattedShares}</span>
                                  <span>Wert: {position.position.formattedValue}</span>
                                  <span>{position.position.formattedPortfolioPercentage} des Portfolios</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              {position.position.isNewPosition ? (
                                <div className="flex items-center gap-2">
                                  <FireIcon className="w-4 h-4 text-blue-400" />
                                  <span className="text-blue-400 font-semibold">Neue Position</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-400" />
                                  <span className="text-emerald-400 font-semibold">
                                    {position.position.formattedChangeValue}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selling Activity */}
                {sellingInvestors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <MinusIcon className="w-4 h-4 text-red-400" />
                      </div>
                      <h2 className="text-xl font-bold text-white">
                        Verkaufsaktivität letztes Quartal
                      </h2>
                      <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-sm font-medium">
                        {sellingInvestors.length} Investoren
                      </span>
                    </div>

                    <div className="space-y-3">
                      {sellingInvestors.map((position) => (
                        <div key={position.investor.slug} className="bg-[#131316] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <Link href={`/superinvestor/${position.investor.slug}`}>
                                <InvestorAvatar
                                  name={position.investor.name}
                                  imageUrl={position.investor.avatar}
                                  size="md"
                                  className="hover:ring-2 hover:ring-red-400 transition-all duration-200 cursor-pointer"
                                />
                              </Link>

                              <div>
                                <Link
                                  href={`/superinvestor/${position.investor.slug}`}
                                  className="font-semibold text-white hover:text-red-400 transition-colors"
                                >
                                  {position.investor.name}
                                </Link>
                                <div className="flex items-center gap-4 text-sm text-neutral-500">
                                  <span>Aktien: {position.position.formattedShares}</span>
                                  <span>Wert: {position.position.formattedValue}</span>
                                  <span>{position.position.formattedPortfolioPercentage} des Portfolios</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 font-semibold">
                                {position.position.formattedChangeValue}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {buyingInvestors.length === 0 && sellingInvestors.length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 mx-auto text-neutral-500 mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      Keine Aktivität
                    </h3>
                    <p className="text-neutral-500">
                      Im letzten Quartal gab es keine signifikanten Käufe oder Verkäufe für {ticker}.
                    </p>
                  </div>
                )}
              </div>
            )
          )}

          {/* Portfolio Holdings Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-white">Alle Portfolio Holdings</h2>
                <span className="px-3 py-1 bg-white/[0.06] text-neutral-400 rounded-full text-sm font-medium">
                  {data.positions.length} Positionen
                </span>
              </div>

              {visiblePositions.map((position, index) => (
                <div key={position.investor.slug} className="bg-[#131316] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                      <span className="text-sm font-bold text-neutral-500">#{index + 1}</span>
                    </div>

                    <Link href={`/superinvestor/${position.investor.slug}`}>
                      <InvestorAvatar
                        name={position.investor.name}
                        imageUrl={position.investor.avatar}
                        size="lg"
                        className="hover:ring-2 hover:ring-emerald-400 transition-all duration-200 cursor-pointer"
                      />
                    </Link>

                    <div className="flex-1">
                      <Link
                        href={`/superinvestor/${position.investor.slug}`}
                        className="text-lg font-bold text-white hover:text-emerald-400 transition-colors duration-200 block mb-1"
                      >
                        {position.investor.name}
                      </Link>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Portfolio %</div>
                          <div className="font-semibold text-white">
                            {position.position.formattedPortfolioPercentage}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Aktuelle Aktivität</div>
                          <div className={`flex items-center gap-1 font-semibold ${
                            position.position.trend === 'increasing' || position.position.trend === 'new'
                              ? 'text-emerald-400'
                              : position.position.trend === 'decreasing'
                                ? 'text-red-400'
                                : 'text-neutral-500'
                          }`}>
                            {position.position.trend === 'increasing' && <ArrowTrendingUpIcon className="w-4 h-4" />}
                            {position.position.trend === 'decreasing' && <ArrowTrendingDownIcon className="w-4 h-4" />}
                            {position.position.trend === 'new' && <FireIcon className="w-4 h-4 text-blue-400" />}
                            {position.position.isNewPosition ? 'Neu' : position.position.formattedChangeValue}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Aktien</div>
                          <div className="font-semibold text-white">
                            {position.position.formattedShares}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-neutral-500 mb-1">Wert</div>
                          <div className="font-semibold text-white">
                            {position.position.formattedValue}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Premium Upsell for more positions */}
              {!isPremium && hiddenPositionsCount > 0 && (
                <div className="bg-gradient-to-r from-[#131316] to-[#131316]/50 border border-white/[0.06] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <LockClosedIcon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          +{hiddenPositionsCount} weitere Positionen
                        </h3>
                        <p className="text-neutral-500 text-sm">
                          Schalte alle Super-Investor Positionen für {ticker} frei
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Premium freischalten <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {data.positions.length === 0 && (
                <div className="text-center py-12">
                  <UserGroupIcon className="w-16 h-16 mx-auto text-neutral-500 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">
                    Keine Positionen gefunden
                  </h3>
                  <p className="text-neutral-500">
                    Für {ticker} wurden keine Super-Investor-Positionen in unserer Datenbank gefunden.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Holdings Tab */}
          {activeTab === 'ownership' && (
            !isPremium ? (
              <PremiumTabLock
                title="Top Holdings"
                description="Erhalte Zugang zu den Top 10 Holdings nach Portfolio-Gewichtung. Sehe welche Investoren die größten Positionen halten."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-xl font-bold text-white">Top 10 Holdings</h2>
                  <span className="px-3 py-1 bg-white/[0.06] text-neutral-400 rounded-full text-sm font-medium">
                    Nach Portfolio-Gewichtung
                  </span>
                </div>

                {topHolders.map((position, index) => (
                  <div key={position.investor.slug} className="bg-[#131316] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.12] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500/10 text-yellow-400' :
                          index === 1 ? 'bg-gray-400/10 text-gray-400' :
                          index === 2 ? 'bg-orange-500/10 text-orange-400' :
                          'bg-white/[0.06] text-neutral-500'
                        }`}>
                          #{index + 1}
                        </div>

                        <Link href={`/superinvestor/${position.investor.slug}`}>
                          <InvestorAvatar
                            name={position.investor.name}
                            imageUrl={position.investor.avatar}
                            size="lg"
                            className="hover:ring-2 hover:ring-emerald-400 transition-all duration-200 cursor-pointer"
                          />
                        </Link>

                        <div>
                          <Link
                            href={`/superinvestor/${position.investor.slug}`}
                            className="text-lg font-bold text-white hover:text-emerald-400 transition-colors duration-200"
                          >
                            {position.investor.name}
                          </Link>
                          <p className="text-sm text-neutral-500">
                            {position.position.formattedShares} Aktien • {position.position.quarter}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-white mb-1">
                          {position.position.formattedPortfolioPercentage}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {position.position.formattedValue}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Timing Intelligence Tab */}
          {activeTab === 'intelligence' && data && (
            !isPremium ? (
              <PremiumTabLock
                title="Timing Intelligence"
                description="Erhalte Zugang zu detaillierten Timing-Analysen. Verstehe wann Super-Investoren gekauft haben und wie sich ihre Einstandskurse entwickelt haben."
              />
            ) : (
              <div className="space-y-8">
                <PositionTimingIntelligence
                  ticker={ticker}
                  positions={data.positions}
                  currentPrice={currentPrice}
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
