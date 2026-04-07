// components/EarningsSummary.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface EarningsSummaryProps {
  ticker: string
  year: number
  quarter: number
  content: string
  minimal?: boolean
}

export default function EarningsSummary({ ticker, year, quarter, content, minimal = false }: EarningsSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isLoadingRef = useRef(false)

  // Check cache on mount — show cached summary immediately without needing button click
  useEffect(() => {
    const cacheKey = `summary-${ticker}-${year}-Q${quarter}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < 30 * 24 * 60 * 60 * 1000) {
          setSummary(parsed.summary)
          setHasRequested(true)
        }
      } catch {
        localStorage.removeItem(cacheKey)
      }
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [ticker, year, quarter])

  const loadSummary = async () => {
    // Prevent duplicate requests
    if (isLoadingRef.current) return

    setHasRequested(true)

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    isLoadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/earnings-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          year,
          quarter,
          content: content.substring(0, 10000)
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) throw new Error('Summary generation failed')

      const data = await response.json()
      setSummary(data.summary)

      // Cache in localStorage
      localStorage.setItem(cacheKey, JSON.stringify({
        summary: data.summary,
        timestamp: Date.now()
      }))

    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError') return
      console.error('Summary error:', err)
      setError('AI-Zusammenfassung nicht verfügbar')
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  // Minimal version for sidebar
  if (minimal) {
    // Not yet requested — show generate button
    if (!hasRequested && !loading) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <SparklesIcon className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-white mb-1">KI-Zusammenfassung</p>
          <p className="text-xs text-neutral-500 mb-5 max-w-[220px]">
            Lass Finclue AI den Earnings Call für dich analysieren und zusammenfassen.
          </p>
          <button
            onClick={() => loadSummary()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-colors"
          >
            <SparklesIcon className="w-4 h-4" />
            Zusammenfassung generieren
          </button>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent"></div>
            <SparklesIcon className="w-5 h-5 text-brand animate-pulse" />
          </div>
          <div className="text-sm font-medium text-theme-primary mb-2">
            Finclue AI analysiert...
          </div>
          <div className="text-xs text-theme-muted">
            Generiere Zusammenfassung für Q{quarter} {year}
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-theme-tertiary/30 rounded animate-pulse"></div>
            <div className="h-3 bg-theme-tertiary/30 rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-theme-tertiary/30 rounded animate-pulse w-5/6"></div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-xs text-red-400 p-3 bg-red-500/10 rounded-lg">
          {error}
        </div>
      )
    }

    if (!summary) return null

    return (
      <div className="space-y-5 text-sm">
        {summary.split('\n\n').map((section, index) => {
          const lines = section.split('\n').filter(l => l.trim())
          
          // Kennzahlen
          if (section.includes('📊') || section.includes('KENNZAHLEN')) {
            return (
              <div key={index} className="pb-4 border-b border-theme/10">
                <h4 className="font-semibold text-theme-primary mb-3 text-sm">Kennzahlen</h4>
                <div className="space-y-1.5">
                  {lines.slice(1).map((item, i) => {
                    if (!item.includes('•')) return null
                    const text = item.replace('•', '').trim()
                    // Highlight wichtige Zahlen
                    const formattedText = text.replace(
                      /(\$[\d,.]+ (?:Mrd\.|Mio\.|billion|million)?|\d+[,.]?\d*%)/g,
                      '<span class="font-semibold text-theme-primary">$1</span>'
                    )
                    return (
                      <div key={i} className="text-theme-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: `• ${formattedText}` }} />
                    )
                  })}
                </div>
              </div>
            )
          }
          
          // Highlights
          if (section.includes('✅') || section.includes('POSITIVE')) {
            return (
              <div key={index} className="pb-4 border-b border-theme/10">
                <h4 className="font-semibold text-theme-primary mb-3 text-sm">Highlights</h4>
                <div className="space-y-1.5">
                  {lines.slice(1).map((item, i) => {
                    if (!item.includes('•')) return null
                    return (
                      <div key={i} className="text-theme-secondary leading-relaxed">
                        <span className="text-brand mr-1.5">•</span>
                        {item.replace('•', '').trim()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
          
          // Herausforderungen
          if (section.includes('⚠️') || section.includes('HERAUSFORDERUNGEN')) {
            return (
              <div key={index} className="pb-4 border-b border-theme/10">
                <h4 className="font-semibold text-theme-primary mb-3 text-sm">Herausforderungen</h4>
                <div className="space-y-1.5">
                  {lines.slice(1).map((item, i) => {
                    if (!item.includes('•')) return null
                    return (
                      <div key={i} className="text-theme-secondary leading-relaxed">
                        <span className="text-yellow-500 mr-1.5">•</span>
                        {item.replace('•', '').trim()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
          
          // Ausblick
          if (section.includes('🎯') || section.includes('GUIDANCE') || section.includes('AUSBLICK')) {
            return (
              <div key={index} className="pb-4 border-b border-theme/10">
                <h4 className="font-semibold text-theme-primary mb-3 text-sm">Guidance & Ausblick</h4>
                <div className="space-y-1.5 text-theme-secondary leading-relaxed">
                  {lines.slice(1).map((item, i) => {
                    if (!item.trim()) return null
                    return (
                      <div key={i}>
                        • {item.replace('•', '').trim()}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
          
          // Fazit
          if (section.includes('💡') || section.includes('FAZIT')) {
            const fazitText = lines.find(l => !l.includes('💡') && !l.includes('FAZIT') && l.trim())
            if (!fazitText) return null
            
            return (
              <div key={index} className="p-4 bg-brand/5 border border-brand/20 rounded-lg">
                <h4 className="font-semibold text-theme-primary mb-2 text-sm">Fazit</h4>
                <p className="text-theme-secondary leading-relaxed">
                  {fazitText}
                </p>
              </div>
            )
          }
          
          return null
        })}
        
        <div className="pt-4 text-xs text-theme-muted leading-relaxed">
          Hinweis: Diese AI-generierte Zusammenfassung dient nur zur Orientierung. Bitte lesen Sie das vollständige Transcript für alle Details.
        </div>
      </div>
    )
  }

  // Full version (not used anymore, but kept for compatibility)
  return null
}