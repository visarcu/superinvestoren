// components/EarningsTranscripts.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  MicrophoneIcon, 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface Transcript {
  symbol: string
  quarter: number
  year: number
  date: string
  content: string
}

interface TranscriptListItem {
  symbol: string
  quarter: number
  year: number
  date: string
}

interface EarningsTranscriptsProps {
  ticker: string
}

export default function EarningsTranscripts({ ticker }: EarningsTranscriptsProps) {
  const [transcripts, setTranscripts] = useState<TranscriptListItem[]>([])
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set())

  // Transkripte laden
  useEffect(() => {
    loadTranscripts()
  }, [ticker])

  const loadTranscripts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/earnings-transcripts?ticker=${ticker}&limit=20`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcripts')
      }
      
      const data = await response.json()
      
      // FMP gibt Array zurück
      if (Array.isArray(data) && data.length > 0) {
        setTranscripts(data)
        
        // Automatisch das neueste Transcript laden
        loadSpecificTranscript(data[0])
        
        // Erste Jahre automatisch erweitern
        const years = new Set(data.slice(0, 8).map((t: any) => t.year))
        setExpandedYears(years)
      } else {
        setTranscripts([])
        setError('Keine Earnings Call Transcripts verfügbar')
      }
    } catch (err: any) {
      console.error('Error loading transcripts:', err)
      setError('Fehler beim Laden der Transcripts')
    } finally {
      setLoading(false)
    }
  }

  const loadSpecificTranscript = async (item: TranscriptListItem) => {
    setLoadingTranscript(true)
    
    try {
      const response = await fetch(
        `/api/earnings-transcripts?ticker=${ticker}&year=${item.year}&quarter=${item.quarter}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch transcript')
      }
      
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        setSelectedTranscript(data[0])
      } else if (data.content) {
        setSelectedTranscript(data)
      }
    } catch (err: any) {
      console.error('Error loading specific transcript:', err)
      setError('Fehler beim Laden des Transcripts')
    } finally {
      setLoadingTranscript(false)
    }
  }

  // Gruppiere Transcripts nach Jahr
  const groupedTranscripts = React.useMemo(() => {
    const groups: { [year: number]: TranscriptListItem[] } = {}
    
    transcripts.forEach(transcript => {
      if (!groups[transcript.year]) {
        groups[transcript.year] = []
      }
      groups[transcript.year].push(transcript)
    })
    
    // Sortiere Jahre absteigend
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({
        year: Number(year),
        items: items.sort((a, b) => b.quarter - a.quarter)
      }))
  }, [transcripts])

  // Format Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Highlight Search in Content
  const highlightContent = (content: string) => {
    if (!searchQuery) return content
    
    const regex = new RegExp(`(${searchQuery})`, 'gi')
    return content.replace(regex, '<mark class="bg-yellow-300 text-black">$1</mark>')
  }

  // Download Transcript
  const downloadTranscript = () => {
    if (!selectedTranscript) return
    
    const blob = new Blob([selectedTranscript.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${ticker}_Q${selectedTranscript.quarter}_${selectedTranscript.year}_transcript.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Toggle Year Expansion
  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears)
    if (newExpanded.has(year)) {
      newExpanded.delete(year)
    } else {
      newExpanded.add(year)
    }
    setExpandedYears(newExpanded)
  }

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-theme-secondary">Lade Earnings Transcripts...</span>
        </div>
      </div>
    )
  }

  if (error && transcripts.length === 0) {
    return (
      <div className="bg-theme-card border border-theme/10 rounded-xl p-8">
        <div className="text-center">
          <DocumentTextIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
          <p className="text-theme-secondary">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MicrophoneIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-theme-primary">Earnings Call Transcripts</h2>
              <p className="text-sm text-theme-muted">Vollständige Transkripte der Quartalsberichte</p>
            </div>
          </div>
          
          {selectedTranscript && (
            <button
              onClick={downloadTranscript}
              className="flex items-center gap-2 px-4 py-2 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        {selectedTranscript && (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-muted" />
            <input
              type="text"
              placeholder="Transcript durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-theme-secondary border border-theme/10 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500/50"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Transcript Liste - Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-theme-card border border-theme/10 rounded-xl p-4 sticky top-4">
            <h3 className="text-sm font-bold text-theme-muted uppercase tracking-wide mb-4">
              Verfügbare Calls
            </h3>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {groupedTranscripts.map(({ year, items }) => (
                <div key={year} className="border-b border-theme/10 last:border-0 pb-2 last:pb-0">
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-2 hover:bg-theme-secondary/50 rounded-lg transition-colors"
                  >
                    <span className="text-theme-primary font-semibold">{year}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-theme-muted">{items.length} Calls</span>
                      {expandedYears.has(year) ? (
                        <ChevronDownIcon className="w-4 h-4 text-theme-muted" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-theme-muted" />
                      )}
                    </div>
                  </button>
                  
                  {expandedYears.has(year) && (
                    <div className="mt-1 space-y-1">
                      {items.map((item) => (
                        <button
                          key={`${item.year}-Q${item.quarter}`}
                          onClick={() => loadSpecificTranscript(item)}
                          className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            selectedTranscript?.year === item.year && 
                            selectedTranscript?.quarter === item.quarter
                              ? 'bg-green-500/20 border border-green-500/30'
                              : 'hover:bg-theme-secondary/50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-theme-primary">
                                Q{item.quarter} {item.year}
                              </div>
                              <div className="text-xs text-theme-muted mt-1">
                                {formatDate(item.date)}
                              </div>
                            </div>
                            {selectedTranscript?.year === item.year && 
                             selectedTranscript?.quarter === item.quarter && (
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transcript Content */}
        <div className="lg:col-span-3">
          {loadingTranscript ? (
            <div className="bg-theme-card border border-theme/10 rounded-xl p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <span className="ml-3 text-theme-secondary">Lade Transcript...</span>
              </div>
            </div>
          ) : selectedTranscript ? (
            <div className="bg-theme-card border border-theme/10 rounded-xl">
              {/* Transcript Header */}
              <div className="p-6 border-b border-theme/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-theme-primary">
                    Q{selectedTranscript.quarter} {selectedTranscript.year} Earnings Call
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-theme-muted">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(selectedTranscript.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      <span>{selectedTranscript.content.split(' ').length} Wörter</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-theme-secondary/50 rounded-lg p-3">
                    <div className="text-xs text-theme-muted mb-1">Länge</div>
                    <div className="text-sm font-bold text-theme-primary">
                      ~{Math.round(selectedTranscript.content.split(' ').length / 200)} Min Lesezeit
                    </div>
                  </div>
                  <div className="bg-theme-secondary/50 rounded-lg p-3">
                    <div className="text-xs text-theme-muted mb-1">Teilnehmer</div>
                    <div className="text-sm font-bold text-theme-primary">
                      Management & Analysten
                    </div>
                  </div>
                  <div className="bg-theme-secondary/50 rounded-lg p-3">
                    <div className="text-xs text-theme-muted mb-1">Typ</div>
                    <div className="text-sm font-bold text-theme-primary">
                      Earnings Call
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Transcript Text */}
              <div className="p-6">
                <div 
                  className="prose prose-sm max-w-none text-theme-primary leading-relaxed"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: highlightContent(selectedTranscript.content) 
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-theme-card border border-theme/10 rounded-xl p-12">
              <div className="text-center">
                <DocumentTextIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
                <p className="text-theme-secondary">Wähle ein Transcript aus der Liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}