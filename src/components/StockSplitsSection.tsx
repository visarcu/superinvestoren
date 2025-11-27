// src/components/StockSplitsSection.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline'

interface StockSplit {
  symbol: string
  date: string
  numerator: number
  denominator: number
  ratio: string
  type: string
  description: string
}

interface StockSplitsSectionProps {
  ticker: string
  isPremium?: boolean
}

export default function StockSplitsSection({ 
  ticker, 
  isPremium = false 
}: StockSplitsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stockSplits, setStockSplits] = useState<StockSplit[]>([])

  // Load stock splits data
  useEffect(() => {
    async function loadStockSplits() {
      if (!ticker) return

      setLoading(true)
      try {
        console.log(`🔍 Loading stock splits for ${ticker}...`)
        
        const response = await fetch(`/api/stock-splits/${ticker}`)
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const data = await response.json()
        setStockSplits(data.splits || [])
        
        console.log(`✅ Stock splits loaded: ${data.splits?.length || 0} splits`)
        
      } catch (error) {
        console.error('❌ Error loading stock splits:', error)
        setError('Fehler beim Laden der Stock Splits')
        setStockSplits([])
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadStockSplits()
    }
  }, [ticker])

  if (loading) {
    return (
      <div className="professional-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-theme-tertiary rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
            <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="professional-card p-6">
        <div className="flex items-center gap-3 text-red-400">
          <ArrowPathRoundedSquareIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="professional-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
          <ArrowPathRoundedSquareIcon className="w-4 h-4 text-orange-400" />
        </div>
        <h3 className="text-xl font-bold text-theme-primary">Aktiensplits Historie</h3>
      </div>

      {stockSplits.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-theme">
          <table className="w-full">
            <thead className="bg-theme-tertiary/50">
              <tr>
                <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Datum</th>
                <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Typ</th>
                <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Verhältnis</th>
                <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {stockSplits.map((split, index) => (
                <tr key={`${split.date}-${index}`} className="hover:bg-theme-tertiary/30 transition-colors border-b border-theme/50">
                  <td className="py-3 px-4 text-theme-primary font-medium">
                    {new Date(split.date).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      split.type === 'Aktiensplit' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {split.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-theme-primary font-semibold">
                    {split.ratio}
                  </td>
                  <td className="py-3 px-4 text-theme-secondary">
                    {split.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-theme-muted">
          <ArrowPathRoundedSquareIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Keine Aktiensplits verfügbar</p>
          <p className="text-sm mt-1">
            {isPremium ? 'Dieses Unternehmen hatte bisher keine Aktiensplits.' : 'Premium-Feature erforderlich'}
          </p>
        </div>
      )}
    </div>
  )
}