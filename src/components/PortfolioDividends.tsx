// src/components/PortfolioDividends.tsx - FEY STYLE
'use client'

import React, { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ClockIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import Logo from '@/components/Logo'

interface Holding {
  symbol: string
  name: string
  quantity: number
  current_price: number
  value: number
}

interface DividendData {
  symbol: string
  date: string
  label: string
  adjDividend: number
  dividend: number
  recordDate: string
  paymentDate: string
  declarationDate: string
}

interface DividendCalendarItem {
  date: string
  symbol: string
  adjDividend: number
  dividend: number
  paymentDate: string
  recordDate: string
  declarationDate: string
}

interface AnnualDividend {
  symbol: string
  name: string
  quantity: number
  dividendYield: number
  annualDividend: number
  totalAnnualIncome: number
  paymentFrequency: string
  lastDividend: number
  lastPaymentDate: string
  nextPaymentDate?: string
}

interface PortfolioDividendsProps {
  holdings: Holding[]
}

export default function PortfolioDividends({ holdings }: PortfolioDividendsProps) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [dividendData, setDividendData] = useState<Map<string, DividendData[]>>(new Map())
  const [annualDividends, setAnnualDividends] = useState<AnnualDividend[]>([])
  const [upcomingDividends, setUpcomingDividends] = useState<DividendCalendarItem[]>([])
  const [totalAnnualIncome, setTotalAnnualIncome] = useState(0)
  const [averageYield, setAverageYield] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'history'>('overview')

  useEffect(() => {
    if (holdings.length > 0) {
      loadDividendData()
    }
  }, [holdings])

  const loadDividendData = async () => {
    setLoading(true)
    const divMap = new Map<string, DividendData[]>()
    const annualDivs: AnnualDividend[] = []
    const upcoming: DividendCalendarItem[] = []

    try {
      console.log('🔍 Loading dividend data via secure API...')

      const dividendResponse = await fetch('/api/dividend-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      })

      let realUpcomingDividends = []
      if (dividendResponse.ok) {
        const dividendData = await dividendResponse.json()
        if (dividendData.success) {
          realUpcomingDividends = dividendData.upcomingDividends || []

          for (const holding of holdings) {
            const historicalDivs = dividendData.historicalDividends[holding.symbol]
            if (historicalDivs && historicalDivs.length > 0) {
              divMap.set(holding.symbol, historicalDivs)

              const today = new Date()
              const twelveMonthsAgo = new Date()
              twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

              const pastDividends = historicalDivs.filter((d: DividendData) =>
                new Date(d.paymentDate) <= today
              )

              const futureDividends = historicalDivs.filter((d: DividendData) =>
                new Date(d.paymentDate) > today
              )

              console.log(`📊 ${holding.symbol}: ${pastDividends.length} past, ${futureDividends.length} future dividends`)

              const recentPastDividends = pastDividends.filter((d: DividendData) =>
                new Date(d.date) > twelveMonthsAgo
              )

              const annualDividendAmount = recentPastDividends.reduce((sum: number, d: DividendData) =>
                sum + d.adjDividend, 0
              )

              const dividendYield = holding.current_price > 0
                ? (annualDividendAmount / holding.current_price) * 100
                : 0

              const totalIncome = annualDividendAmount * holding.quantity

              let frequency = 'N/A'
              if (recentPastDividends.length >= 11) frequency = 'Monatlich'
              else if (recentPastDividends.length >= 3) frequency = 'Vierteljährlich'
              else if (recentPastDividends.length >= 2) frequency = 'Halbjährlich'
              else if (recentPastDividends.length === 1) frequency = 'Jährlich'

              const lastPastDividend = pastDividends.length > 0 ? pastDividends[0] : null
              const nextFutureDividend = futureDividends.length > 0 ? futureDividends[futureDividends.length - 1] : null

              const realUpcoming = realUpcomingDividends.find((cal: any) =>
                cal.symbol === holding.symbol
              )

              let nextPaymentDate = null
              if (realUpcoming) {
                nextPaymentDate = realUpcoming.date
              } else if (nextFutureDividend) {
                nextPaymentDate = nextFutureDividend.paymentDate
                console.log(`🔮 Found future dividend for ${holding.symbol}: ${nextPaymentDate}`)
              } else {
                nextPaymentDate = estimateNextPaymentDate(pastDividends, frequency)
                console.log(`📈 Estimated dividend for ${holding.symbol}: ${nextPaymentDate}`)
              }

              annualDivs.push({
                symbol: holding.symbol,
                name: holding.name,
                quantity: holding.quantity,
                dividendYield,
                annualDividend: annualDividendAmount,
                totalAnnualIncome: totalIncome,
                paymentFrequency: frequency,
                lastDividend: lastPastDividend?.adjDividend || 0,
                lastPaymentDate: lastPastDividend?.paymentDate || '',
                nextPaymentDate: nextPaymentDate
              })

              if (realUpcoming) {
                console.log(`📅 Found real upcoming dividend for ${holding.symbol}:`, realUpcoming)
                upcoming.push({
                  date: realUpcoming.date,
                  symbol: holding.symbol,
                  adjDividend: realUpcoming.dividend || (lastPastDividend?.adjDividend || 0),
                  dividend: realUpcoming.dividend || (lastPastDividend?.dividend || 0),
                  paymentDate: realUpcoming.date,
                  recordDate: realUpcoming.recordDate || '',
                  declarationDate: realUpcoming.declarationDate || ''
                })
              } else if (nextFutureDividend) {
                console.log(`🔮 Using future historical dividend for ${holding.symbol}: ${nextFutureDividend.paymentDate}`)
                upcoming.push({
                  date: nextFutureDividend.paymentDate,
                  symbol: holding.symbol,
                  adjDividend: nextFutureDividend.adjDividend,
                  dividend: nextFutureDividend.dividend,
                  paymentDate: nextFutureDividend.paymentDate,
                  recordDate: nextFutureDividend.recordDate || '',
                  declarationDate: nextFutureDividend.declarationDate || ''
                })
              } else if (nextPaymentDate && new Date(nextPaymentDate) > new Date()) {
                console.log(`⚠️ Using estimated dividend for ${holding.symbol}: ${nextPaymentDate}`)
                upcoming.push({
                  date: nextPaymentDate,
                  symbol: holding.symbol,
                  adjDividend: lastPastDividend?.adjDividend || 0,
                  dividend: lastPastDividend?.dividend || 0,
                  paymentDate: nextPaymentDate,
                  recordDate: '',
                  declarationDate: ''
                })
              }
            }
          }
        } else {
          console.warn(`❌ No dividend data received`)
        }
      } else {
        console.error('❌ Failed to fetch dividend data:', dividendResponse.status)
      }

      setDividendData(divMap)
      setAnnualDividends(annualDivs)
      setUpcomingDividends(upcoming.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ))

      const totalIncome = annualDivs.reduce((sum, d) => sum + d.totalAnnualIncome, 0)
      setTotalAnnualIncome(totalIncome)

      const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0)
      if (portfolioValue > 0) {
        setAverageYield((totalIncome / portfolioValue) * 100)
      }

    } catch (error) {
      console.error('Error loading dividend data:', error)
    } finally {
      setLoading(false)
    }
  }

  const estimateNextPaymentDate = (historical: DividendData[], frequency: string): string | undefined => {
    if (!historical || historical.length < 2) return undefined

    const recentPayments = historical.slice(0, 4).map(h => new Date(h.paymentDate))

    if (recentPayments.length >= 2) {
      const intervals = []
      for (let i = 1; i < recentPayments.length; i++) {
        const diff = recentPayments[i-1].getTime() - recentPayments[i].getTime()
        intervals.push(diff)
      }

      const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length
      const avgIntervalDays = avgInterval / (1000 * 60 * 60 * 24)

      console.log(`📊 ${historical[0]?.symbol || 'Stock'} payment pattern: avg ${Math.round(avgIntervalDays)} days`)

      const nextPayment = new Date(recentPayments[0].getTime() + avgInterval)

      if (nextPayment > new Date()) {
        return nextPayment.toISOString().split('T')[0]
      }
    }

    const lastPayment = new Date(historical[0].paymentDate)
    let nextPayment = new Date(lastPayment)

    switch (frequency) {
      case 'Monatlich':
        nextPayment.setMonth(nextPayment.getMonth() + 1)
        break
      case 'Vierteljährlich':
        nextPayment.setMonth(nextPayment.getMonth() + 3)
        break
      case 'Halbjährlich':
        nextPayment.setMonth(nextPayment.getMonth() + 6)
        break
      case 'Jährlich':
        nextPayment.setFullYear(nextPayment.getFullYear() + 1)
        break
      default:
        return undefined
    }

    return nextPayment.toISOString().split('T')[0]
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getMonthlyIncome = () => {
    return totalAnnualIncome / 12
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-neutral-400">Lade Dividendendaten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview - Flat Inline Stats */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CurrencyDollarIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-neutral-500">Jährliche Dividenden</span>
          </div>
          <p className="text-2xl font-semibold text-white">
            {formatCurrency(totalAnnualIncome)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDaysIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-neutral-500">Monatlich</span>
          </div>
          <p className="text-2xl font-semibold text-white">
            {formatCurrency(getMonthlyIncome())}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowTrendingUpIcon className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-neutral-500">Portfolio Yield</span>
          </div>
          <p className="text-2xl font-semibold text-white">
            {averageYield.toFixed(2)}%
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-neutral-500">Nächste Zahlung</span>
          </div>
          {upcomingDividends.length > 0 ? (
            <p className="text-lg font-semibold text-white">
              {formatDate(upcomingDividends[0].paymentDate)}
              <span className="text-sm text-neutral-500 ml-2">{upcomingDividends[0].symbol}</span>
            </p>
          ) : (
            <p className="text-lg text-neutral-500">Keine geplant</p>
          )}
        </div>
      </div>

      {/* Tab Navigation - Fey Style */}
      <div className="flex gap-6 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'overview'
              ? 'text-white border-emerald-400'
              : 'text-neutral-500 border-transparent hover:text-neutral-300'
          }`}
        >
          Übersicht
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'calendar'
              ? 'text-white border-emerald-400'
              : 'text-neutral-500 border-transparent hover:text-neutral-300'
          }`}
        >
          Kalender
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'history'
              ? 'text-white border-emerald-400'
              : 'text-neutral-500 border-transparent hover:text-neutral-300'
          }`}
        >
          Historie
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Dividenden-Übersicht</h3>

          {annualDividends.length > 0 ? (
            <div className="space-y-0">
              {/* Header Row */}
              <div className="hidden md:grid grid-cols-7 gap-4 py-3 text-xs text-neutral-500 border-b border-neutral-800">
                <span>Aktie</span>
                <span className="text-right">Anzahl</span>
                <span className="text-right">Div. Yield</span>
                <span className="text-right">Jährliche Div.</span>
                <span className="text-right">Jährliches Einkommen</span>
                <span className="text-center">Frequenz</span>
                <span className="text-right">Letzte Zahlung</span>
              </div>

              {annualDividends.map((div) => (
                <div key={div.symbol} className="grid grid-cols-2 md:grid-cols-7 gap-4 py-4 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <Logo
                      ticker={div.symbol}
                      alt={div.symbol}
                      className="w-8 h-8"
                      padding="none"
                    />
                    <div>
                      <p className="font-medium text-white text-sm">{div.symbol}</p>
                      <p className="text-xs text-neutral-500 hidden md:block">{div.name}</p>
                    </div>
                  </div>
                  <p className="text-right text-white text-sm self-center">{div.quantity}</p>
                  <p className={`text-right text-sm self-center hidden md:block ${div.dividendYield > 3 ? 'text-emerald-400' : 'text-white'}`}>
                    {div.dividendYield.toFixed(2)}%
                  </p>
                  <p className="text-right text-white text-sm self-center hidden md:block">
                    {formatCurrency(div.annualDividend)}
                  </p>
                  <p className="text-right text-emerald-400 font-medium text-sm self-center hidden md:block">
                    {formatCurrency(div.totalAnnualIncome)}
                  </p>
                  <p className="text-center text-neutral-400 text-xs self-center hidden md:block">
                    {div.paymentFrequency}
                  </p>
                  <div className="text-right self-center hidden md:block">
                    <p className="text-sm text-white">{formatCurrency(div.lastDividend)}</p>
                    <p className="text-xs text-neutral-500">{formatDate(div.lastPaymentDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800/50 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-8 h-8 text-neutral-600" />
              </div>
              <h3 className="text-base font-medium text-white mb-1">
                Keine Dividenden gefunden
              </h3>
              <p className="text-neutral-500 text-sm max-w-md mx-auto">
                Deine Positionen zahlen möglicherweise keine Dividenden oder die Daten sind noch nicht verfügbar.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Kommende Dividenden</h3>

          {upcomingDividends.length > 0 ? (
            <div className="space-y-0">
              {upcomingDividends.map((div, index) => {
                const holding = holdings.find(h => h.symbol === div.symbol)
                const totalPayment = holding ? div.adjDividend * holding.quantity : 0

                return (
                  <div key={`${div.symbol}-${index}`} className="flex items-center justify-between py-4 border-b border-neutral-800/50">
                    <div className="flex items-center gap-4">
                      <div className="text-center w-12">
                        <p className="text-xs text-neutral-500">
                          {new Date(div.paymentDate).toLocaleDateString('de-DE', { month: 'short' })}
                        </p>
                        <p className="text-xl font-semibold text-white">
                          {new Date(div.paymentDate).getDate()}
                        </p>
                      </div>
                      <Logo
                        ticker={div.symbol}
                        alt={div.symbol}
                        className="w-8 h-8"
                        padding="none"
                      />
                      <div>
                        <p className="font-medium text-white text-sm">{div.symbol}</p>
                        <p className="text-xs text-neutral-500">
                          {formatCurrency(div.adjDividend)} pro Aktie
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-400">
                        +{formatCurrency(totalPayment)}
                      </p>
                      <p className="text-xs text-neutral-600">Geschätzt</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarDaysIcon className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">Keine kommenden Dividenden</p>
              <p className="text-neutral-600 text-sm mt-1">
                Basierend auf historischen Daten
              </p>
            </div>
          )}

          <div className="mt-6 flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-xs text-neutral-400">
              Die kommenden Dividendentermine sind Schätzungen basierend auf historischen Zahlungsmustern.
              Die tatsächlichen Termine können abweichen.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-4">Dividenden-Historie</h3>

          <div className="space-y-6">
            {Array.from(dividendData.entries()).map(([symbol, dividends]) => {
              const holding = holdings.find(h => h.symbol === symbol)
              if (!holding) return null

              return (
                <div key={symbol} className="border-b border-neutral-800 pb-6 last:border-0">
                  <div className="flex items-center gap-3 mb-4">
                    <Logo ticker={symbol} alt={symbol} className="w-6 h-6" padding="none" />
                    <h4 className="font-medium text-white text-sm">
                      {symbol}
                      <span className="text-neutral-500 ml-2 font-normal">{holding.name}</span>
                    </h4>
                  </div>

                  <div className="space-y-0">
                    {dividends.slice(0, 5).map((div, index) => (
                      <div key={`${symbol}-${index}`} className="flex items-center justify-between py-3 border-b border-neutral-800/30 last:border-0">
                        <div>
                          <p className="text-sm text-white">
                            {formatDate(div.paymentDate)}
                          </p>
                          <p className="text-xs text-neutral-600">
                            Ex-Date: {formatDate(div.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">
                            {formatCurrency(div.adjDividend)}
                          </p>
                          <p className="text-xs text-emerald-400">
                            Total: {formatCurrency(div.adjDividend * holding.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {dividendData.size === 0 && (
            <div className="text-center py-12">
              <ClockIcon className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400">Keine Historie verfügbar</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
