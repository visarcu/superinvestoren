// src/components/GrowthAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon, CalendarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LearnTooltipButton } from '@/components/LearnSidebar';
import { useLearnMode } from '@/lib/LearnModeContext';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LockClosedIcon } from '@heroicons/react/24/outline'

// Dynamic Chart Import
const GrowthCharts = dynamic(
  () => import('@/components/GrowthCharts'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

interface GrowthData {
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
  revenueGrowthForward2Y?: number | null
  epsGrowthForward2Y?: number | null
  epsGrowthLongTerm?: number | null
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
}

const GrowthAnalysisClient: React.FC<GrowthAnalysisClientProps> = ({ ticker }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isLearnMode } = useLearnMode()

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

  // Format percentage with color coding
  const formatGrowth = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return '–';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-theme-primary">Wachstumsanalyse</h2>
          <p className="text-theme-secondary mt-1">
            Historische und prognostizierte Wachstumsraten für {ticker}
          </p>
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

        {/* Consistency Score */}
        <div className="bg-theme-card rounded-lg p-6 border border-theme/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-primary">Konsistenz</h3>
              <p className="text-xs text-theme-muted">Wachstumsstabilität</p>
            </div>
          </div>
          <div className="text-2xl font-bold mb-2 text-theme-primary">
            {data.dataQuality.periods >= 5 ? 'Hoch' : 'Moderat'}
          </div>
          <div className="text-xs font-medium text-theme-muted">
            {data.dataQuality.periods} Jahre Daten
          </div>
        </div>
      </div>

      {/* Detailed Growth Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Historical Growth Rates */}
        <div className="bg-theme-card rounded-lg border border-theme/10">
          <div className="px-6 py-4 border-b border-theme/10">
            <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-blue-400" />
              Historische Wachstumsraten
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/* Revenue Growth */}
            <div>
              <h4 className="text-sm font-semibold text-theme-primary mb-4 flex items-center gap-2">
                Umsatzwachstum
                <LearnTooltipButton term="revenue_growth" />
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">1 Jahr (YoY)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.revenueGrowth1Y)}`}>
                    {formatGrowth(growth.revenueGrowth1Y)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">3 Jahre (CAGR)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.revenueGrowth3Y)}`}>
                    {formatGrowth(growth.revenueGrowth3Y)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">5 Jahre (CAGR)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.revenueGrowth5Y)}`}>
                    {formatGrowth(growth.revenueGrowth5Y)}
                  </span>
                </div>
                {growth.revenueGrowth10Y && (
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">10 Jahre (CAGR)</span>
                    <span className={`font-semibold ${getGrowthColor(growth.revenueGrowth10Y)}`}>
                      {formatGrowth(growth.revenueGrowth10Y)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* EPS Growth */}
            <div>
              <h4 className="text-sm font-semibold text-theme-primary mb-4 flex items-center gap-2">
                Gewinnwachstum (EPS)
                <LearnTooltipButton term="eps_growth" />
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">1 Jahr (YoY)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.epsGrowth1Y)}`}>
                    {formatGrowth(growth.epsGrowth1Y)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">3 Jahre (CAGR)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.epsGrowth3Y)}`}>
                    {formatGrowth(growth.epsGrowth3Y)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">5 Jahre (CAGR)</span>
                  <span className={`font-semibold ${getGrowthColor(growth.epsGrowth5Y)}`}>
                    {formatGrowth(growth.epsGrowth5Y)}
                  </span>
                </div>
                {growth.epsGrowth10Y && (
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">10 Jahre (CAGR)</span>
                    <span className={`font-semibold ${getGrowthColor(growth.epsGrowth10Y)}`}>
                      {formatGrowth(growth.epsGrowth10Y)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Forward Growth & Analysis */}
        <div className="bg-theme-card rounded-lg border border-theme/10">
          <div className="px-6 py-4 border-b border-theme/10">
            <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-green-400" />
              Zukunftsprognosen
            </h3>
          </div>
          
          {/* ✅ PREMIUM BLUR für Zukunftsprognosen */}
          {user?.isPremium ? (
            <div className="p-6 space-y-6">
              
              {/* Forward Estimates */}
              {(growth.revenueGrowthForward2Y || growth.epsGrowthForward2Y) && (
                <div>
                  <h4 className="text-sm font-semibold text-theme-primary mb-4">Analyst Schätzungen</h4>
                  <div className="space-y-3">
                    {growth.revenueGrowthForward2Y && (
                      <div className="flex justify-between items-center">
                        <span className="text-theme-secondary text-sm">Umsatz Forward (2Y)</span>
                        <span className={`font-semibold ${getGrowthColor(growth.revenueGrowthForward2Y)}`}>
                          {formatGrowth(growth.revenueGrowthForward2Y)}
                        </span>
                      </div>
                    )}
                    {growth.epsGrowthForward2Y && (
                      <div className="flex justify-between items-center">
                        <span className="text-theme-secondary text-sm">EPS Forward (2Y)</span>
                        <span className={`font-semibold ${getGrowthColor(growth.epsGrowthForward2Y)}`}>
                          {formatGrowth(growth.epsGrowthForward2Y)}
                        </span>
                      </div>
                    )}
                    {growth.epsGrowthLongTerm && (
                      <div className="flex justify-between items-center">
                        <span className="text-theme-secondary text-sm">EPS Langfristig</span>
                        <span className={`font-semibold ${getGrowthColor(growth.epsGrowthLongTerm)}`}>
                          {formatGrowth(growth.epsGrowthLongTerm)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other Metrics */}
              {(growth.ebitdaGrowth3Y || growth.fcfGrowth3Y) && (
                <div>
                  <h4 className="text-sm font-semibold text-theme-primary mb-4">Weitere Kennzahlen</h4>
                  <div className="space-y-3">
                    {growth.ebitdaGrowth3Y && (
                      <div className="flex justify-between items-center">
                        <span className="text-theme-secondary text-sm flex items-center gap-1">
                          EBITDA Growth (3Y)
                          <LearnTooltipButton term="ebitda" />
                        </span>
                        <span className={`font-semibold ${getGrowthColor(growth.ebitdaGrowth3Y)}`}>
                          {formatGrowth(growth.ebitdaGrowth3Y)}
                        </span>
                      </div>
                    )}
                    {growth.fcfGrowth3Y && (
                      <div className="flex justify-between items-center">
                        <span className="text-theme-secondary text-sm flex items-center gap-1">
                          FCF Growth (3Y)
                          <LearnTooltipButton term="free_cash_flow" />
                        </span>
                        <span className={`font-semibold ${getGrowthColor(growth.fcfGrowth3Y)}`}>
                          {formatGrowth(growth.fcfGrowth3Y)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Growth Quality Analysis */}
              <div>
                <h4 className="text-sm font-semibold text-theme-primary mb-4">Wachstumsqualität</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Datenverfügbarkeit</span>
                    <span className="text-theme-primary font-semibold">
                      {data.dataQuality.hasIncomeData ? '✅' : '❌'} Income |{' '}
                      {data.dataQuality.hasEstimates ? '✅' : '❌'} Estimates
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Historische Perioden</span>
                    <span className="text-theme-primary font-semibold">
                      {data.dataQuality.periods} Jahre
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Letztes Update</span>
                    <span className="text-theme-secondary text-sm">
                      {new Date(data.lastUpdated).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="filter blur-sm opacity-60 pointer-events-none select-none p-6 space-y-6">
                
                {/* Geblurrte Forward Estimates */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-primary mb-4">Analyst Schätzungen</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Umsatz Forward (2Y)</span>
                      <span className="font-semibold text-green-400">+5.6%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">EPS Forward (2Y)</span>
                      <span className="font-semibold text-green-400">+8.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">EPS Langfristig</span>
                      <span className="font-semibold text-green-400">+8.9%</span>
                    </div>
                  </div>
                </div>

                {/* Geblurrte Other Metrics */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-primary mb-4">Weitere Kennzahlen</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">EBITDA Growth (3Y)</span>
                      <span className="font-semibold text-green-400">+3.0%</span>
                    </div>
                  </div>
                </div>

                {/* Geblurrte Growth Quality */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-primary mb-4">Wachstumsqualität</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Datenverfügbarkeit</span>
                      <span className="text-theme-primary font-semibold">✅ Income | ✅ Estimates</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Historische Perioden</span>
                      <span className="text-theme-primary font-semibold">10 Jahre</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Letztes Update</span>
                      <span className="text-theme-secondary text-sm">8.7.2025</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Premium Blur Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-theme-card/95 backdrop-blur-sm rounded-lg p-4 text-center shadow-xl border border-green-500/20">
                  <LockClosedIcon className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-theme-primary font-semibold text-sm">Zukunftsprognosen</p>
                  <p className="text-theme-muted text-xs mt-1">Premium erforderlich</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-1 text-green-500 hover:text-green-400 text-xs font-medium mt-2 transition-colors"
                  >
                    Upgrade
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Growth Charts - Premium Feature */}
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
            <div className="w-16 h-16 bg-gradient-to-br border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
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
      </div>
    </div>
  )
}

export default GrowthAnalysisClient;