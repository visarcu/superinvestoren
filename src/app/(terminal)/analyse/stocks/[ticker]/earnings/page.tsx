// app/analyse/stocks/[ticker]/earnings/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import EarningsSummary from '@/components/EarningsSummary'
import { 
  MicrophoneIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  UsersIcon,
  LanguageIcon,
  SparklesIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

interface Transcript {
  symbol: string
  quarter: number
  year: number
  date: string
  content: string
}

export default function QuartalszahlenPage() {
  const params = useParams()
  const ticker = (params.ticker as string)?.toUpperCase() || 'AAPL'
  
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'transcript' | 'slides' | 'report'>('transcript')
  const [showSummary, setShowSummary] = useState(true)

  // Lade Transcripts
  useEffect(() => {
    async function loadTranscripts() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/earnings-transcripts?ticker=${ticker}&limit=20`)
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          setTranscripts(data)
          setSelectedTranscript(data[0])
        } else {
          setError('Keine Earnings Calls verfügbar')
        }
      } catch (err: any) {
        console.error('Error loading transcripts:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    loadTranscripts()
  }, [ticker])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const formatQuarter = (quarter: number, year: number) => {
    return `Q${quarter} ${year}`
  }

  // Parse content für bessere Darstellung
  const formatTranscriptContent = (content: string) => {
    if (!content) return []
    
    return content.split('\n').map((line, index) => {
      // Check if it's a speaker line
      const speakerMatch = line.match(/^([A-Za-z\s]+(?:\s[A-Z]\.\s)?[A-Za-z]+):\s(.*)/)
      
      if (speakerMatch) {
        return {
          type: 'speaker',
          speaker: speakerMatch[1],
          text: speakerMatch[2],
          key: index
        }
      }
      
      // Check for section headers
      if (line.match(/^(Operator|Questions and Answers|Presentation|Conference Call Participants)/)) {
        return {
          type: 'section',
          text: line,
          key: index
        }
      }
      
      return {
        type: 'paragraph',
        text: line,
        key: index
      }
    })
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <span className="text-theme-secondary">Lade Earnings Calls für {ticker}...</span>
        </div>
      </div>
    )
  }

  if (error && transcripts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <DocumentTextIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Keine Earnings Calls verfügbar</h2>
          <p className="text-theme-secondary">{error}</p>
        </div>
      </div>
    )
  }

  const formattedContent = selectedTranscript ? formatTranscriptContent(selectedTranscript.content) : []

  return (
    <div className="h-full flex flex-col bg-theme-primary">
      
      {/* Header - Clean & Minimal */}
      <div className="flex-shrink-0 border-b border-theme/10 bg-theme-primary">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-theme-primary">
              Earnings Calls & Transcripts
            </h1>
            <p className="text-xs text-theme-muted">
              Vollständige Mitschriften für {ticker}
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Spalten wie FinChat */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Event Liste - KONSISTENTER BG */}
        <div className="w-64 bg-theme-card border-r border-theme/10 flex flex-col">
          <div className="p-3 border-b border-theme/10">
            <div className="text-xs font-semibold text-theme-muted uppercase tracking-wide">
              Alle Events
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {transcripts.map((transcript, index) => {
                const isSelected = selectedTranscript?.quarter === transcript.quarter && 
                                 selectedTranscript?.year === transcript.year
                const isPremium = index > 0 // Nur das erste ist kostenlos
                
                return (
                  <button
                    key={`${transcript.year}-Q${transcript.quarter}`}
                    onClick={() => !isPremium && setSelectedTranscript(transcript)}
                    disabled={isPremium}
                    className={`w-full text-left px-3 py-2 rounded-md transition-all ${
                      isSelected
                        ? 'bg-theme-primary border border-green-500/20 text-theme-primary'
                        : isPremium
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-theme-secondary text-theme-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Q{transcript.quarter} {transcript.year}
                          </span>
                          {index === 0 && (
                            <span className="text-xs text-green-500">
                              Aktuell
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-theme-muted mt-0.5">
                          Earnings Call
                        </div>
                        <div className="text-xs text-theme-muted mt-0.5">
                          {formatDate(transcript.date)}
                        </div>
                      </div>
                      
                      {isPremium && (
                        <LockClosedIcon className="w-3.5 h-3.5 text-theme-muted flex-shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Center - Main Content */}
        <div className="flex-1 flex flex-col bg-theme-primary overflow-hidden">
          
          {/* Content Header */}
          <div className="flex-shrink-0 border-b border-theme/10 bg-theme-card">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <h2 className="text-base font-semibold text-theme-primary">
                    {selectedTranscript && `Q${selectedTranscript.quarter} ${selectedTranscript.year} - ${formatDate(selectedTranscript.date)}`}
                  </h2>
                  
                  <div className="flex items-center gap-4 text-xs text-theme-muted">
                    <span>{selectedTranscript && selectedTranscript.content.split(' ').length.toLocaleString()} Wörter</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSummary(!showSummary)}
                    className={`px-3 py-1.5 text-xs border rounded-md transition-colors ${
                      showSummary 
                        ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                        : 'bg-theme-secondary border-theme/10 text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <SparklesIcon className="w-3.5 h-3.5" />
                      <span>AI Summary</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!selectedTranscript) return
                      const blob = new Blob([selectedTranscript.content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${ticker}_Q${selectedTranscript.quarter}_${selectedTranscript.year}_transcript.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="px-3 py-1.5 text-xs bg-theme-secondary hover:bg-theme-hover text-theme-primary border border-theme/10 rounded-md transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-6 mt-3">
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'transcript'
                      ? 'text-green-500 border-green-500'
                      : 'text-theme-muted border-transparent hover:text-theme-secondary'
                  }`}
                >
                  Transcript
                </button>
                <button
                  disabled
                  className="pb-2 text-sm font-medium text-theme-muted/40 border-b-2 border-transparent cursor-not-allowed"
                >
                  Slides (Bald verfügbar)
                </button>
                <button
                  disabled
                  className="pb-2 text-sm font-medium text-theme-muted/40 border-b-2 border-transparent cursor-not-allowed"
                >
                  Report (Bald verfügbar)
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Transcript Content - THEME-CARD BG */}
          <div className="flex-1 overflow-y-auto bg-theme-card">
            {selectedTranscript && (
              <div className="px-8 py-6">
                
                {/* Original Transcript Title */}
                <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide mb-6">
                  Original Transcript (Englisch)
                </h3>
                
                {/* Formatted Transcript - Volle Breite nutzen */}
                <div className="space-y-4 text-sm leading-relaxed">
                  {formattedContent.map((item) => {
                    if (item.type === 'section') {
                      return (
                        <h4 key={item.key} className="text-base font-semibold text-theme-primary mt-8 mb-4">
                          {item.text}
                        </h4>
                      )
                    }
                    
                    if (item.type === 'speaker') {
                      return (
                        <div key={item.key} className="mb-4">
                          <div className="font-semibold text-theme-primary mb-1">
                            {item.speaker}
                          </div>
                          <div className="text-theme-secondary leading-relaxed">
                            {item.text}
                          </div>
                        </div>
                      )
                    }
                    
                    if (item.text.trim()) {
                      return (
                        <p key={item.key} className="text-theme-secondary leading-relaxed">
                          {item.text}
                        </p>
                      )
                    }
                    
                    return null
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - AI Summary - KONSISTENTER BG */}
        {showSummary && selectedTranscript && (
          <div className="w-[700px] border-l border-theme/10 bg-theme-card overflow-y-auto flex-shrink-0">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-4 h-4 text-green-500" />
                <h3 className="text-base font-semibold text-theme-primary">
                  FinClue AI Zusammenfassung
                </h3>
              </div>
              
              <div className="text-sm text-theme-muted mb-5">
                Powered by GPT-4 • Aktualisiert vor 3 Min.
              </div>
              
              {/* Summary Component */}
              <EarningsSummary 
                ticker={ticker}
                year={selectedTranscript.year}
                quarter={selectedTranscript.quarter}
                content={selectedTranscript.content}
                minimal={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}