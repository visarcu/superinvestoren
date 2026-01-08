// src/components/PortfolioStatsGrid-simple.tsx - CLEAN TAILWIND VERSION
'use client'

import React from 'react'
import { 
  ChartPieIcon,
  ClockIcon,
  ArrowPathIcon,
  TrophyIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface PortfolioStatsGridProps {
  stats: {
    totalValue: number
    top10Percentage: number
    avgHoldingPeriod: number
    turnover: number
    sectorBreakdown: Array<{
      sector: string
      value: number
      percentage: number
      count: number
    }>
  }
  investorName: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 1,
  }).format(amount)
}

function formatPeriod(quarters: number): string {
  if (quarters < 1) return '< 1 Quartal'
  if (quarters < 4) return `${quarters.toFixed(1)} Quartale`
  
  const years = quarters / 4
  if (years < 2) return `${years.toFixed(1)} Jahr`
  return `${years.toFixed(1)} Jahre`
}

function getTurnoverDescription(turnover: number): { label: string; color: string; description: string } {
  if (turnover < 10) {
    return {
      label: 'Sehr niedrig',
      color: 'text-brand dark:text-brand-light',
      description: 'Buy-and-Hold Strategie'
    }
  } else if (turnover < 25) {
    return {
      label: 'Niedrig', 
      color: 'text-brand dark:text-brand-light',
      description: 'Langfristig orientiert'
    }
  } else if (turnover < 50) {
    return {
      label: 'Moderat',
      color: 'text-gray-600 dark:text-gray-400',
      description: 'Ausgewogenes Trading'
    }
  } else if (turnover < 100) {
    return {
      label: 'Hoch',
      color: 'text-gray-600 dark:text-gray-400',
      description: 'Aktives Portfolio-Management'
    }
  } else {
    return {
      label: 'Sehr hoch',
      color: 'text-red-600 dark:text-red-400',
      description: 'Häufige Umschichtungen'
    }
  }
}

export default function PortfolioStatsGrid({ stats, investorName }: PortfolioStatsGridProps) {
  const turnoverInfo = getTurnoverDescription(stats.turnover)
  
  return (
    <div className="space-y-8">
      
      {/* === KEY METRICS GRID - Clean Quartr Style === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Portfolio Value */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <BuildingOfficeIcon className="w-5 h-5 text-brand dark:text-brand-light" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Portfolio-Wert</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(stats.totalValue / 1000000000)}B
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Gesamtwert aller Positionen</div>
          </div>
        </div>
        
        {/* Top 10 Concentration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <TrophyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top 10 Anteil</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.top10Percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {stats.top10Percentage > 70 ? 'Hoch konzentriert' : 
               stats.top10Percentage > 50 ? 'Moderat konzentriert' : 'Diversifiziert'}
            </div>
          </div>
        </div>
        
        {/* Average Holding Period */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <ClockIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ø Halteperiode</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {formatPeriod(stats.avgHoldingPeriod)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {stats.avgHoldingPeriod > 16 ? 'Langfristig' : 
               stats.avgHoldingPeriod > 8 ? 'Mittelfristig' : 'Kurzfristig'}
            </div>
          </div>
        </div>
        
        {/* Turnover */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <ArrowPathIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Turnover</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">
              {stats.turnover.toFixed(1)}%
            </div>
            <div className={`text-sm font-medium ${turnoverInfo.color}`}>
              {turnoverInfo.label}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {turnoverInfo.description}
            </div>
          </div>
        </div>
      </div>

      {/* === SECTOR BREAKDOWN - Clean Design === */}
      {stats.sectorBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <ChartPieIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">Sektor-Aufschlüsselung</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Verteilung nach Branchen und Sektoren
                </div>
              </div>
            </div>
          </div>
          
          {/* Simple sector list instead of chart component */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.sectorBreakdown.map((sector, index) => (
              <div key={sector.sector} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{sector.sector}</span>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{sector.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${sector.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{sector.count} Positionen</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(sector.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === PORTFOLIO INSIGHTS - Clean Analysis === */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
        <div className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Portfolio-Insights</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Concentration Analysis */}
          <div className="space-y-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Konzentration</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Top 10 Holdings:</span>
                <span className="font-medium text-gray-900 dark:text-white">{stats.top10Percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.top10Percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {stats.top10Percentage > 80 ? 
                  `${investorName} zeigt eine sehr hohe Konzentration auf wenige Positionen` :
                  stats.top10Percentage > 60 ?
                  `${investorName} fokussiert sich auf eine überschaubare Anzahl von Kernpositionen` :
                  `${investorName} verfolgt eine diversifizierte Anlagestrategie`
                }
              </div>
            </div>
          </div>
          
          {/* Activity Analysis */}
          <div className="space-y-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aktivität</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Turnover Rate:</span>
                <span className={`font-medium ${turnoverInfo.color}`}>
                  {stats.turnover.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    stats.turnover < 25 ? 'bg-brand' :
                    stats.turnover < 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.turnover, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {stats.turnover < 15 ? 
                  `${investorName} verfolgt eine klassische Buy-and-Hold Strategie` :
                  stats.turnover < 40 ?
                  `${investorName} nimmt gelegentlich Anpassungen vor` :
                  `${investorName} managed das Portfolio sehr aktiv`
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}