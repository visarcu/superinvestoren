// src/components/SectorBreakdownChart.tsx - VOLLSTÄNDIG mit korrekter deutscher Sektor-Unterstützung + Currency Context
'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCurrency } from '@/lib/CurrencyContext'

interface SectorBreakdownProps {
  data: Array<{
    sector: string
    value: number
    percentage: number
    count: number
  }>
}

// ✅ COMPLETE: Erweiterte Farb-Palette für deutsche und englische Sektornamen
const getSectorColor = (sector: string, index: number): string => {
  const colorMap: Record<string, string> = {
    // Deutsche Sektornamen
    'Technologie': '#3B82F6',           // Blue
    'Finanzdienstleistungen': '#10B981', // Emerald  
    'Gesundheitswesen': '#EF4444',      // Red
    'Basiskonsumgüter': '#8B5CF6',      // Violet
    'Konsumgüter': '#8B5CF6',           // Violet
    'Zyklische Konsumgüter': '#F59E0B', // Amber
    'Energie': '#F97316',               // Orange
    'Industrie': '#6B7280',             // Gray
    'Immobilien': '#EC4899',            // Pink
    'Rohstoffe': '#84CC16',             // Lime
    'Versorger': '#06B6D4',             // Cyan
    'Kommunikation': '#F472B6',         // Pink-400
    'Sonstige': '#9CA3AF',              // Gray-400
    
    // Englische Sektornamen (Fallback)
    'Technology': '#3B82F6',            // Blue
    'Financial Services': '#10B981',    // Emerald  
    'Healthcare': '#EF4444',            // Red
    'Consumer Staples': '#8B5CF6',      // Violet
    'Consumer Discretionary': '#F59E0B', // Amber
    'Energy': '#F97316',                // Orange
    'Industrials': '#6B7280',           // Gray
    'Real Estate': '#EC4899',           // Pink
    'Materials': '#84CC16',             // Lime
    'Utilities': '#06B6D4',             // Cyan
    'Communication Services': '#F472B6', // Pink-400
    'Other': '#9CA3AF',                 // Gray-400
    
    // Legacy Support für alte hardcodierte Namen
    'Consumer Defensive': '#EF4444',    // Healthcare Red (falls noch verwendet)
    'Consumer Cyclical': '#F59E0B',     // Amber (falls noch verwendet)
    'Communication': '#F472B6',         // Pink-400
    'Kommunikationsdienste': '#F472B6'  // Alternative deutsche Übersetzung
  }
  
  // Direkte Zuordnung falls vorhanden
  if (colorMap[sector]) {
    return colorMap[sector]
  }
  
  // Fallback zu einer der Farben für unbekannte Sektoren
  const fallbackColors = [
    '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', 
    '#F59E0B', '#F97316', '#6B7280', '#EC4899',
    '#84CC16', '#06B6D4', '#F472B6', '#9CA3AF'
  ]
  
  return fallbackColors[index % fallbackColors.length]
}

const CustomTooltip = ({ active, payload }: any) => {
  const { formatCurrency } = useCurrency()
  
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
        <p className="text-white font-semibold mb-1">{data.sector}</p>
        <div className="space-y-1 text-sm">
          <p className="text-green-400 font-medium">
            {formatCurrency(data.value)}
          </p>
          <p className="text-gray-400">
            {data.percentage.toFixed(1)}% • {data.count} Position{data.count !== 1 ? 'en' : ''}
          </p>
        </div>
      </div>
    )
  }
  return null
}

export default function SectorBreakdownChart({ data }: SectorBreakdownProps) {
  const { formatCurrency } = useCurrency()
  
  // Bereite Daten für Chart vor
  const sortedData = [...data].sort((a, b) => b.value - a.value)
  const topSectors = sortedData.slice(0, 8)
  const otherSectors = sortedData.slice(8)
  
  let chartData = topSectors.map((item, index) => ({
    ...item,
    color: getSectorColor(item.sector, index)
  }))
  
  // "Sonstige" Kategorie hinzufügen falls vorhanden
  if (otherSectors.length > 0) {
    const otherTotal = otherSectors.reduce((sum, item) => sum + item.value, 0)
    const otherPercentage = otherSectors.reduce((sum, item) => sum + item.percentage, 0)
    const otherCount = otherSectors.reduce((sum, item) => sum + item.count, 0)
    
    chartData.push({
      sector: 'Sonstige',
      value: otherTotal,
      percentage: otherPercentage,
      count: otherCount,
      color: '#9CA3AF'
    })
  }

  return (
    <div className="space-y-8">
      
      {/* ✅ BEAUTIFUL: Modern Pie Chart */}
      <div className="relative">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={1}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="hover:brightness-110 transition-all duration-200"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.3))'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* ✅ CENTER: Beautiful Center Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">
              {chartData.length}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Sektoren
            </div>
          </div>
        </div>
      </div>

      {/* ✅ BEAUTIFUL: Modern Legend */}
      <div className="space-y-0">
        {chartData.map((sector, index) => (
          <div 
            key={sector.sector} 
            className="flex items-center justify-between py-3 px-4 hover:bg-gray-800/30 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* ✅ BEAUTIFUL: Animated Color Indicator */}
              <div className="relative">
                <div 
                  className="w-4 h-4 rounded-full shadow-lg"
                  style={{ backgroundColor: sector.color }}
                ></div>
                <div 
                  className="absolute inset-0 w-4 h-4 rounded-full opacity-30 group-hover:opacity-50 transition-opacity"
                  style={{ backgroundColor: sector.color, filter: 'blur(8px)' }}
                ></div>
              </div>
              
              {/* ✅ BEAUTIFUL: Sector Info with Progress Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white font-medium truncate">
                    {sector.sector}
                  </span>
                  <span className="text-gray-500 text-sm shrink-0">
                    {sector.count} Position{sector.count !== 1 ? 'en' : ''}
                  </span>
                </div>
                
                {/* ✅ BEAUTIFUL: Animated Progress Bar */}
                <div className="w-full bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      backgroundColor: sector.color,
                      width: `${sector.percentage}%`,
                      boxShadow: `0 0 8px ${sector.color}40`
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* ✅ BEAUTIFUL: Values mit Currency Context */}
            <div className="text-right shrink-0 ml-4">
              <div className="text-white font-semibold">
                {formatCurrency(sector.value)}
              </div>
              <div className="text-gray-400 text-sm">
                {sector.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* ✅ BEAUTIFUL: Summary Stats mit Currency Context */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-800/50">
        <div className="text-center">
          <div className="text-white font-semibold text-lg">
            {chartData.length}
          </div>
          <div className="text-gray-500 text-xs uppercase tracking-wide">
            Sektoren
          </div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold text-lg">
            {chartData.reduce((sum, s) => sum + s.count, 0)}
          </div>
          <div className="text-gray-500 text-xs uppercase tracking-wide">
            Positionen
          </div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold text-lg">
            {chartData[0]?.percentage.toFixed(0)}%
          </div>
          <div className="text-gray-500 text-xs uppercase tracking-wide">
            Größter Sektor
          </div>
        </div>
        <div className="text-center">
          <div className="text-white font-semibold text-lg">
            {formatCurrency(chartData.reduce((sum, s) => sum + s.value, 0), 'number')}
          </div>
          <div className="text-gray-500 text-xs uppercase tracking-wide">
            Gesamtwert
          </div>
        </div>
      </div>
    </div>
  )
}