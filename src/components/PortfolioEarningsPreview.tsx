// src/components/PortfolioEarningsPreview.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import Link from 'next/link'

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  estimatedEPS: number | null
}

interface PortfolioEarningsPreviewProps {
  symbols: string[]
}

export default function PortfolioEarningsPreview({ symbols }: PortfolioEarningsPreviewProps) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (symbols.length === 0) {
      setEarnings([])
      setLoading(false)
      return
    }

    async function loadEarnings() {
      try {
        const response = await fetch(`/api/earnings-calendar?tickers=${symbols.join(',')}`)
        if (response.ok) {
          const data = await response.json()
          // Only show next 5 upcoming earnings
          setEarnings(data.slice(0, 5))
        }
      } catch (error) {
        console.error('Error loading earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEarnings()
  }, [symbols])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short'
    })
  }

  const getTimeLabel = (time: string) => {
    if (time === 'bmo') return 'Vor Börsenöffnung'
    if (time === 'amc') return 'Nach Börsenschluss'
    return time || 'TBD'
  }

  const getDaysUntil = (dateString: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const earningsDate = new Date(dateString)
    earningsDate.setHours(0, 0, 0, 0)
    const diffTime = earningsDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Heute'
    if (diffDays === 1) return 'Morgen'
    if (diffDays < 7) return `In ${diffDays} Tagen`
    if (diffDays < 14) return 'Nächste Woche'
    return `In ${Math.ceil(diffDays / 7)} Wochen`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
      </div>
    )
  }

  if (earnings.length === 0) {
    return (
      <div className="py-6 text-center">
        <CalendarDaysIcon className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
        <p className="text-neutral-500 text-sm">Keine anstehenden Earnings</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-400">Anstehende Earnings</h3>
        <Link
          href="/analyse/earnings"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          Alle anzeigen
        </Link>
      </div>

      <div className="space-y-0">
        {earnings.map((event, index) => (
          <Link
            key={`${event.ticker}-${event.date}-${index}`}
            href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
            className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/30 -mx-2 px-2 rounded transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-emerald-500 rounded-full" />
              <div>
                <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                  {event.ticker}
                </span>
                <p className="text-neutral-500 text-xs">
                  {event.quarter}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white text-sm font-medium">
                {formatDate(event.date)}
              </p>
              <p className="text-neutral-500 text-xs">
                {getDaysUntil(event.date)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
