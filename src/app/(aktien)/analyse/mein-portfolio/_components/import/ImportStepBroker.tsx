'use client'

import React from 'react'
import { IMPORT_BROKERS, type ImportBrokerId } from '@/lib/importBrokerConfig'

interface Props {
  selected: ImportBrokerId | null
  onSelect: (id: ImportBrokerId) => void
}

export default function ImportStepBroker({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1">Welcher Broker?</h3>
      <p className="text-[12px] text-white/30 mb-5">
        Wähle den Broker, von dem du den Export importieren möchtest.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {IMPORT_BROKERS.map(b => {
          const isSelected = selected === b.id
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-white/[0.06] border-white/[0.15]'
                  : 'bg-[#0c0c16] border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03]'
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white"
                style={{ background: b.accentDot || '#1a1a2e' }}
              >
                {b.initial}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white">{b.name}</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {b.formats?.join(' · ') || 'Manueller Import'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
