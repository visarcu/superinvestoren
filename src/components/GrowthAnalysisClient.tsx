// src/components/GrowthAnalysisClient.tsx - INSIGHTS/FEY STYLE v3.0
'use client'

import React, { useState, useEffect } from 'react'
import { ArrowTrendingUpIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { LearnTooltipButton } from '@/components/LearnSidebar'
import { useLearnMode } from '@/lib/LearnModeContext'
import { useCurrency } from '@/lib/CurrencyContext'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LockClosedIcon } from '@heroicons/react/24/outline'

// Dynamic Chart Import
const GrowthCharts = dynamic(
  () => import('@/components/GrowthCharts'),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div></div> }
)

interface GrowthData {
  // Historische Wachstumsraten
  revenueGrowth1Y?: number | null
  revenueGrowth3Y?: number | null  
  revenueGrowth5Y?: number | null
  revenueGrowth10Y?: number | null
  epsGrowth1Y?: number | null
  epsGrowth3Y?: number | null
  epsGrowth5Y?: number | null
  epsGrowth10Y?: number | null
  ebitdaGrowth1Y?: number | null
  ebitdaGrowth3Y?: number | null
  ebitdaGrowth5Y?: number | null
  ebitdaGrowth10Y?: number | null
  fcfGrowth1Y?: number | null
  fcfGrowth3Y?: number | null
  fcfGrowth5Y?: number | null
  fcfGrowth10Y?: number | null
  
  // Forward Estimates
  revenueGrowthForward2Y?: number | null
  epsGrowthForward2Y?: number | null
  epsGrowthLongTerm?: number | null
  
  // Zusätzliche Metriken (wie bei Seeking Alpha)
  operatingIncomeGrowth1Y?: number | null
  operatingIncomeGrowth3Y?: number | null
  operatingIncomeGrowth5Y?: number | null
  operatingIncomeGrowth10Y?: number | null
  netIncomeGrowth1Y?: number | null
  netIncomeGrowth3Y?: number | null
  netIncomeGrowth5Y?: number | null
  netIncomeGrowth10Y?: number | null
  tangibleBookValueGrowth1Y?: number | null
  tangibleBookValueGrowth3Y?: number | null
  tangibleBookValueGrowth5Y?: number | null
  tangibleBookValueGrowth10Y?: number | null
  capexGrowth1Y?: number | null
  capexGrowth3Y?: number | null
  capexGrowth5Y?: number | null
  capexGrowth10Y?: number | null
  dividendGrowth1Y?: number | null
  dividendGrowth3Y?: number | null
  dividendGrowth5Y?: number | null
  dividendGrowth10Y?: number | null
  roeGrowth1Y?: number | null
  roeGrowth3Y?: number | null
  roeGrowth5Y?: number | null
  roeGrowth10Y?: number | null
  workingCapitalGrowth1Y?: number | null
  workingCapitalGrowth3Y?: number | null
  workingCapitalGrowth5Y?: number | null
  workingCapitalGrowth10Y?: number | null
  totalAssetsGrowth1Y?: number | null
  totalAssetsGrowth3Y?: number | null
  totalAssetsGrowth5Y?: number | null
  totalAssetsGrowth10Y?: number | null
  leveredFcfGrowth1Y?: number | null
  leveredFcfGrowth3Y?: number | null
  leveredFcfGrowth5Y?: number | null
  leveredFcfGrowth10Y?: number | null
}

interface GrowthAnalysisClientProps {
  ticker: string;
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface GrowthResponse {
  ticker: string;
  growth: GrowthData;
  dataQuality: {
    hasIncomeData: boolean;
    hasGrowthData: boolean;
    hasEstimates: boolean;
    periods: number;
  };
  lastUpdated: string;
  growthGrade?: string; // Wie bei Seeking Alpha
}

const GrowthAnalysisClient: React.FC<GrowthAnalysisClientProps> = ({ ticker }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const { isLearnMode } = useLearnMode()
  const { formatPercentage } = useCurrency()

  // User laden
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('[GrowthAnalysisClient] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (!ticker) return;
    loadGrowthData();
  }, [ticker]);

  const loadGrowthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/growth/${ticker}`);
      
      if (!response.ok) {
        throw new Error('Failed to load growth data');
      }
      
      const growthData = await response.json();
      setData(growthData);
      
    } catch (err) {
      console.error('Error loading growth data:', err);
      setError('Fehler beim Laden der Wachstumsdaten');
    } finally {
      setLoading(false);
    }
  };

  // Format growth value with color
  const formatGrowth = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return '–';
    return formatPercentage(value, true);
  };

  // Insights/Fey Style: Farbcodierung für Wachstumswerte
  const getGrowthColor = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return 'text-neutral-500'
    if (value > 0) return 'text-emerald-400'
    if (value < 0) return 'text-red-400'
    return 'text-white'
  }

  // Growth Grade Berechnung
  const calculateGrowthGrade = (growth: GrowthData): { grade: string, color: string, bgColor: string } => {
    const metrics = [
      growth.revenueGrowth3Y,
      growth.epsGrowth3Y,
      growth.ebitdaGrowth3Y,
      growth.fcfGrowth3Y
    ].filter(v => v !== null && v !== undefined)

    if (metrics.length === 0) return { grade: '–', color: 'text-neutral-500', bgColor: 'bg-neutral-800' }

    const avgGrowth = metrics.reduce((sum, val) => sum + (val || 0), 0) / metrics.length

    if (avgGrowth > 25) return { grade: 'A+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    if (avgGrowth > 20) return { grade: 'A', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    if (avgGrowth > 15) return { grade: 'A-', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    if (avgGrowth > 12) return { grade: 'B+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' }
    if (avgGrowth > 10) return { grade: 'B', color: 'text-white', bgColor: 'bg-neutral-800' }
    if (avgGrowth > 8) return { grade: 'B-', color: 'text-white', bgColor: 'bg-neutral-800' }
    if (avgGrowth > 6) return { grade: 'C+', color: 'text-amber-400', bgColor: 'bg-amber-500/20' }
    if (avgGrowth > 4) return { grade: 'C', color: 'text-amber-400', bgColor: 'bg-amber-500/20' }
    if (avgGrowth > 2) return { grade: 'C-', color: 'text-amber-400', bgColor: 'bg-amber-500/20' }
    if (avgGrowth > 0) return { grade: 'D+', color: 'text-red-400', bgColor: 'bg-red-500/20' }
    if (avgGrowth > -2) return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20' }
    return { grade: 'F', color: 'text-red-400', bgColor: 'bg-red-500/20' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Loading State - Minimalistisch
  if (loadingUser || loading) {
    return (
      <div className="w-full px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-5 bg-neutral-800 rounded w-48"></div>
          <div className="flex gap-8">
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-neutral-800 rounded w-32"></div>
              <div className="h-4 bg-neutral-800 rounded w-48"></div>
            </div>
            <div className="w-16 h-10 bg-neutral-800 rounded"></div>
          </div>
          <div className="grid grid-cols-4 gap-8">
            {[1,2,3,4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-24"></div>
                <div className="h-8 bg-neutral-800 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error State - Clean
  if (error) {
    return (
      <div className="w-full px-6 lg:px-8 py-8 text-center">
        <p className="text-neutral-500 mb-4">{error}</p>
        <button
          onClick={loadGrowthData}
          className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  // No Data State
  if (!data?.growth) {
    return (
      <div className="w-full px-6 lg:px-8 py-8 text-center">
        <p className="text-neutral-500">Keine Wachstumsdaten verfügbar für {ticker}</p>
      </div>
    )
  }

  const { growth } = data
  const growthGrade = calculateGrowthGrade(growth)

  return (
    <div className="w-full px-6 lg:px-8 py-8">

      {/* ===== HEADER - INLINE MIT GROWTH GRADE ===== */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-xl font-medium text-white mb-1">Wachstumsanalyse</h1>
          <p className="text-sm text-neutral-500">
            Historische und prognostizierte Wachstumsraten für {ticker}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${growthGrade.color}`}>{growthGrade.grade}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${growthGrade.bgColor} ${growthGrade.color}`}>
                Growth Grade
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Basierend auf {data.dataQuality.periods} Jahren</p>
          </div>
          <button
            onClick={loadGrowthData}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Learn Mode Info - Subtiler */}
      {isLearnMode && (
        <div className="mb-8 pb-6 border-b border-neutral-800">
          <p className="text-xs text-neutral-500 leading-relaxed">
            <span className="text-neutral-400 font-medium">Wachstumsanalyse:</span> CAGR (Compound Annual Growth Rate)
            glättet jährliche Schwankungen und zeigt das durchschnittliche Wachstum über mehrere Jahre.
          </p>
        </div>
      )}

      {/* ===== METRIC STATS - FLAT GRID OHNE BOXES ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-neutral-800">

        {/* Umsatzwachstum */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ChartBarIcon className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-400">Umsatzwachstum</span>
          </div>
          <p className={`text-2xl font-bold ${getGrowthColor(growth.revenueGrowth3Y)}`}>
            {formatGrowth(growth.revenueGrowth3Y)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">3Y CAGR</p>
        </div>

        {/* Gewinnwachstum */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-400">Gewinnwachstum</span>
          </div>
          <p className={`text-2xl font-bold ${getGrowthColor(growth.epsGrowth3Y)}`}>
            {formatGrowth(growth.epsGrowth3Y)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">EPS 3Y CAGR</p>
        </div>

        {/* Forward EPS */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-400">Prognose</span>
          </div>
          <p className={`text-2xl font-bold ${getGrowthColor(growth.epsGrowthForward2Y)}`}>
            {formatGrowth(growth.epsGrowthForward2Y)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">Forward EPS</p>
        </div>

        {/* FCF Wachstum */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-neutral-400">FCF Wachstum</span>
          </div>
          <p className={`text-2xl font-bold ${getGrowthColor(growth.fcfGrowth3Y)}`}>
            {formatGrowth(growth.fcfGrowth3Y)}
          </p>
          <p className="text-xs text-neutral-500 mt-1">3Y CAGR</p>
        </div>
      </div>

      {/* ===== WACHSTUMSMETRIKEN IM DETAIL - CLEAN TABLE ===== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
            Wachstumsmetriken im Detail
          </h3>
          <button
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            {showAllMetrics ? 'Weniger anzeigen' : 'Alle Metriken →'}
          </button>
        </div>

        {/* Tabelle ohne Box-Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left py-3 text-sm font-medium text-neutral-400">Metrik</th>
                <th className="text-right py-3 text-sm font-medium text-neutral-400">1Y (YoY)</th>
                <th className="text-right py-3 text-sm font-medium text-neutral-400">3Y CAGR</th>
                <th className="text-right py-3 text-sm font-medium text-neutral-400">5Y CAGR</th>
                <th className="text-right py-3 text-sm font-medium text-neutral-400">10Y CAGR</th>
              </tr>
            </thead>
            <tbody>
              {/* Hauptmetriken */}
              <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                <td className="py-3 text-sm text-white flex items-center gap-2">
                  Umsatzwachstum
                  <LearnTooltipButton term="revenue_growth" />
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.revenueGrowth1Y)}`}>
                  {formatGrowth(growth.revenueGrowth1Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.revenueGrowth3Y)}`}>
                  {formatGrowth(growth.revenueGrowth3Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.revenueGrowth5Y)}`}>
                  {formatGrowth(growth.revenueGrowth5Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.revenueGrowth10Y)}`}>
                  {formatGrowth(growth.revenueGrowth10Y)}
                </td>
              </tr>

              <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                <td className="py-3 text-sm text-white flex items-center gap-2">
                  EPS Wachstum
                  <LearnTooltipButton term="eps_growth" />
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.epsGrowth1Y)}`}>
                  {formatGrowth(growth.epsGrowth1Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.epsGrowth3Y)}`}>
                  {formatGrowth(growth.epsGrowth3Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.epsGrowth5Y)}`}>
                  {formatGrowth(growth.epsGrowth5Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.epsGrowth10Y)}`}>
                  {formatGrowth(growth.epsGrowth10Y)}
                </td>
              </tr>

              <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                <td className="py-3 text-sm text-white flex items-center gap-2">
                  EBITDA Wachstum
                  <LearnTooltipButton term="ebitda" />
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.ebitdaGrowth1Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth1Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.ebitdaGrowth3Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth3Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.ebitdaGrowth5Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth5Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.ebitdaGrowth10Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth10Y)}
                </td>
              </tr>

              <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                <td className="py-3 text-sm text-white flex items-center gap-2">
                  FCF Wachstum
                  <LearnTooltipButton term="free_cash_flow" />
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.fcfGrowth1Y)}`}>
                  {formatGrowth(growth.fcfGrowth1Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.fcfGrowth3Y)}`}>
                  {formatGrowth(growth.fcfGrowth3Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.fcfGrowth5Y)}`}>
                  {formatGrowth(growth.fcfGrowth5Y)}
                </td>
                <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.fcfGrowth10Y)}`}>
                  {formatGrowth(growth.fcfGrowth10Y)}
                </td>
              </tr>

              {/* Erweiterte Metriken (ausklappbar) */}
              {showAllMetrics && (
                <>
                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Operating Income</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.operatingIncomeGrowth1Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.operatingIncomeGrowth3Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.operatingIncomeGrowth5Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.operatingIncomeGrowth10Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Nettogewinn</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.netIncomeGrowth1Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.netIncomeGrowth3Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.netIncomeGrowth5Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.netIncomeGrowth10Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">CAPEX</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.capexGrowth1Y)}`}>
                      {formatGrowth(growth.capexGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.capexGrowth3Y)}`}>
                      {formatGrowth(growth.capexGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.capexGrowth5Y)}`}>
                      {formatGrowth(growth.capexGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.capexGrowth10Y)}`}>
                      {formatGrowth(growth.capexGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Dividende/Aktie</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.dividendGrowth1Y)}`}>
                      {formatGrowth(growth.dividendGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.dividendGrowth3Y)}`}>
                      {formatGrowth(growth.dividendGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.dividendGrowth5Y)}`}>
                      {formatGrowth(growth.dividendGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.dividendGrowth10Y)}`}>
                      {formatGrowth(growth.dividendGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">ROE Wachstum</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.roeGrowth1Y)}`}>
                      {formatGrowth(growth.roeGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.roeGrowth3Y)}`}>
                      {formatGrowth(growth.roeGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.roeGrowth5Y)}`}>
                      {formatGrowth(growth.roeGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.roeGrowth10Y)}`}>
                      {formatGrowth(growth.roeGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Working Capital</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.workingCapitalGrowth1Y)}`}>
                      {formatGrowth(growth.workingCapitalGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.workingCapitalGrowth3Y)}`}>
                      {formatGrowth(growth.workingCapitalGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.workingCapitalGrowth5Y)}`}>
                      {formatGrowth(growth.workingCapitalGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.workingCapitalGrowth10Y)}`}>
                      {formatGrowth(growth.workingCapitalGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Total Assets</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.totalAssetsGrowth1Y)}`}>
                      {formatGrowth(growth.totalAssetsGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.totalAssetsGrowth3Y)}`}>
                      {formatGrowth(growth.totalAssetsGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.totalAssetsGrowth5Y)}`}>
                      {formatGrowth(growth.totalAssetsGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.totalAssetsGrowth10Y)}`}>
                      {formatGrowth(growth.totalAssetsGrowth10Y)}
                    </td>
                  </tr>

                  <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 text-sm text-white">Levered FCF</td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.leveredFcfGrowth1Y)}`}>
                      {formatGrowth(growth.leveredFcfGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.leveredFcfGrowth3Y)}`}>
                      {formatGrowth(growth.leveredFcfGrowth3Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.leveredFcfGrowth5Y)}`}>
                      {formatGrowth(growth.leveredFcfGrowth5Y)}
                    </td>
                    <td className={`text-right py-3 text-sm font-mono ${getGrowthColor(growth.leveredFcfGrowth10Y)}`}>
                      {formatGrowth(growth.leveredFcfGrowth10Y)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== WACHSTUMS-CHARTS - CLEAN ===== */}
      {user?.isPremium ? (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Wachstums-Charts
          </h3>
          <GrowthCharts ticker={ticker} />
        </div>
      ) : (
        <div className="mb-8 pb-8 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4 pb-3 border-b border-neutral-800">
            Wachstums-Charts
          </h3>
          <div className="text-center py-12">
            <LockClosedIcon className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Premium Charts</p>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
              Visualisiere Wachstumstrends über Zeit mit interaktiven Charts und CAGR-Vergleichen.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <LockClosedIcon className="w-4 h-4" />
              Premium freischalten
            </Link>
          </div>
        </div>
      )}

      {/* ===== FOOTER - MINIMAL ===== */}
      <p className="text-xs text-neutral-600 text-center pt-4 border-t border-neutral-800">
        Wachstumsdaten von FMP API • Letztes Update: {formatDate(data.lastUpdated)}
      </p>
    </div>
  )
}

export default GrowthAnalysisClient;