// src/components/PortfolioInsights.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ShieldCheckIcon,
  FireIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface Holding {
  id: string
  symbol: string
  name: string
  quantity: number
  purchase_price: number
  current_price: number
  value: number
  gain_loss: number
  gain_loss_percent: number
}

interface PortfolioInsightsProps {
  holdings: Holding[]
  totalValue: number
  totalGainLoss: number
  totalGainLossPercent: number
  cashPosition: number
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'danger'
  title: string
  description: string
  action?: string
  icon: React.ReactNode
}

interface SectorAllocation {
  sector: string
  value: number
  percentage: number
  holdings: string[]
}

export default function PortfolioInsights({ 
  holdings, 
  totalValue, 
  totalGainLoss, 
  totalGainLossPercent,
  cashPosition 
}: PortfolioInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [sectorAllocations, setSectorAllocations] = useState<SectorAllocation[]>([])
  const [riskScore, setRiskScore] = useState(0)
  const [diversificationScore, setDiversificationScore] = useState(0)

  useEffect(() => {
    generateInsights()
    calculateMetrics()
  }, [holdings, totalValue, cashPosition])

  const calculateMetrics = () => {
    // Berechne Sektor-Allokation (vereinfacht - normalerweise würde man echte Sektordaten von API holen)
    const sectors = estimateSectors()
    setSectorAllocations(sectors)

    // Berechne Risk Score (0-100)
    const volatilityScore = calculateVolatilityScore()
    const concentrationRisk = calculateConcentrationRisk()
    setRiskScore(Math.round((volatilityScore + concentrationRisk) / 2))

    // Berechne Diversification Score (0-100)
    const diversification = calculateDiversificationScore()
    setDiversificationScore(diversification)
  }

  const estimateSectors = (): SectorAllocation[] => {
    // Vereinfachte Sektor-Zuordnung basierend auf bekannten Symbolen
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technologie', 'MSFT': 'Technologie', 'GOOGL': 'Technologie', 'AMZN': 'Technologie', 'META': 'Technologie',
      'NVDA': 'Technologie', 'TSM': 'Technologie', 'INTC': 'Technologie', 'AMD': 'Technologie', 'CRM': 'Technologie',
      'JPM': 'Finanzen', 'BAC': 'Finanzen', 'WFC': 'Finanzen', 'GS': 'Finanzen', 'MS': 'Finanzen',
      'JNJ': 'Gesundheit', 'PFE': 'Gesundheit', 'UNH': 'Gesundheit', 'CVS': 'Gesundheit', 'MRNA': 'Gesundheit',
      'XOM': 'Energie', 'CVX': 'Energie', 'COP': 'Energie', 'SLB': 'Energie',
      'TSLA': 'Automobile', 'F': 'Automobile', 'GM': 'Automobile', 'TM': 'Automobile',
      'WMT': 'Konsumgüter', 'PG': 'Konsumgüter', 'KO': 'Konsumgüter', 'PEP': 'Konsumgüter',
      'DIS': 'Medien', 'NFLX': 'Medien', 'CMCSA': 'Medien',
      'BA': 'Industrie', 'CAT': 'Industrie', 'GE': 'Industrie', 'MMM': 'Industrie'
    }

    const sectorValues = new Map<string, { value: number, holdings: string[] }>()

    holdings.forEach(holding => {
      const sector = sectorMap[holding.symbol] || 'Andere'
      const current = sectorValues.get(sector) || { value: 0, holdings: [] }
      current.value += holding.value
      current.holdings.push(holding.symbol)
      sectorValues.set(sector, current)
    })

    // Cash als eigene "Sektor"
    if (cashPosition > 0) {
      sectorValues.set('Cash', { value: cashPosition, holdings: ['Cash'] })
    }

    return Array.from(sectorValues.entries()).map(([sector, data]) => ({
      sector,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
      holdings: data.holdings
    })).sort((a, b) => b.value - a.value)
  }

  const calculateVolatilityScore = (): number => {
    // Vereinfachte Volatilitäts-Berechnung
    const avgGainLoss = Math.abs(totalGainLossPercent)
    if (avgGainLoss < 5) return 20
    if (avgGainLoss < 10) return 40
    if (avgGainLoss < 20) return 60
    if (avgGainLoss < 30) return 80
    return 95
  }

  const calculateConcentrationRisk = (): number => {
    if (holdings.length === 0) return 100
    
    const largestPosition = Math.max(...holdings.map(h => h.value))
    const concentration = (largestPosition / totalValue) * 100
    
    if (concentration > 50) return 90
    if (concentration > 30) return 70
    if (concentration > 20) return 50
    if (concentration > 15) return 30
    return 20
  }

  const calculateDiversificationScore = (): number => {
    const numHoldings = holdings.length
    const cashPercentage = (cashPosition / totalValue) * 100
    
    let score = 0
    
    // Anzahl Holdings
    if (numHoldings >= 20) score += 40
    else if (numHoldings >= 10) score += 30
    else if (numHoldings >= 5) score += 20
    else score += 10
    
    // Cash Position
    if (cashPercentage >= 5 && cashPercentage <= 20) score += 20
    else if (cashPercentage < 5) score += 10
    
    // Sektor-Diversifikation
    const numSectors = sectorAllocations.filter(s => s.sector !== 'Cash').length
    if (numSectors >= 5) score += 40
    else if (numSectors >= 3) score += 25
    else score += 10
    
    return Math.min(score, 100)
  }

  const generateInsights = () => {
    const newInsights: Insight[] = []

    // Performance Insights
    if (totalGainLossPercent > 20) {
      newInsights.push({
        type: 'success',
        title: 'Starke Performance',
        description: `Ihr Portfolio hat ${totalGainLossPercent.toFixed(1)}% zugelegt. Erwägen Sie Gewinnmitnahmen bei Spitzenpositionen.`,
        action: 'Rebalancing prüfen',
        icon: <ArrowTrendingUpIcon className="w-5 h-5" />
      })
    } else if (totalGainLossPercent < -10) {
      newInsights.push({
        type: 'warning',
        title: 'Portfolio im Minus',
        description: `Ihr Portfolio zeigt ${Math.abs(totalGainLossPercent).toFixed(1)}% Verlust. Dies könnte eine Kaufgelegenheit sein.`,
        action: 'Positionen überprüfen',
        icon: <ArrowTrendingDownIcon className="w-5 h-5" />
      })
    }

    // Concentration Risk
    const largestHolding = holdings.reduce((max, h) => h.value > max.value ? h : max, holdings[0])
    if (largestHolding && (largestHolding.value / totalValue) > 0.25) {
      newInsights.push({
        type: 'warning',
        title: 'Hohe Konzentration',
        description: `${largestHolding.symbol} macht ${((largestHolding.value / totalValue) * 100).toFixed(1)}% Ihres Portfolios aus.`,
        action: 'Diversifikation erhöhen',
        icon: <ExclamationTriangleIcon className="w-5 h-5" />
      })
    }

    // Cash Position
    const cashPercentage = (cashPosition / totalValue) * 100
    if (cashPercentage > 30) {
      newInsights.push({
        type: 'info',
        title: 'Hohe Cash-Reserve',
        description: `${cashPercentage.toFixed(1)}% Ihres Portfolios ist in Cash. Suchen Sie nach Investmentchancen.`,
        icon: <LightBulbIcon className="w-5 h-5" />
      })
    } else if (cashPercentage < 5) {
      newInsights.push({
        type: 'info',
        title: 'Niedrige Cash-Reserve',
        description: 'Erwägen Sie eine Cash-Reserve für Opportunitäten aufzubauen.',
        icon: <InformationCircleIcon className="w-5 h-5" />
      })
    }

    // Winners and Losers
    const bigWinner = holdings.find(h => h.gain_loss_percent > 50)
    if (bigWinner) {
      newInsights.push({
        type: 'success',
        title: 'Top Performer',
        description: `${bigWinner.symbol} hat ${bigWinner.gain_loss_percent.toFixed(1)}% zugelegt. Überlegen Sie Teilgewinne zu realisieren.`,
        icon: <FireIcon className="w-5 h-5" />
      })
    }

    const bigLoser = holdings.find(h => h.gain_loss_percent < -30)
    if (bigLoser) {
      newInsights.push({
        type: 'danger',
        title: 'Underperformer',
        description: `${bigLoser.symbol} ist ${Math.abs(bigLoser.gain_loss_percent).toFixed(1)}% im Minus. Position überprüfen.`,
        icon: <ExclamationTriangleIcon className="w-5 h-5" />
      })
    }

    // Diversification
    if (holdings.length < 5) {
      newInsights.push({
        type: 'warning',
        title: 'Geringe Diversifikation',
        description: `Mit nur ${holdings.length} Positionen ist Ihr Portfolio konzentriert. Mehr Diversifikation reduziert Risiko.`,
        icon: <ScaleIcon className="w-5 h-5" />
      })
    } else if (holdings.length > 15) {
      newInsights.push({
        type: 'info',
        title: 'Breite Diversifikation',
        description: 'Ihr Portfolio ist gut diversifiziert. Behalten Sie den Überblick über alle Positionen.',
        icon: <CheckCircleIcon className="w-5 h-5" />
      })
    }

    setInsights(newInsights)
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400'
    if (score < 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRiskLabel = (score: number) => {
    if (score < 30) return 'Niedrig'
    if (score < 60) return 'Mittel'
    return 'Hoch'
  }

  return (
    <div className="space-y-6">
      {/* Risk and Diversification Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Risiko-Score</h3>
            <ShieldCheckIcon className={`w-6 h-6 ${getRiskColor(riskScore)}`} />
          </div>
          <div className="relative h-2 bg-theme-secondary rounded-full overflow-hidden mb-2">
            <div 
              className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                riskScore < 30 ? 'bg-green-400' : riskScore < 60 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
              {riskScore}
            </span>
            <span className="text-sm text-theme-secondary">
              {getRiskLabel(riskScore)}
            </span>
          </div>
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Diversifikation</h3>
            <ScaleIcon className="w-6 h-6 text-blue-400" />
          </div>
          <div className="relative h-2 bg-theme-secondary rounded-full overflow-hidden mb-2">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-400 transition-all duration-500"
              style={{ width: `${diversificationScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-400">
              {diversificationScore}
            </span>
            <span className="text-sm text-theme-secondary">
              {diversificationScore > 70 ? 'Sehr gut' : diversificationScore > 40 ? 'Gut' : 'Verbesserbar'}
            </span>
          </div>
        </div>

        <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-theme-primary">Positionen</h3>
            <ChartBarIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-theme-secondary">Aktien</span>
              <span className="font-semibold text-theme-primary">{holdings.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-theme-secondary">Sektoren</span>
              <span className="font-semibold text-theme-primary">
                {sectorAllocations.filter(s => s.sector !== 'Cash').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-theme-secondary">Cash %</span>
              <span className="font-semibold text-theme-primary">
                {((cashPosition / totalValue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-theme-card rounded-xl border border-theme/10">
        <div className="p-4 border-b border-theme/10">
          <h3 className="text-lg font-semibold text-theme-primary flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-400" />
            Wichtige Erkenntnisse
          </h3>
        </div>
        
        <div className="p-4 space-y-3">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                insight.type === 'danger' ? 'bg-red-500/10 border-red-500/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${
                  insight.type === 'success' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-400' :
                  insight.type === 'danger' ? 'text-red-400' :
                  'text-blue-400'
                }`}>
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-theme-primary mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-theme-secondary">
                    {insight.description}
                  </p>
                  {insight.action && (
                    <button className="mt-2 text-xs text-green-400 hover:text-green-300 transition-colors">
                      → {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {insights.length === 0 && (
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-theme-secondary">Ihr Portfolio sieht gut aus!</p>
              <p className="text-theme-muted text-sm mt-1">
                Keine kritischen Punkte gefunden.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sector Allocation */}
      <div className="bg-theme-card rounded-xl border border-theme/10">
        <div className="p-4 border-b border-theme/10">
          <h3 className="text-lg font-semibold text-theme-primary">Sektor-Allokation</h3>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            {sectorAllocations.map((sector) => (
              <div key={sector.sector}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-theme-primary">
                    {sector.sector}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-theme-muted">
                      {sector.holdings.join(', ')}
                    </span>
                    <span className="text-sm font-semibold text-theme-primary">
                      {sector.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2 bg-theme-secondary rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                    style={{ width: `${sector.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-theme-secondary/30 rounded-lg">
            <h4 className="text-sm font-semibold text-theme-primary mb-2">Empfehlungen</h4>
            <ul className="space-y-1 text-xs text-theme-secondary">
              {sectorAllocations.length < 3 && (
                <li>• Erhöhen Sie die Sektor-Diversifikation für besseres Risikomanagement</li>
              )}
              {sectorAllocations.some(s => s.percentage > 40 && s.sector !== 'Cash') && (
                <li>• Reduzieren Sie die Konzentration in dominanten Sektoren</li>
              )}
              {cashPosition / totalValue < 0.05 && (
                <li>• Bauen Sie eine Cash-Reserve für Opportunitäten auf</li>
              )}
              {holdings.length < 10 && (
                <li>• Fügen Sie mehr Positionen für bessere Diversifikation hinzu</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}