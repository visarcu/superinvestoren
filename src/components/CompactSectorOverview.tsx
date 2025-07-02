// src/components/CompactSectorOverview.tsx - Optimiert für neues Layout
'use client'

import React from 'react'
import Link from 'next/link'
import { ChartPieIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface SectorData {
  sector: string
  value: number
  percentage: number
  count: number
}

interface CompactSectorOverviewProps {
  data: SectorData[]
  investorSlug?: string
}

const getSectorColor = (sector: string, index: number): string => {
  const colorMap: Record<string, string> = {
    'Technologie': '#3B82F6',
    'Finanzdienstleistungen': '#10B981',
    'Gesundheitswesen': '#EF4444',
    'Basiskonsumgüter': '#8B5CF6',
    'Konsumgüter': '#8B5CF6',
    'Zyklische Konsumgüter': '#F59E0B',
    'Energie': '#F97316',
    'Industrie': '#6B7280',
    'Immobilien': '#EC4899',
    'Rohstoffe': '#84CC16',
    'Versorger': '#06B6D4',
    'Kommunikation': '#F472B6',
    'Sonstige': '#9CA3AF'
  }
  
  return colorMap[sector] || ['#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B'][index % 5]
}

export default function CompactSectorOverview({ data, investorSlug }: CompactSectorOverviewProps) {
  // Zeige nur Top 4 + "Weitere" für kompakteres Design
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  const topSectors = sortedData.slice(0, 4)
  const otherSectors = sortedData.slice(4)
  
  let displayData = topSectors.map((item, index) => ({
    ...item,
    color: getSectorColor(item.sector, index)
  }))
  
  // "Weitere" Kategorie falls vorhanden
  if (otherSectors.length > 0) {
    const otherTotal = otherSectors.reduce((sum, item) => sum + item.value, 0)
    const otherPercentage = otherSectors.reduce((sum, item) => sum + item.percentage, 0)
    const otherCount = otherSectors.reduce((sum, item) => sum + item.count, 0)
    
    displayData.push({
      sector: `Weitere (${otherSectors.length})`,
      value: otherTotal,
      percentage: otherPercentage,
      count: otherCount,
      color: '#9CA3AF'
    })
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <ChartPieIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Sektor-Übersicht</h3>
            <p className="text-xs text-gray-400">Top {displayData.length} Bereiche</p>
          </div>
        </div>
        
        {/* Link zu detaillierter Analyse */}
        {investorSlug && (
          <Link 
            href={`/superinvestor/${investorSlug}?tab=analytics&view=sectors`}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 group"
          >
            Details
            <ArrowTopRightOnSquareIcon className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        )}
      </div>

      {/* Compact Sector List */}
      <div className="space-y-3">
        {displayData.map((sector, index) => (
          <div 
            key={sector.sector}
            className="flex items-center gap-3 group"
          >
            {/* Color Indicator */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sector.color }}
              />
            </div>
            
            {/* Sector Info & Progress */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white truncate">
                  {sector.sector}
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0 ml-2">
                  <span>{sector.count}x</span>
                  <span className="font-semibold text-white">
                    {sector.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Mini Progress Bar */}
              <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ 
                    backgroundColor: sector.color,
                    width: `${sector.percentage}%`,
                    opacity: 0.8
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-800/50">
        <div className="text-xs text-gray-500">
          {data.length} Sektoren gesamt
        </div>
        <div className="text-xs text-gray-400">
          ${(data.reduce((sum, s) => sum + s.value, 0) / 1000000000).toFixed(1)}B
        </div>
      </div>
    </div>
  )
}