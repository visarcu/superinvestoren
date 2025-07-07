// src/app/(terminal)/analyse/stocks/[ticker]/dcf/page.tsx
import React from 'react'
import DCFCalculator from '@/components/DCFCalculator'

interface PageProps {
  params: { ticker: string }
}

export default function DCFPage({ params }: PageProps) {
  const { ticker } = params

  return (
    <div className="p-6">
      <DCFCalculator ticker={ticker.toUpperCase()} />
    </div>
  )
}