// Professional Homepage - Deutsch & Sparsam mit Grün
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
  StarIcon,
  BoltIcon,
  DocumentTextIcon,
  CpuChipIcon,
  BuildingOfficeIcon,
  
} from '@heroicons/react/24/outline'
import SearchTickerInput from '@/components/SearchTickerInput'
import { investors } from '@/data/investors'
import NewsletterSignup from '@/components/NewsletterSignup'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorCardStack from '@/components/InvestorCardStack'

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
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const totalValue = latest.positions.reduce((sum, p) => sum + p.value, 0);

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

export default function ProfessionalHomePage() {
  const router = useRouter()

  // Animation Refs
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartRef, chartVisible] = useIntersectionObserver(0.3);
  const [marketChartRef, marketChartVisible] = useIntersectionObserver(0.3);
  const [watchlistRef, watchlistVisible] = useIntersectionObserver(0.3);
  const [aiRef, aiVisible] = useIntersectionObserver(0.3);

  // Echte Investor Data mit Fallback
  const investorData = getRealPortfolioData();
  
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
    <div className="min-h-screen bg-gray-950">
      
      {/* 🏛️ PROFESSIONAL HERO - Dezent */}
      <div className="bg-gray-950 pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          {/* Minimaler Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-white/1 rounded-full blur-3xl"></div>
          
          <div className="relative text-center space-y-8">
            
            {/* Professional Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Professionelle
              </h1>
              <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="text-gray-300">
                  Aktienanalyse
                </span>
              </h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Profi-Tools für die Aktienanalyse. Fundamentaldaten, Investor-Portfolios 
              und KI-Insights – alles in einem Terminal.
            </p>

            {/* CTA Buttons - Nur EINER mit Grün */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/analyse"
                className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                Terminal öffnen
              </Link>
              <Link
                href="/superinvestor"
                className="px-8 py-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition border border-gray-700"
              >
                Portfolio-Tracking
              </Link>
            </div>
          </div>
        </div>
      </div>

{/* 📊 STATS SECTION - Fokus auf Zahlen */}
<div className="bg-gray-950 py-20 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Stats Grid - Responsive: 2 Spalten auf Mobile, 4 auf Desktop */}
          <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center mb-20">
            <div className={`p-4 md:p-6 bg-gray-900/50 border border-gray-800 rounded-xl transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="text-2xl md:text-3xl font-bold text-white numeric mb-2">
                {useCountUp(10000, 2000, statsVisible).toLocaleString('de-DE')}+
              </div>
              <div className="text-xs md:text-sm text-gray-400">Aktien & ETFs</div>
            </div>
            <div className={`p-4 md:p-6 bg-gray-900/50 border border-gray-800 rounded-xl transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="text-2xl md:text-3xl font-bold text-white numeric mb-2">
                {useCountUp(15, 2200, statsVisible)}
              </div>
              <div className="text-xs md:text-sm text-gray-400">Jahre Historie</div>
            </div>
            <div className={`p-4 md:p-6 bg-gray-900/50 border border-gray-800 rounded-xl transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="text-2xl md:text-3xl font-bold text-white numeric mb-2">
                {useCountUp(70, 2400, statsVisible)}+
              </div>
              <div className="text-xs md:text-sm text-gray-400">Super-Investoren</div>
            </div>
            <div className={`p-4 md:p-6 bg-gray-900/50 border border-gray-800 rounded-xl transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '600ms' }}>
              <div className="text-2xl md:text-3xl font-bold text-white numeric mb-2">
                24/7
              </div>
              <div className="text-xs md:text-sm text-gray-400">Live-Daten</div>
            </div>
          </div>

          {/* Platform Preview Section */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm font-medium mb-6">
                <ChartBarIcon className="w-4 h-4" />
                Analyse Terminal
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Alle Kennzahlen
                <span className="block text-gray-300">
                  an einem Ort
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Von Quartalszahlen über Bewertungskennzahlen bis hin zu technischen Indikatoren - 
                alles was professionelle Analysten für fundierte Entscheidungen benötigen.
              </p>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700"
              >
                Terminal testen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Professional Terminal Preview */}
            <div ref={chartRef} className="relative">
              <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Terminal Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                  <div className="w-8 h-8 rounded-lg overflow-hidden">
                    <Image
                      src="/logos/aapl.png"
                      alt="Apple Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">AAPL</h3>
                    <p className="text-sm text-gray-400">Apple Inc.</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xl font-bold text-white">$185.24</div>
                    <div className="text-sm text-green-400">+2.1% (+$3.82)</div>
                  </div>
                </div>

                {/* Data Grid - Like Your Dashboard */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Market Cap', value: '$2.85T', change: null },
                    { label: 'KGV', value: '28.4', change: null },
                    { label: 'Umsatz (TTM)', value: '$394.3B', change: '+5.8%' },
                    { label: 'EPS (TTM)', value: '$6.16', change: '+8.3%' },
                    { label: 'ROE', value: '160.58%', change: '+12.4%' },
                    { label: 'Verschuldungsgrad', value: '1.73', change: null }
                  ].map((metric, index) => (
                    <div 
                      key={metric.label}
                      className={`bg-gray-800 rounded-lg p-3 transform transition-all duration-500 ${
                        chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`} 
                      style={{ transitionDelay: `${800 + index * 100}ms` }}
                    >
                      <div className="text-xs text-gray-400 mb-1">{metric.label}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white font-semibold numeric">{metric.value}</div>
                        {metric.change && (
                          <div className="text-xs text-green-400">{metric.change}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini Chart - Subtil mit Blau */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2">Kursverlauf (6M)</div>
                  <div className="flex items-end gap-1 h-12">
                    {[40, 45, 35, 50, 65, 55, 70, 60, 75, 85, 80, 90].map((height, i) => (
                      <div
                        key={i}
                        className="bg-blue-500 rounded-sm flex-1 transition-all duration-1000 ease-out"
                        style={{ 
                          height: chartVisible ? `${height}%` : '0%',
                          transitionDelay: `${i * 50 + 1200}ms`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Info Card - Minimal */}
              <div className={`absolute -right-4 -bottom-4 bg-gray-900 border border-gray-600 rounded-lg p-4 transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
              }`} style={{ transitionDelay: '1400ms' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Image
                    src="/images/buffett-cartoon.png"
                    alt="Warren Buffett"
                    width={20}
                    height={20}
                    className="rounded-full object-cover"
                  />
                  <span className="text-white text-xs font-medium">Buffett hält</span>
                </div>
                <div className="text-yellow-400 font-bold text-sm">915M Aktien</div>
                <div className="text-xs text-gray-400">~$170B Position</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📈 FUNDAMENTALS SECTION - Minimal */}
      <section className="bg-gray-950 py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Realistic Chart */}
            <div ref={marketChartRef} className="relative">
              <div className={`bg-gray-900 border border-gray-700 rounded-xl p-8 transform transition-all duration-1000 ${
                marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                      <Image
                        src="/logos/msft.png"
                        alt="Microsoft Logo"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">MSFT</h3>
                      <p className="text-sm text-gray-400">Umsatzanalyse</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">$211.9B</div>
                    <div className="text-xs text-gray-400">FY 2024</div>
                  </div>
                </div>

                {/* Professional Chart */}
                <div className="h-48 bg-gray-800 rounded-lg p-4 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 160">
                    {/* Grid */}
                    <defs>
                      <pattern id="grid3" width="50" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.2"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid3)" />
                    
                    {/* Revenue Line - Subtil Blau */}
                    <path
                      d="M 40 120 L 100 110 L 160 95 L 220 75 L 280 65 L 340 50"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="transition-all duration-3000 ease-out"
                      style={{
                        strokeDasharray: marketChartVisible ? 'none' : '1000',
                        strokeDashoffset: marketChartVisible ? '0' : '1000',
                        transitionDelay: '500ms'
                      }}
                    />
                    
                    {/* Data Points */}
                    {[
                      { x: 40, y: 120 },
                      { x: 100, y: 110 },
                      { x: 160, y: 95 },
                      { x: 220, y: 75 },
                      { x: 280, y: 65 },
                      { x: 340, y: 50 }
                    ].map((point, index) => (
                      <circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill="#3b82f6"
                        className="transition-all duration-500 ease-out"
                        style={{
                          opacity: marketChartVisible ? '1' : '0',
                          transform: marketChartVisible ? 'scale(1)' : 'scale(0)',
                          transitionDelay: `${1000 + (index * 150)}ms`
                        }}
                      />
                    ))}
                  </svg>
                  
                  {/* Years */}
                  <div className="absolute bottom-2 left-4 right-4 flex justify-between text-xs text-gray-500">
                    <span>2019</span>
                    <span>2020</span>
                    <span>2021</span>
                    <span>2022</span>
                    <span>2023</span>
                    <span>2024</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2000ms' }}>
                    <div className="text-sm font-bold text-white">$88.5B</div>
                    <div className="text-xs text-gray-400">Betriebsergebnis</div>
                  </div>
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2100ms' }}>
                    <div className="text-sm font-bold text-white">42.2%</div>
                    <div className="text-xs text-gray-400">Bruttomarge</div>
                  </div>
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2200ms' }}>
                    <div className="text-sm font-bold text-white">28.2</div>
                    <div className="text-xs text-gray-400">KGV</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium mb-6">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Fundamentalanalyse
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Datenbasierte
                <span className="block text-gray-300">
                  Entscheidungen treffen
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Analysiere Umsätze, Margen, Cash Flow und Bewertungskennzahlen. 
                Verstehe die finanzielle Performance von Unternehmen durch 
                professionelle Analyse-Tools und historische Trends.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">15+ Jahre Jahresabschlüsse & Quartalszahlen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">60+ Fundamentale Kennzahlen (KGV, KBV, ROE, etc.)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">Peer-Vergleiche & Branchen-Benchmarks</span>
                </div>
              </div>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700"
              >
                Fundamentaldaten analysieren
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 🤖 AI SECTION - Professional */}
      <section className="bg-gray-950 py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-sm font-medium mb-6">
                <CpuChipIcon className="w-4 h-4" />
                Finclue AI
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                KI-gestützter
                <span className="block text-gray-300">
                  Research Assistent
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Nutze KI für komplexe Finanzanalysen. Stelle Fragen zu Quartalszahlen, 
                vergleiche Portfolios oder lass dir Kennzahlen in natürlicher Sprache erklären.
                Direkter Zugriff auf SEC-Filings und Echtzeit-Daten.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">Live-Zugriff auf SEC 13F Filings</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">Portfolio-Analysen der Super-Investoren</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-300">Natürlichsprachige Finanzanalyse</span>
                </div>
              </div>
              
              <Link
                href="/analyse/ai" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700"
              >
                KI-Assistent nutzen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Professional AI Chat Preview */}
            <div ref={aiRef} className="relative">
              <div className={`bg-gray-900 border border-gray-700 rounded-xl p-6 transform transition-all duration-1000 ${
                aiVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Chat Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
                  <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                    <CpuChipIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Finclue AI</h3>
                    <p className="text-sm text-gray-400">Research Assistent</p>
                  </div>
                  <div className="ml-auto">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-xs text-gray-400">Online</span>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-4 mb-6">
                  {/* User Message */}
                  <div className={`flex justify-end transform transition-all duration-500 ${
                    aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`} style={{ transitionDelay: '500ms' }}>
                    <div className="bg-gray-700 text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Analysiere Berkshire Hathaways Q3 Portfolio-Änderungen</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className={`flex justify-start transform transition-all duration-500 ${
                    aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`} style={{ transitionDelay: '800ms' }}>
                    <div className="bg-gray-800 border border-gray-600 p-4 rounded-lg max-w-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                        <span className="text-xs text-purple-400 font-medium">Finclue AI</span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">
                        Basierend auf dem aktuellen 13F Filing (Q3 2024):
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">AAPL Position:</span>
                          <span className="text-white">-25% (reduziert)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">BAC Verkäufe:</span>
                          <span className="text-white">$3.8B verkauft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cash Position:</span>
                          <span className="text-green-400">$325B (+18%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up */}
                  <div className={`flex justify-end transform transition-all duration-500 ${
                    aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`} style={{ transitionDelay: '1200ms' }}>
                    <div className="bg-gray-700 text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Zeige mir Apples Q3 Quartalszahlen</p>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className={`flex items-center gap-2 text-gray-400 transform transition-all duration-500 ${
                  aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`} style={{ transitionDelay: '1500ms' }}>
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <span className="text-xs">Analysiere AAPL 10-Q Filing...</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 PORTFOLIO TRACKING - Professional */}
      <section className="bg-gray-950 py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium mb-6">
                <BuildingOfficeIcon className="w-4 h-4" />
                Portfolio-Tracking
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Institutionelle Portfolios
                <span className="block text-gray-300">
                  verfolgen
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Verfolge die Portfolios der erfolgreichsten Investoren in Echtzeit. 
                Erhalte Alerts bei Änderungen und analysiere Investment-Strategien 
                basierend auf SEC 13F Filings.
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">90+ Institutionelle Investoren</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">Quartalsweise 13F Filing Updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">Portfolio-Änderungs-Alerts</span>
                </div>
              </div>
              
              <Link
                href="/superinvestor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700"
              >
                Portfolio Tracker
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Professional Portfolio Table */}
            <div ref={watchlistRef} className="relative">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                  <h3 className="text-lg font-bold text-white">Institutionelle Holdings</h3>
                  <div className="text-sm text-gray-400">Letzte Aktualisierung: Q3 2024</div>
                </div>

                {/* Portfolio Table */}
                <div className="space-y-3">
                  {[
                    { fund: 'Berkshire Hathaway', manager: 'W. Buffett', aum: '$258B', change: '-12.8%', top: 'AAPL 26%' },
                    { fund: 'Pershing Square', manager: 'B. Ackman', aum: '$18.2B', change: '+24.1%', top: 'UMG 28%' },
                    { fund: 'Baupost Group', manager: 'S. Klarman', aum: '$27.4B', change: '+8.7%', top: 'META 12%' },
                    { fund: 'Appaloosa', manager: 'D. Tepper', aum: '$13.1B', change: '-3.2%', top: 'GOOGL 18%' }
                  ].map((fund, index) => (
                    <div 
                      key={fund.fund} 
                      className={`grid grid-cols-5 gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-all duration-500 text-sm ${
                        watchlistVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                      }`}
                      style={{ transitionDelay: `${index * 150}ms` }}
                    >
                      <div>
                        <div className="font-medium text-white text-xs">{fund.fund}</div>
                        <div className="text-xs text-gray-400">{fund.manager}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white text-xs">{fund.aum}</div>
                        <div className="text-xs text-gray-400">AUM</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium text-xs ${
                          fund.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                        }`}>{fund.change}</div>
                        <div className="text-xs text-gray-400">Q/Q</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white text-xs">{fund.top}</div>
                        <div className="text-xs text-gray-400">Top</div>
                      </div>
                      <div className="flex justify-end">
                        <button className="text-blue-400 hover:text-blue-300 text-xs">Ansehen →</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className={`mt-6 p-3 bg-gray-800 rounded-lg transform transition-all duration-1000 ${
                  watchlistVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`} style={{ transitionDelay: '800ms' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Gesamtes verwaltetes Vermögen</span>
                    <span className="text-white font-medium">$316.7B</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏛️ SUPER INVESTORS SHOWCASE - Clean & Minimal */}
      <section className="bg-gray-950 py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium mb-6">
              <UserGroupIcon className="w-4 h-4" />
              Super-Investoren
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Portfolios der
              <span className="block text-gray-300">
                erfolgreichsten Investoren
              </span>
            </h2>

            <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto">
              Verfolge die Investmentstrategien der Top-Investoren basierend auf SEC 13F Filings.
            </p>
          </div>

          {/* Clean Investor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {safeInvestorData.slice(0, 3).map((investor, index) => {
              const getSlug = (name: string) => {
                if (name.includes('Warren Buffett')) return 'buffett'
                if (name.includes('Bill Ackman')) return 'ackman' 
                if (name.includes('Howard Marks')) return 'marks'
                return 'buffett'
              }
              
              const slug = getSlug(investor.investor)
              
              return (
                <Link
                  key={index}
                  href={`/superinvestor/${slug}`}
                  className="group bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl p-6 transition-all duration-300 hover:bg-gray-850"
                >
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-600">
                      <Image
                        src={`/images/${slug}.png`}
                        alt={investor.investor}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white group-hover:text-gray-200 transition-colors">
                        {investor.investor}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{investor.name}</p>
                    </div>
                  </div>

                  {/* Portfolio Value */}
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-1">Portfolio Wert</div>
                    <div className="text-2xl font-bold text-white">{investor.totalValue}</div>
                  </div>

                  {/* Top Holdings */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-400 mb-3">Top Holdings</div>
                    <div className="space-y-2">
                      {investor.holdings.slice(0, 3).map((holding) => (
                        <div key={holding.ticker} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">{holding.ticker}</span>
                          <span className="text-sm text-gray-400">{holding.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View Link */}
                  <div className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    <span>Portfolio ansehen</span>
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Simple CTA */}
          <div className="text-center">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700"
            >
              Alle 90+ Investoren durchsuchen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER + BROKER - Professional */}
      <section className="bg-gray-950 py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Newsletter Section */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center mb-20">
            
            {/* Left: Content (3 columns) */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium mb-6">
                <DocumentTextIcon className="w-4 h-4" />
                Research Updates
              </div>
              
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Bleibe informiert
                <span className="block text-gray-300">
                  über Markt-Updates
                </span>
              </h3>
              <p className="text-lg text-gray-400 leading-relaxed mb-8">
                Quartalsweise Research-Updates zu institutionellen Portfolio-Änderungen, 
                Marktanalysen und neuen Platform-Features. Professionelle Insights 
                ohne Spam.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-gray-300">Quartalsweise 13F Updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-gray-300">Kein Spam Policy</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-gray-300">Marktanalysen</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-gray-300">Platform Updates</span>
                </div>
              </div>
            </div>
            
            {/* Right: Newsletter Form (2 columns) */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8">
                <NewsletterSignup />
              </div>
            </div>
          </div>

          {/* Broker Section - Professional */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium mb-4">
                <BuildingOfficeIcon className="w-4 h-4" />
                Broker-Vergleich
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Professionelle Trading-Plattformen
              </h3>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Vergleiche institutional-grade Broker für Aktien- und ETF-Trading. 
                Kosteneffiziente Lösungen für professionelle Anleger.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Scalable Capital */}
              <a 
                href="https://de.scalable.capital/trading-aff?utm_medium=affiliate&utm_source=qualityclick&utm_campaign=broker&utm_term=764&c_id=QC5-b486e7461716d777857i74425940697f6676687279547b46" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-2xl p-8 transition-all duration-300 hover:bg-gray-850"
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Image
                      src="/broker-logos/scalable-capital.svg"
                      alt="Scalable Capital"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors mb-1">
                      Scalable Capital
                    </h4>
                    <p className="text-gray-400 font-medium">
                      ETF Trading • Kommissionsfrei
                    </p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>2.000+ ETFs verfügbar</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Bruchstücke ab €1</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>XETRA Marktzugang</span>
                  </div>
                </div>
              </a>
              
              {/* Trade Republic */}
              <a 
                href="https://traderepublic.com/de-de/nocodereferral?code=46xwv4b4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-2xl p-8 transition-all duration-300 hover:bg-gray-850"
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Image
                      src="/broker-logos/trade-republic.svg"
                      alt="Trade Republic"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors mb-1">
                      Trade Republic
                    </h4>
                    <p className="text-gray-400 font-medium">
                      Aktien • Mobile Trading
                    </p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Aktien & ETFs ab €1</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Professionelle Mobile App</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>Integriertes Banking</span>
                  </div>
                </div>
              </a>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-500 space-y-1">
              <p>Werbung • Wir erhalten eine Provision bei Depoteröffnung über diese Links</p>
              <p>Dies ist keine Anlageberatung. Bitte informiere dich ausführlich vor einer Investition.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}