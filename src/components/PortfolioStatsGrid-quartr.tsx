// src/components/PortfolioStatsGrid-quartr.tsx - TRUE QUARTR COLORS
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
      color: 'text-emerald-500',
      description: 'Buy-and-Hold Strategie'
    }
  } else if (turnover < 25) {
    return {
      label: 'Niedrig', 
      color: 'text-emerald-500',
      description: 'Langfristig orientiert'
    }
  } else if (turnover < 50) {
    return {
      label: 'Moderat',
      color: 'text-neutral-400',
      description: 'Ausgewogenes Trading'
    }
  } else if (turnover < 100) {
    return {
      label: 'Hoch',
      color: 'text-amber-500',
      description: 'Aktives Portfolio-Management'
    }
  } else {
    return {
      label: 'Sehr hoch',
      color: 'text-red-500',
      description: 'Häufige Umschichtungen'
    }
  }
}

export default function PortfolioStatsGrid({ stats, investorName }: PortfolioStatsGridProps) {
  const turnoverInfo = getTurnoverDescription(stats.turnover)
  
  return (
    <div className="space-y-6">
      
      {/* === KEY METRICS GRID - True Quartr Style === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Portfolio Value */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/10">
              <BuildingOfficeIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Portfolio-Wert</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {formatCurrency(stats.totalValue / 1000000000)}B
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">Gesamtwert aller Positionen</div>
          </div>
        </div>
        
        {/* Top 10 Concentration */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10">
              <TrophyIcon className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Top 10 Anteil</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {stats.top10Percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {stats.top10Percentage > 70 ? 'Hoch konzentriert' : 
               stats.top10Percentage > 50 ? 'Moderat konzentriert' : 'Diversifiziert'}
            </div>
          </div>
        </div>
        
        {/* Average Holding Period */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-500/10">
              <ClockIcon className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Ø Halteperiode</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {formatPeriod(stats.avgHoldingPeriod)}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {stats.avgHoldingPeriod > 16 ? 'Langfristig' : 
               stats.avgHoldingPeriod > 8 ? 'Mittelfristig' : 'Kurzfristig'}
            </div>
          </div>
        </div>
        
        {/* Turnover */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/10">
              <ArrowPathIcon className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Turnover</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {stats.turnover.toFixed(1)}%
            </div>
            <div className={`text-sm font-medium ${turnoverInfo.color}`}>
              {turnoverInfo.label}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {turnoverInfo.description}
            </div>
          </div>
        </div>
      </div>

      {/* === SECTOR BREAKDOWN - Clean Design === */}
      {stats.sectorBreakdown.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
          <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10">
                <ChartPieIcon className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <div className="text-lg font-semibold text-neutral-900 dark:text-white">Sektor-Aufschlüsselung</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Verteilung nach Branchen und Sektoren
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.sectorBreakdown.map((sector, index) => (
              <div key={sector.sector} className="p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-neutral-900 dark:text-white text-sm">{sector.sector}</span>
                  <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">{sector.percentage}%</span>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-1000"
                    style={{ width: `${sector.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{sector.count} Positionen</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatCurrency(sector.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === PORTFOLIO INSIGHTS - Clean Analysis === */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <div className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Portfolio-Insights</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Concentration Analysis */}
          <div className="space-y-4">
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Konzentration</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Top 10 Holdings:</span>
                <span className="font-medium text-neutral-900 dark:text-white">{stats.top10Percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.top10Percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
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
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Aktivität</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Turnover Rate:</span>
                <span className={`font-medium ${turnoverInfo.color}`}>
                  {stats.turnover.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    stats.turnover < 25 ? 'bg-emerald-500' :
                    stats.turnover < 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.turnover, 100)}%` }}
                ></div>
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
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