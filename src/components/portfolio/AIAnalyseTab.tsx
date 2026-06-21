// src/components/portfolio/AIAnalyseTab.tsx
'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Holding } from '@/hooks/usePortfolio'
import Logo from '@/components/Logo'
import {
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  NewspaperIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

interface PositionAnalysis {
  ticker: string
  signal: 'bullish' | 'neutral' | 'bearish'
  score: number
  reason: string
  superInvestorActivity: string
  newsHighlight: string
}

interface AnalysisResult {
  portfolioScore: number
  portfolioVerdict: string
  positions: PositionAnalysis[]
  topInsight: string
  timestamp: string
}

interface AIAnalyseTabProps {
  holdings: Holding[]
  portfolioId?: string
}

const signalConfig = {
  bullish: { icon: CheckCircleIcon, color: 'text-emerald-300', bg: 'bg-emerald-400/[0.08] border-emerald-300/[0.18]', label: 'Bullish' },
  neutral: { icon: MinusCircleIcon, color: 'text-neutral-300', bg: 'bg-white/[0.04] border-white/[0.08]', label: 'Neutral' },
  bearish: { icon: ExclamationCircleIcon, color: 'text-red-300', bg: 'bg-red-400/[0.08] border-red-300/[0.18]', label: 'Bearish' },
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#2dd4bf' : score >= 40 ? '#94a3b8' : '#f87171'

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.08]" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-white">{score}</span>
      </div>
    </div>
  )
}

export default function AIAnalyseTab({ holdings, portfolioId }: AIAnalyseTabProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Bitte melde dich an.')
        return
      }

      const res = await fetch('/api/portfolio/ai-analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          holdings: holdings.map(h => ({
            symbol: h.symbol,
            quantity: h.quantity,
            value: h.value,
            gain_loss_percent: h.gain_loss_percent
          }))
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Fehler ${res.status}`)
      }

      const data = await res.json()
      setResult({
        portfolioScore: data.portfolioScore || 50,
        portfolioVerdict: data.portfolioVerdict || '',
        positions: data.positions || [],
        topInsight: data.topInsight || data.topAction || '',
        timestamp: data.timestamp || new Date().toISOString()
      })
    } catch (err: any) {
      setError(err.message || 'Analyse fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  // Empty / initial state
  if (!result && !loading && !error) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl border border-teal-300/20 bg-teal-400/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <SparklesIcon className="w-8 h-8 text-teal-300" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">KI-Portfolio-Analyse</h3>
        <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
          Analysiert dein Portfolio anhand von Fundamentaldaten, Superinvestor-Aktivität und aktuellen News.
        </p>
        <button
          onClick={runAnalysis}
          disabled={holdings.length === 0}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-5 py-2.5 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.03] disabled:text-neutral-600"
        >
          <SparklesIcon className="w-4 h-4" />
          Analyse starten
        </button>
        {holdings.length === 0 && (
          <p className="text-neutral-600 text-xs mt-3">Füge zuerst Positionen hinzu</p>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl border border-teal-300/20 bg-teal-400/10 flex items-center justify-center">
            <ArrowPathIcon className="w-8 h-8 text-teal-300 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-medium text-white mb-1">Analyse läuft...</h3>
            <p className="text-neutral-500 text-sm">FMP-Daten, Superinvestor-Signale und News werden ausgewertet</p>
          </div>
        </div>

        {/* Skeleton cards */}
        <div className="mt-8 space-y-3">
          {holdings.slice(0, 5).map((h) => (
            <div key={h.id} className="bg-white/[0.035] rounded-xl p-4 border border-white/[0.07] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-800 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-neutral-800 rounded w-20 mb-1" />
                  <div className="h-3 bg-neutral-800 rounded w-48" />
                </div>
                <div className="h-6 bg-neutral-800 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-xl flex items-center justify-center">
          <ExclamationCircleIcon className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-base font-medium text-white mb-1">Analyse fehlgeschlagen</h3>
        <p className="text-neutral-500 text-sm mb-4">{error}</p>
        <button
          onClick={runAnalysis}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white transition-colors hover:bg-white/[0.07]"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    )
  }

  // Result state
  if (!result) return null

  return (
    <div className="space-y-6">
      {/* Header with Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ScoreCircle score={result.portfolioScore} />
          <div>
            <h3 className="text-base font-medium text-white">Portfolio-Score</h3>
            <p className="text-neutral-500 text-xs mt-0.5">
              Zuletzt: {new Date(result.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button
          onClick={runAnalysis}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-sm text-teal-300 transition-colors hover:border-teal-300/20 hover:bg-teal-400/10 hover:text-white"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Neu analysieren
        </button>
      </div>

      {/* Portfolio Verdict */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
        <p className="text-sm text-neutral-300 leading-relaxed">{result.portfolioVerdict}</p>
      </div>

      {/* Top Insight */}
      {result.topInsight && (
        <div className="rounded-2xl border border-teal-300/15 bg-teal-400/[0.045] p-4">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-teal-300 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-teal-300 mb-1">Wichtigste Erkenntnis</p>
              <p className="text-sm text-neutral-300">{result.topInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Position Cards */}
      <div>
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Positionsbewertungen</h3>
        <div className="space-y-2">
          {result.positions.map((pos) => {
            const cfg = signalConfig[pos.signal] || signalConfig.neutral
            const Icon = cfg.icon
            const holding = holdings.find(h => h.symbol === pos.ticker)

            return (
              <div key={pos.ticker} className="rounded-2xl border border-white/[0.08] bg-white/[0.028] p-4 transition-colors hover:bg-white/[0.04]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Logo ticker={pos.ticker} alt={pos.ticker} className="w-8 h-8" padding="none" />
                    <div>
                      <span className="font-medium text-white text-sm">{pos.ticker}</span>
                      {holding && (
                        <p className="text-xs text-neutral-500">
                          {holding.gain_loss_percent >= 0 ? '+' : ''}{holding.gain_loss_percent.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    <span className="text-xs font-medium text-neutral-500">{pos.score}/100</span>
                  </div>
                </div>

                <p className="text-sm text-neutral-400 mb-2">{pos.reason}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {pos.superInvestorActivity && (
                    <span className="inline-flex items-center gap-1.5 text-neutral-500">
                      <UserGroupIcon className="h-3.5 w-3.5 text-neutral-600" />
                      {pos.superInvestorActivity}
                    </span>
                  )}
                  {pos.newsHighlight && pos.newsHighlight !== 'Keine besonderen Nachrichten' && (
                    <span className="inline-flex items-center gap-1.5 text-neutral-500">
                      <NewspaperIcon className="h-3.5 w-3.5 text-neutral-600" />
                      {pos.newsHighlight}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-neutral-500 leading-relaxed">
        Diese Analyse dient ausschließlich zu Informationszwecken und stellt keine Anlageberatung dar.
        Keine Aufforderung zum Kauf oder Verkauf von Wertpapieren. Investitionsentscheidungen sollten
        auf Basis eigener Recherche und ggf. professioneller Beratung getroffen werden.
      </p>
    </div>
  )
}
