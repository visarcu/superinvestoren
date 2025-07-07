// src/components/AdvancedSectorAnalysis.tsx - Vollständige Komponente für den "Sektoren" Tab + Currency Context
'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ArrowRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'
import { stocks } from '@/data/stocks'
import { useCurrency } from '@/contexts/CurrencyContext'

interface AdvancedSectorAnalysisProps {
  snapshots: any[]
  investorName: string
}

// Helper Funktionen
function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

export default function AdvancedSectorAnalysis({ snapshots, investorName }: AdvancedSectorAnalysisProps) {
  const { formatLargeNumber } = useCurrency()
  
  // 1. Sektor-Allokation über Zeit
  const sectorTrendsOverTime = React.useMemo(() => {
    return snapshots.map(snapshot => {
      const sectorMap = new Map<string, number>()
      const totalValue = snapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0)
      
      snapshot.data.positions.forEach((position: any) => {
        const sector = getSectorFromPosition({
          cusip: position.cusip,
          ticker: getTicker(position)
        })
        const germanSector = translateSector(sector)
        
        const current = sectorMap.get(germanSector) || 0
        sectorMap.set(germanSector, current + position.value)
      })
      
      const result: any = {
        quarter: getPeriodFromDate(snapshot.data.date)
      }
      
      // Konvertiere zu Prozenten
      sectorMap.forEach((value, sector) => {
        result[sector] = (value / totalValue) * 100
      })
      
      return result
    }).sort((a, b) => a.quarter.localeCompare(b.quarter))
  }, [snapshots])

  // 2. Sektor-Diversifikation Score (Herfindahl-Index)
  const diversificationScore = React.useMemo(() => {
    const latestSnapshot = snapshots[snapshots.length - 1]
    if (!latestSnapshot) return 0
    
    const sectorMap = new Map<string, number>()
    const totalValue = latestSnapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0)
    
    latestSnapshot.data.positions.forEach((position: any) => {
      const sector = getSectorFromPosition({
        cusip: position.cusip,
        ticker: getTicker(position)
      })
      const germanSector = translateSector(sector)
      
      const current = sectorMap.get(germanSector) || 0
      sectorMap.set(germanSector, current + position.value)
    })
    
    // Herfindahl-Index berechnen
    let herfindahl = 0
    sectorMap.forEach(value => {
      const percentage = value / totalValue
      herfindahl += percentage * percentage
    })
    
    return (1 - herfindahl) * 100 // Diversifikation als Prozent
  }, [snapshots])

  // 3. Größte Sektor-Verschiebungen
  const sectorShifts = React.useMemo(() => {
    if (snapshots.length < 2) return []
    
    const current = snapshots[snapshots.length - 1]
    const previous = snapshots[snapshots.length - 2]
    
    const getCurrentSectors = (snapshot: any) => {
      const sectorMap = new Map<string, number>()
      const totalValue = snapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0)
      
      snapshot.data.positions.forEach((position: any) => {
        const sector = getSectorFromPosition({
          cusip: position.cusip,
          ticker: getTicker(position)
        })
        const germanSector = translateSector(sector)
        
        const currentValue = sectorMap.get(germanSector) || 0
        sectorMap.set(germanSector, currentValue + position.value)
      })
      
      const result = new Map<string, number>()
      sectorMap.forEach((value, sector) => {
        result.set(sector, (value / totalValue) * 100)
      })
      
      return result
    }
    
    const currentSectors = getCurrentSectors(current)
    const previousSectors = getCurrentSectors(previous)
    
    const shifts: Array<{
      sector: string
      change: number
      direction: 'up' | 'down'
      currentPercent: number
    }> = []
    
    const allSectors = new Set([...currentSectors.keys(), ...previousSectors.keys()])
    
    allSectors.forEach(sector => {
      const currentPercent = currentSectors.get(sector) || 0
      const previousPercent = previousSectors.get(sector) || 0
      const change = currentPercent - previousPercent
      
      if (Math.abs(change) > 0.5) { // Nur Änderungen > 0.5%
        shifts.push({
          sector,
          change: Math.abs(change),
          direction: change > 0 ? 'up' : 'down',
          currentPercent
        })
      }
    })
    
    return shifts.sort((a, b) => b.change - a.change).slice(0, 5)
  }, [snapshots])

  // Top Sektoren für Chart
  const topSectors = React.useMemo(() => {
    const latestSnapshot = snapshots[snapshots.length - 1]
    if (!latestSnapshot) return []
    
    const sectorMap = new Map<string, number>()
    const totalValue = latestSnapshot.data.positions.reduce((sum: number, p: any) => sum + p.value, 0)
    
    latestSnapshot.data.positions.forEach((position: any) => {
      const sector = getSectorFromPosition({
        cusip: position.cusip,
        ticker: getTicker(position)
      })
      const germanSector = translateSector(sector)
      
      const current = sectorMap.get(germanSector) || 0
      sectorMap.set(germanSector, current + position.value)
    })
    
    return Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: (value / totalValue) * 100,
        count: latestSnapshot.data.positions.filter((p: any) => {
          const s = translateSector(getSectorFromPosition({
            cusip: p.cusip,
            ticker: getTicker(p)
          }))
          return s === sector
        }).length
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [snapshots])

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Detaillierte Sektor-Analyse
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Tiefe Einblicke in {investorName}s Sektor-Allokation, Diversifikation und historische Trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Diversifikation Score */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Diversifikation</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {diversificationScore.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">
            {diversificationScore > 80 ? 'Sehr diversifiziert' : 
             diversificationScore > 60 ? 'Gut diversifiziert' : 
             diversificationScore > 40 ? 'Mäßig diversifiziert' : 'Konzentriert'}
          </p>
        </div>
        
        {/* Anzahl Sektoren */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ArrowRightIcon className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Aktive Sektoren</h3>
          </div>
          <p className="text-2xl font-bold text-white mb-2">
            {topSectors.length}
          </p>
          <p className="text-xs text-gray-500">Mit signifikanten Positionen</p>
        </div>
        
        {/* Größter Sektor */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-400">Größter Sektor</h3>
          </div>
          <p className="text-lg font-bold text-white mb-1">
            {topSectors[0]?.sector || 'N/A'}
          </p>
          <p className="text-sm text-green-400">
            {topSectors[0]?.percentage.toFixed(1)}% des Portfolios
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Sektor-Trends über Zeit */}
        {snapshots.length > 1 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sektor-Allokation über Zeit</h3>
                <p className="text-sm text-gray-400">Entwicklung der Top-Sektoren</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sectorTrendsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="quarter" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'Anteil']}
                />
                {topSectors.slice(0, 4).map((sector, index) => (
                  <Line
                    key={sector.sector}
                    type="monotone"
                    dataKey={sector.sector}
                    stroke={['#3B82F6', '#10B981', '#EF4444', '#F59E0B'][index]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sektor-Verschiebungen */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Größte Verschiebungen</h3>
              <p className="text-sm text-gray-400">Seit letztem Quartal</p>
            </div>
          </div>
          
          {sectorShifts.length > 0 ? (
            <div className="space-y-4">
              {sectorShifts.map((shift, index) => (
                <div key={shift.sector} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      shift.direction === 'up' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="text-white font-medium">{shift.sector}</p>
                      <p className="text-gray-400 text-sm">{shift.currentPercent.toFixed(1)}% aktuell</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${
                      shift.direction === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {shift.direction === 'up' ? (
                        <ArrowTrendingUpIcon className="w-4 h-4" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4" />
                      )}
                      <span className="font-semibold">
                        {shift.change.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Keine signifikanten Verschiebungen seit letztem Quartal</p>
            </div>
          )}
        </div>
      </div>

      {/* Sektor-Performance Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Sektor-Details</h3>
          <p className="text-sm text-gray-400 mt-1">Aufschlüsselung aller Sektoren mit Positionen</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr className="text-sm text-gray-400">
                <th className="text-left p-4 font-medium">Sektor</th>
                <th className="text-right p-4 font-medium">Wert</th>
                <th className="text-right p-4 font-medium">Portfolio %</th>
                <th className="text-right p-4 font-medium">Positionen</th>
              </tr>
            </thead>
            <tbody>
              {topSectors.map((sector, index) => (
                <tr key={sector.sector} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ 
                          backgroundColor: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899'][index] || '#9CA3AF'
                        }}
                      ></div>
                      <span className="font-medium text-white">{sector.sector}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300 font-mono">
                      {formatLargeNumber(sector.value)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-300 font-mono">
                      {sector.percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-gray-400">
                      {sector.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}