// src/app/analyse/page.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import SearchTickerInput from '@/components/SearchTickerInput'

export default function AnalysisIndexPage() {
  const router = useRouter()

  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-4xl font-bold text-center">
        Aktien-Analyse Hub
      </h1>
      <p className="text-center text-gray-300">
        Unser Analyse-Hub liefert dir Live-Quote, historische Charts, Dividenden-Historie, Kennzahlen-Vergleich und mehr.
      </p>
      <div className="flex justify-center">
        <div className="w-full sm:w-2/3">
          <SearchTickerInput
            placeholder="Ticker eingeben (AAPL, TSLA …)"
            onSelect={(ticker) => router.push(`/analyse/${ticker.toLowerCase()}`)}
          />
        </div>
      </div>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Beliebte Analysen</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['AAPL','MSFT','GOOGL','AMZN'].map((t) => (
            <button
              key={t}
              onClick={() => router.push(`/analyse/${t.toLowerCase()}`)}
              className="bg-card-dark p-4 rounded-lg text-center hover:bg-gray-700"
            >
              {t}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}