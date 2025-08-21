// src/components/EstimatesOverview.tsx
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

interface EstimatesOverviewProps {
  ticker: string
}

export default function EstimatesOverview({ ticker }: EstimatesOverviewProps) {
  const pathname = usePathname()
  
  const tabs = [
    {
      id: 'overview',
      name: 'Übersicht',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates`,
      icon: ChartBarIcon
    },
    {
      id: 'revenue-earnings',
      name: 'Umsatz & Gewinn',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/revenue-earnings`,
      icon: CurrencyDollarIcon
    },
    {
      id: 'price-targets',
      name: 'Kursziele',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/price-targets`,
      icon: ArrowTrendingUpIcon
    },
    {
      id: 'surprises',
      name: 'Earnings Surprises',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/surprises`,
      icon: TrophyIcon
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Analysten-Schätzungen</h2>
        <p className="text-theme-secondary mt-1">
          Detaillierte Prognosen und Analysen für {ticker}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-theme/20">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme/30'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/estimates/revenue-earnings`}
          className="bg-theme-card rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            <ArrowTrendingUpIcon className="w-4 h-4 text-theme-muted group-hover:text-green-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-theme-primary mb-2">Umsatz & Gewinn Prognosen</h3>
          <p className="text-theme-secondary text-sm">
            Detaillierte Jahresprognosen mit Konsens-Schätzungen
          </p>
        </Link>

        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/estimates/price-targets`}
          className="bg-theme-card rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <ArrowTrendingUpIcon className="w-8 h-8 text-blue-400" />
            <ArrowTrendingUpIcon className="w-4 h-4 text-theme-muted group-hover:text-blue-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-theme-primary mb-2">Analysten Kursziele</h3>
          <p className="text-theme-secondary text-sm">
            Aktuelle Kursziele und Konsens-Bewertungen
          </p>
        </Link>

        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/estimates/surprises`}
          className="bg-theme-card rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <TrophyIcon className="w-8 h-8 text-yellow-400" />
            <ArrowTrendingUpIcon className="w-4 h-4 text-theme-muted group-hover:text-yellow-400 transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-theme-primary mb-2">Earnings Surprises</h3>
          <p className="text-theme-secondary text-sm">
            Historische Performance vs. Erwartungen
          </p>
        </Link>
      </div>

      {/* Back Link */}
      <div className="text-center pt-8">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="text-theme-secondary hover:text-theme-primary transition-colors"
        >
          ← Zurück zur Aktienanalyse
        </Link>
      </div>
    </div>
  )
}