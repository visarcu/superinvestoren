'use client'

import React, { useState } from 'react'
import { SparklesIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import AIChatMessage from './AIChatMessage'
import Link from 'next/link'

interface AISneakPeakProps {
    investorSlug: string
    investorName: string
}

export default function AISneakPeak({ investorSlug, investorName }: AISneakPeakProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFetchSneakPeak = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Analysiere die neuesten Portfolio-Bewegungen von ${investorName}. Was sind die wichtigsten Käufe und Verkäufe?`,
                    context: [],
                    analysisType: 'superinvestor',
                    investor: investorSlug,
                    isTrial: true
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Trial limit reached or API error')
            }

            setResult(data.response)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (result) {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-theme-card border border-theme-light rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-6">
                        <AIChatMessage
                            message={{
                                id: 'sneak-peak',
                                type: 'assistant',
                                content: result.content,
                                timestamp: new Date(),
                                ragSources: result.metadata?.sources,
                                ragEnabled: true
                            }}
                            onExecuteAction={() => { }}
                        />
                    </div>

                    {/* Conversion CTA */}
                    <div className="bg-gradient-to-r from-brand/10 to-brand/5 p-8 text-center border-t border-brand/10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand text-white rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
                            Bonus Insight
                        </div>
                        <h3 className="text-xl font-bold text-theme-primary mb-3">
                            Willst du tiefere Einblicke?
                        </h3>
                        <p className="text-theme-muted mb-6 max-w-md mx-auto">
                            Dies war nur ein kleiner Vorgeschmack. Melde dich an, um unbegrenzt Fragen zu stellen,
                            Insider-Trades zu analysieren und historische Trends zu tracken.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/auth/signin"
                                className="px-8 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
                            >
                                Jetzt kostenlos anmelden
                                <ArrowRightIcon className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/settings/premium"
                                className="px-8 py-3 bg-theme-button hover:bg-theme-button-hover text-theme-primary rounded-xl font-semibold border border-theme-light transition-all flex items-center justify-center gap-2"
                            >
                                Premium entdecken
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto py-12">
            <div className="bg-theme-card border border-theme-light rounded-3xl p-10 overflow-hidden relative group hover:border-brand/30 transition-all duration-500 shadow-2xl">
                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-brand/20 transition-all duration-700"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-brand/10 transition-all duration-700"></div>

                <div className="relative z-10 text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-brand/20 to-brand/5 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-inner border border-brand/10">
                        <SparklesIcon className="w-10 h-10 text-brand animate-pulse" />
                    </div>

                    <h2 className="text-3xl font-bold text-theme-primary mb-4 tracking-tight">
                        Was kauft {investorName}?
                    </h2>

                    <p className="text-theme-muted text-lg mb-10 leading-relaxed">
                        Unsere AI hat die SEC-Filings analysiert. Hol dir jetzt eine
                        kostenlose Kurzanalyse der letzten Portfolio-Änderungen.
                    </p>

                    <button
                        onClick={handleFetchSneakPeak}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-brand to-brand-light hover:from-brand-light hover:to-brand text-white text-lg font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Analysiere Filings...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-6 h-6" />
                                <span>Kostenlose AI-Analyse starten</span>
                            </>
                        )}
                    </button>

                    {error && (
                        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm flex items-center justify-center gap-2">
                                <LockClosedIcon className="w-4 h-4" />
                                {error.includes('limit')
                                    ? 'Dein kostenloses Guthaben für heute ist aufgebraucht.'
                                    : 'Bitte melde dich an, um diesen Investor zu analysieren.'}
                            </p>
                            <Link href="/auth/signin" className="mt-3 inline-block text-brand hover:underline font-medium text-sm">
                                Jetzt anmelden für unbegrenzten Zugriff
                            </Link>
                        </div>
                    )}

                    <div className="mt-10 flex items-center justify-center gap-6 text-sm text-theme-muted opacity-60">
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                            Echte 13F Daten
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>
                            Echtzeit Analyse
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
