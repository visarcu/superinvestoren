// src/app/(terminal)/analyse/stocks/[ticker]/estimates/page.tsx - INSIGHTS STYLE
import React from 'react'
import { stocks } from '@/data/stocks'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import EstimatesPageClient from '@/components/EstimatesPageClient'

export default function EstimatesPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker)

  if (!stock) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-white mb-2">Aktie nicht gefunden</h1>
          <p className="text-neutral-500 mb-6">
            Die Aktie mit dem Symbol "{ticker}" konnte nicht gefunden werden.
          </p>
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zur Analyse
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      <EstimatesPageClient ticker={ticker} />
    </div>
  )
}
