// Professional Homepage - Deutsch & Sparsam mit Grün
'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  CheckIcon,
  DocumentTextIcon,
  CpuChipIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import NewsletterSignup from '@/components/NewsletterSignup'
import { useHomepagePortfolios } from '@/hooks/useHomepagePortfolios'
import { useCurrency } from '@/lib/CurrencyContext'

// Portfolio data now loaded via API

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
  // Currency formatting
  const { formatCurrency } = useCurrency()
  // API Data Hook - replaces heavy client-side processing
  const { data: portfolioData } = useHomepagePortfolios()
  
  // Helper to safely convert string/number to number for formatting
  const toNumber = (value: string | number): number => {
    if (typeof value === 'number') return value
    // Parse string like "266 Mrd. $" to number 266000000000
    const numStr = value.replace(/[^0-9.,-]/g, '').replace(',', '.')
    const num = parseFloat(numStr)
    if (value.includes('Mrd') || value.includes('B')) return num * 1000000000
    if (value.includes('Mio') || value.includes('M')) return num * 1000000
    if (value.includes('k') || value.includes('K')) return num * 1000
    return num
  }

  // Animation Refs
  const [statsRef, statsVisible] = useIntersectionObserver(0.3);
  const [chartRef, chartVisible] = useIntersectionObserver(0.3);
  const [marketChartRef, marketChartVisible] = useIntersectionObserver(0.3);
  const [watchlistRef, watchlistVisible] = useIntersectionObserver(0.3);
  const [aiRef, aiVisible] = useIntersectionObserver(0.3);

  // Use API data with fallback
  const safeInvestorData = portfolioData.length > 0 ? portfolioData : [
    {
      name: 'Berkshire Hathaway Inc',
      investor: 'Warren Buffett',
      date: '29.09.2024',
      filingId: '1067983',
      totalValue: 266000000000,
      tickers: 'AAPL, BAC, AXP, KO',
      holdings: [
        { ticker: 'AAPL', value: 69900000000, percentage: 26.0 },
        { ticker: 'BAC', value: 31700000000, percentage: 12.0 },
        { ticker: 'AXP', value: 25100000000, percentage: 9.5 },
        { ticker: 'KO', value: 22400000000, percentage: 8.5 },
        { ticker: 'CVX', value: 18600000000, percentage: 7.0 }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-black">
      
     

{/* Hero - Quartr/Fiscal Style */}
<div className="bg-black pt-40 pb-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center space-y-8">
            {/* Main Headlines - Clean & Professional */}
            <div className="space-y-3">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-medium text-white leading-[0.85] tracking-[-0.02em]">
                Professionelle
                <br />
                <span className="text-gray-300">Aktienanalyse</span>
              </h1>
            </div>

            {/* Subtitle - More Professional */}
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Institutionelle Investment-Daten und Tools für bessere Anlageentscheidungen
            </p>
            {/* CTAs - Cleaner Fiscal Style */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link 
                href="/analyse" 
                className="px-8 py-4 bg-white text-black font-semibold rounded-2xl transition-all hover:bg-gray-100 hover:scale-[1.02] text-lg"
              >
                Terminal öffnen
              </Link>
              
              <Link 
                href="/superinvestor" 
                className="px-8 py-4 text-white font-semibold rounded-2xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-lg"
              >
                Portfolio-Tracking →
              </Link>
            </div>
          </div>
        </div>
      </div>




{/* Stats - Cleaner Fiscal Style */}
<div className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Stats Grid - Minimal & Clean */}
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(10000, 2000, statsVisible).toLocaleString('de-DE')}+
              </div>
              <div className="text-lg text-gray-400">Aktien & ETFs</div>
            </div>
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(15, 2200, statsVisible)}
              </div>
              <div className="text-lg text-gray-400">Jahre Historie</div>
            </div>
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(90, 2400, statsVisible)}+
              </div>
              <div className="text-lg text-gray-400">Super-Investoren</div>
            </div>
          </div>
          
          {/* Platform Preview Section */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
                <ChartBarIcon className="w-4 h-4" />
                Analyse Terminal
              </div>
              
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Alle Kennzahlen
                <span className="block text-gray-300">
                  an einem Ort
                </span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Von Quartalszahlen über Bewertungskennzahlen bis hin zu technischen Indikatoren - 
                alles was professionelle Analysten für fundierte Entscheidungen benötigen.
              </p>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all duration-200"
              >
                Terminal testen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Clean Terminal Preview */}
            <div ref={chartRef} className="relative">
              <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 transform transition-all duration-1000 ${
                chartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 flex items-center justify-center">
                    <Image
                      src="/logos/aapl.png"
                      alt="Apple"
                      width={24}
                      height={24}
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">AAPL</h3>
                    <p className="text-gray-400">Apple Inc.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-white">{formatCurrency(185.24, 'number')} $</div>
                    <div className="text-sm text-brand-light">+{formatCurrency(2.1, 'number')}%</div>
                  </div>
                </div>

                {/* Key Metrics - Simplified */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Marktkapitalisierung</div>
                    <div className="text-white text-xl font-semibold">{formatCurrency(2850000000000)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">KGV</div>
                    <div className="text-white text-xl font-semibold">{formatCurrency(28.4, 'number')}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Umsatz</div>
                    <div className="text-white text-xl font-semibold">{formatCurrency(394000000000)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Gewinn pro Aktie</div>
                    <div className="text-white text-xl font-semibold">{formatCurrency(6.16, 'number')} $</div>
                  </div>
                </div>

                {/* Chart Placeholder - Minimal */}
                <div className="bg-white/5 rounded-2xl p-6">
                  <div className="text-gray-400 text-sm mb-4">6M Performance</div>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 45, 35, 50, 65, 55, 70, 60, 75, 85, 80, 90].map((height, i) => (
                      <div
                        key={i}
                        className="bg-gradient-to-t from-white/20 to-white/40 rounded-sm flex-1 transition-all duration-1000 ease-out"
                        style={{ 
                          height: chartVisible ? `${height}%` : '0%',
                          transitionDelay: `${i * 50 + 800}ms`
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* 📈 FUNDAMENTALS SECTION - Minimal */}
      <section className="bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Realistic Chart */}
            <div ref={marketChartRef} className="relative">
              <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8 transform transition-all duration-1000 ${
                marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white">
                      <Image
                        src="/logos/msft.png"
                        alt="Microsoft Logo"
                        width={32}
                        height={32}
                        className="object-contain"
                        priority
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">MSFT</h3>
                      <p className="text-sm text-gray-400">Umsatzanalyse</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{formatCurrency(211900000000)}</div>
                    <div className="text-xs text-gray-400">FY 2024</div>
                  </div>
                </div>

                {/* Professional Chart */}
                <div className="bg-white/5 rounded-2xl h-48 p-4 relative overflow-hidden">
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
                    <div className="text-sm font-bold text-white">{formatCurrency(88500000000)}</div>
                    <div className="text-xs text-gray-400">Betriebsergebnis</div>
                  </div>
                  <div className={`text-center transform transition-all duration-500 ${
                    marketChartVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`} style={{ transitionDelay: '2100ms' }}>
                    <div className="text-sm font-bold text-white">{formatCurrency(42.2, 'number')}%</div>
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                Fundamentalanalyse
              </div>
              
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Datenbasierte
                <span className="block text-gray-300">
                  Entscheidungen treffen
                </span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Analysiere Umsätze, Margen, Cash Flow und Bewertungskennzahlen. 
                Verstehe die finanzielle Performance von Unternehmen durch 
                professionelle Analyse-Tools und historische Trends.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">15+ Jahre Jahresabschlüsse & Quartalszahlen</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">60+ Fundamentale Kennzahlen</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Peer-Vergleiche & Branchen-Benchmarks</span>
                </div>
              </div>
              
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all duration-200"
              >
                Fundamentaldaten analysieren
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

{/* LOGO CAROUSEL - Ohne Lücke */}
<div className="bg-black py-16 overflow-hidden border-t border-b border-white/5">
<div className="text-center mb-8">
<p className="text-xs text-gray-600 uppercase tracking-wider font-medium">
Analysiere die besten Unternehmen der Welt</p>
  </div>
  
  <div className="relative max-w-7xl mx-auto overflow-hidden">
    <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#0d0d0e] to-transparent z-10 pointer-events-none"></div>
    <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#0d0d0e] to-transparent z-10 pointer-events-none"></div>
    
    <div className="flex animate-infinite-scroll">
      {/* Erste Gruppe - Mehr Logos! */}
      <div className="flex items-center justify-center min-w-full gap-12 px-8">
        <Image src="/logos/aapl.png" alt="Apple" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/msft.png" alt="Microsoft" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/googl.png" alt="Google" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/amzn.png" alt="Amazon" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/nvda.png" alt="NVIDIA" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/tsla.png" alt="Tesla" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/meta.png" alt="Meta" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/wmt.png" alt="Walmart" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/v.png" alt="Visa" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/jpm.png" alt="JPMorgan" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/wmt.png" alt="Walmart" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/dis.png" alt="Disney" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/pypl.png" alt="Paypal" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/csco.png" alt="Cisco" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/crm.png" alt="Salesforce" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
     
      </div>
      {/* Zweite Gruppe - Duplikat */}
      <div className="flex items-center justify-center min-w-full gap-12 px-8">
        <Image src="/logos/aapl.png" alt="Apple" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/msft.png" alt="Microsoft" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/googl.png" alt="Google" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/amzn.png" alt="Amazon" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/nvda.png" alt="NVIDIA" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/tsla.png" alt="Tesla" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/meta.png" alt="Meta" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/wmt.png" alt="Walmart" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/v.png" alt="Visa" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/jpm.png" alt="JPMorgan" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/wmt.png" alt="Walmart" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/dis.png" alt="Disney" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/pypl.png" alt="Paypal" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/csco.png" alt="Cisco" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
        <Image src="/logos/crm.png" alt="Salesforce" width={40} height={40} className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer" />
       
      </div>
    </div>
  </div>
</div>

      {/* 🤖 AI SECTION - Professional */}
      <section className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
                <CpuChipIcon className="w-4 h-4" />
                Finclue AI
              </div>
              
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                KI-gestützter
                <span className="block text-gray-300">
                  Research Assistent
                </span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Nutze KI für komplexe Finanzanalysen. Stelle Fragen zu Quartalszahlen, 
                vergleiche Portfolios oder lass dir Kennzahlen in natürlicher Sprache erklären.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Live-Zugriff auf SEC 13F Filings</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Portfolio-Analysen der Super-Investoren</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Natürlichsprachige Finanzanalyse</span>
                </div>
              </div>
              
              <Link
                href="/analyse/ai" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all duration-200"
              >
                KI-Assistent nutzen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Professional AI Chat Preview */}
            <div ref={aiRef} className="relative">
              <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-6 transform transition-all duration-1000 ${
                aiVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                
                {/* Chat Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="w-8 h-8 bg-white/10 rounded-2xl flex items-center justify-center">
                    <CpuChipIcon className="w-5 h-5 text-brand-light" />
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
                    <div className="bg-white/10 text-white p-3 rounded-2xl max-w-xs">
                      <p className="text-sm">Analysiere Berkshire Hathaways Q3 Portfolio-Änderungen</p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className={`flex justify-start transform transition-all duration-500 ${
                    aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`} style={{ transitionDelay: '800ms' }}>
                    <div className="bg-white/10 p-4 rounded-2xl max-w-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-brand rounded-full"></div>
                        <span className="text-xs text-brand-light font-medium">Finclue AI</span>
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
                          <span className="text-white">{formatCurrency(3800000000)} verkauft</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Cash Position:</span>
                          <span className="text-brand-light">{formatCurrency(325000000000)} (+{formatCurrency(18, 'number')}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Follow-up */}
                  <div className={`flex justify-end transform transition-all duration-500 ${
                    aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`} style={{ transitionDelay: '1200ms' }}>
                    <div className="bg-white/10 text-white p-3 rounded-2xl max-w-xs">
                      <p className="text-sm">Zeige mir Apples Q3 Quartalszahlen</p>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className={`flex items-center gap-2 text-gray-400 transform transition-all duration-500 ${
                  aiVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`} style={{ transitionDelay: '1500ms' }}>
                  <div className="w-3 h-3 bg-brand rounded-full"></div>
                  <span className="text-xs">Analysiere AAPL 10-Q Filing...</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 PORTFOLIO TRACKING - Professional */}
      <section className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
                <BuildingOfficeIcon className="w-4 h-4" />
                Portfolio-Tracking
              </div>
              
              <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Institutionelle Portfolios
                <span className="block text-gray-300">
                  verfolgen
                </span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Verfolge die Portfolios der erfolgreichsten Investoren in Echtzeit. 
                Erhalte Alerts bei Änderungen und analysiere Investment-Strategien 
                basierend auf SEC 13F Filings.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">90+ Institutionelle Investoren</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Quartalsweise 13F Filing Updates</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300 text-lg">Portfolio-Änderungs-Alerts</span>
                </div>
              </div>
              
              <Link
                href="/superinvestor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all duration-200"
              >
                Portfolio Tracker
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Professional Portfolio Table */}
            <div ref={watchlistRef} className="relative">
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h3 className="text-lg font-bold text-white">Institutionelle Holdings</h3>
                  <div className="text-sm text-gray-400">Letzte Aktualisierung: Q3 2024</div>
                </div>

                {/* Portfolio Table */}
                <div className="space-y-3">
                  {[
                    { fund: 'Berkshire Hathaway', manager: 'W. Buffett', aum: 258000000000, change: -12.8, top: 'AAPL', topPercent: 26 },
                    { fund: 'Pershing Square', manager: 'B. Ackman', aum: 18200000000, change: 24.1, top: 'UMG', topPercent: 28 },
                    { fund: 'Baupost Group', manager: 'S. Klarman', aum: 27400000000, change: 8.7, top: 'META', topPercent: 12 },
                    { fund: 'Appaloosa', manager: 'D. Tepper', aum: 13100000000, change: -3.2, top: 'GOOGL', topPercent: 18 }
                  ].map((fund, index) => (
                    <div 
                      key={fund.fund} 
                      style={{ 
                        transitionDelay: `${index * 150}ms`
                      }}
                      className={`grid grid-cols-5 gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all duration-500 text-sm ${
                        watchlistVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-white text-xs">{fund.fund}</div>
                        <div className="text-xs text-gray-400">{fund.manager}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white text-xs">{formatCurrency(fund.aum)}</div>
                        <div className="text-xs text-gray-400">AUM</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium text-xs ${
                          fund.change > 0 ? 'text-brand-light' : 'text-red-400'
                        }`}>{fund.change > 0 ? '+' : ''}{formatCurrency(fund.change, 'number')}%</div>
                        <div className="text-xs text-gray-400">Q/Q</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white text-xs">{fund.top} {formatCurrency(fund.topPercent, 'number')}%</div>
                        <div className="text-xs text-gray-400">Top</div>
                      </div>
                      <div className="flex justify-end">
                        <button className="text-blue-400 hover:text-blue-300 text-xs">Ansehen →</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className={`mt-6 p-3 bg-white/5 rounded-2xl transform transition-all duration-1000 ${
                  watchlistVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`} style={{ transitionDelay: '800ms' }}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Gesamtes verwaltetes Vermögen</span>
                    <span className="text-white font-medium">{formatCurrency(316700000000)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏛️ SUPER INVESTORS SHOWCASE - Clean & Minimal */}
      <section className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
              <UserGroupIcon className="w-4 h-4" />
              Super-Investoren
            </div>

            <h2 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
              Portfolios der
              <span className="block text-gray-300">
                erfolgreichsten Investoren
              </span>
            </h2>

            <p className="text-xl text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
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
                  className="group bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] rounded-3xl p-6 transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                      <Image
                        src={`/images/${slug}.png`}
                        alt={investor.investor}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        loading="lazy"
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
                    <div className="text-2xl font-bold text-white">{formatCurrency(toNumber(investor.totalValue))}</div>
                  </div>

                  {/* Top Holdings */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-400 mb-3">Top Holdings</div>
                    <div className="space-y-2">
                      {investor.holdings.slice(0, 3).map((holding) => (
                        <div key={holding.ticker} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">{holding.ticker}</span>
                          <span className="text-sm text-gray-400">{formatCurrency(toNumber(holding.percentage), 'number')}%</span>
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
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all duration-200"
            >
              Alle 90+ Investoren durchsuchen
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* NEWSLETTER + BROKER - Professional */}
      <section className="bg-black py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Newsletter Section */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center mb-20">
            
            {/* Left: Content (3 columns) */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
                <DocumentTextIcon className="w-4 h-4" />
                Research Updates
              </div>
              
              <h3 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Bleibe informiert
                <span className="block text-gray-300">
                  über Markt-Updates
                </span>
              </h3>
              <p className="text-xl text-gray-400 leading-relaxed mb-10">
                Quartalsweise Research-Updates zu institutionellen Portfolio-Änderungen, 
                Marktanalysen und neuen Platform-Features. Professionelle Insights 
                ohne Spam.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                  <span className="text-gray-300">Quartalsweise 13F Updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                  <span className="text-gray-300">Kein Spam Policy</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                  <span className="text-gray-300">Marktanalysen</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                  <span className="text-gray-300">Platform Updates</span>
                </div>
              </div>
            </div>
            
            {/* Right: Newsletter Form (2 columns) */}
            <div className="lg:col-span-2">
              <div className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl p-8">
                <NewsletterSignup />
              </div>
            </div>
          </div>

          {/* Broker Section - Professional */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-6">
                <BuildingOfficeIcon className="w-4 h-4" />
                Broker-Vergleich
              </div>
              
              <h3 className="text-3xl md:text-4xl font-medium text-white mb-4">
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
                className="group bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] rounded-3xl p-8 transition-all duration-300"
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Image
                      src="/broker-logos/scalable-capital.svg"
                      alt="Scalable Capital"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                      loading="lazy"
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
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <span>{formatCurrency(2000, 'number')}+ ETFs verfügbar</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <span>Bruchstücke ab €1</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <span>XETRA Marktzugang</span>
                  </div>
                </div>
              </a>
              
              {/* Trade Republic */}
              <a 
                href="https://traderepublic.com/de-de/nocodereferral?code=46xwv4b4" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-white/[0.03] backdrop-blur-sm border border-white/10 hover:bg-white/[0.05] rounded-3xl p-8 transition-all duration-300"
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Image
                      src="/broker-logos/trade-republic.svg"
                      alt="Trade Republic"
                      width={48}
                      height={48}
                      className="w-12 h-12"
                      loading="lazy"
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
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <span>Aktien & ETFs ab €1</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
                    <span>Professionelle Mobile App</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <CheckIcon className="w-4 h-4 text-brand-light flex-shrink-0" />
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

