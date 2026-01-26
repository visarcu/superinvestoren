'use client'

import React, { useState } from 'react'
import ImprovedDCFCalculator from '@/components/ImprovedDCFCalculator'
import { AIAnalyseTab } from '@/components/ai-analyse'
import { CalculatorIcon, SparklesIcon } from '@heroicons/react/24/outline'

type TabType = 'manual' | 'ai'

export default function DCFCalculatorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ai')

  return (
    <div className="p-6 bg-theme-primary min-h-screen">
      {/* Tab Switcher */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-center">
          <div className="inline-flex bg-theme-secondary rounded-xl p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'manual'
                  ? 'bg-theme-card text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <CalculatorIcon className="w-4 h-4" />
              Manuell
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ai'
                  ? 'bg-theme-card text-theme-primary shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <SparklesIcon className="w-4 h-4" />
              AI-Analyse
              <span className="ml-1 px-1.5 py-0.5 bg-brand/20 text-brand rounded text-xs font-semibold">
                NEU
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'manual' ? (
        <ImprovedDCFCalculator />
      ) : (
        <AIAnalyseTab />
      )}
    </div>
  )
}
