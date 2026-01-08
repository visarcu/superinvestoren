// src/components/PortfolioStatsGrid.tsx - FIXED Syntax Error
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
      color: 'text-brand-light',
      description: 'Buy-and-Hold Strategie'
    }
  } else if (turnover < 25) {
    return {
      label: 'Niedrig',
      color: 'text-green-300',
      description: 'Langfristig orientiert'
    }
  } else if (turnover < 50) {
    return {
      label: 'Moderat',
      color: 'text-yellow-400',
      description: 'Ausgewogenes Trading'
    }
  } else if (turnover < 100) {
    return {
      label: 'Hoch',
      color: 'text-orange-400',
      description: 'Aktives Portfolio-Management'
    }
  } else {
    return {
      label: 'Sehr hoch',
      color: 'text-red-400',
      description: 'Häufige Umschichtungen'
    }
  }
}

export default function PortfolioStatsGrid({ stats, investorName }: PortfolioStatsGridProps) {
  const turnoverInfo = getTurnoverDescription(stats.turnover)
  
  return (
    <div className="space-y-8">
      
      {/* ✅ REDESIGNED Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Portfolio Value */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-emerald-500/10 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-brand/20 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Portfolio-Wert</h3>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {formatCurrency(stats.totalValue / 1000000000)}B
              </p>
              <p className="text-xs text-gray-500">Gesamtwert aller Positionen</p>
            </div>
          </div>
        </div>
        
        {/* Top 10 Concentration */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Top 10 Anteil</h3>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {stats.top10Percentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {stats.top10Percentage > 70 ? 'Hoch konzentriert' : 
                 stats.top10Percentage > 50 ? 'Moderat konzentriert' : 'Diversifiziert'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Average Holding Period */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Ø Halteperiode</h3>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {formatPeriod(stats.avgHoldingPeriod)}
              </p>
              <p className="text-xs text-gray-500">
                {stats.avgHoldingPeriod > 16 ? 'Langfristig' : 
                 stats.avgHoldingPeriod > 8 ? 'Mittelfristig' : 'Kurzfristig'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Turnover */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <ArrowPathIcon className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Turnover</h3>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">
                {stats.turnover.toFixed(1)}%
              </p>
              <p className={`text-xs ${turnoverInfo.color}`}>
                {turnoverInfo.label}
              </p>
              <p className="text-xs text-gray-500">
                {turnoverInfo.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ REDESIGNED Sector Breakdown */}
      {stats.sectorBreakdown.length > 0 && (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
          <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                <ChartPieIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Sektor-Aufschlüsselung</h3>
                <p className="text-sm text-gray-400">
                  Verteilung nach Branchen und Sektoren
                </p>
              </div>
            </div>
            
            <SectorBreakdownChart data={stats.sectorBreakdown} />
          </div>
        </div>
      )}

      {/* ✅ REDESIGNED Additional Insights */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-slate-500/5 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
        <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-200">
          <h3 className="text-lg font-bold text-white mb-6">Portfolio-Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Concentration Analysis */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Konzentration</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Top 10 Holdings:</span>
                  <span className="text-white font-medium">{stats.top10Percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(stats.top10Percentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {stats.top10Percentage > 80 ? 
                    `${investorName} zeigt eine sehr hohe Konzentration auf wenige Positionen` :
                    stats.top10Percentage > 60 ?
                    `${investorName} fokussiert sich auf eine überschaubare Anzahl von Kernpositionen` :
                    `${investorName} verfolgt eine diversifizierte Anlagestrategie`
                  }
                </p>
              </div>
            </div>
            
            {/* Activity Analysis */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Aktivität</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Turnover Rate:</span>
                  <span className={`font-medium ${turnoverInfo.color}`}>
                    {stats.turnover.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      stats.turnover < 25 ? 'bg-brand' :
                      stats.turnover < 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(stats.turnover, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">
                  {stats.turnover < 15 ? 
                    `${investorName} verfolgt eine klassische Buy-and-Hold Strategie` :
                    stats.turnover < 40 ?
                    `${investorName} nimmt gelegentlich Anpassungen vor` :
                    `${investorName} managed das Portfolio sehr aktiv`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}