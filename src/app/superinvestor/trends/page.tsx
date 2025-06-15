// src/app/superinvestor/trends/page.tsx - Coming Soon Page
'use client'

import React from 'react'
import Link from 'next/link'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  BoltIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export default function TrendsComingSoonPage() {
  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Hero Section */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            
            {/* Back Button */}
            <div className="absolute left-4 top-4 lg:left-8 lg:top-8">
              <Link
                href="/superinvestor"
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück
              </Link>
            </div>

            {/* Main Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ArrowTrendingUpIcon className="w-10 h-10 text-black" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                Trends & Insights
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Diese Sektion ist noch in Entwicklung und wird bald verfügbar sein.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Coming Soon Card */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm mb-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClockIcon className="w-8 h-8 text-green-400" />
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-4">
            Bald verfügbar
          </h2>
          
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Wir arbeiten an umfassenden Trend-Analysen und Market Insights. 
            Diese Sektion wird bald live gehen mit spannenden Features für 
            bessere Investment-Entscheidungen.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm">
            <span>🚧</span>
            <span>In Entwicklung</span>
          </div>
        </div>

        {/* Preview Features */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm mb-8">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            Was dich hier erwarten wird
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ChartBarIcon className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-medium text-white mb-2">Market Trends</h4>
              <p className="text-sm text-gray-400">
                Analyse der wichtigsten Markttrends und Sektoren
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <UserGroupIcon className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-medium text-white mb-2">Investor Patterns</h4>
              <p className="text-sm text-gray-400">
                Welche Aktien kaufen/verkaufen die Super-Investoren
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />
              </div>
              <h4 className="font-medium text-white mb-2">Sector Analysis</h4>
              <p className="text-sm text-gray-400">
                Deep Dive in die beliebtesten Branchen
              </p>
            </div>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            In der Zwischenzeit
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/superinvestor"
              className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition border border-gray-700 group"
            >
              <UserGroupIcon className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <div className="font-medium text-white group-hover:text-green-400 transition">
                  Alle Investoren
                </div>
                <div className="text-sm text-gray-400">
                  Durchstöbere die Super-Investor Portfolios
                </div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition" />
            </Link>
            
            <Link
              href="/superinvestor/activity"
              className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition border border-gray-700 group"
            >
              <BoltIcon className="w-5 h-5 text-green-400" />
              <div className="flex-1">
                <div className="font-medium text-white group-hover:text-green-400 transition">
                  Real-Time Activity
                </div>
                <div className="text-sm text-gray-400">
                  Live Transaktionen der Investoren
                </div>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}