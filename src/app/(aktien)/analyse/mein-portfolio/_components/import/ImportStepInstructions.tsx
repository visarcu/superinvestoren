'use client'

import React from 'react'
import { getImportBroker, type ImportBrokerId } from '@/lib/importBrokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'

interface Props {
  brokerId: ImportBrokerId
}

export default function ImportStepInstructions({ brokerId }: Props) {
  const broker = getImportBroker(brokerId)
  const ins = broker.instructions

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <BrokerLogo brokerId={broker.id} size={40} />
        <div>
          <h3 className="text-[14px] font-semibold text-white tracking-tight">{ins.title}</h3>
          <p className="text-[11px] text-white/30 mt-0.5">{broker.formats?.join(' · ')}</p>
        </div>
      </div>

      <ol className="space-y-2.5 mb-5">
        {ins.steps.map((step, idx) => (
          <li key={idx} className="flex gap-3">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/[0.06] text-white/60 text-[10px] font-bold flex-shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-[13px] text-white/70 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      {ins.hint && (
        <div className="text-[11px] text-amber-400/80 bg-amber-500/[0.04] border border-amber-500/[0.1] rounded-xl px-4 py-2.5 mb-3">
          💡 {ins.hint}
        </div>
      )}

      {ins.loginUrl && (
        <a
          href={ins.loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/70 hover:text-white transition-all"
        >
          {ins.loginLabel || 'Bei ' + broker.name + ' anmelden'}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      )}
    </div>
  )
}
