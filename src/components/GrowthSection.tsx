// src/components/GrowthSection.tsx
'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';
import { LearnTooltipButton } from '@/components/LearnSidebar';
import { LEARN_DEFINITIONS } from '@/data/learnDefinitions';

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

interface GrowthSectionProps {
  ticker: string;
  isPremium: boolean;
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

const GrowthSection: React.FC<GrowthSectionProps> = React.memo(({ ticker, isPremium }) => {
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    
    const formatted = `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    return formatted;
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

  // Get trend icon
  const getTrendIcon = (value?: number | null) => {
    if (typeof value !== 'number' || isNaN(value) || value === null) return null;
    
    if (value > 0) {
      return <ArrowTrendingUpIcon className="w-3 h-3 text-green-400" />;
    } else {
      return <ArrowTrendingDownIcon className="w-3 h-3 text-red-400" />;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            Wachstum
          </h3>
        </div>
        <div className="p-6 h-[200px] flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-theme-secondary text-sm mt-3">Lade Wachstumsdaten...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            Wachstum
          </h3>
        </div>
        <div className="p-6 h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4 text-sm font-medium">{error}</p>
            <button 
              onClick={loadGrowthData}
              className="btn-secondary text-sm"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No Data
  if (!data?.growth) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
            Wachstum
          </h3>
        </div>
        <div className="p-6 h-[200px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-theme-secondary text-sm">Keine Wachstumsdaten verfügbar</p>
          </div>
        </div>
      </div>
    );
  }

  const { growth } = data;

  return (
    <div className="bg-theme-card rounded-lg">
      <div className="px-6 py-4 border-b border-theme/10">
        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
          Wachstum
        </h3>
      </div>

      <div className="p-6 h-[400px] overflow-y-auto">
        <div className="space-y-6">

          {/* Revenue Growth */}
          <div>
            <h4 className="text-theme-primary font-semibold text-sm mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              Umsatzwachstum
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-theme-secondary text-sm">Umsatz YoY</span>
                  <LearnTooltipButton term="revenue_growth" />
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.revenueGrowth1Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.revenueGrowth1Y)}`}>
                    {formatGrowth(growth.revenueGrowth1Y)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-theme-secondary text-sm">Umsatz 3Y CAGR</span>
                  <LearnTooltipButton term="cagr" />
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.revenueGrowth3Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.revenueGrowth3Y)}`}>
                    {formatGrowth(growth.revenueGrowth3Y)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-theme-secondary text-sm">Umsatz 5Y CAGR</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.revenueGrowth5Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.revenueGrowth5Y)}`}>
                    {formatGrowth(growth.revenueGrowth5Y)}
                  </span>
                </div>
              </div>

              {growth.revenueGrowthForward2Y && (
                <div className="flex justify-between items-center border-t border-theme/20 pt-2">
                  <span className="text-theme-secondary text-sm">Umsatz Erw. (2Y)</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(growth.revenueGrowthForward2Y)}
                    <span className={`text-sm font-medium ${getGrowthColor(growth.revenueGrowthForward2Y)}`}>
                      {formatGrowth(growth.revenueGrowthForward2Y)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* EPS Growth */}
          <div>
            <h4 className="text-theme-primary font-semibold text-sm mb-4 flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              Gewinnwachstum
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-theme-secondary text-sm">EPS YoY</span>
                  <LearnTooltipButton term="eps_growth" />
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.epsGrowth1Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.epsGrowth1Y)}`}>
                    {formatGrowth(growth.epsGrowth1Y)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-theme-secondary text-sm">EPS 3Y CAGR</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.epsGrowth3Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.epsGrowth3Y)}`}>
                    {formatGrowth(growth.epsGrowth3Y)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-theme-secondary text-sm">EPS 5Y CAGR</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(growth.epsGrowth5Y)}
                  <span className={`text-sm font-medium ${getGrowthColor(growth.epsGrowth5Y)}`}>
                    {formatGrowth(growth.epsGrowth5Y)}
                  </span>
                </div>
              </div>

              {growth.epsGrowthForward2Y && (
                <div className="flex justify-between items-center border-t border-theme/20 pt-2">
                  <span className="text-theme-secondary text-sm">EPS Erw. (2Y)</span>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(growth.epsGrowthForward2Y)}
                    <span className={`text-sm font-medium ${getGrowthColor(growth.epsGrowthForward2Y)}`}>
                      {formatGrowth(growth.epsGrowthForward2Y)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Other Growth Metrics */}
          {(growth.ebitdaGrowth3Y || growth.fcfGrowth3Y) && (
            <div>
              <h4 className="text-theme-primary font-semibold text-sm mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                Weitere Kennzahlen
              </h4>
              <div className="space-y-3">
                {growth.ebitdaGrowth3Y && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">EBITDA 3Y CAGR</span>
                      <LearnTooltipButton term="ebitda" />
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(growth.ebitdaGrowth3Y)}
                      <span className={`text-sm font-medium ${getGrowthColor(growth.ebitdaGrowth3Y)}`}>
                        {formatGrowth(growth.ebitdaGrowth3Y)}
                      </span>
                    </div>
                  </div>
                )}
                
                {growth.fcfGrowth3Y && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">FCF 3Y CAGR</span>
                      <LearnTooltipButton term="free_cash_flow" />
                    </div>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(growth.fcfGrowth3Y)}
                      <span className={`text-sm font-medium ${getGrowthColor(growth.fcfGrowth3Y)}`}>
                        {formatGrowth(growth.fcfGrowth3Y)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-theme/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs text-theme-muted">
                {data.dataQuality.periods} Jahre Historie
              </span>
            </div>
            <button 
              onClick={loadGrowthData} 
              className="text-xs text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-tertiary rounded" 
              title="Aktualisieren"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* Link zur Wachstumsseite */}
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}/growth/`}
            className="text-xs text-theme-secondary hover:text-theme-primary transition-colors flex items-center gap-1 group"
          >
            <svg className="w-3 h-3 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="group-hover:text-green-400 transition-colors">Mehr zum Wachstum</span>
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
});

GrowthSection.displayName = 'GrowthSection';

export default GrowthSection;