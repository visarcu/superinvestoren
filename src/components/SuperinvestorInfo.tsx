// components/SuperinvestorInfo.tsx
'use client'

import React, { useState } from 'react'
import { 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function SuperinvestorInfo() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm overflow-hidden">
      
      {/* Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 text-left hover:bg-gray-900/60 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Was sind Super-Investoren?</h3>
              <p className="text-sm text-gray-400">
                Erfahre mehr über die erfolgreichsten Investoren der Welt
              </p>
            </div>
          </div>
          <div className="text-gray-400">
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="p-6 pt-0 border-t border-gray-800/50">
          
          {/* Main Description */}
          <div className="mb-8">
            <p className="text-gray-300 leading-relaxed mb-4">
              <strong className="text-white">Super-Investoren</strong> sind institutionelle Anleger und Hedgefonds-Manager, 
              die über <strong className="text-green-400">$100 Millionen</strong> an US-Aktien verwalten. 
              Sie müssen quartalsweise ihre Holdings in einem <strong className="text-blue-400">13F-Filing</strong> bei 
              der SEC offenlegen.
            </p>
            
            <p className="text-gray-300 leading-relaxed">
              Diese Transparenz ermöglicht es uns, die Strategien der erfolgreichsten Investoren der Welt 
              zu verfolgen und von ihren Entscheidungen zu lernen.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <DocumentTextIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">13F-Filings</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Quartalsweise Pflichtveröffentlichungen der SEC mit allen 
                  US-Aktienpositionen über $200.000
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Portfolio-Tracking</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Verfolge Käufe, Verkäufe und Positionsgrößen 
                  der besten Investoren in Echtzeit
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <LightBulbIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Investment-Insights</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Erkenne Trends, beliebte Aktien und Sektor-Allokationen 
                  der Smart Money Investoren
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <ClockIcon className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Zeitverzögerung</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  13F-Daten werden 45 Tage nach Quartalsende veröffentlicht, 
                  zeigen also vergangene Positionen
                </p>
              </div>
            </div>
          </div>

          {/* Famous Examples */}
          <div className="bg-gray-800/30 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span className="text-lg">👑</span>
              Bekannte Super-Investoren
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'Warren Buffett', fund: 'Berkshire Hathaway', aum: '$266B' },
                { name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10B' },
                { name: 'Terry Smith', fund: 'Fundsmith Equity', aum: '$24B' },
                { name: 'David Einhorn', fund: 'Greenlight Capital', aum: '$1.2B' },
                { name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$7B' },
                { name: 'Howard Marks', fund: 'Oaktree Capital', aum: '$8B' }
              ].map((investor, index) => (
                <div key={index} className="bg-gray-700/30 rounded-lg p-3">
                  <div className="text-white font-medium text-sm">{investor.name}</div>
                  <div className="text-gray-400 text-xs">{investor.fund}</div>
                  <div className="text-green-400 text-xs font-semibold">{investor.aum}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">
              <strong>Wichtiger Hinweis:</strong> Dies ist keine Anlageberatung. 
              13F-Daten zeigen vergangene Positionen mit Verzögerung. 
              Führe immer eigene Recherchen durch, bevor du Investitionsentscheidungen triffst.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}