// src/components/Hero.tsx
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
    <section className="relative overflow-hidden bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-32">
        <div className="text-center">
          {/* Clean Badge - Supabase Style */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-8">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            Professionelle Investment-Analyse
          </div>
          
          {/* Main Heading - Clean Typography */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Analysiere Aktien
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
              Erhalte Einblicke
            </span>
          </h1>
          
          {/* Clean Subheading */}
          <p className="text-xl md:text-2xl text-gray-400 max-w-4xl mx-auto mb-12 leading-relaxed">
            Aktienanalyse für langfristige Investoren – Live-Quote, Charts & Kennzahlen in 
            Sekundenschnelle. Treffen Sie bessere Investment-Entscheidungen.
          </p>

          {/* Clean Search Bar - Reuse existing component */}
          <div className="max-w-lg mx-auto mb-16">
            <SearchTickerInput
              placeholder="Suche 10.000+ Aktien & ETFs..."
              onSelect={handleTickerSelect}
            />
          </div>

          {/* Clean Company Logos Section */}
          <div className="flex items-center justify-center gap-8 opacity-60 mb-6">
            <div className="text-gray-600 text-sm font-medium">Trusted by investors analyzing:</div>
          </div>
          <div className="flex items-center justify-center gap-8">
            {['aapl', 'msft', 'googl', 'amzn'].map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleQuickSearch(ticker.toUpperCase())}
                className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-200"
              >
                <Logo
                  src={`/logos/${ticker}.svg`}
                  alt={`${ticker} Logo`}
                  className="w-8 h-8"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtle Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950 to-gray-900 pointer-events-none"></div>
    </section>
  )
}