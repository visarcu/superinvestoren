// /analyse/dcf-rechner — Fey-Style DCF-Rechner
// Wiederverwendet die existing ImprovedDCFCalculator + AIAnalyseTab Komponenten,
// jetzt unter dem (aktien)-Layout mit FeyTopBar und FeyBottomNav.
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import ImprovedDCFCalculator from '@/components/ImprovedDCFCalculator'
import { AIAnalyseTab } from '@/components/ai-analyse'

type TabType = 'manual' | 'ai'

export default function DcfRechnerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ai')

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Hero-Header */}
      <header className="px-6 sm:px-10 pt-8 pb-4 max-w-6xl mx-auto w-full">
        <div className="flex items-start gap-4">
          <Link
            href="/analyse/home"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors mt-1 flex-shrink-0"
            aria-label="Zurück"
          >
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-1.5">
              Tools · DCF-Rechner
            </p>
            <h1 className="text-[26px] font-semibold text-white tracking-tight">
              Fair-Value berechnen
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              Discounted Cash Flow Analyse — manuell oder per AI auf Basis deiner Inputs
            </p>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="px-6 sm:px-10 pb-2 max-w-6xl mx-auto w-full">
        <div className="inline-flex items-center gap-1 bg-white/[0.02] border border-white/[0.05] rounded-xl p-1">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-white/[0.08] text-white/90'
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
            </svg>
            Manuell
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-white/[0.08] text-white/90'
                : 'text-white/45 hover:text-white/75'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            AI-Analyse
            <span className="text-[9px] uppercase tracking-widest text-amber-300/85 bg-amber-400/[0.08] border border-amber-400/15 rounded px-1.5 py-0.5 font-medium">
              Neu
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 px-2 sm:px-4 pb-32">
        {activeTab === 'manual' ? <ImprovedDCFCalculator /> : <AIAnalyseTab />}
      </main>
    </div>
  )
}
