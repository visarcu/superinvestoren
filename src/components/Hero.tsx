// src/components/Hero.tsx - VERBESSERTE VERSION
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import SearchTickerInput from '@/components/SearchTickerInput'
import Logo from '@/components/Logo'

const popularStocks = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'GOOGL', name: 'Google' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'TSLA', name: 'Tesla' }
]

export default function Hero() {
  const router = useRouter()

  const handleTickerSelect = (ticker: string) => {
    router.push(`/analyse/${ticker.toLowerCase()}`)
  }

  const handleQuickSearch = (ticker: string) => {
    router.push(`/analyse/${ticker}`)
  }

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      {/* Hero Section - Konsistent mit Pricing */}
      <div className="bg-gray-950 noise-bg pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          {/* Subtle Background Glow - Positioniert wie auf Pricing */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/3 rounded-full blur-3xl"></div>
          
          <div className="relative text-center space-y-8">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 border border-brand/20 text-brand-light rounded-full text-sm font-medium backdrop-blur-sm">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              Professionelle Investment-Analyse
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                Analysiere Aktien
              </h1>
              <h2 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-300 leading-tight tracking-tight">
                Erhalte Einblicke
              </h2>
            </div>

            {/* Subheading */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Starte deine Analyse mit Live-Kursen, Charts, Kennzahlen & mehr.<br />
              Wirf einen Blick in die Depots der besten Investoren der Welt.
            </p>

            {/* Search Bar */}
            <div className="max-w-lg mx-auto">
              <SearchTickerInput
                placeholder="Suche Aktie oder Investor..."
                onSelect={handleTickerSelect}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push('/analyse')}
                className="px-6 py-3 bg-brand text-black font-medium rounded-lg hover:bg-green-400 transition"
              >
                Jetzt analysieren
              </button>
              <button
                onClick={() => router.push('/superinvestor')}
                className="px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
              >
                Super-Investoren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="bg-gray-950 noise-bg py-16 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Company Logos Header */}
          <div className="text-center mb-12">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-6">
              Analysiere Aktien von 10.000+ Unternehmen
            </p>
          </div>

          {/* Logo Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-40">
            {['aapl', 'msft', 'googl', 'amzn'].map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleQuickSearch(ticker.toUpperCase())}
                className="group p-4 rounded-xl bg-gray-900/30 border border-gray-800/50 hover:border-gray-700/50 hover:bg-gray-900/50 transition-all duration-300 hover:opacity-100 backdrop-blur-sm"
              >
                <Logo
                  src={`/logos/${ticker}.svg`}
                  alt={`${ticker} Logo`}
                  className="w-12 h-12 group-hover:scale-110 transition-transform duration-300"
                />
              </button>
            ))}
          </div>

          {/* Stats or Features Preview */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            
            <div className="p-6">
              <div className="text-3xl font-bold text-white numeric mb-2">10.000+</div>
              <div className="text-sm text-gray-400">Aktien & ETFs</div>
            </div>
            
            <div className="p-6">
              <div className="text-3xl font-bold text-white numeric mb-2">154</div>
              <div className="text-sm text-gray-400">Jahre historische Daten</div>
            </div>
            
            <div className="p-6">
              <div className="text-3xl font-bold text-white numeric mb-2">20+</div>
              <div className="text-sm text-gray-400">Super-Investoren</div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}