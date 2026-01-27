'use client'

import React, { useState } from 'react'
import {
    SparklesIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '@/lib/supabaseClient'

interface Stock {
    symbol: string
    name: string
    sector?: string
}

interface StockFinderAnalystProps {
    stocks: Stock[]
    query: string
}

export default function StockFinderAnalyst({ stocks, query }: StockFinderAnalystProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [analysis, setAnalysis] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleAnalyze = async () => {
        if (stocks.length === 0) return

        setIsLoading(true)
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const symbols = stocks.map(s => s.symbol).slice(0, 12) // Top 12 für Kontext
            const symbolsList = stocks.map(s => `${s.symbol} (${s.name})`).slice(0, 12).join(', ')

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    message: `Analysiere diese Auswahl an Aktien im Kontext der Suche "${query}": ${symbolsList}. 
                    Erstelle eine kurze, prägnante Zusammenfassung (max 200 Wörter): 
                    1. Was sind die gemeinsamen fundamentalen Stärken dieser Firmen? 
                    2. Welche spezifischen Branchen-Risiken teilen sie? 
                    3. Welche dieser Aktien sticht aktuell besonders hervor (Sentiment/News)?`,
                    analysisType: 'general',
                    context: []
                })
            })

            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Failed to analyze results')

            setAnalysis(data.response.content)
        } catch (err: any) {
            console.error('Stock Finder Analyst Error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (stocks.length === 0) return null

    return (
        <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between bg-theme-secondary/20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20">
                        <SparklesIcon className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-theme-primary uppercase tracking-tight">AI Result Analyst</h3>
                        <p className="text-[10px] text-theme-muted uppercase tracking-widest font-medium">Deep Intelligence Snapshot</p>
                    </div>
                </div>

                {!analysis && !isLoading && (
                    <button
                        onClick={handleAnalyze}
                        className="px-4 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-lg transition-all border border-brand/20 flex items-center gap-2"
                    >
                        <PresentationChartLineIcon className="w-3.5 h-3.5" />
                        Ergebnisse jetzt analysieren
                    </button>
                )}

                {analysis && !isLoading && (
                    <button
                        onClick={handleAnalyze}
                        className="text-theme-muted hover:text-theme-primary transition-all p-1"
                        title="Neu analysieren"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                            <SparklesIcon className="w-5 h-5 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-theme-primary">Analysiere Markt-Zusammenhänge...</p>
                            <p className="text-[11px] text-theme-muted mt-1 uppercase tracking-wider">Metriken & Nachrichten-Daten werden fusioniert</p>
                        </div>
                    </div>
                ) : analysis ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => <p className="text-sm text-theme-secondary leading-relaxed mb-4 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="text-theme-primary font-bold">{children}</strong>,
                                ul: ({ children }) => <ul className="space-y-2 mb-4 list-none p-0">{children}</ul>,
                                li: ({ children }) => (
                                    <li className="flex gap-2 text-sm text-theme-secondary group">
                                        <div className="w-1.5 h-1.5 bg-brand/30 rounded-full mt-1.5 flex-shrink-0 group-hover:bg-brand transition-colors" />
                                        <span>{children}</span>
                                    </li>
                                )
                            }}
                        >
                            {analysis}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <p className="text-sm text-theme-secondary max-w-md">
                            Lass die AI deine Trefferliste auswerten, um **gemeinsame Moats, Risiken und Top-Performer** direkt zu identifizieren.
                        </p>
                        <button
                            onClick={handleAnalyze}
                            className="mt-6 px-8 py-3 bg-brand hover:bg-brand-light text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/10 text-sm"
                        >
                            Snapshot generieren
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-3">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-bold">Analyse fehlgeschlagen</p>
                            <p className="opacity-80 mt-0.5">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            {analysis && (
                <div className="px-6 py-3 border-t border-white/[0.04] bg-theme-secondary/5 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-theme-muted uppercase tracking-widest font-bold opacity-50">
                        <span className="flex items-center gap-1"><div className="w-1 h-1 bg-brand rounded-full" /> Fundamental Analysis</span>
                        <span className="flex items-center gap-1"><div className="w-1 h-1 bg-brand rounded-full" /> Sentiment Check</span>
                    </div>
                    <div className="text-[10px] text-theme-muted opacity-30">
                        Finclue AI v2.1
                    </div>
                </div>
            )}
        </div>
    )
}
