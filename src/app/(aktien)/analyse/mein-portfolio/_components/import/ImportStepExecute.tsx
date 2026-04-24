'use client'

import React, { useEffect, useRef, useState } from 'react'
import { executeImport, type ImportResult } from './importExecutor'
import type { NormalizedTransaction } from './types'

interface Props {
  transactions: NormalizedTransaction[]
  portfolioId: string
  onDone: (result: ImportResult) => void
}

export default function ImportStepExecute({ transactions, portfolioId, onDone }: Props) {
  const [progress, setProgress] = useState<'running' | 'done' | 'error'>('running')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // Guard gegen React-Strict-Mode Double-Invoke in Development: useRef
  // persistiert zwischen den beiden Mounts, verhindert zweiten executeImport.
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true

    let cancelled = false
    async function run() {
      try {
        const result = await executeImport(portfolioId, transactions)
        if (cancelled) return
        if (result.errors.length > 0 && result.insertedTransactions === 0) {
          setProgress('error')
          setErrorMsg(result.errors.join(' · '))
        } else {
          setProgress('done')
          onDone(result)
        }
      } catch (err) {
        if (cancelled) return
        setProgress('error')
        setErrorMsg(err instanceof Error ? err.message : 'Unbekannter Fehler')
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="text-center py-8">
      {progress === 'running' && (
        <>
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
          <h3 className="text-[15px] font-semibold text-white mb-1">Import läuft…</h3>
          <p className="text-[12px] text-white/40">
            {transactions.length} Transaktionen werden übernommen
          </p>
        </>
      )}

      {progress === 'error' && (
        <>
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-[15px] font-semibold text-white mb-1">Import fehlgeschlagen</h3>
          <p className="text-[12px] text-red-400/80 max-w-md mx-auto">{errorMsg}</p>
        </>
      )}
    </div>
  )
}
