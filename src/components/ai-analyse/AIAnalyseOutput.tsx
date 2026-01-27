'use client'

import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Logo from '@/components/Logo'
import MarginOfSafetyGauge from '@/components/MarginOfSafetyGauge'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface AIAnalyseOutputProps {
  analysis: string
  ticker: string
  companyName: string
  currentPrice: number
  marketCap: number
  fairValue: number
  timestamp: string
  accessToken: string | null
}

interface DownloadStatus {
  canDownload: boolean
  isPremium: boolean
  downloadsThisMonth: number
  limit: number | 'unlimited'
  remaining?: number
}

export default function AIAnalyseOutput({
  analysis,
  ticker,
  companyName,
  currentPrice,
  marketCap,
  fairValue,
  timestamp,
  accessToken
}: AIAnalyseOutputProps) {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const formatMarketCap = (cap: number) => {
    const formatNumber = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (cap >= 1e12) return `${formatNumber(cap / 1e12)} Bio. USD`
    if (cap >= 1e9) return `${formatNumber(cap / 1e9)} Mrd. USD`
    if (cap >= 1e6) return `${formatNumber(cap / 1e6)} Mio. USD`
    return `${formatNumber(cap)} USD`
  }

  // Check download status on mount
  useEffect(() => {
    if (!accessToken) return

    const checkDownloadStatus = async () => {
      try {
        const res = await fetch('/api/ai-analyse/download', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (res.ok) {
          const data = await res.json()
          setDownloadStatus(data)
        }
      } catch (err) {
        console.error('Error checking download status:', err)
      }
    }

    checkDownloadStatus()
  }, [accessToken])

  const handleDownload = async () => {
    if (!accessToken) return
    if (downloadStatus && !downloadStatus.canDownload) return

    setIsDownloading(true)
    setDownloadError(null)

    try {
      // Try to record the download (non-blocking - we'll still allow download if this fails)
      try {
        const recordRes = await fetch('/api/ai-analyse/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ ticker, companyName })
        })

        if (recordRes.ok && downloadStatus && !downloadStatus.isPremium) {
          // Update download status only if we successfully recorded
          setDownloadStatus(prev => prev ? {
            ...prev,
            downloadsThisMonth: prev.downloadsThisMonth + 1,
            canDownload: prev.downloadsThisMonth + 1 < (prev.limit as number),
            remaining: Math.max(0, (prev.limit as number) - prev.downloadsThisMonth - 1)
          } : null)
        }
      } catch (recordErr) {
        // Silently ignore recording errors - still allow the download
        console.warn('Could not record download:', recordErr)
      }

      // Generate and download the report as HTML file
      const htmlContent = generateHTMLReport()
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `DCF-Analyse-${ticker}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Download error:', err)
      setDownloadError(err instanceof Error ? err.message : 'Download fehlgeschlagen')
    } finally {
      setIsDownloading(false)
    }
  }

  const generateHTMLReport = () => {
    // Convert markdown to simple HTML
    const analysisHTML = analysis
      .replace(/^## (.*$)/gim, '<h2 style="color: #1a1a1a; font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e5e5e5;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="color: #1a1a1a; font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a1a1a;">$1</strong>')
      .replace(/^\- (.*$)/gim, '<li style="color: #4a4a4a; margin-bottom: 0.25rem;">$1</li>')
      .replace(/^\| (.*) \|$/gim, (match) => {
        const cells = match.slice(1, -1).split('|').map(c => c.trim())
        return '<tr>' + cells.map(c => `<td style="padding: 0.5rem; border: 1px solid #e5e5e5;">${c}</td>`).join('') + '</tr>'
      })
      .replace(/\n/g, '<br>')

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DCF-Analyse: ${companyName} (${ticker})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #4a4a4a; max-width: 800px; margin: 0 auto; padding: 2rem; background: #fff; }
    .header { border-bottom: 2px solid #16a34a; padding-bottom: 1rem; margin-bottom: 2rem; }
    .company-name { font-size: 1.75rem; font-weight: 700; color: #1a1a1a; }
    .ticker { display: inline-block; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; margin-left: 0.5rem; }
    .meta { display: flex; gap: 2rem; margin-top: 1rem; }
    .meta-item { }
    .meta-label { font-size: 0.75rem; color: #8a8a8a; }
    .meta-value { font-size: 1.25rem; font-weight: 600; color: #1a1a1a; }
    .content { margin-top: 2rem; }
    .disclaimer { margin-top: 2rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; font-size: 0.75rem; color: #6b7280; }
    .footer { margin-top: 2rem; text-align: center; font-size: 0.75rem; color: #8a8a8a; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th { background: #f3f4f6; padding: 0.5rem; text-align: left; font-weight: 600; border: 1px solid #e5e5e5; }
    ul { padding-left: 1.5rem; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <div class="header">
    <span class="company-name">${companyName}</span>
    <span class="ticker">${ticker}</span>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Aktueller Kurs</div>
        <div class="meta-value">$${currentPrice?.toFixed(2)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Marktkapitalisierung</div>
        <div class="meta-value">${formatMarketCap(marketCap)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Erstellt am</div>
        <div class="meta-value">${new Date(timestamp).toLocaleDateString('de-DE')}</div>
      </div>
    </div>
  </div>

  <div class="content">
    ${analysisHTML}
  </div>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> Diese Analyse dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar.
    Die Berechnungen basieren auf historischen Daten und Annahmen, die sich als ungenau erweisen können.
  </div>

  <div class="footer">
    Powered by Finclue AI · ${new Date().toLocaleDateString('de-DE')}
  </div>
</body>
</html>`
  }

  return (
    <div className="max-w-4xl mx-auto" ref={reportRef}>
      {/* Stock Header */}
      <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <Logo ticker={ticker} className="w-16 h-16" alt={companyName} />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme-primary">{companyName}</h2>
              <span className="px-2 py-1 bg-theme-secondary rounded-md text-sm font-medium text-theme-secondary">
                {ticker}
              </span>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div>
                <span className="text-theme-muted text-sm">Aktueller Kurs</span>
                <p className="text-xl font-semibold text-theme-primary">${currentPrice?.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-theme-muted text-sm">Marktkapitalisierung</span>
                <p className="text-xl font-semibold text-theme-primary">{formatMarketCap(marketCap)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                AI-Analyse
              </div>
              <span className="text-xs text-theme-muted">
                {new Date(timestamp).toLocaleString('de-DE')}
              </span>
            </div>
          </div>
          {/* Margin of Safety Gauge */}
          {fairValue > 0 && (
            <div className="flex-shrink-0">
              <MarginOfSafetyGauge
                currentPrice={currentPrice}
                fairValue={fairValue}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Analysis Content */}
      <div className="bg-theme-card border border-theme rounded-xl p-8">
        <article className="ai-analysis-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {analysis}
          </ReactMarkdown>
        </article>
      </div>

      {/* Download Button - Always show if we have an access token */}
      {accessToken && (
        <div className="mt-6 flex items-center justify-between p-4 bg-theme-card border border-theme rounded-xl">
          <div>
            <p className="text-sm font-medium text-theme-primary">Report herunterladen</p>
            <p className="text-xs text-theme-muted">
              {downloadStatus?.isPremium
                ? 'Unbegrenzte Downloads mit Premium'
                : downloadStatus
                  ? `${downloadStatus.remaining} von ${downloadStatus.limit} Downloads diesen Monat verfügbar`
                  : 'Als HTML-Datei speichern'
              }
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || (downloadStatus && !downloadStatus.canDownload)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !downloadStatus || downloadStatus.canDownload
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'bg-theme-secondary text-theme-muted cursor-not-allowed'
            }`}
          >
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird erstellt...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                {!downloadStatus || downloadStatus.canDownload ? 'Als HTML herunterladen' : 'Limit erreicht'}
              </>
            )}
          </button>
        </div>
      )}

      {downloadError && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{downloadError}</p>
        </div>
      )}

      {/* Info & Disclaimer */}
      <div className="mt-6 p-4 border border-theme rounded-xl space-y-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-theme-muted mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-theme-muted text-xs leading-relaxed">
            <span className="font-medium text-theme-secondary">Was ist DCF?</span> Die Discounted-Cash-Flow-Methode berechnet den fairen Wert einer Aktie basierend auf zukünftigen Cashflows.{' '}
            <a href="/blog/dcf-methode-erklaert" className="text-brand hover:underline">Mehr erfahren →</a>
          </p>
        </div>
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-theme-muted mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-theme-muted text-xs leading-relaxed">
            <span className="font-medium text-theme-secondary">Disclaimer:</span> Diese Analyse dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-theme-muted">
        <span>Powered by</span>
        <span className="font-medium text-theme-secondary">Finclue AI</span>
      </div>
    </div>
  )
}
