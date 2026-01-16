// components/SectorPerformance.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ChartBarIcon } from '@heroicons/react/24/outline'

interface Sector {
  sector: string
  sectorDE: string
  change: number
  changeFormatted: string
}

const SectorPerformance = React.memo(() => {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSectorPerformance() {
      try {
        const response = await fetch('/api/sector-performance')

        if (!response.ok) {
          throw new Error('Failed to fetch sector performance')
        }

        const data = await response.json()
        setSectors(data.sectors || [])
      } catch (error) {
        console.error('Error loading sector performance:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSectorPerformance()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-primary">Sector Performance</h3>
          <span className="text-xs text-theme-muted">% Veränderung</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-6 bg-theme-secondary/50 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  // Teile Sektoren in zwei Spalten
  const midpoint = Math.ceil(sectors.length / 2)
  const leftColumn = sectors.slice(0, midpoint)
  const rightColumn = sectors.slice(midpoint)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-theme-primary">Sector Performance</h3>
        <span className="text-xs text-theme-muted">% Veränderung</span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {/* Left Column */}
        <div className="space-y-1.5">
          {leftColumn.map((sector) => (
            <SectorRow key={sector.sector} sector={sector} />
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-1.5">
          {rightColumn.map((sector) => (
            <SectorRow key={sector.sector} sector={sector} />
          ))}
        </div>
      </div>
    </>
  )
})

// Einzelne Sektor-Zeile
const SectorRow = ({ sector }: { sector: Sector }) => {
  const isPositive = sector.change >= 0

  return (
    <div className="flex items-center justify-between py-1 group">
      <span className="text-xs text-theme-secondary group-hover:text-theme-primary transition-colors truncate pr-2">
        {sector.sectorDE}
      </span>
      <span className={`text-xs font-medium tabular-nums ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {sector.changeFormatted}
      </span>
    </div>
  )
}

SectorPerformance.displayName = 'SectorPerformance'

export default SectorPerformance
