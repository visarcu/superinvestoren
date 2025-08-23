// Test component for optimized investor data loading
'use client'

import React from 'react'
import { useInvestorHoldings } from '@/hooks/useInvestorHoldings'

interface OptimizedInvestorDataProps {
  slug: string
}

export default function OptimizedInvestorData({ slug }: OptimizedInvestorDataProps) {
  const { allHoldings, latestHoldings, loading, error } = useInvestorHoldings(slug)

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700">🔄 Loading optimized data for {slug}...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">❌ Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-green-800 font-semibold mb-2">✅ Optimized Data Loaded for {slug}</h3>
      
      {latestHoldings && (
        <div className="mb-4">
          <p className="text-sm text-green-700">
            📊 Latest Holdings: {latestHoldings.data.positionsCount} positions, 
            ${(latestHoldings.data.totalValue / 1000000000).toFixed(1)}B total value
          </p>
          <p className="text-xs text-green-600">
            Quarter: {latestHoldings.quarter}, Date: {latestHoldings.data.date}
          </p>
        </div>
      )}
      
      {allHoldings && (
        <div>
          <p className="text-sm text-green-700">
            📈 Historical Data: {allHoldings.length} quarters available
          </p>
          <p className="text-xs text-green-600">
            From: {allHoldings[0]?.quarter} to {allHoldings[allHoldings.length - 1]?.quarter}
          </p>
        </div>
      )}
    </div>
  )
}