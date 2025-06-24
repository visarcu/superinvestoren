'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightIcon, TrendingUpIcon, DollarSignIcon, BarChart3 } from 'lucide-react'

interface Holding {
  ticker: string
  value: string
  percentage: string
}

interface InvestorCardProps {
  name: string
  investor: string
  date: string
  filingId: string
  totalValue: string
  tickers: string
  holdings: Holding[]
}

interface ModernInvestorCardsProps {
  investors: InvestorCardProps[]
}

// Modern Card Component
function ModernInvestorCard({ 
  investor, 
  isSelected, 
  onClick 
}: { 
  investor: InvestorCardProps
  isSelected: boolean
  onClick: () => void 
}) {
  const getInvestorSlug = (name: string) => {
    if (name.includes('Warren Buffett')) return 'buffett'
    if (name.includes('Bill Ackman')) return 'ackman' 
    if (name.includes('Howard Marks')) return 'marks'
    return 'buffett'
  }

  const slug = getInvestorSlug(investor.investor)

  return (
    <div
      onClick={onClick}
      className={`
        group cursor-pointer rounded-xl transition-all duration-300 overflow-hidden
        ${isSelected 
          ? 'bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10' 
          : 'bg-gray-800/30 hover:bg-gray-800/50 border-gray-700/30 hover:border-gray-600/50'
        } border backdrop-blur-sm
      `}
    >
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6 items-center">
          
          {/* Left: Investor Info (5 columns) */}
          <div className="col-span-12 sm:col-span-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`
                  w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300
                  ${isSelected ? 'border-green-500/50 shadow-lg shadow-green-500/20' : 'border-gray-600/50 group-hover:border-gray-500/70'}
                `}>
                  <Image
                    src={`/images/${slug}.png`}
                    alt={investor.investor}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Status Indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`
                  font-bold text-lg transition-colors duration-300 truncate
                  ${isSelected ? 'text-white' : 'text-gray-100 group-hover:text-white'}
                `}>
                  {investor.investor}
                </h3>
                <p className="text-sm text-gray-400 truncate">{investor.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Live • {investor.date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Portfolio Value (3 columns) */}
          <div className="col-span-12 sm:col-span-3 text-center sm:text-left">
            <div className="flex items-center gap-2 mb-1">
              <DollarSignIcon className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Portfolio</span>
            </div>
            <div className={`
              text-2xl font-black transition-all duration-300
              ${isSelected ? 'text-green-400 scale-105' : 'text-green-400 group-hover:scale-105'}
            `}>
              {investor.totalValue}
            </div>
            <div className="text-xs text-gray-500">{investor.holdings.length} Positionen</div>
          </div>

          {/* Right: Top Holdings (4 columns) */}
          <div className="col-span-12 sm:col-span-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Top Holdings</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {investor.holdings.slice(0, 3).map((holding, index) => (
                <div
                  key={holding.ticker}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-300
                    ${isSelected 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-gray-700/50 text-gray-300 group-hover:bg-gray-700 group-hover:text-white'
                    }
                  `}
                >
                  <span className="font-bold">{holding.ticker}</span>
                  <span className="text-gray-500">•</span>
                  <span>{holding.percentage}%</span>
                </div>
              ))}
            </div>
            
            {/* View Link */}
            <Link
              href={`/superinvestor/${slug}`}
              className={`
                inline-flex items-center gap-1 mt-3 text-sm transition-all duration-300 group/link
                ${isSelected 
                  ? 'text-green-400 hover:text-green-300' 
                  : 'text-gray-400 hover:text-white'
                }
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <span>Portfolio ansehen</span>
              <ArrowRightIcon className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Holdings Detail
function EnhancedHoldingsDetail({ investor }: { investor: InvestorCardProps }) {
  const getInvestorSlug = (name: string) => {
    if (name.includes('Warren Buffett')) return 'buffett'
    if (name.includes('Bill Ackman')) return 'ackman' 
    if (name.includes('Howard Marks')) return 'marks'
    return 'buffett'
  }

  const slug = getInvestorSlug(investor.investor)

  return (
    <div className="mt-8 bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/60 to-gray-800/40 px-8 py-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-600/50">
              <Image
                src={`/images/${slug}.png`}
                alt={investor.investor}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{investor.investor}</h3>
              <p className="text-sm text-gray-400">Top Holdings Breakdown</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Stand: {investor.date}</div>
            <div className="text-2xl font-bold text-green-400">{investor.totalValue}</div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700/30">
            <tr>
              <th className="text-left px-8 py-4 text-sm font-semibold text-gray-300">Rang</th>
              <th className="text-left px-4 py-4 text-sm font-semibold text-gray-300">Ticker</th>
              <th className="text-right px-4 py-4 text-sm font-semibold text-gray-300">Marktwert</th>
              <th className="text-right px-8 py-4 text-sm font-semibold text-gray-300">Portfolio-Anteil</th>
            </tr>
          </thead>
          <tbody>
            {investor.holdings.map((holding, index) => (
              <tr 
                key={holding.ticker} 
                className="border-b border-gray-700/30 last:border-b-0 hover:bg-gray-700/20 transition-colors"
              >
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-gray-700/50 rounded-lg flex items-center justify-center text-xs font-bold text-gray-300">
                      {index + 1}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-bold text-white text-lg">{holding.ticker}</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-semibold text-gray-200">${holding.value}</span>
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className="font-semibold text-gray-200">{holding.percentage}%</span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(parseFloat(holding.percentage) * 3, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-800/30 px-8 py-6 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">
              Zeigt die Top {investor.holdings.length} Positionen • Basiert auf aktuellen 13F-Filings
            </span>
          </div>
          <Link
            href={`/superinvestor/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-xl transition-all duration-200 font-semibold hover:scale-105 shadow-lg hover:shadow-green-500/25"
          >
            <span>Vollständiges Portfolio</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function ModernInvestorCards({ investors }: ModernInvestorCardsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  return (
    <div className="w-full max-w-6xl mx-auto">
      
      {/* Cards List */}
      <div className="space-y-4 mb-8">
        {investors.map((investor, index) => (
          <ModernInvestorCard
            key={index}
            investor={investor}
            isSelected={index === selectedIndex}
            onClick={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {/* Enhanced Details */}
      <EnhancedHoldingsDetail investor={investors[selectedIndex]} />

      {/* Footer */}
      <div className="text-center mt-12">
        <Link
          href="/superinvestor"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors group"
        >
          <span>Alle {investors.length} Super-Investoren durchsuchen</span>
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}