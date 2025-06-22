'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'

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

interface InvestorCardStackProps {
  investors: InvestorCardProps[]
}

export default function InvestorCardStack({ investors }: InvestorCardStackProps) {
  const [activeCard, setActiveCard] = useState(0)

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {investors.map((investor, index) => {
        const isActive = index === activeCard
        const offsetY = index * 16
        const rotation = isActive ? '0deg' : `${-2 + index * 1.5}deg`
        const zIndex = investors.length - index
        const scale = isActive ? 1 : 1 - index * 0.015

        return (
          <motion.div
            key={index}
            onClick={() => setActiveCard(index)}
            className={`absolute w-full bg-gray-900/90 border border-gray-700 rounded-xl backdrop-blur-sm cursor-pointer transition-all duration-300 ${
              isActive
                ? 'shadow-2xl shadow-green-500/10 hover:border-green-500/50'
                : 'shadow-xl shadow-black/30 hover:border-gray-600'
            }`}
            style={{
              transform: `translateY(${offsetY}px) rotate(${rotation}) scale(${scale})`,
              zIndex,
              top: 0,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{investor.name}</h3>
                  <p className="text-gray-400 mb-2">{investor.investor}</p>
                  <p className="text-3xl font-bold text-green-400">{investor.totalValue}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{investor.date}</p>
                  <p className="text-gray-500 text-xs">{investor.filingId}</p>
                  <p className="text-gray-500 text-sm mt-2">{investor.tickers}</p>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-300">Ticker</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-300">Market Value</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-300">Portfolio %</th>
                  </tr>
                </thead>
                <tbody>
                  {investor.holdings.map((h, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="p-4 text-white font-medium">{h.ticker}</td>
                      <td className="p-4 text-right text-gray-300">{h.value}</td>
                      <td className="p-4 text-right text-gray-400">{h.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {isActive && (
              <div className="p-6 bg-gray-800/30 border-t border-gray-800">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap gap-3">
                    {investors.map((inv, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveCard(idx)
                        }}
                        className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 border ${
                          idx === activeCard
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-600/50 hover:border-gray-500'
                        }`}
                      >
                        {inv.investor}
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/superinvestor"
                    className="text-sm text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                  >
                    Alle ansehen
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Spacer for stack height */}
      <div style={{ height: `${(investors.length - 1) * 16 + 650}px` }}></div>
    </div>
  )
}