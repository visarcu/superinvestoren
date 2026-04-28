'use client'

// Bewertungs-Tab im Stock-Detail — DCF-Analyse mit aktuellem Ticker vorausgefüllt.
// Nutzt existing AIAnalyseTab-Komponente mit ticker-Prop. Header im Fey-Stil.
// Link zur vollen Standalone-Variante /analyse/dcf-rechner für Manuell-Modus.
import React from 'react'
import Link from 'next/link'
import { AIAnalyseTab } from '@/components/ai-analyse'

interface BewertungTabProps {
  ticker: string
}

export default function BewertungTab({ ticker }: BewertungTabProps) {
  return (
    <div className="w-full max-w-4xl">
      {/* Hint oben rechts: Link zum Standalone DCF-Rechner für Manuell-Modus */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-1">
            DCF · {ticker}
          </p>
          <h2 className="text-[18px] font-semibold text-white/90">Fair-Value-Analyse</h2>
        </div>
        <Link
          href={`/analyse/dcf-rechner`}
          className="text-[12px] text-white/45 hover:text-white/80 transition-colors flex items-center gap-1.5"
          title="Im DCF-Rechner manuell anpassen"
        >
          Manuell anpassen
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* AI-DCF mit vorausgewähltem Ticker */}
      <AIAnalyseTab ticker={ticker} />
    </div>
  )
}
