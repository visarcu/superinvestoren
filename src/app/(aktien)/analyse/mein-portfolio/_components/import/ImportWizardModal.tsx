'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { usePortfolio } from '@/hooks/usePortfolio'
import Modal from '../Modal'
import ImportStepIndicator from './ImportStepIndicator'
import ImportStepBroker from './ImportStepBroker'
import ImportStepInstructions from './ImportStepInstructions'
import ImportStepUpload from './ImportStepUpload'
import ImportStepResolve from './ImportStepResolve'
import ImportStepCash from './ImportStepCash'
import ImportStepPreview from './ImportStepPreview'
import ImportStepExecute from './ImportStepExecute'
import ImportStepDone from './ImportStepDone'
import { parseFile, ParserNotImplementedError } from './parserAdapter'
import type { ImportResult } from './importExecutor'
import type { ImportState, WizardStep } from './types'
import type { ImportBrokerId } from '@/lib/importBrokerConfig'

interface Props {
  open: boolean
  onClose: () => void
}

const initialState: ImportState = {
  step: 'broker',
  brokerId: null,
  file: null,
  fileName: '',
  rawParseResult: null,
  parseError: null,
  transactions: [],
  cashMode: 'include',
  selectedTxIds: new Set(),
  importSummary: null,
}

export default function ImportWizardModal({ open, onClose }: Props) {
  const { portfolio, allPortfolios, isAllDepotsView, refresh, formatCurrency } = usePortfolio()
  const [state, setState] = useState<ImportState>(initialState)
  const [processing, setProcessing] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [finalTransactions, setFinalTransactions] = useState<typeof state.transactions>([])

  // Ziel-Depot für den Import (kann von portfolio.id abweichen, wenn gerade
  // "Alle Depots" aktiv ist). Default: erstes echtes Depot aus allPortfolios.
  const [selectedDepotId, setSelectedDepotId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // Wenn Benutzer auf "Alle Depots" ist → erstes Depot als Default vorauswählen.
    if (isAllDepotsView || portfolio?.id === 'all') {
      if (!selectedDepotId && allPortfolios.length > 0) {
        setSelectedDepotId(allPortfolios[0].id)
      }
    } else if (portfolio?.id && portfolio.id !== 'all') {
      setSelectedDepotId(portfolio.id)
    }
  }, [open, isAllDepotsView, portfolio?.id, allPortfolios, selectedDepotId])

  const activePortfolio = useMemo(
    () => allPortfolios.find(p => p.id === selectedDepotId) ?? null,
    [allPortfolios, selectedDepotId]
  )

  const reset = () => {
    setState(initialState)
    setImportResult(null)
    setFinalTransactions([])
  }

  const handleClose = async () => {
    if (processing || state.step === 'importing') return
    if (state.step === 'done' && importResult && importResult.insertedTransactions > 0) {
      await refresh()
    }
    reset()
    onClose()
  }

  const goTo = (step: WizardStep) => setState(s => ({ ...s, step }))

  const handleSelectBroker = (id: ImportBrokerId) => {
    setState(s => ({ ...s, brokerId: id, step: 'instructions' }))
  }

  const handleFile = async (file: File) => {
    if (!state.brokerId) return
    setProcessing(true)
    setState(s => ({ ...s, file, fileName: file.name, parseError: null, step: 'processing' }))
    try {
      const { transactions, raw } = await parseFile(state.brokerId, file)
      setState(s => ({
        ...s,
        transactions,
        rawParseResult: raw,
        step: 'resolve',
        parseError: null,
      }))
    } catch (err) {
      const msg =
        err instanceof ParserNotImplementedError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unbekannter Fehler'
      setState(s => ({ ...s, parseError: msg, step: 'upload' }))
    } finally {
      setProcessing(false)
    }
  }

  const back = () => {
    const prev: Partial<Record<WizardStep, WizardStep>> = {
      instructions: 'broker',
      upload: 'instructions',
      resolve: 'upload',
      cash: 'resolve',
      preview: 'cash',
    }
    const target = prev[state.step]
    if (target) goTo(target)
  }

  // Subtitle: bei "Alle Depots" Depot-Selektor zeigen, sonst Depot-Namen
  const showDepotSelector = (isAllDepotsView || portfolio?.id === 'all') && allPortfolios.length > 1

  return (
    <Modal
      open={open}
      title="Import"
      subtitle={
        showDepotSelector ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-white/30">
            Ziel-Depot:
            <select
              value={selectedDepotId ?? ''}
              onChange={e => setSelectedDepotId(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 text-[12px] text-white/75 focus:outline-none focus:border-white/[0.15] transition-colors"
            >
              {allPortfolios.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </span>
        ) : (
          activePortfolio ? `In Depot: ${activePortfolio.name}` : 'Transaktionen übernehmen'
        )
      }
      onClose={handleClose}
      size="lg"
    >
      <div className="-m-5">
        <ImportStepIndicator step={state.step} />

        <div className="px-6 py-6 min-h-[360px]">
          {state.step === 'broker' && (
            <ImportStepBroker selected={state.brokerId} onSelect={handleSelectBroker} />
          )}

          {state.step === 'instructions' && state.brokerId && (
            <>
              <ImportStepInstructions brokerId={state.brokerId} />
              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={back}
                  className="px-4 py-2 rounded-full text-[12px] text-white/40 hover:text-white/70 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={() => goTo('upload')}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
                >
                  Weiter
                </button>
              </div>
            </>
          )}

          {(state.step === 'upload' || state.step === 'processing') && state.brokerId && (
            <>
              <ImportStepUpload
                brokerId={state.brokerId}
                onFile={handleFile}
                processing={processing || state.step === 'processing'}
                error={state.parseError}
              />
              {state.step === 'upload' && (
                <div className="mt-4">
                  <button
                    onClick={back}
                    className="px-4 py-2 rounded-full text-[12px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    Zurück
                  </button>
                </div>
              )}
            </>
          )}

          {state.step === 'resolve' && (
            <ImportStepResolve
              transactions={state.transactions}
              onDone={resolved => {
                setState(s => ({ ...s, transactions: resolved, step: 'cash' }))
              }}
              onBack={back}
            />
          )}

          {state.step === 'cash' && (
            <ImportStepCash
              transactions={state.transactions}
              cashMode={state.cashMode}
              onChange={mode => setState(s => ({ ...s, cashMode: mode }))}
              onNext={() => goTo('preview')}
              onBack={back}
              formatCurrency={formatCurrency}
            />
          )}

          {state.step === 'preview' && activePortfolio && (
            <ImportStepPreview
              transactions={state.transactions}
              cashMode={state.cashMode}
              portfolioId={activePortfolio.id}
              onBack={back}
              onImport={selected => {
                setFinalTransactions(selected)
                goTo('importing')
              }}
              formatCurrency={formatCurrency}
            />
          )}

          {state.step === 'importing' && activePortfolio && (
            <ImportStepExecute
              transactions={finalTransactions}
              portfolioId={activePortfolio.id}
              onDone={res => {
                setImportResult(res)
                goTo('done')
              }}
            />
          )}

          {state.step === 'done' && importResult && (
            <ImportStepDone result={importResult} onClose={handleClose} />
          )}

          {state.step === 'preview' && !activePortfolio && (
            <div className="text-center py-12">
              <p className="text-[12px] text-red-400">
                Bitte ein Ziel-Depot im Header auswählen.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
