'use client'

import React from 'react'
import type { WizardStep } from './types'

interface MainStep {
  keys: WizardStep[]
  label: string
}

const MAIN_STEPS: MainStep[] = [
  { keys: ['broker'], label: 'Broker' },
  { keys: ['instructions'], label: 'Anleitung' },
  { keys: ['upload', 'processing', 'resolve'], label: 'Upload' },
  { keys: ['cash'], label: 'Cash' },
  { keys: ['preview', 'importing', 'done'], label: 'Vorschau' },
]

interface Props {
  step: WizardStep
}

export default function ImportStepIndicator({ step }: Props) {
  const activeIdx = MAIN_STEPS.findIndex(s => s.keys.includes(step))
  const isDone = step === 'done'

  return (
    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/[0.04] bg-white/[0.01]">
      {MAIN_STEPS.map((s, idx) => {
        const isActive = idx === activeIdx
        const isPast = idx < activeIdx || (isDone && idx <= activeIdx)
        return (
          <React.Fragment key={s.label}>
            <div className="flex items-center gap-2">
              <div
                className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                  isActive
                    ? 'bg-white text-black'
                    : isPast
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.04] text-white/30'
                }`}
              >
                {isPast && !isActive ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-[11px] font-medium hidden sm:inline ${
                  isActive ? 'text-white' : isPast ? 'text-white/50' : 'text-white/25'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < MAIN_STEPS.length - 1 && (
              <div
                className={`flex-1 h-px transition-colors ${
                  isPast ? 'bg-emerald-500/30' : 'bg-white/[0.05]'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
