// components/SuperinvestorInfo.tsx - LINEAR/QUARTR STYLE
'use client'

import React from 'react'
import {
  InformationCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

export default function SuperinvestorInfo() {
  return (
    <section>
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-1">
            Was sind Super-Investoren?
          </h2>
          <p className="text-sm text-gray-500">
            Die Elite der Finanzwelt - und wie du ihre Strategien verfolgen kannst
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Main Info Card */}
          <div className="lg:col-span-2 bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <div className="mb-6">
              <h3 className="text-base font-medium text-white mb-3">
                Institutionelle Anleger mit über $100M AUM
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                Super-Investoren sind Hedgefonds-Manager und institutionelle Anleger, die
                mindestens <span className="text-white font-medium">$100 Millionen</span> an
                US-Aktien verwalten. Die SEC verpflichtet sie, ihre Positionen quartalsweise in
                sogenannten <span className="text-white font-medium">13F-Filings</span> offenzulegen.
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
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
                  <div className="p-2 bg-white/5 rounded-lg flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-gray-400" />
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
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <h4 className="text-base font-medium text-white mb-4">Top Investoren</h4>
            <div className="space-y-2">
              {[
                { name: 'Warren Buffett', fund: 'Berkshire', aum: '$266 Mrd.' },
                { name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10 Mrd.' },
                { name: 'Terry Smith', fund: 'Fundsmith', aum: '$24 Mrd.' },
                { name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$7 Mrd.' },
                { name: 'Howard Marks', fund: 'Oaktree', aum: '$8 Mrd.' }
              ].map((investor, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3 hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">
                        {investor.name}
                      </div>
                      <div className="text-gray-500 text-xs">{investor.fund}</div>
                    </div>
                    <div className="text-gray-400 text-sm">
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
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <ChartBarIcon className="w-4 h-4 text-gray-400" />
              </div>
              <h4 className="text-base font-medium text-white">So funktioniert's</h4>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-gray-500 font-medium">1.</span>
                <span className="text-gray-400">Investoren reichen 13F-Filing bei der SEC ein</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-500 font-medium">2.</span>
                <span className="text-gray-400">Wir analysieren und aggregieren die Daten</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-500 font-medium">3.</span>
                <span className="text-gray-400">Du siehst Trends und kannst Strategien verfolgen</span>
              </li>
            </ol>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#111113] rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/5 rounded-lg">
                <InformationCircleIcon className="w-4 h-4 text-gray-400" />
              </div>
              <h4 className="text-base font-medium text-white">Wichtiger Hinweis</h4>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
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
