// components/SuperinvestorInfo.tsx - MODERNIZED VERSION
'use client'

import React, { useState } from 'react'
import { 
  InformationCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  LightBulbIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function SuperinvestorInfo() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full mb-6 border border-green-500/20">
            <SparklesIcon className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Wissen</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Was sind
            <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> Super-Investoren?</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Die Elite der Finanzwelt - und wie du ihre Strategien verfolgen kannst
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-[#161618] rounded-2xl p-8 border border-white/[0.06]">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                Institutionelle Anleger mit über $100M AUM
              </h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                Super-Investoren sind Hedgefonds-Manager und institutionelle Anleger, die 
                mindestens <span className="text-green-400 font-semibold">$100 Millionen</span> an 
                US-Aktien verwalten. Die SEC verpflichtet sie, ihre Positionen quartalsweise in 
                sogenannten <span className="text-green-400 font-semibold">13F-Filings</span> offenzulegen.
              </p>
              <p className="text-gray-400 leading-relaxed">
                Diese Transparenz ermöglicht es uns, die Investment-Strategien der erfolgreichsten 
                Investoren der Welt zu analysieren und von ihren Entscheidungen zu lernen.
              </p>
            </div>

            {/* Feature List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: DocumentTextIcon, title: '13F-Filings', desc: 'Quartalsweise SEC-Berichte' },
                { icon: ChartBarIcon, title: 'Portfolio-Tracking', desc: 'Verfolge alle Bewegungen' },
                { icon: LightBulbIcon, title: 'Smart Money', desc: 'Lerne von den Besten' },
                { icon: ClockIcon, title: '45 Tage Verzögerung', desc: 'Nach Quartalsende' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <feature.icon className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">{feature.title}</h4>
                    <p className="text-gray-500 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Investors Showcase */}
          <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06]">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>👑</span> Top Investoren
            </h4>
            <div className="space-y-3">
              {[
                { name: 'Warren Buffett', fund: 'Berkshire', aum: '$266B', color: 'text-yellow-400' },
                { name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10B', color: 'text-green-400' },
                { name: 'Terry Smith', fund: 'Fundsmith', aum: '$24B', color: 'text-green-400' },
                { name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$7B', color: 'text-green-400' },
                { name: 'Howard Marks', fund: 'Oaktree', aum: '$8B', color: 'text-green-400' }
              ].map((investor, i) => (
                <div key={i} className="bg-[#1A1A1D] rounded-lg p-3 hover:bg-[#1F1F22] transition-colors cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm group-hover:text-green-400 transition-colors">
                        {investor.name}
                      </div>
                      <div className="text-gray-500 text-xs">{investor.fund}</div>
                    </div>
                    <div className={`font-bold text-sm ${investor.color}`}>
                      {investor.aum}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* How it Works */}
          <div className="bg-gradient-to-br from-green-500/10 to-transparent rounded-2xl p-6 border border-green-500/20">
            <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-green-400" />
              So funktioniert's
            </h4>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">1.</span>
                <span className="text-gray-300">Investoren reichen 13F-Filing bei der SEC ein</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">2.</span>
                <span className="text-gray-300">Wir analysieren und aggregieren die Daten</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 font-bold">3.</span>
                <span className="text-gray-300">Du siehst Trends und kannst Strategien verfolgen</span>
              </li>
            </ol>
          </div>

          {/* Disclaimer */}
          <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-2xl p-6 border border-yellow-500/20">
            <h4 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5" />
              Wichtiger Hinweis
            </h4>
            <p className="text-yellow-400/80 text-sm leading-relaxed">
              Dies ist keine Anlageberatung. 13F-Daten werden mit 45 Tagen Verzögerung 
              veröffentlicht und zeigen nur Long-Positionen in US-Aktien. 
              Führe immer eigene Recherchen durch.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}