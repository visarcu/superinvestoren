// src/components/GrowthAnalysisClient.tsx - Erweitert mit zusätzlichen Metriken
'use client'

import React, { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LearnTooltipButton } from '@/components/LearnSidebar';
import { useLearnMode } from '@/lib/LearnModeContext';
import { useCurrency } from '@/lib/CurrencyContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LockClosedIcon } from '@heroicons/react/24/outline'

// Dynamic Chart Import
const GrowthCharts = dynamic(
  () => import('@/components/GrowthCharts'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

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
  fcfGrowth1Y?: number | null
  fcfGrowth3Y?: number | null
  
  // Forward Estimates
  revenueGrowthForward2Y?: number | null
  epsGrowthForward2Y?: number | null
  epsGrowthLongTerm?: number | null
  
  // Zusätzliche Metriken (wie bei Seeking Alpha)
  operatingIncomeGrowth1Y?: number | null
  operatingIncomeGrowth3Y?: number | null
  netIncomeGrowth1Y?: number | null
  netIncomeGrowth3Y?: number | null
  tangibleBookValueGrowth1Y?: number | null
  tangibleBookValueGrowth3Y?: number | null
  capexGrowth1Y?: number | null
  capexGrowth3Y?: number | null
  dividendGrowth1Y?: number | null
  dividendGrowth3Y?: number | null
  roeGrowth1Y?: number | null
  roeGrowth3Y?: number | null
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

  // Get color class for growth value
  const getGrowthColor = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return 'text-theme-muted';
    if (value > 15) return 'text-green-400 font-semibold';
    if (value > 5) return 'text-green-300';
    if (value > 0) return 'text-theme-primary';
    if (value > -5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Get growth rating
  const getGrowthRating = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return { rating: 'Unbekannt', color: 'text-theme-muted' };
    if (value > 20) return { rating: 'Exzellent', color: 'text-green-500' };
    if (value > 15) return { rating: 'Sehr gut', color: 'text-green-400' };
    if (value > 10) return { rating: 'Gut', color: 'text-green-300' };
    if (value > 5) return { rating: 'Moderat', color: 'text-yellow-400' };
    if (value > 0) return { rating: 'Schwach', color: 'text-orange-400' };
    return { rating: 'Negativ', color: 'text-red-400' };
  };

  // Calculate overall growth grade (like Seeking Alpha)
  const calculateGrowthGrade = (growth: GrowthData): { grade: string, color: string } => {
    const metrics = [
      growth.revenueGrowth3Y,
      growth.epsGrowth3Y,
      growth.ebitdaGrowth3Y,
      growth.fcfGrowth3Y
    ].filter(v => v !== null && v !== undefined);

    if (metrics.length === 0) return { grade: '–', color: 'text-theme-muted' };

    const avgGrowth = metrics.reduce((sum, val) => sum + (val || 0), 0) / metrics.length;

    if (avgGrowth > 25) return { grade: 'A+', color: 'text-green-500' };
    if (avgGrowth > 20) return { grade: 'A', color: 'text-green-500' };
    if (avgGrowth > 15) return { grade: 'A-', color: 'text-green-400' };
    if (avgGrowth > 12) return { grade: 'B+', color: 'text-green-400' };
    if (avgGrowth > 10) return { grade: 'B', color: 'text-green-300' };
    if (avgGrowth > 8) return { grade: 'B-', color: 'text-green-300' };
    if (avgGrowth > 6) return { grade: 'C+', color: 'text-yellow-400' };
    if (avgGrowth > 4) return { grade: 'C', color: 'text-yellow-400' };
    if (avgGrowth > 2) return { grade: 'C-', color: 'text-orange-400' };
    if (avgGrowth > 0) return { grade: 'D+', color: 'text-orange-400' };
    if (avgGrowth > -2) return { grade: 'D', color: 'text-red-400' };
    return { grade: 'F', color: 'text-red-500' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  // Loading State
  if (loadingUser || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-theme-primary mb-2">Fehler beim Laden</h3>
        <p className="text-theme-secondary mb-6">{error}</p>
        <button 
          onClick={loadGrowthData}
          className="btn-primary"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (!data?.growth) {
    return (
      <div className="text-center py-12">
        <p className="text-theme-secondary">Keine Wachstumsdaten verfügbar für {ticker}</p>
      </div>
    )
  }

  const { growth } = data;
  const growthGrade = calculateGrowthGrade(growth);

  return (
    <div className="space-y-8">
      {/* Header mit Growth Grade */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-theme-primary">Wachstumsanalyse</h2>
            <p className="text-theme-secondary mt-1">
              Historische und prognostizierte Wachstumsraten für {ticker}
            </p>
          </div>
          {/* Growth Grade Badge (wie bei Seeking Alpha) */}
          <div className="flex flex-col items-center">
            <div className={`text-3xl font-bold ${growthGrade.color} bg-theme-card rounded-lg px-4 py-2 border border-theme/20`}>
              {growthGrade.grade}
            </div>
            <span className="text-xs text-theme-muted mt-1">Growth Grade</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-theme-muted">
            Basierend auf {data.dataQuality.periods} Jahren Finanzdaten
          </div>
          <button 
            onClick={loadGrowthData}
            className="btn-secondary"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Learn Mode Info */}
      {isLearnMode && (
        <div className="bg-green-500/10 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-1">Wachstumsanalyse verstehen</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Wachstumsraten zeigen, wie schnell ein Unternehmen expandiert. CAGR (Compound Annual Growth Rate) 
                glättet jährliche Schwankungen und zeigt das durchschnittliche Wachstum über mehrere Jahre.
                Ein Growth Grade bewertet die Gesamtwachstumsqualität im Vergleich zum Sektor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Growth Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Revenue Growth Summary */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">Umsatzwachstum</h3>
              <p className="text-xs text-theme-muted">3Y CAGR</p>
            </div>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: getGrowthColor(growth.revenueGrowth3Y).split(' ')[0].replace('text-', '') }}>
            {formatGrowth(growth.revenueGrowth3Y)}
          </div>
          <div className={`text-xs font-medium ${getGrowthRating(growth.revenueGrowth3Y).color}`}>
            {getGrowthRating(growth.revenueGrowth3Y).rating}
          </div>
        </div>

        {/* EPS Growth Summary */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ArrowTrendingUpIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">Gewinnwachstum</h3>
              <p className="text-xs text-theme-muted">EPS 3Y CAGR</p>
            </div>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: getGrowthColor(growth.epsGrowth3Y).split(' ')[0].replace('text-', '') }}>
            {formatGrowth(growth.epsGrowth3Y)}
          </div>
          <div className={`text-xs font-medium ${getGrowthRating(growth.epsGrowth3Y).color}`}>
            {getGrowthRating(growth.epsGrowth3Y).rating}
          </div>
        </div>

        {/* Forward Growth */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">Prognose</h3>
              <p className="text-xs text-theme-muted">Forward EPS</p>
            </div>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: getGrowthColor(growth.epsGrowthForward2Y).split(' ')[0].replace('text-', '') }}>
            {formatGrowth(growth.epsGrowthForward2Y)}
          </div>
          <div className={`text-xs font-medium ${getGrowthRating(growth.epsGrowthForward2Y).color}`}>
            Analyst Schätzung
          </div>
        </div>

        {/* Free Cash Flow Growth */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">FCF Wachstum</h3>
              <p className="text-xs text-theme-muted">3Y CAGR</p>
            </div>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: getGrowthColor(growth.fcfGrowth3Y).split(' ')[0].replace('text-', '') }}>
            {formatGrowth(growth.fcfGrowth3Y)}
          </div>
          <div className={`text-xs font-medium ${getGrowthRating(growth.fcfGrowth3Y).color}`}>
            {getGrowthRating(growth.fcfGrowth3Y).rating}
          </div>
        </div>
      </div>

      {/* Detailed Growth Metrics - Erweiterte Tabelle wie bei Seeking Alpha */}
      <div className="bg-theme-card rounded-lg border border-theme/10">
        <div className="px-6 py-4 border-b border-theme/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-blue-400" />
            Wachstumsmetriken im Detail
          </h3>
          <button
            onClick={() => setShowAllMetrics(!showAllMetrics)}
            className="text-sm text-theme-secondary hover:text-theme-primary transition-colors"
          >
            {showAllMetrics ? 'Weniger anzeigen' : 'Alle Metriken anzeigen'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-theme/20">
                <th className="text-left py-3 px-6 text-theme-primary font-semibold">Metrik</th>
                <th className="text-right py-3 px-4 text-theme-primary font-semibold">1Y (YoY)</th>
                <th className="text-right py-3 px-4 text-theme-primary font-semibold">3Y CAGR</th>
                <th className="text-right py-3 px-4 text-theme-primary font-semibold">5Y CAGR</th>
                <th className="text-right py-3 px-4 text-theme-primary font-semibold">10Y CAGR</th>
                <th className="text-right py-3 px-4 text-theme-primary font-semibold">Forward 2Y</th>
              </tr>
            </thead>
            <tbody>
              {/* Hauptmetriken */}
              <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                <td className="py-3 px-6 font-medium text-theme-primary flex items-center gap-2">
                  Umsatzwachstum
                  <LearnTooltipButton term="revenue_growth" />
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.revenueGrowth1Y)}`}>
                  {formatGrowth(growth.revenueGrowth1Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.revenueGrowth3Y)}`}>
                  {formatGrowth(growth.revenueGrowth3Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.revenueGrowth5Y)}`}>
                  {formatGrowth(growth.revenueGrowth5Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.revenueGrowth10Y)}`}>
                  {formatGrowth(growth.revenueGrowth10Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.revenueGrowthForward2Y)}`}>
                  {formatGrowth(growth.revenueGrowthForward2Y)}
                </td>
              </tr>
              
              <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                <td className="py-3 px-6 font-medium text-theme-primary flex items-center gap-2">
                  EPS Wachstum
                  <LearnTooltipButton term="eps_growth" />
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.epsGrowth1Y)}`}>
                  {formatGrowth(growth.epsGrowth1Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.epsGrowth3Y)}`}>
                  {formatGrowth(growth.epsGrowth3Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.epsGrowth5Y)}`}>
                  {formatGrowth(growth.epsGrowth5Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.epsGrowth10Y)}`}>
                  {formatGrowth(growth.epsGrowth10Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.epsGrowthForward2Y)}`}>
                  {formatGrowth(growth.epsGrowthForward2Y)}
                </td>
              </tr>

              <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                <td className="py-3 px-6 font-medium text-theme-primary flex items-center gap-2">
                  EBITDA Wachstum
                  <LearnTooltipButton term="ebitda" />
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.ebitdaGrowth1Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth1Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.ebitdaGrowth3Y)}`}>
                  {formatGrowth(growth.ebitdaGrowth3Y)}
                </td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
              </tr>

              <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                <td className="py-3 px-6 font-medium text-theme-primary flex items-center gap-2">
                  FCF Wachstum
                  <LearnTooltipButton term="free_cash_flow" />
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.fcfGrowth1Y)}`}>
                  {formatGrowth(growth.fcfGrowth1Y)}
                </td>
                <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.fcfGrowth3Y)}`}>
                  {formatGrowth(growth.fcfGrowth3Y)}
                </td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
              </tr>

              {/* Erweiterte Metriken (ausklappbar) */}
              {showAllMetrics && (
                <>
                  <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                    <td className="py-3 px-6 font-medium text-theme-primary">
                      Operating Income
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.operatingIncomeGrowth1Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.operatingIncomeGrowth3Y)}`}>
                      {formatGrowth(growth.operatingIncomeGrowth3Y)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                  </tr>

                  <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                    <td className="py-3 px-6 font-medium text-theme-primary">
                      Nettogewinn
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.netIncomeGrowth1Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.netIncomeGrowth3Y)}`}>
                      {formatGrowth(growth.netIncomeGrowth3Y)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                  </tr>

                  <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                    <td className="py-3 px-6 font-medium text-theme-primary">
                      CAPEX
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.capexGrowth1Y)}`}>
                      {formatGrowth(growth.capexGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.capexGrowth3Y)}`}>
                      {formatGrowth(growth.capexGrowth3Y)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                  </tr>

                  <tr className="border-b border-theme/10 hover:bg-theme-tertiary/50 transition-colors">
                    <td className="py-3 px-6 font-medium text-theme-primary">
                      Dividende/Aktie
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.dividendGrowth1Y)}`}>
                      {formatGrowth(growth.dividendGrowth1Y)}
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${getGrowthColor(growth.dividendGrowth3Y)}`}>
                      {formatGrowth(growth.dividendGrowth3Y)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                    <td className="text-right py-3 px-4 font-medium text-theme-muted">–</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Growth Charts - Premium Feature mit echten Daten */}
      {user?.isPremium ? (
        <div className="bg-theme-card rounded-lg border border-theme/10">
          <div className="px-6 py-4 border-b border-theme/10">
            <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-purple-400" />
              Wachstums-Charts
            </h3>
          </div>
          <div className="p-6">
            <GrowthCharts ticker={ticker} />
          </div>
        </div>
      ) : (
        <div className="bg-theme-card rounded-lg border border-theme/10">
          <div className="px-6 py-4 border-b border-theme/10">
            <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-purple-400" />
              Interaktive Wachstums-Charts
            </h3>
          </div>
          <div className="p-6 text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <LockClosedIcon className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Charts verfügbar</h3>
            <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">
              Visualisiere Wachstumstrends über Zeit mit interaktiven Charts, CAGR-Vergleichen und historischen Analysen.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg font-semibold transition-colors"
            >
              <LockClosedIcon className="w-5 h-5" />
              14 Tage kostenlos testen
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-xs text-theme-muted">
          Wachstumsdaten basieren auf Finanzdaten von FMP API • Analysten-Schätzungen von führenden Investmentbanken
        </p>
        <p className="text-xs text-theme-muted mt-2">
          Letztes Update: {formatDate(data.lastUpdated)}
        </p>
      </div>
    </div>
  )
}

export default GrowthAnalysisClient;