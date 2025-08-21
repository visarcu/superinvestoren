// src/app/(terminal)/analyse/stocks/[ticker]/ratings/page.tsx
import React from 'react'
import RatingsClient from '@/components/RatingsClient'

// Metadata für SEO
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ ticker: string }> 
}) {
  const { ticker } = await params
  const symbol = ticker.toUpperCase()
  
  return {
    title: `${symbol} Bewertung & Scores - FinClue Rating`,
    description: `Detaillierte Bewertungsanalyse für ${symbol}: FinClue Score, Altman Z-Score, Piotroski F-Score und fundamentale Faktoren.`,
  }
}

// Haupt-Component
export default async function RatingsPage({ 
  params 
}: { 
  params: Promise<{ ticker: string }> 
}) {
  // Params auflösen (Next.js 15 Requirement)
  const resolvedParams = await params
  const ticker = resolvedParams.ticker.toUpperCase()
  
  return <RatingsClient ticker={ticker} />
}