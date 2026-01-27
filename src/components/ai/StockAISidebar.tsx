'use client'

import React, { useState, useEffect } from 'react'
import {
    SparklesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    InformationCircleIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import RAGSourcesDisplay from './RAGSourcesDisplay'
import { supabase } from '@/lib/supabaseClient'

interface StockAISidebarProps {
    ticker: string
    isPremium: boolean
    financialData?: any
}

// Internal Helper for Section Headers
const SectionHeader = ({ type, children }: { type: 'bull' | 'bear' | 'fazit', children: React.ReactNode }) => {
    const colors = {
        bull: 'text-emerald-400',
        bear: 'text-red-400',
        fazit: 'text-brand-light'
    }
    const icons = {
        bull: <ArrowTrendingUpIcon className="w-4 h-4" />,
        bear: <ArrowTrendingDownIcon className="w-4 h-4" />,
        fazit: <InformationCircleIcon className="w-4 h-4" />
    }

    return (
        <div className={`flex items-center gap-2 mb-4 font-bold uppercase tracking-wider text-[11px] ${colors[type]}`}>
            {icons[type]}
            {children}
        </div>
    )
}

const mdComponents = {
    p: ({ children }: any) => <p className="text-sm text-theme-secondary mb-3 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }: any) => <strong className="text-theme-primary font-bold">{children}</strong>,
    li: ({ children }: any) => (
        <li className="flex gap-2 text-sm text-theme-secondary mb-2 last:mb-0 group">
            <div className="w-1 h-1 bg-brand-light/30 rounded-full mt-2 flex-shrink-0" />
            <span className="leading-tight">{children}</span>
        </li>
    ),
    ul: ({ children }: any) => <ul className="space-y-1">{children}</ul>,
    h3: () => null, // We handle headers manually
}

export default function StockAISidebar({ ticker, isPremium, financialData }: StockAISidebarProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const storageKey = `finclue_pulse_${ticker}`

    // Load from cache
    useEffect(() => {
        const cached = sessionStorage.getItem(storageKey)
        if (cached) {
            try {
                setResult(JSON.parse(cached))
            } catch (e) {
                console.error('Error parsing cached pulse result', e)
            }
        }
    }, [storageKey])

    const handleFetchPulse = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    message: `Führe einen 60-Sekunden AI Pulse Check für ${ticker} durch.`,
                    context: [],
                    analysisType: 'stock-pulse',
                    ticker: ticker,
                    financialData: financialData
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Failed to fetch AI pulse')
            }

            if (!data.response || !data.response.content) {
                throw new Error('Ungültige AI-Antwort erhalten.')
            }

            setResult({
                content: data.response.content,
                metadata: data.response.metadata,
                ragEnabled: data.ragEnabled
            })
            sessionStorage.setItem(storageKey, JSON.stringify({
                content: data.response.content,
                metadata: data.response.metadata,
                ragEnabled: data.ragEnabled
            }))
        } catch (err: any) {
            console.error('AI Pulse Error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isPremium) {
        return (
            <div className="bg-theme-secondary/20 border border-white/[0.06] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/10">
                        <SparklesIcon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-theme-primary">AI 60-Sekunden Check</h3>
                        <p className="text-theme-muted text-sm max-w-md">
                            Hole dir Bull- und Bear-Argumente basierend auf unserem AI-Index. **Premium erforderlich.**
                        </p>
                    </div>
                </div>
                <button className="w-full md:w-auto px-8 py-3 bg-brand hover:bg-brand-light text-white font-bold rounded-lg transition-all text-sm shadow-lg shadow-brand/10">
                    Mit Premium freischalten
                </button>
            </div>
        )
    }

    if (result) {
        // Split content into Bull, Bear, Fazit sections
        // Expected format: ### BULL-ARGUMENTE ... ### BEAR-ARGUMENTE ... ### FAZIT ...
        const parts = result.content.split(/###\s+/);
        const bullSection = parts.find((p: string) => p.toUpperCase().includes('BULL')) || '';
        const bearSection = parts.find((p: string) => p.toUpperCase().includes('BEAR')) || '';
        const fazitSection = parts.find((p: string) => p.toUpperCase().includes('FAZIT')) || '';

        return (
            <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="px-6 py-3 border-b border-white/[0.04] flex items-center justify-between bg-theme-secondary/20">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-4 h-4 text-brand" />
                        <h3 className="text-sm font-bold text-theme-primary uppercase tracking-tight">AI 60-Sekunden Check: {ticker}</h3>
                    </div>
                    <button
                        onClick={handleFetchPulse}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-theme-muted hover:text-theme-primary disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Bull Column */}
                        <div className="space-y-2">
                            <SectionHeader type="bull">BULL-ARGUMENTE</SectionHeader>
                            <ReactMarkdown components={mdComponents as any} remarkPlugins={[remarkGfm]}>
                                {bullSection.replace(/.*BULL-ARGUMENTE.*\n/i, '').trim()}
                            </ReactMarkdown>
                        </div>

                        {/* Bear Column */}
                        <div className="space-y-2">
                            <SectionHeader type="bear">BEAR-ARGUMENTE</SectionHeader>
                            <ReactMarkdown components={mdComponents as any} remarkPlugins={[remarkGfm]}>
                                {bearSection.replace(/.*BEAR-ARGUMENTE.*\n/i, '').trim()}
                            </ReactMarkdown>
                        </div>

                        {/* Fazit Column */}
                        <div className="space-y-2">
                            <SectionHeader type="fazit">FAZIT</SectionHeader>
                            <ReactMarkdown components={mdComponents as any} remarkPlugins={[remarkGfm]}>
                                {fazitSection.replace(/.*FAZIT.*\n/i, '').trim()}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Sources */}
                    {result.metadata?.ragSources && (
                        <div className="mt-8 pt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <RAGSourcesDisplay
                                sources={result.metadata.ragSources}
                                ragEnabled={result.ragEnabled}
                            />
                            <div className="text-theme-muted text-[10px] opacity-40 uppercase tracking-widest font-medium">
                                Stand: {new Date().toLocaleDateString('de-DE')}
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                        <span>Fehler beim Aktualisieren: {error}</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="bg-theme-secondary/20 border border-white/[0.06] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-brand/20 transition-all duration-300">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center border border-brand/10 transition-transform group-hover:rotate-1">
                    <SparklesIcon className="w-6 h-6 text-brand animate-pulse" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-theme-primary">AI 60-Sekunden Check</h3>
                    <p className="text-theme-muted text-sm max-w-xl">
                        Analysiere die aktuellsten Markt-Daten, Insider-Käufe & News für **{ticker}** blitzschnell mit unserer AI.
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                <button
                    onClick={handleFetchPulse}
                    disabled={isLoading}
                    className="w-full md:w-auto px-8 py-3 bg-brand hover:bg-brand-light text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-brand/10 disabled:opacity-70 min-w-[220px]"
                >
                    {isLoading ? (
                        <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            <span>Analysiere {ticker}...</span>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-5 h-5" />
                            <span>Pulse Check starten</span>
                        </>
                    )}
                </button>
                {error && (
                    <p className="text-red-400 text-[10px] flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        {error}
                    </p>
                )}
            </div>
        </div>
    )
}
