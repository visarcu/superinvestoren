// app/superinvestor/components/HeroSection.tsx

'use client'

import React from 'react'
import { ArrowTrendingUpIcon, UsersIcon, CircleStackIcon } from '@heroicons/react/24/outline'


export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/[0.03] to-transparent pointer-events-none" />
      
      {/* Floating Orbs - sehr subtil */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand/[0.02] rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand/[0.02] rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-24 sm:py-32">
        {/* Main Content */}
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand/10 backdrop-blur-sm rounded-full">
            <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
            <span className="text-sm font-medium text-brand-light">Live 13F Tracking</span>
          </div>
          
          {/* Headline - Groß und Bold */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight">
              Super-Investoren
            </h1>
            <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto font-light">
              Verfolge die Portfolios der erfolgreichsten Investoren der Welt in Echtzeit
            </p>
          </div>
          
          {/* Key Metrics - Minimal */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-16 pt-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <UsersIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">90+</div>
                <div className="text-sm text-gray-500">Top Investoren</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <CircleStackIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">$2.5T</div>
                <div className="text-sm text-gray-500">Verwaltetes Vermögen</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-brand-light" />
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-white">Q4 2024</div>
                <div className="text-sm text-gray-500">Letztes Update</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}