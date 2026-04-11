'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

export default function ArticleReaderPage() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url')
  const title = searchParams.get('title')
  const source = searchParams.get('source')
  const symbol = searchParams.get('symbol')
  const [iframeError, setIframeError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!url) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Kein Artikel</h2>
          <p className="text-theme-muted mb-4">Keine Artikel-URL angegeben.</p>
          <Link href="/analyse/analyst-ratings" className="text-brand hover:text-brand-light transition-colors">
            Zurück zu Analyst Ratings
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Article Header Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-theme-card border-b border-theme flex-shrink-0">
        <Link
          href="/analyse/analyst-ratings"
          className="flex items-center gap-1.5 text-sm text-theme-muted hover:text-theme-primary transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Zurück
        </Link>

        <div className="h-4 w-px bg-theme-border" />

        {symbol && (
          <Link
            href={`/analyse/stocks/${symbol.toLowerCase()}/estimates`}
            className="px-2 py-0.5 rounded bg-brand/15 text-brand-light text-xs font-semibold hover:bg-brand/25 transition-colors"
          >
            {symbol}
          </Link>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm text-theme-primary font-medium truncate" title={title}>
              {title}
            </p>
          )}
          {source && (
            <p className="text-xs text-theme-muted">{source}</p>
          )}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-theme-secondary border border-theme text-sm text-theme-primary hover:bg-theme-tertiary transition-colors flex-shrink-0"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          Original
        </a>
      </div>

      {/* Loading indicator */}
      {loading && !iframeError && (
        <div className="flex items-center justify-center py-12 bg-theme-card">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-theme-muted text-sm">Artikel wird geladen...</span>
          </div>
        </div>
      )}

      {/* Iframe fallback notice */}
      {iframeError && (
        <div className="flex items-center justify-center flex-1 bg-theme-card">
          <div className="text-center max-w-md px-6">
            <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-theme-primary mb-2">Artikel kann nicht eingebettet werden</h2>
            <p className="text-theme-muted text-sm mb-4">
              Diese Quelle erlaubt keine Einbettung. Du kannst den Artikel direkt beim Anbieter lesen.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              Artikel auf {source || 'der Originalseite'} lesen
            </a>
          </div>
        </div>
      )}

      {/* Article iframe */}
      {!iframeError && (
        <iframe
          src={url}
          className="flex-1 w-full border-0 bg-white"
          title={title || 'Artikel'}
          onLoad={() => setLoading(false)}
          onError={() => { setIframeError(true); setLoading(false) }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  )
}
