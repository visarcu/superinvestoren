// src/components/PortfolioDividendSummary.tsx - Compact Dividend Summary Card
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useCurrency } from '@/lib/CurrencyContext'
import Logo from '@/components/Logo'

interface Holding {
  symbol: string
  name: string
  quantity: number
  value: number
}

interface UpcomingDividend {
  symbol: string
  name: string
  paymentDate: string
  dividend: number
  totalPayment: number
}

interface PortfolioDividendSummaryProps {
  holdings: Holding[]
}

export default function PortfolioDividendSummary({ holdings }: PortfolioDividendSummaryProps) {
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [upcomingDividends, setUpcomingDividends] = useState<UpcomingDividend[]>([])
  const [annualEstimate, setAnnualEstimate] = useState(0)
  const [monthlyEstimate, setMonthlyEstimate] = useState(0)
  const [portfolioYield, setPortfolioYield] = useState(0)

  useEffect(() => {
    if (holdings.length > 0) {
      loadDividendData()
    } else {
      setLoading(false)
    }
  }, [holdings])

  const loadDividendData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/dividend-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dividend data')
      }

      const data = await response.json()

      if (data.success) {
        const upcoming: UpcomingDividend[] = []
        let totalAnnualIncome = 0
        const today = new Date()

        // Process each holding
        for (const holding of holdings) {
          const historicalDivs = data.historicalDividends?.[holding.symbol] || []

          if (historicalDivs.length > 0) {
            // Calculate annual dividend from last 12 months
            const twelveMonthsAgo = new Date()
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

            const recentDivs = historicalDivs.filter((d: any) =>
              new Date(d.date) > twelveMonthsAgo && new Date(d.paymentDate) <= today
            )

            const annualDivPerShare = recentDivs.reduce((sum: number, d: any) =>
              sum + (d.adjDividend || 0), 0
            )

            totalAnnualIncome += annualDivPerShare * holding.quantity

            // Find upcoming dividend
            const upcomingDiv = data.upcomingDividends?.find((d: any) =>
              d.symbol === holding.symbol
            )

            if (upcomingDiv) {
              const lastDiv = historicalDivs[0]
              upcoming.push({
                symbol: holding.symbol,
                name: holding.name,
                paymentDate: upcomingDiv.date,
                dividend: upcomingDiv.dividend || lastDiv?.adjDividend || 0,
                totalPayment: (upcomingDiv.dividend || lastDiv?.adjDividend || 0) * holding.quantity
              })
            } else {
              // Check for future dividends in historical data
              const futureDivs = historicalDivs.filter((d: any) =>
                new Date(d.paymentDate) > today
              )
              if (futureDivs.length > 0) {
                const nextDiv = futureDivs[futureDivs.length - 1]
                upcoming.push({
                  symbol: holding.symbol,
                  name: holding.name,
                  paymentDate: nextDiv.paymentDate,
                  dividend: nextDiv.adjDividend,
                  totalPayment: nextDiv.adjDividend * holding.quantity
                })
              }
            }
          }
        }

        // Sort upcoming by date
        upcoming.sort((a, b) =>
          new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        )

        setUpcomingDividends(upcoming.slice(0, 3)) // Show max 3
        setAnnualEstimate(totalAnnualIncome)
        setMonthlyEstimate(totalAnnualIncome / 12)

        // Calculate portfolio yield
        const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0)
        if (portfolioValue > 0) {
          setPortfolioYield((totalAnnualIncome / portfolioValue) * 100)
        }
      }
    } catch (error) {
      console.error('Error loading dividend data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-8">
        <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
      </div>
    )
  }

  // No dividends found
  if (annualEstimate === 0 && upcomingDividends.length === 0) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Dividenden</h3>
          <Link
            href="/analyse/dividends"
            className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            Kalender
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CurrencyDollarIcon className="w-8 h-8 text-neutral-700 mb-2" />
          <p className="text-sm text-neutral-500">Keine Dividendenzahler</p>
          <p className="text-xs text-neutral-600 mt-1">im Portfolio</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Dividenden</h3>
        <Link
          href="/analyse/dividends"
          className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
        >
          Kalender
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-5 pb-5 border-b border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Jährlich (est.)</p>
          <p className="text-base font-semibold text-emerald-400">
            {formatCurrency(annualEstimate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Monatlich</p>
          <p className="text-base font-semibold text-white">
            {formatCurrency(monthlyEstimate)}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">Yield</p>
          <p className="text-base font-semibold text-white">
            {portfolioYield.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Upcoming Dividends */}
      {upcomingDividends.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-3">Nächste Auszahlungen</p>
          <div className="space-y-2">
            {upcomingDividends.map((div, index) => {
              const daysUntil = getDaysUntil(div.paymentDate)
              return (
                <Link
                  key={`${div.symbol}-${index}`}
                  href={`/analyse/stocks/${div.symbol.toLowerCase()}`}
                  className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-neutral-800/50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Logo
                      ticker={div.symbol}
                      alt={div.symbol}
                      className="w-7 h-7 rounded"
                      padding="none"
                    />
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {div.symbol}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatDate(div.paymentDate)}
                        {daysUntil > 0 && daysUntil <= 30 && (
                          <span className="ml-1.5 text-neutral-600">
                            in {daysUntil}d
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      +{formatCurrency(div.totalPayment)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Link to full calendar */}
      <Link
        href="/analyse/dividends"
        className="mt-4 flex items-center justify-center gap-2 py-2.5 text-sm text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
      >
        <CalendarDaysIcon className="w-4 h-4" />
        Vollständigen Kalender anzeigen
      </Link>
    </div>
  )
}
