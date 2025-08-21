// app/analyse/stocks/[ticker]/earnings/page.tsx
// ALTERNATIV: app/analyse/stocks/[ticker]/quartalszahlen/page.tsx
'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import EarningsTranscripts from '@/components/EarningsTranscripts'
import { 
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline'

export default function QuartalszahlenPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const [activeView, setActiveView] = useState<'transcripts' | 'calendar' | 'estimates'>('transcripts')

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">
            Quartalszahlen & Conference Calls
          </h1>
          <p className="text-theme-secondary">
            Vollständige Transkripte der Earnings Calls und Quartalsberichte für {ticker.toUpperCase()}
          </p>
        </div>

        {/* View Selector */}
        <div className="flex gap-2 mb-8 bg-theme-card border border-theme/10 rounded-xl p-1">
          <button
            onClick={() => setActiveView('transcripts')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'transcripts'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/50'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Call Transcripts</span>
          </button>
          
          <button
            onClick={() => setActiveView('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'calendar'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/50'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>Earnings Kalender</span>
          </button>
          
          <button
            onClick={() => setActiveView('estimates')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeView === 'estimates'
                ? 'bg-green-500 text-white shadow-lg'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/50'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            <span>Schätzungen</span>
          </button>
        </div>

        {/* Content Area */}
        {activeView === 'transcripts' && (
          <EarningsTranscripts ticker={ticker.toUpperCase()} />
        )}
        
        {activeView === 'calendar' && (
          <div className="bg-theme-card border border-theme/10 rounded-xl p-8">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <p className="text-theme-secondary">Earnings Kalender kommt bald...</p>
            </div>
          </div>
        )}
        
        {activeView === 'estimates' && (
          <div className="bg-theme-card border border-theme/10 rounded-xl p-8">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
              <p className="text-theme-secondary">Analysten-Schätzungen kommen bald...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}