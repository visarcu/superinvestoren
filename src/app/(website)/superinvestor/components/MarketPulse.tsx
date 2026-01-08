// app/superinvestor/components/MarketPulse.tsx

'use client'

import React from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline'


export default function MarketPulse({ data }: any) {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Market Pulse</h2>
          <p className="text-gray-400">Aktuelle Bewegungen der Top-Investoren</p>
        </div>
        
        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sentiment Card */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand/10 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-brand-light" />
              </div>
              <h3 className="text-lg font-semibold text-white">Sentiment</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-brand-light mb-1">
                  {data.sentimentScore}%
                </div>
                <div className="text-sm text-gray-500">Bullish</div>
              </div>
              
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${data.sentimentScore}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Top Käufe */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-brand/10 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-brand-light" />
              </div>
              <h3 className="text-lg font-semibold text-white">Top Käufe</h3>
            </div>
            
            <div className="space-y-3">
              {data.topBuys.map((stock: any) => (
                <div key={stock.ticker} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{stock.ticker}</span>
                  <span className="text-xs text-brand-light">+{stock.buyers} Käufer</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Top Verkäufe */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Top Verkäufe</h3>
            </div>
            
            <div className="space-y-3">
              {data.topSells.map((stock: any) => (
                <div key={stock.ticker} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{stock.ticker}</span>
                  <span className="text-xs text-red-400">-{stock.sellers} Verkäufer</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}