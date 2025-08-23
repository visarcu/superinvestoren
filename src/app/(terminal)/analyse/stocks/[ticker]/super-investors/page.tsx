// Optimized Super-Investors page - NO 38MB holdings import
import React from 'react'
import { notFound } from 'next/navigation'
import SuperInvestorsClient from '@/components/SuperInvestorsClient'
import { stocks } from '@/data/stocks'

interface PageProps {
  params: {
    ticker: string
  }
}

export default function SuperInvestorsPage({ params }: PageProps) {
  const ticker = params.ticker.toUpperCase()
  
  // Basic validation - detailed validation happens in the API route
  const stock = stocks.find(s => s.ticker.toLowerCase() === ticker.toLowerCase())
  if (!stock) {
    notFound()
  }

  // All heavy processing moved to API route and client component
  return (
    <SuperInvestorsClient 
      ticker={ticker}
      initialStockName={stock.name}
    />
  )
}

export const runtime = 'edge' // Optional: Use edge runtime for faster cold starts