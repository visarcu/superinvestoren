// /components/PortfolioAnalysisInline.tsx - Öffentlich für alle User
import React, { useState } from 'react'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

interface Position {
  cusip: string
  name: string
  ticker?: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
}

interface AnalysisInlineProps {
  investorName: string
  currentPositions: Position[]
  previousPositions: any[]
}

interface Insight {
  type: 'reduction' | 'increase' | 'concentration' | 'new'
  text: string
  change: string
}

function generateCleanInsights(positions: Position[], investorName: string): Insight[] {
  const majorChanges = positions
    .filter(p => Math.abs(p.pctDelta) > 0.10) // >10% Änderung
    .sort((a, b) => Math.abs(b.pctDelta) - Math.abs(a.pctDelta))

  const increases = majorChanges.filter(p => p.pctDelta > 0).slice(0, 2)
  const decreases = majorChanges.filter(p => p.pctDelta < 0).slice(0, 2)
  const newPositions = positions.filter(p => p.deltaShares > 0 && p.pctDelta === 0).slice(0, 2)
  
  const insights: Insight[] = []
  
  // Reduzierungen
  if (decreases.length > 0) {
    const names = decreases.map(p => p.ticker || p.name.split(' - ')[0]).join(', ')
    const maxChange = Math.abs(decreases[0].pctDelta * 100).toFixed(0)
    insights.push({
      type: 'reduction',
      text: `Reduzierung in ${names}`,
      change: `-${maxChange}%+`
    })
  }
  
  // Aufstockungen
  if (increases.length > 0) {
    const names = increases.map(p => p.ticker || p.name.split(' - ')[0]).join(', ')
    const maxChange = Math.abs(increases[0].pctDelta * 100).toFixed(0)
    insights.push({
      type: 'increase', 
      text: `Aufstockung in ${names}`,
      change: `+${maxChange}%+`
    })
  }

  // Neue Positionen
  if (newPositions.length > 0) {
    const names = newPositions.map(p => p.ticker || p.name.split(' - ')[0]).join(', ')
    insights.push({
      type: 'new',
      text: `Neue Position${newPositions.length > 1 ? 'en' : ''}: ${names}`,
      change: 'Neu'
    })
  }

  // Portfolio-Konzentration
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
  const topPosition = positions.sort((a, b) => b.value - a.value)[0]
  
  if (topPosition && totalValue > 0) {
    const concentration = ((topPosition.value / totalValue) * 100).toFixed(0)
    insights.push({
      type: 'concentration',
      text: `Größte Position: ${topPosition.ticker || topPosition.name.split(' - ')[0]}`,
      change: `${concentration}%`
    })
  }

  return insights.slice(0, 4) // Max 4 insights
}

function generateAdditionalInsights(positions: Position[]): string[] {
  const additionalInsights: string[] = []
  
  // Portfolio-Diversifikation
  if (positions.length <= 5) {
    additionalInsights.push(`Hochkonzentriertes Portfolio mit ${positions.length} Positionen`)
  } else if (positions.length >= 15) {
    additionalInsights.push(`Diversifiziertes Portfolio mit ${positions.length} Positionen`)
  }
  
  // Gesamtwert
  const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
  const formattedValue = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(totalValue)
  additionalInsights.push(`Gesamtportfolio-Wert: ${formattedValue}`)
  
  // Sektor-Diversifikation (falls verfügbar)
  const uniqueSectors = new Set()
  positions.forEach(p => {
    // Einfache Sektor-Heuristik basierend auf Ticker/Name
    const name = p.name.toLowerCase()
    if (name.includes('bank') || name.includes('financial')) uniqueSectors.add('Finanz')
    else if (name.includes('tech') || name.includes('apple') || name.includes('alphabet')) uniqueSectors.add('Technologie')
    else if (name.includes('energy') || name.includes('oil')) uniqueSectors.add('Energie')
    else if (name.includes('healthcare') || name.includes('pharma')) uniqueSectors.add('Gesundheit')
  })
  
  if (uniqueSectors.size > 0) {
    additionalInsights.push(`Investiert in ${uniqueSectors.size} verschiedene Sektoren`)
  }
  
  return additionalInsights
}

export default function PortfolioAnalysisInline({ 
  investorName, 
  currentPositions
}: AnalysisInlineProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const insights = generateCleanInsights(currentPositions, investorName)
  const additionalInsights = generateAdditionalInsights(currentPositions)

  if (insights.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      {/* Clean Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 rounded-md bg-gray-700 flex items-center justify-center">
          <LightBulbIcon className="w-4 h-4 text-gray-300" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Portfolio Insights</h3>
          <p className="text-sm text-gray-500">Wichtigste Entwicklungen im Überblick</p>
        </div>
      </div>

      {/* Clean Content - Für alle zugänglich */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4">
        
        {/* Main Insights - Clean List */}
        <div className="space-y-3 mb-4">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded transition-colors hover:bg-gray-800/40">
              <div className="flex items-center gap-3">
                {insight.type === 'reduction' ? (
                  <ArrowTrendingDownIcon className="w-4 h-4 text-gray-400" />
                ) : insight.type === 'increase' ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-gray-400" />
                ) : insight.type === 'new' ? (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                )}
                <span className="text-sm text-gray-300">{insight.text}</span>
              </div>
              <span className={`text-sm font-medium ${
                insight.type === 'reduction' ? 'text-red-400' : 
                insight.type === 'increase' ? 'text-green-400' : 
                insight.type === 'new' ? 'text-blue-400' :
                'text-gray-400'
              }`}>
                {insight.change}
              </span>
            </div>
          ))}
        </div>

        {/* Additional Insights - Expandable */}
        {additionalInsights.length > 0 && (
          <div className="border-t border-gray-700/30 pt-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              <span>{isExpanded ? 'Weniger anzeigen' : `+${additionalInsights.length} weitere Insights`}</span>
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-3 space-y-2">
                {additionalInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-center gap-3 py-1 px-3">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                    <span className="text-sm text-gray-400">{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}