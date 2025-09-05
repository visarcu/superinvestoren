'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowTopRightOnSquareIcon, UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import InvestorAvatar from './InvestorAvatar'

interface InvestorCardData {
  slug: string
  name: string
  subtitle: string
  type: 'investor' | 'fund'
  totalValue: number
}

const InvestorCardSimple: React.FC<{ investor: InvestorCardData }> = ({ investor }) => {
  const formatLargeNumber = (value: number): string => {
    if (value === 0) return '–'
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B $`
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(0)}M $`
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K $`
    }
    return `${Math.round(value)} $`
  }

  return (
    <Link
      href={`/superinvestor/${investor.slug}`}
      className="group bg-[#161618] rounded-2xl p-5 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1] w-full h-[240px] flex flex-col"
      style={{ width: '360px', height: '240px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <InvestorAvatar
            name={investor.name}
            imageUrl={`/images/${investor.slug}.png`}
            size="sm"
            className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm group-hover:text-green-400 transition-colors truncate">
              {investor.name}
            </h3>
            {investor.subtitle && (
              <p className="text-xs text-gray-400 truncate">
                {investor.subtitle}
              </p>
            )}
          </div>
        </div>
        
        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0" />
      </div>

      {/* Simple Chart Placeholder */}
      <div className="h-16 mb-4 -mx-1 bg-gray-800/30 rounded flex items-center justify-center">
        <div className="text-xs text-gray-500">Chart Loading...</div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
        <div>
          <div className="text-gray-400 mb-1">Portfolio</div>
          <div className="font-medium text-green-400">
            {formatLargeNumber(investor.totalValue)}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Total</div>
          <div className="font-medium text-green-400">+5.2%</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Quartal</div>
          <div className="font-medium text-green-400">+2.1%</div>
        </div>
      </div>

      {/* Top Holdings Placeholder */}
      <div className="flex-1 min-h-0">
        <div className="text-gray-400 text-xs mb-2">Top Holdings</div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs text-gray-300 flex-shrink-0">
                AAPL
              </span>
              <span className="text-gray-400 truncate">25.3%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          investor.type === 'investor' 
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {investor.type === 'investor' ? (
            <>
              <UserIcon className="w-3 h-3" />
              Investor
            </>
          ) : (
            <>
              <BuildingOffice2Icon className="w-3 h-3" />
              Fonds
            </>
          )}
        </span>
        
        <span className="text-xs text-gray-500">
          01.12.2024
        </span>
      </div>
    </Link>
  )
}

export default InvestorCardSimple