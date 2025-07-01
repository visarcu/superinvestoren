// src/app/analyse/[ticker]/valuation/page.tsx - EINHEITLICHER HEADER
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { 
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowLeftIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface ValuationData {
  // P/E Ratios (vereinfacht)
  peRatioTTM: number;
  forwardPE: number;
  pegRatioTTM: number;
  
  // Andere Ratios
  priceToBookRatioTTM: number;
  priceSalesRatioTTM: number;
  priceToCashFlowRatio: number;        // Operating Cash Flow
  priceToFreeCashFlowsRatio: number;   // Free Cash Flow
  dividendYieldTTM: number;
  
  // EV Ratios (berechnet)
  evToSales: number;
  evToEbitda: number;
  evToEbit: number;
  
  // Historical 5Y Averages
  pe5YAvg: number;
  peg5YAvg: number;
  pb5YAvg: number;
  ps5YAvg: number;
  pcf5YAvg: number;
  fcf5YAvg: number;
  evSales5YAvg: number;
  evEbitda5YAvg: number;
  divYield5YAvg: number;
}

// ===== MAIN VALUATION COMPONENT =====
function ProfessionalValuationTable({ ticker, isPremium = false }: { ticker: string; isPremium?: boolean }) {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadValuationData();
  }, [ticker]);

  const loadValuationData = async () => {
    setLoading(true);
    setError(null);
    
    // Simuliere Datenladung
    setTimeout(() => {
      if (isPremium) {
        // Simuliere echte Daten für Premium-User
        setData({
          peRatioTTM: 28.5,
          forwardPE: 24.8,
          pegRatioTTM: 1.2,
          priceToBookRatioTTM: 8.9,
          priceSalesRatioTTM: 12.4,
          priceToCashFlowRatio: 22.1,
          priceToFreeCashFlowsRatio: 26.7,
          dividendYieldTTM: 0.44,
          evToSales: 11.8,
          evToEbitda: 19.2,
          evToEbit: 21.5,
          pe5YAvg: 31.2,
          peg5YAvg: 1.8,
          pb5YAvg: 7.2,
          ps5YAvg: 8.9,
          pcf5YAvg: 18.9,
          fcf5YAvg: 23.1,
          evSales5YAvg: 9.4,
          evEbitda5YAvg: 17.8,
          divYield5YAvg: 0.52
        });
      }
      setLoading(false);
    }, 1500);
  };

  const formatRatio = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    return value.toFixed(2);
  };

  const formatPercent = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    
    // Wenn Wert bereits in Prozent (>1), direkt nutzen
    if (value > 1) {
      return `${value.toFixed(2)}%`;
    }
    
    // Wenn Wert als Dezimal (<1), in Prozent umwandeln
    return `${(value * 100).toFixed(2)}%`;
  };

  const calculateDifference = (current: number, comparison: number): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return '-';
    const diff = ((current - comparison) / comparison) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
  };

  const getDifferenceColor = (current: number, comparison: number): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return 'text-theme-muted';
    return current > comparison ? 'text-red-400' : 'text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-theme-card rounded-xl p-8">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-theme-muted">Lade Bewertungsdaten...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-theme-card rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Fehler beim Laden der Bewertungsdaten: {error}</p>
        <button 
          onClick={loadValuationData}
          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Bewertungsanalyse</h3>
        <p className="text-theme-muted mb-6">Professionelle Bewertungsmetriken mit historischen Vergleichen</p>
        <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all">
          Premium freischalten
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Deutsche Kennzahlen-Namen (vereinfacht)
  const valuationMetrics = [
    {
      label: 'KGV (TTM)',
      current: data.peRatioTTM,
      comparison: data.pe5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KGV Erwartet (FWD)',
      current: data.forwardPE,
      comparison: data.pe5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'PEG (TTM)',
      current: data.pegRatioTTM,
      comparison: data.peg5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/Umsatz (TTM)',
      current: data.evToSales,
      comparison: data.evSales5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/EBITDA (TTM)',
      current: data.evToEbitda,
      comparison: data.evEbitda5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/EBIT (TTM)',
      current: data.evToEbit,
      comparison: data.evEbitda5YAvg, // Approximation
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KUV (TTM)',
      current: data.priceSalesRatioTTM,
      comparison: data.ps5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KBV (TTM)',
      current: data.priceToBookRatioTTM,
      comparison: data.pb5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Kurs/Cashflow (TTM)',
      current: data.priceToCashFlowRatio,
      comparison: data.pcf5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Kurs/Free Cashflow (TTM)',
      current: data.priceToFreeCashFlowsRatio,
      comparison: data.fcf5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Dividendenrendite (TTM)',
      current: data.dividendYieldTTM,
      comparison: data.divYield5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatPercent
    }
  ];

  return (
    <div className="bg-theme-card rounded-xl overflow-hidden">
      {/* ✅ FISCAL Header */}
      <div className="p-6 border-b border-theme/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <CalculatorIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
            <p className="text-theme-muted text-sm">{ticker} Bewertungsanalyse</p>
          </div>
        </div>
      </div>

      {/* ✅ FISCAL Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme-tertiary/20">
            <tr>
              <th className="text-left py-3 px-6 text-theme-muted font-medium text-sm">Kennzahl</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">{ticker}</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">Vergleichswert</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">% Differenz</th>
            </tr>
          </thead>
          <tbody>
            {valuationMetrics.map((metric, index) => (
              <tr 
                key={index}
                className={`hover:bg-theme-secondary/20 transition-colors ${
                  index !== valuationMetrics.length - 1 ? 'border-b border-theme/5' : ''
                }`}
              >
                <td className="py-3 px-6 text-theme-primary font-medium text-sm">
                  {metric.label}
                </td>
                <td className="py-3 px-6 text-right text-theme-primary font-medium text-sm">
                  {metric.formatter(metric.current)}
                </td>
                <td className="py-3 px-6 text-right text-theme-muted text-sm">
                  {metric.formatter(metric.comparison)}
                </td>
                <td className={`py-3 px-6 text-right font-medium text-sm ${getDifferenceColor(metric.current, metric.comparison)}`}>
                  {calculateDifference(metric.current, metric.comparison)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ FISCAL Footer Note */}
      <div className="p-4 bg-theme-tertiary/10 text-xs text-theme-muted">
        <p>
          Alle Daten basieren auf den neuesten verfügbaren Finanzdaten von {ticker}. 
          TTM = Trailing Twelve Months, FWD = Forward (Analystenschätzungen).
          Vergleichswerte sind 5-Jahres-Durchschnitte der gleichen Kennzahl.
          KGV = Kurs-Gewinn-Verhältnis, KBV = Kurs-Buchwert-Verhältnis, KUV = Kurs-Umsatz-Verhältnis.
          Kurs/Cashflow basiert auf Operating Cash Flow, Kurs/Free Cashflow auf Free Cash Flow.
        </p>
      </div>
    </div>
  );
}

export default function ValuationPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker.toUpperCase())

  // User-Daten laden
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
        console.error('[ValuationPage] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted">Lade Bewertungsdaten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER - wie andere Pages */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <Logo
                ticker={ticker}
                alt={`${ticker} Logo`}
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                {stock?.name || ticker.toUpperCase()}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-purple-400 font-semibold">{ticker.toUpperCase()}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-theme-muted">
                  Bewertungsanalyse
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">

        {/* Main Valuation Table */}
        <ProfessionalValuationTable 
          ticker={ticker.toUpperCase()} 
          isPremium={user?.isPremium || false}
        />

        {/* ✅ FISCAL Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-card rounded-xl p-6 hover:bg-theme-secondary/10 transition-colors border border-theme/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
                <p className="text-theme-muted text-sm">Vergleich mit Branchenkonkurrenten</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/20 rounded-lg p-4 border-l-4 border-blue-400">
              <p className="text-sm text-theme-muted">
                🚀 Bald verfügbar: Automatischer Vergleich mit Top-Konkurrenten in der Branche
              </p>
            </div>
          </div>
          
          <div className="bg-theme-card rounded-xl p-6 hover:bg-theme-secondary/10 transition-colors border border-theme/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-theme-primary">DCF Modell</h3>
                <p className="text-theme-muted text-sm">Discounted Cash Flow Bewertung</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/20 rounded-lg p-4 border-l-4 border-green-400">
              <p className="text-sm text-theme-muted">
                📊 Bald verfügbar: Interaktives DCF-Modell mit anpassbaren Parametern
              </p>
            </div>
          </div>
        </div>

        {/* ✅ FISCAL Premium CTA */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-8 text-center border border-theme/10">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CalculatorIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-3">Erweiterte Bewertungstools</h3>
            <p className="text-theme-muted mb-6 max-w-xl mx-auto">
              Erhalte Zugang zu interaktiven DCF-Modellen, Peer-Vergleichen, Monte-Carlo-Simulationen 
              und professionellen Bewertungsberichten für {ticker.toUpperCase()} und 3000+ weitere Aktien.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>DCF-Modell</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Peer-Vergleich</span>
              </div>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Monte-Carlo</span>
              </div>
            </div>
            
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-400 hover:to-blue-400 transition-all">
              Premium freischalten - Nur 9€/Monat
            </button>
          </div>
        )}

        {/* ✅ FISCAL CTA für Premium Users */}
        {user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary mb-1">
                  Vollständige {ticker.toUpperCase()} Analyse
                </h3>
                <p className="text-theme-muted text-sm">
                  Charts, Fundamentaldaten, Dividenden und technische Analyse
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Zur Analyse
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}