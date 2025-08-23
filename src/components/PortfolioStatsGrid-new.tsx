// src/components/PortfolioStatsGrid-new.tsx - QUARTR-INSPIRED REDESIGN
'use client'

import React from 'react'
import { 
  ChartPieIcon,
  ClockIcon,
  ArrowPathIcon,
  TrophyIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import SectorBreakdownChart from './SectorBreakdownChart'

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
      color: 'status-positive',
      description: 'Buy-and-Hold Strategie'
    }
  } else if (turnover < 25) {
    return {
      label: 'Niedrig', 
      color: 'status-positive',
      description: 'Langfristig orientiert'
    }
  } else if (turnover < 50) {
    return {
      label: 'Moderat',
      color: 'status-neutral',
      description: 'Ausgewogenes Trading'
    }
  } else if (turnover < 100) {
    return {
      label: 'Hoch',
      color: 'status-neutral',
      description: 'Aktives Portfolio-Management'
    }
  } else {
    return {
      label: 'Sehr hoch',
      color: 'status-negative',
      description: 'Häufige Umschichtungen'
    }
  }
}

export default function PortfolioStatsGrid({ stats, investorName }: PortfolioStatsGridProps) {
  const turnoverInfo = getTurnoverDescription(stats.turnover)
  
  return (
    <div className="stack stack-8">
      
      {/* === KEY METRICS GRID - Clean Quartr Style === */}
      <div className="grid grid-auto">
        
        {/* Portfolio Value */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
              <BuildingOfficeIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
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
        <div className="card">
          <div className="inline inline-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <TrophyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-micro">Top 10 Anteil</div>
            </div>
          </div>
          <div className="stack stack-2">
            <div className="text-heading">
              {stats.top10Percentage.toFixed(1)}%
            </div>
            <div className="text-caption">
              {stats.top10Percentage > 70 ? 'Hoch konzentriert' : 
               stats.top10Percentage > 50 ? 'Moderat konzentriert' : 'Diversifiziert'}
            </div>
          </div>
        </div>
        
        {/* Average Holding Period */}
        <div className="card">
          <div className="inline inline-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <ClockIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-micro">Ø Halteperiode</div>
            </div>
          </div>
          <div className="stack stack-2">
            <div className="text-heading">
              {formatPeriod(stats.avgHoldingPeriod)}
            </div>
            <div className="text-caption">
              {stats.avgHoldingPeriod > 16 ? 'Langfristig' : 
               stats.avgHoldingPeriod > 8 ? 'Mittelfristig' : 'Kurzfristig'}
            </div>
          </div>
        </div>
        
        {/* Turnover */}
        <div className="card">
          <div className="inline inline-4 mb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <ArrowPathIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-micro">Turnover</div>
            </div>
          </div>
          <div className="stack stack-2">
            <div className="text-heading">
              {stats.turnover.toFixed(1)}%
            </div>
            <div className={`text-caption ${turnoverInfo.color}`}>
              {turnoverInfo.label}
            </div>
            <div className="text-caption">
              {turnoverInfo.description}
            </div>
          </div>
        </div>
      </div>

      {/* === SECTOR BREAKDOWN - Clean Design === */}
      {stats.sectorBreakdown.length > 0 && (
        <div className="card-spacious">
          <div className="chart-header">
            <div className="inline inline-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                <ChartPieIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <div className="chart-title">Sektor-Aufschlüsselung</div>
                <div className="chart-subtitle">
                  Verteilung nach Branchen und Sektoren
                </div>
              </div>
            </div>
          </div>
          
          <SectorBreakdownChart data={stats.sectorBreakdown} />
        </div>
      )}

      {/* === PORTFOLIO INSIGHTS - Clean Analysis === */}
      <div className="card-spacious">
        <div className="text-heading mb-6">Portfolio-Insights</div>
        <div className="grid grid-2">
          
          {/* Concentration Analysis */}
          <div className="stack stack-4">
            <div className="text-micro">Konzentration</div>
            <div className="stack stack-2">
              <div className="inline justify-between">
                <span className="text-caption">Top 10 Holdings:</span>
                <span className="text-body font-medium">{stats.top10Percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(stats.top10Percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-caption">
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
          <div className="stack stack-4">
            <div className="text-micro">Aktivität</div>
            <div className="stack stack-2">
              <div className="inline justify-between">
                <span className="text-caption">Turnover Rate:</span>
                <span className={`text-body font-medium ${turnoverInfo.color}`}>
                  {stats.turnover.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    stats.turnover < 25 ? 'bg-green-500' :
                    stats.turnover < 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.turnover, 100)}%` }}
                ></div>
              </div>
              <div className="text-caption">
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