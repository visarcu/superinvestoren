'use client'

import { useState, useEffect } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface StockNewsSummaryProps {
  ticker: string
  companyName?: string
  price?: number
  changePct?: number
}

export default function StockNewsSummary({
  ticker,
  companyName,
  price,
  changePct
}: StockNewsSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const fetchSummary = async () => {
    setLoading(true)
    setError(false)

    try {
      const res = await fetch('/api/stock-news-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          companyName,
          price,
          changePct
        })
      })

      const data = await res.json()

      if (data.generated && data.summary) {
        setSummary(data.summary)
        setGeneratedAt(data.generatedAt)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('[StockNewsSummary] Error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Nur fetchen wenn wir Kursdaten haben (d.h. die Seite ist geladen)
    if (ticker && typeof changePct === 'number') {
      fetchSummary()
    }
  }, [ticker, changePct])

  // Formatiere Zeitstempel
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }) + ' Uhr'
  }

  // Nicht anzeigen wenn noch keine Kursdaten da sind
  if (typeof changePct !== 'number') {
    return null
  }

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <SparklesIcon className="w-4 h-4 text-brand" />
        <span className="text-sm font-medium text-theme-primary">News Summary</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-theme-hover rounded animate-pulse w-full" />
          <div className="h-4 bg-theme-hover rounded animate-pulse w-5/6" />
          <div className="h-4 bg-theme-hover rounded animate-pulse w-4/6" />
        </div>
      ) : error ? (
        <p className="text-sm text-theme-muted">
          Keine aktuellen News verfügbar.
        </p>
      ) : summary ? (
        <>
          <p className="text-sm text-theme-secondary leading-relaxed">
            {summary}
          </p>
          {generatedAt && (
            <p className="text-xs text-theme-muted mt-3">
              News aktualisiert um {formatTime(generatedAt)}
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
