// Homepage mit optimiertem Noise Pattern - VERBESSERTE VERSION + ANIMATIONEN
'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  CheckIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import SearchTickerInput from '@/components/SearchTickerInput'
import { investors } from '@/data/investors'
import NewsletterSignup from '@/components/NewsletterSignup'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

// — Helper function to get real portfolio data —
const getRealPortfolioData = () => {
  const investorSlugs = ['buffett', 'ackman', 'marks'];
  const portfolios: Array<{
    name: string;
    investor: string;
    date: string;
    filingId: string;
    totalValue: string;
    tickers: string;
    holdings: Array<{
      ticker: string;
      value: string;
      percentage: string;
    }>;
  }> = [];

  investorSlugs.forEach(slug => {
    const snapshots = holdingsHistory[slug];
    if (!snapshots || snapshots.length === 0) return;

    const latest = snapshots[snapshots.length - 1].data;
    
    // Helper function to merge positions (same logic as in investor page)
    const mergePositions = (raw: { cusip: string; shares: number; value: number; ticker?: string; name?: string }[]) => {
      const map = new Map<string, { shares: number; value: number; ticker?: string; name?: string }>();
      raw.forEach(p => {
        const prev = map.get(p.cusip);
        if (prev) {
          prev.shares += p.shares;
          prev.value += p.value;
        } else {
          map.set(p.cusip, { 
            shares: p.shares, 
            value: p.value,
            ticker: p.ticker,
            name: p.name
          });
        }
      });
      return map;
    };

    const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
      .map(([cusip, { shares, value, ticker: positionTicker, name: positionName }]) => {
        const stockData = stocks.find(s => s.cusip === cusip);
        
        let ticker = positionTicker || stockData?.ticker || cusip.replace(/0+$/, '');
        let displayName = positionName || stockData?.name || cusip;
        
        return {
          cusip, 
          ticker, 
          name: displayName,
          shares, 
          value
        };
      })
      .sort((a, b) => b.value - a.value) // Sort by value descending
      .slice(0, 5); // Top 5 holdings

    const totalValue = latest.positions.reduce((sum, p) => sum + p.value, 0);

    // Map slug to proper names and info
    const investorInfo = {
      buffett: {
        name: 'Berkshire Hathaway Inc',
        investor: 'Warren Buffett',
        filingId: '1067983'
      },
      ackman: {
        name: 'Pershing Square Capital',
        investor: 'Bill Ackman',
        filingId: '1336528'
      },
      marks: {
        name: 'Oaktree Capital Management',
        investor: 'Howard Marks',
        filingId: '1007478'
      }
    };

    const info = investorInfo[slug as keyof typeof investorInfo];
    if (!info) return;

    portfolios.push({
      name: info.name,
      investor: info.investor,
      date: latest.date?.split('-').reverse().join('.') || 'September 29, 2024',
      filingId: info.filingId,
      totalValue: `${(totalValue / 1000000).toFixed(0)}M`,
      tickers: mergedHoldings.map(h => h.ticker).join(', '),
      holdings: mergedHoldings.map(holding => ({
        ticker: holding.ticker,
        value: `${(holding.value / 1000000).toFixed(1)}M`,
        percentage: ((holding.value / totalValue) * 100).toFixed(1)
      }))
    });
  });

  return portfolios;
};

// — Custom Hooks für Animationen —
const useCountUp = (end: number, duration = 2000, shouldStart = false) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    if (!shouldStart) return;
    
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function für smoothe Animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(end * easeOutQuart));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, shouldStart]);
  
  return count;
};

const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return [ref, isVisible] as const;
};

export default function OptimizedHomePage() {
  const router = useRouter()

  // Animation Refs
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartRef, chartVisible] = useIntersectionObserver(0.3);
  const [marketChartRef, marketChartVisible] = useIntersectionObserver(0.3); // Separater Observer für zweiten Chart
  const [watchlistRef, watchlistVisible] = useIntersectionObserver(0.3); // Observer für Watchlist

  // Kartenstack State
  const [activeCard, setActiveCard] = useState(0);

  // Echte Investor Data aus Holdings History mit Fallback
  const investorData = getRealPortfolioData();
  
  // Fallback falls keine Daten verfügbar sind
  const safeInvestorData = investorData.length > 0 ? investorData : [
    {
      name: 'Berkshire Hathaway Inc',
      investor: 'Warren Buffett',
      date: '29.09.2024',
      filingId: '1067983',
      totalValue: '$266B',
      tickers: 'AAPL, BAC, AXP, KO',
      holdings: [
        { ticker: 'AAPL', value: '$69.9B', percentage: '26.0' },
        { ticker: 'BAC', value: '$31.7B', percentage: '12.0' },
        { ticker: 'AXP', value: '$25.1B', percentage: '9.5' },
        { ticker: 'KO', value: '$22.4B', percentage: '8.5' },
        { ticker: 'CVX', value: '$18.6B', percentage: '7.0' }
      ]
    }
  ];

  const wantedSlugs = ['buffett', 'ackman', 'marks', 'smith'] 
  const highlightInvestors = investors.filter(inv =>
    wantedSlugs.includes(inv.slug)
  )

  const handleTickerSelect = (ticker: string) => {
    router.push(`/analyse/${ticker.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Hero Section - Optimiert wie Pricing Page */}
      <div className="bg-gray-950 noise-bg pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          {/* Subtiler Background Glow - Positioniert wie auf Pricing */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
          
          <div className="relative text-center space-y-8">
            
            {/* Badge - Enhanced */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium hover:bg-green-500/20 transition-colors backdrop-blur-sm">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span>Professionelle Investment-Analyse</span>
              <ArrowRightIcon className="w-3 h-3" />
            </div>
            
            {/* Main Heading - Konsistent mit Pricing */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Analysiere Aktien
              </h1>
              <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  Erhalte Einblicke
                </span>
              </h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Starte deine Analyse mit Live-Kursen, Charts, Kennzahlen & mehr.<br />
              Wirf einen Blick in die Depots der besten Investoren der Welt.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/analyse"
                className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                Jetzt analysieren
              </Link>
              <Link
                href="/superinvestor"
                className="px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
              >
                Super-Investoren
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Preview - Wie FinChat aber für FinClue */}
      <div className="bg-gray-950 noise-bg py-20 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Stats Grid - Mit Animation */}
          <div ref={statsRef} className="grid grid-cols-3 gap-8 text-center mb-20">
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                {useCountUp(10000, 2000, statsVisible).toLocaleString('de-DE')}+
              </div>
              <div className="text-xs text-gray-500">Aktien & ETFs</div>
            </div>
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                {useCountUp(150, 2200, statsVisible)}
              </div>
              <div className="text-xs text-gray-500">Jahre Daten</div>
            </div>
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                {useCountUp(70, 2400, statsVisible)}+
              </div>
              <div className="text-xs text-gray-500">Super-Investoren</div>
            </div>
          </div>

          {/* Platform Preview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Professionelle Analyse
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  in Sekunden
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Von Live-Kursen bis historischen Charts - erhalte alle wichtigen Kennzahlen 
                und Insights die du für bessere Investment-Entscheidungen brauchst.
              </p>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                Live Demo ansehen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Platform Preview Mockup - Mit Animation */}
            <div ref={chartRef} className="relative">
              {/* Main Dashboard Preview */}
              <div className={`bg-gray-900/80 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Apple Inc.</h3>
                    <p className="text-green-400 text-sm">$185.24 (+2.1%)</p>
                  </div>
                </div>

                {/* Mini Chart - Mit animierten Bars */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="flex items-end gap-1 h-16">
                    {[40, 45, 35, 50, 65, 55, 70, 60, 75, 85, 80, 90].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-green-500 to-green-300 rounded-sm flex-1 transition-all duration-1000 ease-out"
                        style={{ 
                          height: chartVisible ? `${height}%` : '0%',
                          transitionDelay: `${i * 100 + 500}ms`
                        }}
                      ></div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">6M Performance</div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1500ms' }}>
                    <div className="text-xs text-gray-500">Market Cap</div>
                    <div className="text-white font-semibold numeric">$2.85T</div>
                  </div>
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1600ms' }}>
                    <div className="text-xs text-gray-500">P/E Ratio</div>
                    <div className="text-white font-semibold numeric">28.4</div>
                  </div>
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1700ms' }}>
                    <div className="text-xs text-gray-500">Revenue</div>
                    <div className="text-white font-semibold numeric">$394B</div>
                  </div>
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1800ms' }}>
                    <div className="text-xs text-gray-500">Dividend</div>
                    <div className="text-white font-semibold numeric">0.89%</div>
                  </div>
                </div>
              </div>

              {/* Floating Super-Investor Card */}
              <div className={`absolute -right-4 -bottom-4 bg-gray-900/90 border border-gray-700 rounded-lg p-4 backdrop-blur-sm transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
              }`} style={{ transitionDelay: '1000ms' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gray-600 rounded-full"></div>
                  <span className="text-white text-sm font-medium">Warren Buffett</span>
                </div>
                <div className="text-xs text-gray-400">Berkshire besitzt</div>
                <div className="text-green-400 font-semibold">915M Aktien</div>
              </div>

              {/* Background glow */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Analysis Section - Neue animierte Chart Sektion */}
      <section className="bg-gray-950 noise-bg py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Animated Chart */}
            <div ref={marketChartRef} className="relative">
              <div className={`bg-gray-900/80 border border-gray-800 rounded-xl p-8 backdrop-blur-sm transform transition-all duration-1000 ${
                marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">MSFT</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Microsoft Corp.</h3>
                      <p className="text-sm text-gray-400">Umsatzentwicklung 5 Jahre</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">$211.9B</div>
                    <div className="text-xs text-gray-500">Jahresumsatz 2024</div>
                  </div>
                </div>

                {/* Animated Line Chart */}
                <div className="h-64 bg-gray-800/30 rounded-lg p-4 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    {/* Grid Lines */}
                    <defs>
                      <pattern id="grid2" width="40" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid2)" />
                    
                    {/* Chart Line - wird animiert eingezeichnet */}
                    <path
                      d="M 20 120 L 80 110 L 140 95 L 200 75 L 260 65 L 320 50 L 380 45"
                      fill="none"
                      stroke="url(#gradient2)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="transition-all duration-3000 ease-out"
                      style={{
                        strokeDasharray: marketChartVisible ? 'none' : '1000',
                        strokeDashoffset: marketChartVisible ? '0' : '1000',
                        transitionDelay: '500ms'
                      }}
                    />
                    
                    {/* Area under curve */}
                    <path
                      d="M 20 120 L 80 110 L 140 95 L 200 75 L 260 65 L 320 50 L 380 45 L 380 180 L 20 180 Z"
                      fill="url(#areaGradient2)"
                      className="transition-all duration-3000 ease-out"
                      style={{
                        opacity: marketChartVisible ? '0.2' : '0',
                        transitionDelay: '1000ms'
                      }}
                    />
                    
                    {/* Data Points */}
                    {[
                      { x: 20, y: 120 },
                      { x: 80, y: 110 },
                      { x: 140, y: 95 },
                      { x: 200, y: 75 },
                      { x: 260, y: 65 },
                      { x: 320, y: 50 },
                      { x: 380, y: 45 }
                    ].map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="4"
                        fill="#10b981"
                        className="transition-all duration-500 ease-out"
                        style={{
                          opacity: marketChartVisible ? '1' : '0',
                          transform: marketChartVisible ? 'scale(1)' : 'scale(0)',
                          transitionDelay: `${1500 + (index * 150)}ms`
                        }}
                      />
                    ))}
                    
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#34d399" />
                      </linearGradient>
                      <linearGradient id="areaGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Chart Labels */}
                  <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
                    <span>2019</span>
                    <span>2020</span>
                    <span>2021</span>
                    <span>2022</span>
                    <span>2023</span>
                    <span>2024</span>
                  </div>
                </div>

                {/* Chart Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2000ms' }}>
                    <div className="text-lg font-bold text-white">$88.5B</div>
                    <div className="text-xs text-gray-500">EBITDA 2024</div>
                  </div>
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2100ms' }}>
                    <div className="text-lg font-bold text-white">$72.4B</div>
                    <div className="text-xs text-gray-500">Nettogewinn</div>
                  </div>
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2200ms' }}>
                    <div className="text-lg font-bold text-white">28.2</div>
                    <div className="text-xs text-gray-500">KGV</div>
                  </div>
                </div>
              </div>

              {/* Background glow */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl blur-xl -z-10"></div>
            </div>

            {/* Right: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                <ChartBarIcon className="w-4 h-4" />
                Fundamentalanalyse
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Verstehe
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  Unternehmenszahlen
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Analysiere Umsätze, EBITDA, Gewinne und andere fundamentale Kennzahlen. 
                Verstehe die finanzielle Gesundheit von Unternehmen und treffe 
                datenbasierte Investment-Entscheidungen.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Jahresabschlüsse & Quartalszahlen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">KGV, KBV & weitere Bewertungskennzahlen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Historische Trends & Vergleiche</span>
                </div>
              </div>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                Aktien analysieren
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Schnäppchen-Radar Section */}
      <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                <StarIcon className="w-4 h-4" />
                Schnäppchen-Radar
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Finde
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  günstige Aktien
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Entdecke Aktien aus deiner Watchlist, die unter ihrem 52-Wochen-Hoch handeln. 
                Setze deine eigene Schwelle und erhalte Alerts wenn Quality-Aktien 
                zu attraktiven Preisen verfügbar sind.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Individuelle Schwellen-Einstellung</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">52-Wochen-Hoch Vergleich</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Automatische Schnäppchen-Alerts</span>
                </div>
              </div>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                Radar aktivieren
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Schnäppchen-Radar Preview */}
            <div ref={watchlistRef} className="relative">
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Schnäppchen-Radar</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="text-gray-400">Schwelle:</div>
                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">-15%</div>
                  </div>
                </div>

                {/* Radar Items */}
                <div className="space-y-4">
                  {[
                    { symbol: 'AAPL', name: 'Apple Inc.', current: '$185.24', high52w: '$199.62', discount: '-7.2%', severity: 'low' },
                    { symbol: 'MSFT', name: 'Microsoft', current: '$378.91', high52w: '$468.35', discount: '-19.1%', severity: 'high' },
                    { symbol: 'GOOGL', name: 'Alphabet', current: '$142.56', high52w: '$191.75', discount: '-25.7%', severity: 'high' },
                    { symbol: 'DIS', name: 'Walt Disney', current: '$96.73', high52w: '$123.74', discount: '-21.8%', severity: 'high' }
                  ].map((stock, index) => (
                    <div 
                      key={stock.symbol} 
                      className={`flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all duration-500 ${
                        watchlistVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 150}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{stock.symbol.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm flex items-center gap-2">
                            {stock.symbol}
                            {stock.severity === 'high' && (
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{stock.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white text-sm">{stock.current}</div>
                        <div className="text-xs text-gray-500">52W: {stock.high52w}</div>
                        <div className={`text-xs font-bold ${
                          stock.severity === 'high' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {stock.discount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alert Summary */}
                <div className={`mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg transform transition-all duration-1000 ${
                  watchlistVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`} style={{ transitionDelay: '800ms' }}>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <StarIcon className="w-4 h-4" />
                    <span>3 Schnäppchen unter -15% gefunden</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Nächste Prüfung in 4h
                  </div>
                </div>
              </div>

              {/* Background glow */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Super Investors Showcase - Interaktiver Kartenstack */}
      <section className="bg-gray-950 noise-bg py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Zentrierter Titel */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <UserGroupIcon className="w-4 h-4" />
              Super-Investoren
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Lerne von den
              <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                besten Investoren
              </span>
            </h2>
            
            <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-3xl mx-auto">
              Verfolge die Portfolios und Strategien der erfolgreichsten Investoren der Welt.
              Von Warren Buffett bis Bill Ackman - erhalte Einblicke in ihre Investment-Philosophien.
            </p>
            
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
            >
              Alle Investoren ansehen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {/* Sehr breite Karten - Full Width */}
          <div className="flex justify-center">
            <div className="relative h-[500px] w-full max-w-4xl">
              {safeInvestorData.map((investor, index) => {
                const isActive = index === activeCard;
                const offset = (index - activeCard) * 40;
                const zIndex = 3 - Math.abs(index - activeCard);
                const scale = isActive ? 1 : 0.92 - Math.abs(index - activeCard) * 0.03;
                
                return (
                  <div
                    key={index}
                    onClick={() => setActiveCard(index)}
                    className={`absolute inset-0 bg-gray-900/90 border border-gray-700 rounded-2xl p-8 backdrop-blur-sm cursor-pointer transition-all duration-500 hover:border-green-500/50 ${
                      isActive ? 'shadow-2xl shadow-green-500/10' : 'shadow-lg'
                    }`}
                    style={{
                      transform: `translateY(${offset}px) scale(${scale})`,
                      zIndex: zIndex,
                    }}
                  >
                    {/* Card Header */}
                    <div className="mb-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-white">{investor.name}</h3>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">{investor.date}</div>
                          <div className="text-xs text-gray-500">{investor.filingId}</div>
                        </div>
                      </div>
                      <div className="text-base text-gray-300 mb-1">{investor.investor}</div>
                      <div className="text-lg font-semibold text-green-400">{investor.totalValue}</div>
                      <div className="text-sm text-gray-500 mt-1">{investor.tickers}</div>
                    </div>

                    {/* Portfolio Table - Breiter */}
                    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-700/50 text-sm font-medium text-gray-300">
                        <div>Ticker</div>
                        <div>Market Value</div>
                        <div>Portfolio %</div>
                      </div>
                      
                      {/* Table Rows */}
                      <div className="space-y-2 p-4">
                        {investor.holdings.map((holding: { ticker: string; value: string; percentage: string }, holdingIndex: number) => (
                          <div key={holdingIndex} className="grid grid-cols-3 gap-4 py-3 px-2 text-sm hover:bg-gray-700/30 rounded">
                            <div className="font-medium text-white">{holding.ticker}</div>
                            <div className="text-gray-300">{holding.value}</div>
                            <div className="text-gray-400">{holding.percentage}%</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card Indicator */}
                    <div className="flex justify-center mt-6 space-x-2">
                      {safeInvestorData.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                            i === activeCard ? 'bg-green-400' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Broker Comparison */}
      <section className="bg-gray-950 noise-bg py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-4 backdrop-blur-sm">
            <ChartBarIcon className="w-4 h-4" />
            Broker-Vergleich
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2">
            Online Broker im Vergleich
          </h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Die besten Online Broker für Aktien und ETFs. 
            Vergleiche Features, Kosten und finde den passenden Broker für deine Investments.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Scalable Capital */}
            <a 
              href="https://de.scalable.capital/trading-aff?utm_medium=affiliate&utm_source=qualityclick&utm_campaign=broker&utm_term=764&c_id=QC5-b486e7461716d777857i74425940697f6676687279547b46" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group bg-gray-900/70 border border-gray-800 hover:border-green-500/50 rounded-xl p-6 transition-all duration-200 hover:bg-gray-900/80 hover:scale-105 hover:shadow-xl hover:shadow-green-500/5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Image
                    src="/broker-logos/scalable-capital.svg"
                    alt="Scalable Capital"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                    Scalable Capital
                  </h4>
                  <p className="text-sm text-gray-400">
                    ETFs ab 0€ • Sparpläne kostenlos
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>Über 2.000 ETFs verfügbar</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>Kostenlose Sparpläne ab 1€</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>XETRA-Handel verfügbar</span>
                </div>
              </div>
            </a>
            
            {/* Trade Republic */}
            <a 
              href="https://traderepublic.com/de-de/nocodereferral?code=46xwv4b4" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group bg-gray-900/70 border border-gray-800 hover:border-green-500/50 rounded-xl p-6 transition-all duration-200 hover:bg-gray-900/80 hover:scale-105 hover:shadow-xl hover:shadow-green-500/5 backdrop-blur-sm"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Image
                    src="/broker-logos/trade-republic.svg"
                    alt="Trade Republic"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <div className="text-left flex-1">
                  <h4 className="font-semibold text-white group-hover:text-green-400 transition-colors">
                    Trade Republic
                  </h4>
                  <p className="text-sm text-gray-400">
                    Aktien ab 1€ • Mobile-First
                  </p>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
              </div>
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>Aktien und ETFs ab 1€</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>Intuitive Mobile App</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckIcon className="w-3 h-3 text-green-400" />
                  <span>Kostenloses Girokonto</span>
                </div>
              </div>
            </a>
          </div>
          
          <div className="mt-8 text-xs text-gray-500 space-y-1">
            <p>Werbung • Bei Depoteröffnung über diese Links erhalten wir eine kleine Provision</p>
            <p>Dies ist keine Anlageberatung. Bitte informiere dich ausführlich vor einer Investition.</p>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="bg-gray-950 noise-bg py-24 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-green-500/3 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span>Newsletter</span>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Nie wieder ein
              <span className="block bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Update verpassen
              </span>
            </h3>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Quartalsweise Updates über neue 13F-Filings, marktbewegende Ereignisse 
              und Insights unserer Top-Investor-Analysen.
            </p>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm hover:bg-gray-900/80 transition-all duration-300">
              <NewsletterSignup />
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-6 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-3 h-3 text-green-400" />
                <span>Quartalsweise Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-3 h-3 text-green-400" />
                <span>Jederzeit kündbar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-3 h-3 text-green-400" />
                <span>Keine Werbung</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}