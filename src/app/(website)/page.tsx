// Professional Homepage - Konsistent mit Pricing Page Design
'use client'

import React, { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRightIcon,
  CheckIcon,
  DocumentTextIcon,
  SparklesIcon,
  BuildingLibraryIcon,
  EyeIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import NewsletterSignup from '@/components/NewsletterSignup'
import LandingFeatureShowcase from '@/components/landing/LandingFeatureShowcase'
import { useHomepagePortfolios } from '@/hooks/useHomepagePortfolios'
import { useCurrency } from '@/lib/CurrencyContext'

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
  const { formatCurrency } = useCurrency()
  const { data: portfolioData } = useHomepagePortfolios()
  
  const toNumber = (value: string | number): number => {
    if (typeof value === 'number') return value
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
    <div className="min-h-screen bg-[#000000]">

      {/* Hero Section - Linear Style */}
      <section className="pt-16 lg:pt-28">
        {/* Text Content */}
        <div className="text-center px-6 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white leading-[1.1] tracking-[-0.02em]">
            Professionelle
            <br />
            <span className="text-neutral-400">Aktienanalyse</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-xl mx-auto leading-relaxed mt-6">
            Institutionelle Investment-Daten und Tools für bessere Anlageentscheidungen
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/analyse"
              className="px-6 py-3 bg-white text-black font-medium rounded-lg transition-all hover:bg-neutral-100 text-base"
            >
              Terminal öffnen
            </Link>

            <Link
              href="/superinvestor"
              className="px-6 py-3 text-neutral-300 font-medium transition-all hover:text-white text-base flex items-center gap-1"
            >
              Portfolio-Tracking <span className="text-neutral-500">→</span>
            </Link>
          </div>




          
        </div>

        {/* Hero Terminal Image */}
        <div className="relative mt-4 lg:mt-20">
          <Image
            src="/images/hero-terminal.png"
            alt="Finclue Terminal - Professionelle Aktienanalyse"
            width={1920}
            height={1080}
            className="w-full max-w-6xl mx-auto"
            style={{
              maskImage:
                'radial-gradient(ellipse 82% 88% at center, black 40%, transparent 92%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 82% 88% at center, black 40%, transparent 92%)',
            }}
            priority
          />
        </div>
      </section>

      {/* Stats Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(10000, 2000, statsVisible).toLocaleString('de-DE')}+
              </div>
              <div className="text-lg text-neutral-500">Aktien & ETFs</div>
            </div>
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(15, 2200, statsVisible)}
              </div>
              <div className="text-lg text-neutral-500">Jahre Historie</div>
            </div>
            <div className={`text-center transform transition-all duration-1000 ${
              statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="text-4xl md:text-5xl font-medium text-white mb-3">
                {useCountUp(90, 2400, statsVisible)}+
              </div>
              <div className="text-lg text-neutral-500">Super-Investoren</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Showcases — 3 Top-Features alternierend, Teaser für den Rest */}
      <LandingFeatureShowcase
        image="/features/hero-portfolio.png"
        alt="Portfolio-Übersicht in Finclue"
        eyebrow="Portfolio"
        headline="Dein Portfolio, endlich mit Klarheit."
        subline="Alle Positionen, Gewinne und Verluste — in einer einzigen, klaren Ansicht."
        linkHref="/features#hero"
        linkLabel="Mehr zum Portfolio-Tracking"
        layout="left"
      />
      <LandingFeatureShowcase
        image="/features/kennzahlen.png"
        alt="Kennzahlen-Dashboard in Finclue"
        eyebrow="Kennzahlen"
        headline="Komplexe Daten, klar verständlich."
        subline="15+ Jahre Jahresabschlüsse, 60+ Kennzahlen — in klaren Visualisierungen statt Tabellenchaos."
        linkHref="/features#kennzahlen"
        linkLabel="Kennzahlen entdecken"
        layout="right"
      />
      <LandingFeatureShowcase
        image="/features/superinvestoren.png"
        alt="Super-Investoren-Portfolios in Finclue"
        eyebrow="Super-Investoren"
        headline="Folge den Besten."
        subline="Buffett, Ackman, Burry und 90 weitere Top-Investoren — Portfolio-Änderungen live verfolgen."
        linkHref="/features#superinvestoren"
        linkLabel="Super-Investoren ansehen"
        layout="left"
      />

      {/* Mehr Features Teaser */}
      <section className="py-24 md:py-32 border-t border-neutral-900/50">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="text-sm font-medium text-orange-400 uppercase tracking-wider mb-4">
              Noch viel mehr entdecken
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.05]">
              Und das ist erst der Anfang.
            </h2>
            <p className="mt-5 text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto">
              Finclue bündelt alles, was du als Investor brauchst — hier ein Auszug der weiteren Features.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-4">
                <SparklesIcon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Quartalszahlen + KI</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Aus 100 Seiten werden 10 Zeilen. Reports und Transcripts auf den Punkt gebracht.
              </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-4">
                <BuildingLibraryIcon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Kongress-Trades</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Sieh, was US-Politiker kaufen und verkaufen — bevor es die Medien aufgreifen.
              </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-4">
                <EyeIcon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Insider-Signale</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Wann CEOs und Direktoren kaufen oder verkaufen — direkt aus SEC-Filings.
              </p>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center mb-4">
                <PresentationChartLineIcon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Chart Builder</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Aktien, Kennzahlen und Jahre vergleichen — alles in einem Chart.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/features"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg transition-all hover:bg-neutral-100 text-base"
            >
              Alle Features im Detail
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Logo Carousel */}
      <div className="py-16 overflow-hidden border-t border-b border-neutral-800/50">
        <div className="text-center mb-8">
          <p className="text-xs text-neutral-600 uppercase tracking-wider font-medium">
            Analysiere die besten Unternehmen der Welt
          </p>
        </div>
        
        <div className="relative max-w-7xl mx-auto overflow-hidden">
          <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#000000] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#000000] to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex animate-infinite-scroll">
            {/* First Group */}
            <div className="flex items-center justify-center min-w-full gap-12 px-8">
              {['aapl', 'msft', 'googl', 'amzn', 'nvda', 'tsla', 'meta', 'wmt', 'v', 'jpm', 'dis', 'pypl', 'csco', 'crm'].map((logo) => (
                <Image 
                  key={logo}
                  src={`/logos/${logo}.png`} 
                  alt={logo.toUpperCase()} 
                  width={40} 
                  height={40} 
                  className="opacity-40 hover:opacity-80 transition-opacity cursor-pointer" 
                />
              ))}
            </div>
            {/* Duplicate for seamless scroll */}
            <div className="flex items-center justify-center min-w-full gap-12 px-8">
              {['aapl', 'msft', 'googl', 'amzn', 'nvda', 'tsla', 'meta', 'wmt', 'v', 'jpm', 'dis', 'pypl', 'csco', 'crm'].map((logo) => (
                <Image 
                  key={`${logo}-2`}
                  src={`/logos/${logo}.png`} 
                  alt={logo.toUpperCase()} 
                  width={40} 
                  height={40} 
                  className="opacity-40 hover:opacity-80 transition-opacity cursor-pointer" 
                />
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Newsletter Section */}
      <section className="py-24 border-t border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center mb-20">
            
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 rounded-full text-sm font-medium mb-8">
                <DocumentTextIcon className="w-4 h-4" />
                Research Updates
              </div>
              
              <h3 className="text-4xl md:text-5xl font-medium text-white mb-6 leading-tight">
                Bleibe informiert
                <span className="block text-neutral-400">
                  über Markt-Updates
                </span>
              </h3>
              <p className="text-xl text-neutral-400 leading-relaxed mb-10">
                Quartalsweise Research-Updates zu institutionellen Portfolio-Änderungen, 
                Marktanalysen und neuen Platform-Features.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-400">Quartalsweise 13F Updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-400">Kein Spam Policy</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-400">Marktanalysen</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                  <span className="text-neutral-400">Platform Updates</span>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
                <NewsletterSignup />
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}