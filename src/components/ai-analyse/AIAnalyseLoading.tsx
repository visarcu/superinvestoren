'use client'

import React from 'react'

export default function AIAnalyseLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Stock Header Skeleton */}
      <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-theme-secondary rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-7 bg-theme-secondary rounded-lg w-48 animate-pulse mb-2" />
            <div className="flex gap-6 mt-3">
              <div className="h-5 bg-theme-secondary rounded w-24 animate-pulse" />
              <div className="h-5 bg-theme-secondary rounded w-32 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Loading Animation */}
      <div className="bg-theme-card border border-theme rounded-xl p-8">
        <div className="flex flex-col items-center justify-center py-12">
          {/* AI Animation */}
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-brand/20 rounded-full">
              <div className="w-20 h-20 border-4 border-transparent border-t-brand rounded-full animate-spin" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-brand" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            AI analysiert Finanzdaten...
          </h3>
          <p className="text-theme-muted text-center max-w-md mb-6">
            Die AI erstellt eine detaillierte DCF-Bewertung basierend auf aktuellen Finanzdaten.
            Dies kann bis zu 30 Sekunden dauern.
          </p>

          {/* Progress Steps */}
          <div className="space-y-3 w-full max-w-sm">
            <LoadingStep label="Finanzdaten laden" delay={0} />
            <LoadingStep label="Kennzahlen analysieren" delay={1} />
            <LoadingStep label="DCF-Modell berechnen" delay={2} />
            <LoadingStep label="Szenarien erstellen" delay={3} />
            <LoadingStep label="Bericht generieren" delay={4} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingStep({ label, delay }: { label: string; delay: number }) {
  return (
    <div
      className="flex items-center gap-3 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay * 0.5}s`, animationFillMode: 'forwards' }}
    >
      <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      <span className="text-theme-secondary text-sm">{label}</span>
    </div>
  )
}
