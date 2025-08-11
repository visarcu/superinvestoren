// app/superinvestor/components/InvestorCard.tsx

'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface InvestorCardProps {
  investor: {
    slug: string
    name: string
    firm: string
    image: string
    portfolioValue: number
    ytdReturn: number
    topHoldings: Array<{
      ticker: string
      value: number
      percentage: number
    }>
  }
}

export default function InvestorCard({ investor }: InvestorCardProps) {
  const formatValue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    return `$${value.toLocaleString()}`
  }

  return (
    <Link href={`/superinvestor/${investor.slug}`}>
      <div className="group relative bg-[#161618] rounded-2xl p-6 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1]">
        {/* Top Section */}
        <div className="flex items-start gap-4 mb-6">
          {/* Avatar */}
          <div className="relative">
            <Image
              src={investor.image}
              alt={investor.name}
              width={56}
              height={56}
              className="rounded-full ring-2 ring-white/10 group-hover:ring-green-500/30 transition-all duration-300"
            />
            {/* Status Indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#161618]" />
          </div>
          
          {/* Name & Firm */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
              {investor.name}
            </h3>
            <p className="text-sm text-gray-500 truncate">{investor.firm}</p>
          </div>
        </div>
        
        {/* Portfolio Value */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-bold text-white">
              {formatValue(investor.portfolioValue)}
            </span>
            <div className={`flex items-center gap-1 text-sm font-medium ${
              investor.ytdReturn >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {investor.ytdReturn >= 0 ? (
                <ArrowUpIcon className="w-3 h-3" />
              ) : (
                <ArrowDownIcon className="w-3 h-3" />
              )}
              <span>{Math.abs(investor.ytdReturn)}%</span>
            </div>
          </div>
          <div className="text-xs text-gray-600 uppercase tracking-wider">Portfolio Wert</div>
        </div>
        
        {/* Top Holdings - Minimal */}
        <div className="space-y-3 mb-6">
          {investor.topHoldings.slice(0, 3).map((holding, idx) => (
            <div key={holding.ticker} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 font-mono">{idx + 1}</span>
                <span className="text-sm font-medium text-gray-300">{holding.ticker}</span>
              </div>
              <span className="text-sm text-gray-500">{holding.percentage}%</span>
            </div>
          ))}
        </div>
        
        {/* Hover Action */}
        <div className="flex items-center justify-center gap-2 text-gray-500 group-hover:text-green-400 transition-colors">
          <span className="text-sm font-medium">Portfolio ansehen</span>
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}