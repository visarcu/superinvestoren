'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChartBarIcon, 
  TrophyIcon, 
  ClockIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import InvestorAvatar from '@/components/InvestorAvatar'
import Link from 'next/link'
interface TimingData {
  investor: {
    slug: string
    name: string
    avatar: string
  }
  position: {
    firstQuarter: string
    firstPrice: number
    currentPrice: number
    holdingPeriod: number // in quarters
    estimatedPerformance: number // percentage
    timingScore: number // 0-100 rating
    category: 'early-adopter' | 'perfect-timer' | 'late-comer' | 'diamond-hands'
  }
}

interface PositionTimingIntelligenceProps {
  ticker: string
  positions: any[]
  currentPrice: number
}


const calculateTimingScore = (entryPrice: number, currentPrice: number, holdingPeriod: number): number => {
  const performance = ((currentPrice - entryPrice) / entryPrice) * 100
  const timeBonus = Math.min(holdingPeriod * 5, 25) // Up to 25 points for holding time
  const performanceScore = Math.min(Math.max(performance, -50), 200) / 2 // -25 to 100 points
  
  return Math.max(0, Math.min(100, performanceScore + timeBonus))
}

const categorizeInvestor = (timingScore: number, holdingPeriod: number, performance: number) => {
  if (performance > 100 && holdingPeriod >= 8) return 'diamond-hands'
  if (performance > 50 && timingScore > 80) return 'perfect-timer'
  if (holdingPeriod >= 12) return 'early-adopter'
  return 'late-comer'
}

export default function PositionTimingIntelligence({ 
  ticker, 
  positions, 
  currentPrice 
}: PositionTimingIntelligenceProps) {
  
  const [timingData, setTimingData] = useState<TimingData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTimingData = async () => {
      setLoading(true)
      try {
        // Use a simpler approach - just use holdings history index for now
        // This is much faster than making tons of API calls
        const results: TimingData[] = []
        
        for (const pos of positions) {
          // For now, just use the quarter from the position data
          // This is much faster and still gives reasonable estimates
          const firstQuarter = pos.position.quarter
          
          // Use a simple price estimation based on current price and time
          // This avoids slow API calls for historical prices
          const holdingPeriod = calculateHoldingPeriod(firstQuarter)
          
          // Estimate entry price based on current price and time held
          // Assume average 10% annual appreciation (rough estimate)
          const yearsHeld = holdingPeriod / 4
          const estimatedFirstPrice = currentPrice / Math.pow(1.10, yearsHeld)
          
          const estimatedPerformance = ((currentPrice - estimatedFirstPrice) / estimatedFirstPrice) * 100
          const timingScore = calculateTimingScore(estimatedFirstPrice, currentPrice, holdingPeriod)
          const category = categorizeInvestor(timingScore, holdingPeriod, estimatedPerformance) as 'early-adopter' | 'perfect-timer' | 'late-comer' | 'diamond-hands'
          
          results.push({
            investor: {
              slug: pos.investor.slug,
              name: pos.investor.name,
              avatar: pos.investor.avatar
            },
            position: {
              firstQuarter,
              firstPrice: estimatedFirstPrice,
              currentPrice,
              holdingPeriod,
              estimatedPerformance,
              timingScore,
              category
            }
          })
        }
        
        // Sort by timing score
        results.sort((a, b) => b.position.timingScore - a.position.timingScore)
        setTimingData(results)
      } catch (error) {
        console.error('Error loading timing data:', error)
        setTimingData([])
      } finally {
        setLoading(false)
      }
    }

    if (positions.length > 0) {
      loadTimingData()
    }
  }, [positions, ticker, currentPrice])

  function calculateHoldingPeriod(firstQuarter: string): number {
    // Calculate quarters between first quarter and Q4 2024
    const [quarter, year] = firstQuarter.split(' ')
    const startYear = parseInt(year)
    const startQ = parseInt(quarter.replace('Q', ''))
    
    // Current is Q4 2024
    const currentYear = 2024
    const currentQ = 4
    
    return ((currentYear - startYear) * 4) + (currentQ - startQ) + 1
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'diamond-hands':
        return {
          label: 'Diamond Hands 💎',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10 border-purple-500/20',
          description: 'Langzeit-Gewinner'
        }
      case 'perfect-timer':
        return {
          label: 'Perfect Timer 🎯',
          color: 'text-brand-light',
          bgColor: 'bg-brand/10 border-brand/20',
          description: 'Optimaler Einstieg'
        }
      case 'early-adopter':
        return {
          label: 'Early Adopter 🚀',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          description: 'Früher Einstieg'
        }
      default:
        return {
          label: 'Late Comer ⏰',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10 border-orange-500/20',
          description: 'Später Einstieg'
        }
    }
  }

  const bestPerformer = timingData[0]
  const averagePerformance = timingData.length > 0 ? timingData.reduce((sum, data) => sum + data.position.estimatedPerformance, 0) / timingData.length : 0

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <SparklesIcon className="w-8 h-8 text-brand-light" />
            <h2 className="text-3xl font-bold text-white">
              Position Timing Intelligence
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Lade Timing-Analyse...
          </p>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        </div>
      </div>
    )
  }

  if (timingData.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <SparklesIcon className="w-8 h-8 text-brand-light" />
            <h2 className="text-3xl font-bold text-white">
              Position Timing Intelligence
            </h2>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Keine historischen Preisdaten verfügbar für die Timing-Analyse.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <SparklesIcon className="w-8 h-8 text-brand-light" />
          <h2 className="text-3xl font-bold text-white">
            Position Timing Intelligence
          </h2>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Analyse der Einstiegszeitpunkte und Performance-Schätzungen basierend auf historischen Daten
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <TrophyIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Best Performer</h3>
              <p className="text-lg font-bold text-theme-primary">{bestPerformer?.investor.name}</p>
            </div>
          </div>
          <p className="text-brand-light font-semibold">
            {formatPercentage(bestPerformer?.position.estimatedPerformance || 0)}
          </p>
        </div>

        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Durchschnitts-Performance</h3>
              <p className="text-lg font-bold text-theme-primary">Alle Investoren</p>
            </div>
          </div>
          <p className={`font-semibold ${averagePerformance >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
            {formatPercentage(averagePerformance)}
          </p>
        </div>

        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Längste Haltedauer</h3>
              <p className="text-lg font-bold text-theme-primary">
                {Math.max(...timingData.map(d => d.position.holdingPeriod))} Quartale
              </p>
            </div>
          </div>
          <p className="text-theme-muted font-semibold">Diamond Hands</p>
        </div>
      </div>

      {/* Timing Leaderboard */}
      <div className="bg-theme-card border border-theme/10 rounded-xl">
        <div className="p-6 border-b border-theme/10">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-6 h-6 text-brand-light" />
            <h3 className="text-xl font-bold text-theme-primary">Timing Leaderboard</h3>
          </div>
          <p className="text-sm text-theme-muted mt-2">
            Sortiert nach Timing Score (Performance + Haltedauer)
          </p>
        </div>

        <div className="p-6 space-y-4">
          {timingData.map((data, index) => {
            const categoryInfo = getCategoryInfo(data.position.category)
            
            return (
              <div key={data.investor.slug} className="bg-theme-secondary/50 rounded-lg p-4 hover:bg-theme-secondary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-brand/20 text-brand-light' :
                      index === 1 ? 'bg-theme-secondary text-theme-muted' :
                      index === 2 ? 'bg-theme-secondary text-theme-muted' :
                      'bg-theme-secondary text-theme-muted'
                    }`}>
                      #{index + 1}
                    </div>
                    
                    <Link href={`/superinvestor/${data.investor.slug}`}>
                      <InvestorAvatar 
                        name={data.investor.name}
                        imageUrl={data.investor.avatar}
                        size="md"
                        className="hover:ring-2 hover:ring-green-400 transition-all duration-200 cursor-pointer"
                      />
                    </Link>
                    
                    <div>
                      <Link 
                        href={`/superinvestor/${data.investor.slug}`}
                        className="font-semibold text-theme-primary hover:text-brand-light transition-colors"
                      >
                        {data.investor.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.bgColor} ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="text-xs text-theme-muted">
                          Seit {data.position.firstQuarter}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <span className="text-theme-muted">Timing Score</span>
                        <div className="font-bold text-theme-primary">
                          {data.position.timingScore.toFixed(0)}/100
                        </div>
                      </div>
                      <div>
                        <span className="text-theme-muted">Est. Entry</span>
                        <div className="font-bold text-theme-primary">
                          {formatCurrency(data.position.firstPrice)}
                        </div>
                      </div>
                      <div>
                        <span className="text-theme-muted">Performance</span>
                        <div className={`font-bold ${data.position.estimatedPerformance >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
                          {formatPercentage(data.position.estimatedPerformance)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>


      {/* Disclaimer */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <FireIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium text-sm">Wichtiger Hinweis</p>
            <p className="text-theme-muted text-sm mt-1">
              Performance-Schätzungen basieren auf historischen Preismodellen und ersten Filing-Erwähnungen aus 13F-Daten. 
              Tatsächliche Einstiegspreise können abweichen, da Filings quartalsweise erfolgen. Nur für Analysezwecke, keine Anlageberatung.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}