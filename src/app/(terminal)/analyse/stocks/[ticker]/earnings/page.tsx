// app/analyse/stocks/[ticker]/earnings/page.tsx - INSIGHTS STYLE
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import EarningsSummary from '@/components/EarningsSummary'
import {
  DocumentTextIcon,
  LockClosedIcon,
  SparklesIcon
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

  // Loading State
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <span className="text-sm text-neutral-500">Lade Earnings Calls...</span>
        </div>
      </div>
    )
  }

  // Error State
  if (error && transcripts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-dark">
        <div className="text-center">
          <DocumentTextIcon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Keine Earnings Calls verfügbar</h2>
          <p className="text-neutral-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const formattedContent = selectedTranscript ? formatTranscriptContent(selectedTranscript.content) : []
  const wordCount = selectedTranscript ? selectedTranscript.content.split(' ').length : 0

  return (
    <div className="h-full flex flex-col bg-dark">

      {/* Header - Clean & Minimal */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-white">Earnings Calls & Transcripts</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Vollständige Mitschriften für {ticker}</p>
          </div>
        </div>
      </div>

      {/* Main Layout - 3 Spalten */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Sidebar - Event Liste */}
        <div className="w-56 border-r border-neutral-800 flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-800">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Alle Events
            </span>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {transcripts.map((transcript, index) => {
              const isSelected = selectedTranscript?.quarter === transcript.quarter &&
                               selectedTranscript?.year === transcript.year
              const isPremium = false // Alle Quartale verfügbar

              return (
                <button
                  key={`${transcript.year}-Q${transcript.quarter}`}
                  onClick={() => !isPremium && setSelectedTranscript(transcript)}
                  disabled={isPremium}
                  className={`w-full text-left px-4 py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-neutral-800 border-l-2 border-emerald-500'
                      : isPremium
                        ? 'opacity-40 cursor-not-allowed border-l-2 border-transparent'
                        : 'hover:bg-neutral-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-white">
                        Q{transcript.quarter} {transcript.year}
                      </span>
                      {index === 0 && (
                        <span className="ml-2 text-xs text-emerald-400">Aktuell</span>
                      )}
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatDate(transcript.date)}
                      </p>
                    </div>

                    {isPremium && (
                      <LockClosedIcon className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Center - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Content Header */}
          <div className="flex-shrink-0 px-6 py-3 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-base font-medium text-white">
                  {selectedTranscript && `Q${selectedTranscript.quarter} ${selectedTranscript.year} - ${formatDate(selectedTranscript.date)}`}
                </h2>
                <span className="text-xs text-neutral-500">
                  {wordCount.toLocaleString()} Wörter
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    showSummary
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <SparklesIcon className="w-3.5 h-3.5 inline mr-1.5" />
                  AI Summary
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
                  className="px-3 py-1.5 text-xs bg-neutral-800 text-neutral-400 hover:text-white rounded-md transition-colors"
                >
                  Download
                </button>
              </div>
            </div>

            {/* Tabs - subtiler */}
            <div className="flex gap-6 mt-3">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-2 text-sm border-b-2 transition-colors ${
                  activeTab === 'transcript'
                    ? 'text-white border-white'
                    : 'text-neutral-500 border-transparent hover:text-neutral-300'
                }`}
              >
                Transcript
              </button>
              <span className="pb-2 text-sm text-neutral-600 cursor-not-allowed">
                Slides (Bald)
              </span>
              <span className="pb-2 text-sm text-neutral-600 cursor-not-allowed">
                Report (Bald)
              </span>
            </div>
          </div>

          {/* Scrollable Transcript Content */}
          <div className="flex-1 overflow-y-auto bg-dark">
            {selectedTranscript && (
              <div className="px-8 py-6 max-w-4xl">

                {/* Original Transcript Title */}
                <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-6">
                  Original Transcript (Englisch)
                </h3>

                {/* Speaker Formatting */}
                <div className="space-y-4">
                  {formattedContent.map((item) => {
                    if (item.type === 'section') {
                      return (
                        <h4 key={item.key} className="text-base font-medium text-white mt-8 mb-4">
                          {item.text}
                        </h4>
                      )
                    }

                    if (item.type === 'speaker') {
                      return (
                        <div key={item.key} className="mb-4">
                          <p className="font-medium text-white mb-1">{item.speaker}</p>
                          <p className="text-neutral-400 leading-relaxed">{item.text}</p>
                        </div>
                      )
                    }

                    if (item.text.trim()) {
                      return (
                        <p key={item.key} className="text-neutral-400 leading-relaxed">
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

        {/* Right Sidebar - AI Summary */}
        {showSummary && selectedTranscript && (
          <div className="w-[400px] border-l border-neutral-800 overflow-y-auto flex-shrink-0">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-white">AI Zusammenfassung</h3>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                GPT-4 • Aktualisiert vor 3 Min.
              </p>

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
