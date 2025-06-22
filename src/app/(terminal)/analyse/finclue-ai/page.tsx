// src/app/analyse/finclue-ai/page.tsx - Improved with Ticker Selection
'use client'

import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import FinClueAI from '@/components/FinclueAI'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function FinClueAIPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [tickerInput, setTickerInput] = useState('')
  const [showTickerSelector, setShowTickerSelector] = useState(true)

  // Popular tickers for quick selection
  const popularTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'
  ]

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Check URL for ticker parameter
    const urlParams = new URLSearchParams(window.location.search)
    const tickerParam = urlParams.get('ticker')
    if (tickerParam) {
      setSelectedTicker(tickerParam.toUpperCase())
      setShowTickerSelector(false)
    }
  }, [])

  const handleTickerSelect = (ticker: string) => {
    setSelectedTicker(ticker.toUpperCase())
    setShowTickerSelector(false)
    
    // Update URL without page reload
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('ticker', ticker.toUpperCase())
    window.history.pushState({}, '', newUrl.toString())
  }

  const handleCustomTicker = () => {
    if (tickerInput.trim()) {
      handleTickerSelect(tickerInput.trim())
      setTickerInput('')
    }
  }

  const handleReset = () => {
    setSelectedTicker(null)
    setShowTickerSelector(true)
    setTickerInput('')
    
    // Remove ticker from URL
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('ticker')
    window.history.pushState({}, '', newUrl.toString())
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade FinClue AI...</p>
        </div>
      </div>
    )
  }

  // If no ticker selected and user is premium, show ticker selector
  if (showTickerSelector && user?.isPremium) {
    return (
      <div className="h-full bg-gray-950 flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">FinClue AI</h1>
            <p className="text-gray-400 text-lg">
              Wähle eine Aktie für detaillierte AI-Analysen oder starte eine allgemeine Finanzberatung
            </p>
          </div>

          <div className="space-y-6">
            {/* Custom Ticker Input */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Aktien-Ticker eingeben</h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomTicker()}
                  placeholder="z.B. AAPL, MSFT, TSLA..."
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleCustomTicker}
                  disabled={!tickerInput.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Analysieren
                </button>
              </div>
            </div>

            {/* Popular Tickers */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Beliebte Aktien</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {popularTickers.map((ticker) => (
                  <button
                    key={ticker}
                    onClick={() => handleTickerSelect(ticker)}
                    className="p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-white rounded-lg transition-all duration-200 font-medium"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>

            {/* General Analysis Option */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Allgemeine Finanzberatung</h3>
              <p className="text-gray-400 mb-4">
                Starte ohne spezifische Aktie für allgemeine Marktanalysen und Finanzberatung
              </p>
              <button
                onClick={() => {
                  setSelectedTicker(null)
                  setShowTickerSelector(false)
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all duration-200 font-medium"
              >
                Allgemeine Beratung starten
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      {/* Reset Button */}
      {(selectedTicker || !showTickerSelector) && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            <span className="text-sm">Ticker ändern</span>
          </button>
        </div>
      )}

      <FinClueAI 
        ticker={selectedTicker} 
        isPremium={user?.isPremium || false} 
      />
    </div>
  )
}