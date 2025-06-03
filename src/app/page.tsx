// src/app/page.tsx
'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import SearchTickerInput from '@/components/SearchTickerInput'
import { investors } from '@/data/investors'

export default function HomePage() {
  const router = useRouter()

  const wantedSlugs = ['buffett', 'ackman', 'marks', 'smith'] 
  const highlightInvestors = investors.filter(inv =>
    wantedSlugs.includes(inv.slug)
  )

  const handleTickerSelect = (ticker: string) => {
    router.push(`/analyse/${ticker.toLowerCase()}`)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Hero Section - Supabase Style */}
      <section className="relative overflow-hidden bg-gray-950">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="text-center">
            {/* Badge - Supabase Style */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-8 hover:bg-green-500/20 transition-colors">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span>Professionelle Investment-Analyse</span>
              <ArrowRightIcon className="w-3 h-3" />
            </div>
            
            {/* Main Heading - Exakt wie Supabase */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight tracking-tight">
              Analysiere Aktien
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Erhalte Einblicke
              </span>
            </h2>
            
            {/* Subtitle - Supabase Style */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
             
              Starte deine Analyse mit Live-Kursen, Charts & Kennzahlen.
              <br className="hidden sm:block" />
              Guck in die Depots der besten Investoren der Welt.
            </p>

            {/* CTA Buttons - Supabase Style */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25"
              >
                Jetzt analysieren
              </Link>
              <button className="inline-flex items-center gap-2 px-6 py-3 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-all duration-200">
                Demo anfordern
              </button>
            </div>

            {/* Trusted By Section - Supabase Style */}
            <div className="flex flex-col items-center gap-8">
              <p className="text-sm text-gray-500 font-medium">
                Analysiere Aktien von 10.000+ Unternehmen
              </p>
              
              {/* Company Logos */}
              <div className="flex items-center justify-center gap-16 opacity-60 hover:opacity-80 transition-opacity">
                {['aapl', 'msft', 'googl', 'amzn', 'nvda'].map((ticker) => (
                  <div key={ticker} className="grayscale hover:grayscale-0 transition-all duration-300">
                    <Image
                      src={`/logos/${ticker}.svg`}
                      alt={`${ticker} logo`}
                      width={120}
                      height={120}
                      className="w-25 h-25"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Supabase 3-Card Style */}
      <section className="bg-gray-950 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Feature 1: Stock Analysis */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Aktienanalyse
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Live-Kurse, historische Charts und Kennzahlen. Professionelle Tools für bessere Investment-Entscheidungen mit über 10.000 Aktien weltweit.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Live-Marktdaten</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Historische Charts</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-green-400" />
                  <span>Fundamentaldaten</span>
                </div>
              </div>
            </div>

            {/* Feature 2: Super Investors */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
                <UserGroupIcon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Super-Investoren
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Verfolge Portfolios von Warren Buffett, Bill Ackman und anderen Top-Investoren. Lerne von den Besten der Finanzwelt.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-blue-400" />
                  <span>13F-Filings Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-blue-400" />
                  <span>Portfolio-Änderungen</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-blue-400" />
                  <span>Investment-Strategien</span>
                </div>
              </div>
            </div>

            {/* Feature 3: Portfolio Tracking */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300 group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors">
                <ChartBarIcon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Portfolio-Tracking
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Erstelle Watchlists, verfolge Performance und erhalte Insights zu deinen Investments mit professionellen Tools.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-purple-400" />
                  <span>Persönliche Watchlists</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-purple-400" />
                  <span>Performance-Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckIcon className="w-4 h-4 text-purple-400" />
                  <span>Alerts & Benachrichtigungen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Super Investors Showcase - Supabase Style */}
      <section className="bg-gray-900 border-y border-gray-800 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Text Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium mb-6">
                <UserGroupIcon className="w-4 h-4" />
                Super-Investoren
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                Lerne von den
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  besten Investoren
                </span>
              </h2>
              
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                Verfolge die Portfolios und Strategien der erfolgreichsten Investoren der Welt.
                Von Warren Buffett bis Bill Ackman - erhalte Einblicke in ihre Investment-Philosophien.
              </p>
              
              <Link
                href="/superinvestor"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Alle Investoren ansehen
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Right: Investor Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {highlightInvestors.slice(0, 4).map((inv) => (
                <Link
                  key={inv.slug}
                  href={`/investor/${inv.slug}`}
                  className="group bg-gray-950/50 border border-gray-800 hover:border-gray-700 rounded-xl p-6 hover:bg-gray-950/70 transition-all duration-200 text-center"
                >
                  <div className="relative w-12 h-12 mx-auto mb-3 rounded-full overflow-hidden ring-2 ring-blue-500/20 group-hover:ring-blue-500/40 transition-all duration-200">
                    <Image
                      src={inv.imageUrl!}
                      alt={inv.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors duration-200">
                    {inv.name.split('–')[0].trim()}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Portfolio →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA - Supabase Style */}
      <section className="bg-gray-950 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Nie wieder ein Update verpassen
          </h3>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed max-w-2xl mx-auto">
            Quartalsweise Updates über neue 13F-Filings, marktbewegende Ereignisse 
            und Insights unserer Top-Investor-Analysen.
          </p>
          
          <div className="max-w-md mx-auto">
            <form className="flex gap-3">
              <input
                type="email"
                placeholder="Deine E-Mail-Adresse"
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all duration-200"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 whitespace-nowrap"
              >
                Abonnieren
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-4">
              Quartalsweise Updates • Jederzeit kündbar • Keine Werbung
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}