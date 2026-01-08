// src/components/OwnershipSection.tsx - VOLLSTÄNDIG DEUTSCH
'use client'

import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { ArrowsPointingOutIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

interface OwnershipSectionProps {
  ticker: string
  isPremium?: boolean
}

interface OwnershipData {
  topInstitutional: Array<{
    holder: string
    sharesNumber: number
    value: number | null
    percentage: number
  }>
  categories: Array<{
    name: string
    value: number
    color: string
    percentage: number
  }>
  summary: {
    institutionalPercentage: number
    publicPercentage: number
    calculationBasis: string
    dataQuality: string
  }
  outstandingShares: number
}

const OwnershipSection = React.memo<OwnershipSectionProps>(({ ticker, isPremium = false }) => {
  const [data, setData] = useState<OwnershipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function loadOwnershipData() {
      if (!ticker) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/ownership/${ticker}`)
        if (response.ok) {
          const result = await response.json()
          setData(result.data)
        } else {
          console.error('Failed to load ownership data')
          setData(null)
        }
      } catch (error) {
        console.error('Ownership data error:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    loadOwnershipData()
  }, [ticker])

  // ✅ DEUTSCHE LABELS für bessere UX
  const translateCategoryName = (name: string): string => {
    const translations: { [key: string]: string } = {
      'Investmentfonds': 'Investmentfonds',
      'ETFs': 'ETFs',
      'Vermögensverwalter': 'Vermögensverwalter',
      'Pensionsfonds': 'Pensionsfonds',
      'Versicherungen': 'Versicherungsgesellschaften',
      'Andere Institutionen': 'Andere Institutionen',
      'Öffentlich & Andere': 'Privat & Sonstige',
      // Fallback für alte englische Namen
      'Mutual Funds': 'Investmentfonds',
      'Investment Advisors': 'Vermögensverwalter',
      'Pension Funds': 'Pensionsfonds',
      'Insurance Companies': 'Versicherungsgesellschaften',
      'Other Institutions': 'Andere Institutionen',
      'Public & Other': 'Privat & Sonstige'
    }
    return translations[name] || name
  }

  // ✅ VERBESSERTE FARBPALETTE für mehr Vielfalt
  const improveColors = (categories: any[]) => {
    const colorPalette = [
      '#3B82F6', // Blau - Investmentfonds
      '#10B981', // Grün - ETFs  
      '#F59E0B', // Orange - Vermögensverwalter
      '#8B5CF6', // Lila - Pensionsfonds
      '#EF4444', // Rot - Versicherungen
      '#06B6D4', // Cyan - Andere Institutionen
      '#6B7280', // Grau - Privat & Sonstige
      '#EC4899', // Pink - Fallback
      '#84CC16', // Lime - Fallback
      '#F97316'  // Orange-Rot - Fallback
    ]
    
    return categories.map((cat, index) => ({
      ...cat,
      name: translateCategoryName(cat.name),
      color: colorPalette[index % colorPalette.length]
    }))
  }

  const formatShares = (shares: number): string => {
    if (shares >= 1e9) {
      return `${(shares / 1e9).toFixed(1)}B`
    } else if (shares >= 1e6) {
      return `${(shares / 1e6).toFixed(0)}M`
    }
    return shares.toLocaleString()
  }

  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-xl font-bold text-theme-primary">Aktionärsstruktur</h3>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  // Zeige Teaser auch ohne Premium - mit echten Daten wenn verfügbar
  if (!data) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-xl font-bold text-theme-primary">Aktionärsstruktur</h3>
        </div>
        <div className="p-6">
          <div className="min-h-[400px] bg-theme-tertiary rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Premium Teaser: Zeige ersten 3 Holder + Kategorien, blur den Rest
  if (!isPremium) {
    const teaserHolders = data.topInstitutional.slice(0, 3)
    const blurredHolders = data.topInstitutional.slice(3, 8)
    const improvedCategories = improveColors(data.categories)

    return (
      <div className="bg-theme-card rounded-lg relative overflow-hidden">
        <div className="px-6 py-4 border-b border-theme/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-theme-primary">Aktionärsstruktur</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-brand-light font-medium">Echte SEC-Daten</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Ownership Pie Chart - voll sichtbar als Teaser */}
            <div className="lg:col-span-1">
              <div className="aspect-square">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={improvedCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="percentage"
                    >
                      {improvedCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const data = payload[0].payload

                        return (
                          <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme-border">
                            <p className="text-theme-primary text-sm font-medium">{data.name}</p>
                            <p className="text-theme-secondary text-xs">
                              {data.percentage.toFixed(1)}%
                            </p>
                          </div>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-2">
                {improvedCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-theme-primary">{category.name}</span>
                    </div>
                    <span className="text-theme-secondary font-medium">
                      {category.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Institutional Holders - Teaser mit Blur */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-theme-primary">Top Institutionelle Investoren</h4>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-xs text-blue-400 font-medium">SEC 13F Filings</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Sichtbare Teaser-Einträge (Top 3) */}
                {teaserHolders.map((holder, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-theme-tertiary rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-theme-primary truncate">
                        {holder.holder}
                      </div>
                      <div className="text-xs text-theme-secondary">
                        {formatShares(holder.sharesNumber)} Aktien
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-theme-primary">
                        {holder.percentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}

                {/* Geblurrte Einträge mit Overlay */}
                <div className="relative">
                  <div className="filter blur-sm opacity-50 pointer-events-none select-none space-y-3">
                    {blurredHolders.map((holder, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-theme-tertiary rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-theme-primary truncate">
                            {holder.holder}
                          </div>
                          <div className="text-xs text-theme-secondary">
                            {formatShares(holder.sharesNumber)} Aktien
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-theme-primary">
                            {holder.percentage.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Premium Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Link
                      href="/pricing"
                      className="bg-theme-card/95 backdrop-blur-sm rounded-lg px-4 py-3 text-center shadow-lg border border-brand/20 hover:border-green-500/40 transition-colors"
                    >
                      <LockClosedIcon className="w-5 h-5 text-brand mx-auto mb-1" />
                      <p className="text-theme-primary font-medium text-sm">+{data.topInstitutional.length - 3} weitere Investoren</p>
                      <p className="text-brand text-xs mt-1">Premium freischalten →</p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const improvedCategories = improveColors(data.categories)

  return (
    <div className="bg-theme-card rounded-lg hover:bg-theme-hover transition-all duration-300 group">
      <div className="px-6 py-4 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-theme-primary">Aktionärsstruktur</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-brand-light font-medium">Echte SEC-Daten</span>
            </div>
            <button 
              onClick={() => setExpanded(true)}
              className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <ArrowsPointingOutIcon className="w-4 h-4 text-theme-secondary hover:text-theme-primary" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Ownership Pie Chart */}
          <div className="lg:col-span-1">
            <div className="aspect-square">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={improvedCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="percentage"
                  >
                    {improvedCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      
                      return (
                        <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme-border">
                          <p className="text-theme-primary text-sm font-medium">{data.name}</p>
                          <p className="text-theme-secondary text-xs">
                            {data.percentage.toFixed(1)}% • {formatShares(data.value)} Aktien
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="mt-4 space-y-2">
              {improvedCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-theme-primary">{category.name}</span>
                  </div>
                  <span className="text-theme-secondary font-medium">
                    {category.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Institutional Holders */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-theme-primary">Top Institutionelle Investoren</h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-blue-400 font-medium">SEC 13F Filings</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {data.topInstitutional.slice(0, 8).map((holder, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-theme-tertiary rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-theme-primary truncate">
                      {holder.holder}
                    </div>
                    <div className="text-xs text-theme-secondary">
                      {formatShares(holder.sharesNumber)} Aktien
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-theme-primary">
                      {holder.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Info */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-blue-400 mb-1">Datenquelle</h5>
                  <p className="text-xs text-theme-secondary leading-relaxed">
                    Institutionelle Holdings basieren auf echten SEC 13F Filings. Institutional Holdings ab $100M Assets werden quartalsweise gemeldet. Aktuelle Positionen können abweichen.
                  </p>
                  <div className="mt-2 text-xs text-theme-muted">
                    Stand: {new Date().toLocaleDateString('de-DE')} • 
                    Grundlage: {(data.outstandingShares / 1e9).toFixed(2)}B ausstehende Aktien
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
});

OwnershipSection.displayName = 'OwnershipSection';

export default OwnershipSection;