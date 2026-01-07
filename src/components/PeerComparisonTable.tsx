// src/components/PeerComparisonTable.tsx - Professional Peer Comparison
'use client'

import React, { useState, useEffect } from 'react'
import { PeerComparisonData } from '@/lib/peerComparisonService'
import { useCurrency } from '@/lib/CurrencyContext'
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  MinusIcon,
  BuildingOfficeIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline'

interface PeerComparisonTableProps {
  ticker: string
  isPremium: boolean
}

export default function PeerComparisonTable({ ticker, isPremium }: PeerComparisonTableProps) {
  const [data, setData] = useState<PeerComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatCurrency, formatPercentage, formatNumber } = useCurrency()

  useEffect(() => {
    async function loadPeerComparison() {
      if (!isPremium) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        console.log(`🔍 Loading peer comparison for ${ticker}`)
        const response = await fetch(`/api/peer-comparison/${ticker}`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const peerData = await response.json()
        setData(peerData)
        
      } catch (err) {
        console.error('Error loading peer comparison:', err)
        setError('Fehler beim Laden der Peer-Daten')
      } finally {
        setLoading(false)
      }
    }

    loadPeerComparison()
  }, [ticker, isPremium])

  // Premium Teaser: Zeige Tabellen-Header + erste 3 Metriken, blur den Rest
  if (!isPremium) {
    // Teaser-Metriken (erste 3)
    const teaserMetrics = [
      { key: 'pe', label: 'KGV', type: 'ratio' as const, higherIsBetter: false },
      { key: 'pb', label: 'KBV', type: 'ratio' as const, higherIsBetter: false },
      { key: 'roe', label: 'ROE', type: 'percentage' as const, higherIsBetter: true },
    ]

    // Geblurrte Metriken (Rest)
    const blurredMetrics = [
      { key: 'ps', label: 'KUV', type: 'ratio' as const },
      { key: 'evEbitda', label: 'EV/EBITDA', type: 'ratio' as const },
      { key: 'netMargin', label: 'Nettomarge', type: 'percentage' as const },
    ]

    return (
      <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
            <p className="text-theme-muted text-sm">Vergleich mit Branchenkonkurrenten</p>
          </div>
        </div>

        {/* Teaser Tabelle */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-theme/10">
                <th className="text-left py-3 px-2 text-theme-secondary text-sm font-medium">Kennzahl</th>
                <th className="text-right py-3 px-2 text-theme-secondary text-sm font-medium">{ticker.toUpperCase()}</th>
                <th className="text-right py-3 px-2 text-theme-secondary text-sm font-medium">Sektor ⌀</th>
                <th className="text-center py-3 px-2 text-theme-secondary text-sm font-medium">vs. Sektor</th>
              </tr>
            </thead>
            <tbody>
              {/* Sichtbare Teaser-Zeilen */}
              {teaserMetrics.map(metric => (
                <tr key={metric.key} className="border-b border-theme/5">
                  <td className="py-3 px-2 text-theme-primary text-sm font-medium">{metric.label}</td>
                  <td className="py-3 px-2 text-right text-theme-muted text-sm font-mono">—</td>
                  <td className="py-3 px-2 text-right text-theme-muted text-sm font-mono">—</td>
                  <td className="py-3 px-2 text-center">
                    <MinusIcon className="w-4 h-4 text-gray-400 mx-auto" />
                  </td>
                </tr>
              ))}

              {/* Geblurrte Zeilen */}
              <tr>
                <td colSpan={4} className="p-0">
                  <div className="relative">
                    <div className="filter blur-sm opacity-40 pointer-events-none select-none">
                      {blurredMetrics.map(metric => (
                        <div key={metric.key} className="flex border-b border-theme/5">
                          <div className="py-3 px-2 text-theme-primary text-sm font-medium flex-1">{metric.label}</div>
                          <div className="py-3 px-2 text-right text-theme-muted text-sm font-mono w-24">12.5x</div>
                          <div className="py-3 px-2 text-right text-theme-muted text-sm font-mono w-24">15.2x</div>
                          <div className="py-3 px-2 text-center w-20">
                            <ArrowUpIcon className="w-4 h-4 text-green-400 mx-auto" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Premium CTA */}
        <div className="mt-6 pt-4 border-t border-theme/10">
          <a
            href="/pricing"
            className="flex items-center justify-center gap-2 w-full py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 rounded-lg transition-colors"
          >
            <BuildingOfficeIcon className="w-4 h-4 text-green-500" />
            <span className="text-green-500 font-medium text-sm">
              Vollständigen Peer-Vergleich freischalten
            </span>
          </a>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
            <p className="text-theme-muted text-sm">Lade Branchenvergleich...</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    )
  }

  // Error State
  if (error || !data) {
    return (
      <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
            <p className="text-theme-muted text-sm">Fehler beim Laden</p>
          </div>
        </div>
        
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <p className="text-red-400 text-sm">
            {error || 'Keine Peer-Daten verfügbar'}
          </p>
        </div>
      </div>
    )
  }

  // Helper function for comparison indicators
  const getComparisonIndicator = (value: number | null, average: number | null, higher_is_better = false) => {
    if (value === null || average === null) return <MinusIcon className="w-4 h-4 text-gray-400" />
    
    const isHigher = value > average
    const betterColor = higher_is_better ? 'text-green-400' : 'text-red-400'
    const worseColor = higher_is_better ? 'text-red-400' : 'text-green-400'
    
    return isHigher ? (
      <ArrowUpIcon className={`w-4 h-4 ${higher_is_better ? betterColor : worseColor}`} />
    ) : (
      <ArrowDownIcon className={`w-4 h-4 ${higher_is_better ? worseColor : betterColor}`} />
    )
  }

  const formatValue = (value: number | null, type: 'ratio' | 'percentage' | 'currency' | 'number') => {
    if (value === null || value === undefined) return '—'
    
    switch (type) {
      case 'ratio':
        return `${value.toFixed(1)}x`
      case 'percentage':
        return formatPercentage(value / 100)
      case 'currency':
        return formatCurrency(value)
      case 'number':
        return formatNumber(value)
      default:
        return value.toString()
    }
  }

  const metrics = [
    { key: 'pe', label: 'KGV', type: 'ratio' as const, higherIsBetter: false },
    { key: 'pb', label: 'KBV', type: 'ratio' as const, higherIsBetter: false },
    { key: 'ps', label: 'KUV', type: 'ratio' as const, higherIsBetter: false },
    { key: 'evEbitda', label: 'EV/EBITDA', type: 'ratio' as const, higherIsBetter: false },
    { key: 'evSales', label: 'EV/Sales', type: 'ratio' as const, higherIsBetter: false },
    { key: 'priceToFreeCashFlow', label: 'P/FCF', type: 'ratio' as const, higherIsBetter: false },
    { key: 'roe', label: 'ROE', type: 'percentage' as const, higherIsBetter: true },
    { key: 'roic', label: 'ROIC', type: 'percentage' as const, higherIsBetter: true },
    { key: 'grossMargin', label: 'Bruttomarge', type: 'percentage' as const, higherIsBetter: true },
    { key: 'operatingMargin', label: 'Operative Marge', type: 'percentage' as const, higherIsBetter: true },
    { key: 'netMargin', label: 'Nettomarge', type: 'percentage' as const, higherIsBetter: true },
  ]

  return (
    <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <ChartBarIcon className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
          <p className="text-theme-muted text-sm">
            {data.targetCompany.name} vs. {data.peers.length} Konkurrenten ({data.targetCompany.sector})
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme/10">
              <th className="text-left py-3 px-2 text-theme-secondary text-sm font-medium">
                Kennzahl
              </th>
              <th className="text-right py-3 px-2 text-theme-secondary text-sm font-medium">
                {data.targetCompany.ticker}
              </th>
              <th className="text-right py-3 px-2 text-theme-secondary text-sm font-medium">
                Sektor ⌀
              </th>
              <th className="text-center py-3 px-2 text-theme-secondary text-sm font-medium">
                vs. Sektor
              </th>
              {data.peers.slice(0, 3).map(peer => (
                <th key={peer.ticker} className="text-right py-3 px-2 text-theme-secondary text-sm font-medium">
                  {peer.ticker}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(metric => {
              const targetValue = (data.targetCompany as any)[metric.key] as number | null
              const sectorAverage = (data.sectorAverages as any)[metric.key]
              
              return (
                <tr key={metric.key} className="border-b border-theme/5 hover:bg-theme-secondary/5">
                  <td className="py-3 px-2 text-theme-primary text-sm font-medium">
                    {metric.label}
                  </td>
                  <td className="py-3 px-2 text-right text-theme-primary text-sm font-mono">
                    {formatValue(targetValue, metric.type)}
                  </td>
                  <td className="py-3 px-2 text-right text-theme-secondary text-sm font-mono">
                    {formatValue(sectorAverage, metric.type)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {getComparisonIndicator(targetValue, sectorAverage, metric.higherIsBetter)}
                  </td>
                  {data.peers.slice(0, 3).map(peer => {
                    const peerValue = (peer as any)[metric.key] as number | null
                    return (
                      <td key={peer.ticker} className="py-3 px-2 text-right text-theme-secondary text-sm font-mono">
                        {formatValue(peerValue, metric.type)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with peer companies */}
      <div className="mt-6 pt-4 border-t border-theme/10">
        <p className="text-theme-muted text-xs mb-2">Verglichene Unternehmen:</p>
        <div className="flex flex-wrap gap-2">
          {data.peers.map(peer => (
            <span key={peer.ticker} className="px-2 py-1 bg-theme-secondary/20 rounded text-xs text-theme-secondary">
              {peer.ticker}: {peer.name.length > 20 ? peer.name.substring(0, 20) + '...' : peer.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}