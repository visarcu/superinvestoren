// app/analyse/stocks/[ticker]/earnings/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import EarningsSummary from '@/components/EarningsSummary'
import {
  DocumentTextIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'

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
  const [activeTab, setActiveTab] = useState<'transcript' | 'slides' | 'report'>('transcript')
  const [showSummary, setShowSummary] = useState(true)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    async function loadPremium() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()
          setIsPremium(profile?.is_premium || false)
        }
      } catch (e) {
        console.error('[earnings] premium check failed:', e)
      }
    }
    loadPremium()
  }, [])

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

  const formatTranscriptContent = (content: string) => {
    if (!content) return []

    return content.split('\n').map((line, index) => {
      const speakerMatch = line.match(/^([A-Za-z\s]+(?:\s[A-Z]\.\s)?[A-Za-z]+):\s(.*)/)

      if (speakerMatch) {
        return {
          type: 'speaker',
          speaker: speakerMatch[1],
          text: speakerMatch[2],
          key: index
        }
      }

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
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-sm text-theme-muted">Lade Earnings Calls...</span>
        </div>
      </div>
    )
  }

  if (error && transcripts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-primary">
        <div className="text-center">
          <div className="w-12 h-12 bg-theme-secondary/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="w-6 h-6 text-theme-muted" />
          </div>
          <h2 className="text-base font-medium text-theme-primary mb-2">Keine Earnings Calls verfügbar</h2>
          <p className="text-theme-muted text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const formattedContent = selectedTranscript ? formatTranscriptContent(selectedTranscript.content) : []
  const wordCount = selectedTranscript ? selectedTranscript.content.split(' ').length : 0
  const readingMinutes = Math.max(1, Math.round(wordCount / 150))

  return (
    <div className="h-full flex flex-col bg-theme-primary">

      {/* Outer container with consistent padding */}
      <div className="flex-1 flex flex-col overflow-hidden px-6 py-5 gap-5">

        {/* Main Grid: Sidebar + Content area */}
        <div className="flex-1 grid gap-5 overflow-hidden grid-cols-[260px_1fr]">

          {/* Left Sidebar - Event Liste Card */}
          <aside className="bg-theme-card rounded-xl border border-white/[0.06] shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-4 h-4 text-theme-muted" />
                <span className="text-xs font-medium text-theme-primary uppercase tracking-wider">
                  Alle Events
                </span>
              </div>
              <span className="text-[10px] text-theme-muted bg-theme-secondary/50 px-1.5 py-0.5 rounded">
                {transcripts.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {transcripts.map((transcript, index) => {
                const isSelected = selectedTranscript?.quarter === transcript.quarter &&
                                 selectedTranscript?.year === transcript.year

                return (
                  <button
                    key={`${transcript.year}-Q${transcript.quarter}`}
                    onClick={() => setSelectedTranscript(transcript)}
                    className={`w-full text-left px-5 py-3 transition-all relative group ${
                      isSelected
                        ? 'bg-emerald-500/5'
                        : 'hover:bg-theme-secondary/30'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-500 rounded-r" />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-theme-primary' : 'text-theme-secondary group-hover:text-theme-primary'} transition-colors`}>
                            Q{transcript.quarter} {transcript.year}
                          </span>
                          {index === 0 && (
                            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                              Aktuell
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-theme-muted mt-0.5">
                          {formatDate(transcript.date)}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Right side: Content + Summary */}
          <div className={`grid gap-5 overflow-hidden ${showSummary && selectedTranscript ? 'grid-cols-[1fr_440px]' : 'grid-cols-1'}`}>

            {/* Center - Main Transcript Card */}
            <section className="bg-theme-card rounded-xl border border-white/[0.06] shadow-sm overflow-hidden flex flex-col">

              {/* Card Header */}
              <div className="flex-shrink-0 px-6 pt-5 pb-0 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-theme-primary truncate">
                        {selectedTranscript && `Q${selectedTranscript.quarter} ${selectedTranscript.year} Earnings Call`}
                      </h2>
                      <p className="text-xs text-theme-muted mt-0.5 truncate">
                        {selectedTranscript && formatDate(selectedTranscript.date)}
                        <span className="mx-2">•</span>
                        {wordCount.toLocaleString('de-DE')} Wörter
                        <span className="mx-2">•</span>
                        ~{readingMinutes} Min. Lesezeit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowSummary(!showSummary)}
                      className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                        showSummary
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
                          : 'bg-transparent border-white/[0.08] text-theme-muted hover:text-theme-primary hover:border-white/[0.15]'
                      }`}
                    >
                      <SparklesIcon className="w-3.5 h-3.5" />
                      KI-Zusammenfassung {showSummary ? 'aus' : 'ein'}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-transparent border border-white/[0.08] text-theme-muted hover:text-theme-primary hover:border-white/[0.15] rounded-md transition-all"
                    >
                      <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === 'transcript'
                        ? 'text-theme-primary border-emerald-500'
                        : 'text-theme-muted border-transparent hover:text-theme-secondary'
                    }`}
                  >
                    Transcript
                  </button>
                  <span className="pb-3 text-sm text-theme-muted/60 cursor-not-allowed border-b-2 border-transparent">
                    Slides <span className="text-[10px] ml-1 opacity-70">(Bald)</span>
                  </span>
                  <span className="pb-3 text-sm text-theme-muted/60 cursor-not-allowed border-b-2 border-transparent">
                    Report <span className="text-[10px] ml-1 opacity-70">(Bald)</span>
                  </span>
                </div>
              </div>

              {/* Scrollable Transcript Content */}
              <div className="flex-1 overflow-y-auto">
                {selectedTranscript && (
                  <div className="px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-[10px] font-medium text-theme-muted uppercase tracking-wider">
                        Original Transcript
                      </span>
                      <span className="text-[10px] text-theme-muted/60">•</span>
                      <span className="text-[10px] font-medium text-theme-muted uppercase tracking-wider">
                        Englisch
                      </span>
                    </div>

                    <div className="space-y-6">
                      {formattedContent.map((item) => {
                        if (item.type === 'section') {
                          return (
                            <div key={item.key} className="pt-6 mt-2 first:pt-0 first:mt-0">
                              <h4 className="text-xs font-semibold text-theme-primary uppercase tracking-wider pb-2 border-b border-white/[0.06]">
                                {item.text}
                              </h4>
                            </div>
                          )
                        }

                        if (item.type === 'speaker') {
                          return (
                            <div key={item.key} className="grid grid-cols-[160px_1fr] gap-6 group">
                              <div className="flex-shrink-0">
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-1 h-4 rounded-full bg-emerald-500/70" />
                                  <span className="text-sm font-semibold text-emerald-400 leading-tight">
                                    {item.speaker}
                                  </span>
                                </span>
                              </div>
                              <p className="text-sm text-theme-secondary leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                          )
                        }

                        if (item.text.trim()) {
                          return (
                            <div key={item.key} className="grid grid-cols-[160px_1fr] gap-6">
                              <div />
                              <p className="text-sm text-theme-secondary leading-relaxed">
                                {item.text}
                              </p>
                            </div>
                          )
                        }

                        return null
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Right Sidebar - AI Summary Card */}
            {showSummary && selectedTranscript && (
              <aside className="bg-theme-card rounded-xl border border-white/[0.06] shadow-sm overflow-hidden flex flex-col">

                {/* Card Header */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-theme-primary">
                          KI-Zusammenfassung
                        </h3>
                        <p className="text-[11px] text-theme-muted mt-0.5">
                          Finclue AI · Q{selectedTranscript.quarter} {selectedTranscript.year}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-5">
                    {isPremium ? (
                      <EarningsSummary
                        ticker={ticker}
                        year={selectedTranscript.year}
                        quarter={selectedTranscript.quarter}
                        content={selectedTranscript.content}
                        minimal={true}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-xl bg-theme-secondary/40 border border-white/[0.06] flex items-center justify-center mb-4">
                          <LockClosedIcon className="w-5 h-5 text-theme-muted" />
                        </div>
                        <p className="text-sm font-semibold text-theme-primary mb-1.5">
                          Premium Feature
                        </p>
                        <p className="text-xs text-theme-muted mb-5 max-w-[240px] leading-relaxed">
                          KI-Zusammenfassungen von Earnings Calls sind nur für Premium-Mitglieder verfügbar.
                        </p>
                        <a
                          href="/pricing"
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          Premium werden
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
