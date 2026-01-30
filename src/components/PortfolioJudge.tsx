'use client'

import React, { useState } from 'react'
import { SparklesIcon, ScaleIcon, FireIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/LoadingSpinner'

interface AuditResult {
    match: {
        investor: {
            name: string
            slug: string
            style: string
        }
        score: number
        details: {
            sharedStocks: number
            sectorMatch: number
            tickerMatch: number
        }
    }
    allComparisons: any[]
    analysis: {
        realityCheck: string
        verdict: string
        tips: string[]
    }
}

interface PortfolioJudgeProps {
    holdings: any[]
    totalValue: number
}

export default function PortfolioJudge({ holdings, totalValue }: PortfolioJudgeProps) {
    const [result, setResult] = useState<AuditResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [hasAudited, setHasAudited] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleAudit = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/ai/portfolio-audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ holdings, totalValue })
            })

            if (res.ok) {
                const data = await res.json()
                setResult(data)
                setHasAudited(true)
            } else {
                setError('Analyse fehlgeschlagen. Bitte versuche es später noch einmal.')
            }
        } catch (error) {
            console.error('Audit failed:', error)
            setError('Verbindung fehlgeschlagen.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-theme-card border border-white/[0.04] rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                <LoadingSpinner />
                <p className="mt-4 text-theme-secondary animate-pulse">
                    Der "Ruthless Judge" analysiert dein Portfolio...
                </p>
                <p className="text-xs text-theme-muted mt-2">
                    Vergleiche mit Buffett, Burry & Co...
                </p>
            </div>
        )
    }

    if (!hasAudited) {
        return (
            <div className="bg-theme-card border border-white/[0.04] rounded-2xl p-8 text-center relative overflow-hidden">
                {/* Background Effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ScaleIcon className="w-8 h-8 text-brand-light" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3">
                        Welcher Superinvestor bist du?
                    </h2>
                    <p className="text-theme-secondary mb-8 leading-relaxed">
                        Lass deine Aktien von unserer AI analysieren. Wir vergleichen dein Portfolio mit den Legenden (Buffett, Burry, Ackman) und geben dir ein ehrliches, professionelles Feedback.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAudit}
                        className="mx-auto w-full sm:w-auto px-8 py-4 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Portfolio analysieren
                    </button>
                    <p className="text-xs text-theme-muted mt-4">
                        Powered by AI & 13F Data
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 1. The Verdict Card */}
            <div className="bg-theme-card border border-white/[0.04] rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="p-6 sm:p-8 relative z-10">
                    <div className="flex flex-col md:flex-row gap-8 items-start">

                        {/* Score & Match */}
                        <div className="w-full md:w-1/3 text-center md:text-left">
                            <p className="text-sm font-medium text-theme-muted uppercase tracking-wider mb-2">Dein Investment-Zwilling</p>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                                {result?.match.investor.name}
                            </h2>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand-light rounded-full text-sm font-medium mb-4">
                                <FireIcon className="w-4 h-4" />
                                {result?.match.score}% Match
                            </div>

                            <div className="space-y-2 mt-4 text-left bg-theme-bg-secondary p-4 rounded-xl border border-white/[0.04]">
                                <div className="flex justify-between text-sm">
                                    <span className="text-theme-secondary">Geteilte Aktien</span>
                                    <span className="text-white font-medium">{result?.match.details.sharedStocks}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-theme-secondary">Sektor-Korrelation</span>
                                    <span className="text-white font-medium">{result?.match.details.sectorMatch}%</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Roast Text */}
                        <div className="w-full md:w-2/3">
                            <div className="bg-theme-bg-secondary/50 backdrop-blur-sm rounded-xl p-6 border border-white/[0.04] h-full">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <span className="text-2xl">👨‍⚖️</span> Das Urteil
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-theme-muted uppercase mb-1">Reality Check</p>
                                        <p className="text-theme-primary italic">"{result?.analysis.realityCheck}"</p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-theme-muted uppercase mb-1">Analyse</p>
                                        <p className="text-theme-secondary text-sm leading-relaxed">{result?.analysis.verdict}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Actionable Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-theme-card border border-white/[0.04] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">💡 Profi-Tipps für dich</h3>
                    <ul className="space-y-3">
                        {result?.analysis.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-brand/20 text-brand-light flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                                    {idx + 1}
                                </div>
                                <p className="text-theme-secondary text-sm">{tip}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-theme-card border border-white/[0.04] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Andere Ähnlichkeiten</h3>
                    <div className="space-y-4">
                        {result?.allComparisons.slice(1).map((comp, idx) => ( // Skip the first one as it is the main match
                            <div key={idx} className="flex items-center justify-between p-3 bg-theme-bg-secondary rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-theme-secondary">
                                        {comp.investor.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{comp.investor.name}</p>
                                        <p className="text-xs text-theme-muted">{comp.investor.style}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-bold text-white">{comp.score}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
