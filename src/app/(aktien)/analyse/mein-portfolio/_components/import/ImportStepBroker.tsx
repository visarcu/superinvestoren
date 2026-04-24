'use client'

import React from 'react'
import { IMPORT_BROKERS, type ImportBrokerId } from '@/lib/importBrokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'

interface Props {
  selected: ImportBrokerId | null
  onSelect: (id: ImportBrokerId) => void
}

export default function ImportStepBroker({ selected, onSelect }: Props) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1 tracking-tight">Welcher Broker?</h3>
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
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-white/[0.06] border-white/[0.15]'
                  : 'bg-[#0c0c16] border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03]'
              }`}
            >
              <BrokerLogo brokerId={b.id} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[13px] font-semibold text-white tracking-tight truncate">
                    {b.name}
                  </p>
                  {b.isBetterThanPdf && (
                    <span className="shrink-0 text-[9px] font-medium px-1.5 py-0.5 bg-emerald-500/[0.08] text-emerald-300/90 border border-emerald-500/15 rounded">
                      CSV
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/30 mt-0.5 truncate">
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
