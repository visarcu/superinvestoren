// src/app/superinvestor/page.tsx - MODERNISIERTE VERSION wie Homepage mit SuperinvestorInfo
'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowRightIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  CheckIcon,
  StarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import { investors } from '@/data/investors'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorAvatar from '@/components/InvestorAvatar'
import YouTubeCarousel from '@/components/YoutubeCarousel'
import { featuredVideos } from '@/data/videos'
import NewsletterSignup from '@/components/NewsletterSignup'
import SuperinvestorInfo from '@/components/SuperinvestorInfo'

// Animation Hooks (von Homepage übernommen)
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

// Helper functions
function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

function getTicker(position: any): string | null {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.ticker || null
}

function getStockName(position: any): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const stock = stocks.find(s => s.cusip === position.cusip)
  return stock?.name || position.name || position.cusip
}

function peekPositions(slug: string) {
  const snaps = holdingsHistory[slug]
  if (!Array.isArray(snaps) || snaps.length === 0) return []
  const latest = snaps[snaps.length - 1].data
  const map = new Map<string, { shares: number; value: number }>()
  
  latest.positions.forEach(p => {
    const ticker = getTicker(p)
    const key = ticker || p.cusip
    
    const prev = map.get(key)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(key, { shares: p.shares, value: p.value })
    }
  })
  
  return Array.from(map.entries())
    .map(([key, { shares, value }]) => {
      const ticker = getTicker({ ticker: key, cusip: key })
      const name = getStockName({ ticker: key, cusip: key, name: key })
      
      return { 
        ticker: ticker || key, 
        name: name || key, 
        value 
      }
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
}

// Real portfolio data generator
const getRealPortfolioData = () => {
  const investorSlugs = ['buffett', 'ackman', 'smith'];
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
      smith: {
        name: 'Fundsmith Equity',
        investor: 'Terry Smith',
        filingId: '1172748'
      }
    };

    const info = investorInfo[slug as keyof typeof investorInfo];
    if (!info) return;

    portfolios.push({
      name: info.name,
      investor: info.investor,
      date: latest.date?.split('-').reverse().join('.') || '29.09.2024',
      filingId: info.filingId,
      totalValue: `${(totalValue / 1000000000).toFixed(1)}B`,
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

export default function SuperinvestorOverview() {
  // Animation Refs
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartRef, chartVisible] = useIntersectionObserver(0.3);
  const [investorsRef, investorsVisible] = useIntersectionObserver(0.3);

  // Kartenstack State
  const [activeCard, setActiveCard] = useState(0);

  // Portfolio-Werte berechnen
  const portfolioValue: Record<string, number> = {}
  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return
    const total = latest.positions.reduce((sum, p) => sum + p.value, 0)
    portfolioValue[slug] = total
  })

  const highlighted = ['buffett', 'ackman', 'smith']

  // Portfolio-Daten für Kartenstack
  const investorData = getRealPortfolioData();
  const safeInvestorData = investorData.length > 0 ? investorData : [
    {
      name: 'Berkshire Hathaway Inc',
      investor: 'Warren Buffett',
      date: '29.09.2024',
      filingId: '1067983',
      totalValue: '266.7B',
      tickers: 'AAPL, BAC, AXP, KO',
      holdings: [
        { ticker: 'AAPL', value: '69.9B', percentage: '26.0' },
        { ticker: 'BAC', value: '31.7B', percentage: '12.0' },
        { ticker: 'AXP', value: '25.1B', percentage: '9.5' },
        { ticker: 'KO', value: '22.4B', percentage: '8.5' },
        { ticker: 'CVX', value: '18.6B', percentage: '7.0' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Hero Section - Modernisiert */}
      <div className="bg-gray-950 noise-bg pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
          
          <div className="relative text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium hover:bg-green-500/20 transition-colors backdrop-blur-sm">
              <UserGroupIcon className="w-4 h-4" />
              <span>Super-Investoren</span>
              <ArrowRightIcon className="w-3 h-3" />
            </div>
            
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Die besten Investoren
              </h1>
              <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  der Welt
                </span>
              </h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Entdecke, wie Legenden wie Warren Buffett, Bill Ackman und Terry Smith investieren.<br />
              Erhalte Einblicke in ihre Strategien und verfolge ihre Portfolio-Bewegungen.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/superinvestor/investors"
                className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                Alle Investoren entdecken
              </Link>
              <Link
                href="/superinvestor/insights"
                className="px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
              >
                Market Insights
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-950 noise-bg py-20 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Stats Grid */}
          <div ref={statsRef} className="grid grid-cols-3 gap-8 text-center mb-20">
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                {useCountUp(70, 2000, statsVisible)}+
              </div>
              <div className="text-xs text-gray-500">Super-Investoren</div>
            </div>
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                ${useCountUp(2500, 2200, statsVisible).toLocaleString('de-DE')}B+
              </div>
              <div className="text-xs text-gray-500">Verwaltetes Vermögen</div>
            </div>
            <div className={`p-4 transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="text-3xl font-bold text-white numeric mb-1">
                {useCountUp(15, 2400, statsVisible)}+
              </div>
              <div className="text-xs text-gray-500">Jahre Track Record</div>
            </div>
          </div>

          {/* ✅ SuperinvestorInfo Integration */}
          <div className="mb-20">
            <SuperinvestorInfo />
          </div>

          {/* Preview Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Lerne von den
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  erfolgreichsten Investoren
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Verfolge die Portfolios und Strategien der besten Investoren der Welt. 
                Von 13F-Filings bis hin zu detaillierten Portfolio-Analysen - 
                erhalte exklusive Einblicke in ihre Investment-Philosophien.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Quartalsweise 13F-Filing Updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Portfolio-Änderungen in Echtzeit</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Detaillierte Investment-Strategien</span>
                </div>
              </div>
              
              <Link
                href="/superinvestor/investors"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              >
                Alle Investoren ansehen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Portfolio Preview */}
            <div ref={chartRef} className="relative">
              <div className={`bg-gray-900/80 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-black font-bold text-sm">👑</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Warren Buffett</h3>
                    <p className="text-sm text-gray-400">Berkshire Hathaway</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-bold text-green-400">$266.7B</div>
                    <div className="text-xs text-gray-500">Portfolio Value</div>
                  </div>
                </div>

                {/* Top Holdings Chart */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <div className="text-xs text-gray-400 mb-3">Top Holdings</div>
                  <div className="space-y-3">
                    {[
                      { ticker: 'AAPL', percentage: 26.0, color: 'bg-blue-500' },
                      { ticker: 'BAC', percentage: 12.0, color: 'bg-green-500' },
                      { ticker: 'AXP', percentage: 9.5, color: 'bg-purple-500' },
                      { ticker: 'KO', percentage: 8.5, color: 'bg-red-500' },
                    ].map((holding, index) => (
                      <div key={holding.ticker} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{holding.ticker.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-white text-sm font-medium">{holding.ticker}</span>
                            <span className="text-gray-400 text-xs">{holding.percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`${holding.color} h-1.5 rounded-full transition-all duration-1000 ease-out`}
                              style={{ 
                                width: chartVisible ? `${holding.percentage * 4}%` : '0%',
                                transitionDelay: `${(index + 1) * 200 + 500}ms`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1200ms' }}>
                    <div className="text-xs text-gray-500">Holdings</div>
                    <div className="text-white font-semibold">45</div>
                  </div>
                  <div className={`bg-gray-800/30 rounded-lg p-3 transform transition-all duration-500 ${
                    chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '1300ms' }}>
                    <div className="text-xs text-gray-500">Last Update</div>
                    <div className="text-white font-semibold">Q3 2024</div>
                  </div>
                </div>
              </div>

              {/* Background glow */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl blur-xl -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Investors Section */}
      <section className="bg-gray-950 noise-bg py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div ref={investorsRef} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <TrophyIcon className="w-4 h-4" />
              Featured Investoren
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Die Top
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Performer</span>
            </h2>
          </div>
          
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 transform transition-all duration-1000 ${
            investorsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            {investors
              .filter(i => highlighted.includes(i.slug))
              .map((inv, index) => {
                const peek = peekPositions(inv.slug)
                const portfolioVal = portfolioValue[inv.slug] || 0
                
                return (
                  <Link
                    key={inv.slug}
                    href={`/superinvestor/${inv.slug}`}
                    className="group bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 relative overflow-hidden"
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    {/* Crown for Buffett */}
                    {inv.slug === 'buffett' && (
                      <div className="absolute top-4 right-4">
                        <span className="text-yellow-400 text-2xl">👑</span>
                      </div>
                    )}
                    
                    {/* Profile Image */}
                    <div className="flex justify-center mb-6">
                      <InvestorAvatar
                        name={inv.name}
                        imageUrl={inv.imageUrl}
                        size="xl"
                        className="ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-200"
                      />
                    </div>
                    
                    {/* Name */}
                    <h3 className="text-xl font-bold text-white text-center mb-2 group-hover:text-blue-400 transition-colors">
                      {inv.name.split('–')[0].trim()}
                    </h3>
                    
                    {/* Portfolio Value */}
                    <p className="text-center text-gray-400 mb-4">
                      Portfolio: <span className="text-green-400 font-medium">
                        {formatCurrency(portfolioVal, 'USD', 1)}
                      </span>
                    </p>
                    
                    {/* Top 3 Holdings Preview */}
                    {peek.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500 text-center mb-3">Top Holdings:</p>
                        {peek.slice(0, 3).map((p, idx) => (
                          <div key={p.ticker} className="flex justify-between items-center text-sm">
                            <span className="text-gray-300">{idx + 1}. {p.ticker}</span>
                            <span className="text-gray-500 truncate ml-2">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* View Portfolio Button */}
                    <div className="mt-6 text-center">
                      <span className="inline-flex items-center gap-1 text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                        Portfolio ansehen
                        <ArrowRightIcon className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                )
              })}
          </div>

          {/* Quick Access zu Unterseiten */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/superinvestor/investors"
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all"
            >
              <UserGroupIcon className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Alle Investoren
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Vollständige Liste mit erweiterten Filtern und Suchfunktion
              </p>
              <span className="text-blue-400 text-sm font-medium">
                Entdecken →
              </span>
            </Link>

            <Link
              href="/superinvestor/insights"
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all"
            >
              <ChartBarIcon className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                Market Insights
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Top Käufe, beliebteste Aktien und detaillierte Markt-Analysen
              </p>
              <span className="text-green-400 text-sm font-medium">
                Analysieren →
              </span>
            </Link>

            <Link
              href="/superinvestor/trends"
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all"
            >
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Trends & Bewegungen
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Neue Positionen, große Käufe und Verkäufe der Super-Investoren
              </p>
              <span className="text-purple-400 text-sm font-medium">
                Verfolgen →
              </span>
            </Link>

            <Link
              href="/superinvestor/activity"
              className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/70 hover:border-gray-700 transition-all"
            >
              <DocumentTextIcon className="w-8 h-8 text-yellow-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                13F Filings
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Alle Quartalsberichte, Filing-Kalender und historische Daten
              </p>
              <span className="text-yellow-400 text-sm font-medium">
                Durchsuchen →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Portfolio Showcase */}
      <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <StarIcon className="w-4 h-4" />
              Live Portfolios
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Portfolio
              <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Deep-Dives
              </span>
            </h2>
            
            <p className="text-lg text-gray-400 mb-8 leading-relaxed max-w-3xl mx-auto">
              Tauche tief in die Portfolios der erfolgreichsten Investoren ein. 
              Verfolge ihre Positionen, Strategien und Bewegungen in Echtzeit.
            </p>
          </div>

          {/* Interactive Portfolio Cards */}
          <div className="max-w-6xl mx-auto">
            <div className="relative flex justify-center">
              <div className="relative w-full max-w-4xl">
                {safeInvestorData.map((investor, index) => {
                  const isActive = index === activeCard;
                  const offset = index * 12;
                  const zIndex = safeInvestorData.length - index;
                  const scale = 1 - (index * 0.02);
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setActiveCard(index)}
                      className={`absolute w-full bg-gray-900/90 border border-gray-700 rounded-xl backdrop-blur-sm cursor-pointer transition-all duration-300 ${
                        isActive 
                          ? 'shadow-2xl shadow-green-500/10 hover:border-green-500/50' 
                          : 'shadow-lg hover:border-gray-600'
                      }`}
                      style={{
                        transform: `translateY(${offset}px) scale(${scale})`,
                        zIndex: zIndex,
                        top: 0,
                      }}
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-gray-800">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <h3 className="text-2xl font-bold text-white mb-1">{investor.name}</h3>
                            <p className="text-gray-400 mb-2">{investor.investor}</p>
                            <p className="text-3xl font-bold text-green-400">${investor.totalValue}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">{investor.date}</p>
                            <p className="text-gray-500 text-xs">{investor.filingId}</p>
                            <p className="text-gray-500 text-sm mt-2">{investor.tickers}</p>
                          </div>
                        </div>
                      </div>

                      {/* Portfolio Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-800/50">
                            <tr>
                              <th className="text-left p-4 text-sm font-medium text-gray-300">Ticker</th>
                              <th className="text-right p-4 text-sm font-medium text-gray-300">Market Value</th>
                              <th className="text-right p-4 text-sm font-medium text-gray-300">Portfolio %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {investor.holdings.map((holding, holdingIndex) => (
                              <tr key={holdingIndex} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                <td className="p-4">
                                  <span className="font-medium text-white">{holding.ticker}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-gray-300">${holding.value}</span>
                                </td>
                                <td className="p-4 text-right">
                                  <span className="text-gray-400">{holding.percentage}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer with navigation */}
                      {isActive && (
                        <div className="p-6 bg-gray-800/30 border-t border-gray-800">
                          <div className="flex flex-wrap gap-3 items-center justify-between">
                            <div className="flex flex-wrap gap-3">
                              {safeInvestorData.map((inv, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCard(idx);
                                  }}
                                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 border ${
                                    idx === activeCard
                                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                      : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600/50 hover:border-gray-500'
                                  }`}
                                >
                                  {inv.investor}
                                </button>
                              ))}
                            </div>
                            <Link
                              href="/superinvestor/investors"
                              className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                            >
                              Alle ansehen
                              <ArrowRightIcon className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Spacer */}
                <div style={{ height: `${(safeInvestorData.length - 1) * 12 + 650}px` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Neueste Video-Analysen
            </h2>
            <p className="text-gray-400">
              Deep-Dives in die Strategien und Portfolios der Super-Investoren
            </p>
          </div>
          <YouTubeCarousel videos={featuredVideos} />
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
                13F-Filing verpassen
              </span>
            </h3>
            <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Quartalsweise Updates über neue 13F-Filings, Investment-Strategien 
              und Portfolio-Bewegungen der Top-Investoren.
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