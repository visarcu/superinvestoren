'use client'

import React, { useState } from 'react'
import Modal from '../Modal'
import ImportStepIndicator from './ImportStepIndicator'
import ImportStepBroker from './ImportStepBroker'
import ImportStepInstructions from './ImportStepInstructions'
import ImportStepUpload from './ImportStepUpload'
import { parseFile, ParserNotImplementedError } from './parserAdapter'
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
  const [state, setState] = useState<ImportState>(initialState)
  const [processing, setProcessing] = useState(false)

  const reset = () => setState(initialState)
  const handleClose = () => {
    if (processing) return
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
    setState(s => ({ ...s, file, fileName: file.name, parseError: null }))
    try {
      const { transactions, raw } = await parseFile(state.brokerId, file)
      setState(s => ({
        ...s,
        transactions,
        rawParseResult: raw,
        step: 'preview', // skip resolve+cash für jetzt — kommt in Folge-Session
        parseError: null,
      }))
    } catch (err) {
      const msg =
        err instanceof ParserNotImplementedError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unbekannter Fehler'
      setState(s => ({ ...s, parseError: msg }))
    } finally {
      setProcessing(false)
    }
  }

  // Footer Navigation
  const back = () => {
    if (state.step === 'instructions') goTo('broker')
    else if (state.step === 'upload') goTo('instructions')
    else if (state.step === 'preview') goTo('upload')
  }

  const next = () => {
    if (state.step === 'instructions') goTo('upload')
  }

  const canBack = ['instructions', 'upload', 'preview'].includes(state.step)
  const canNext = state.step === 'instructions'

  return (
    <Modal
      open={open}
      title="Import"
      subtitle="Transaktionen aus deinem Broker übernehmen"
      onClose={handleClose}
      size="lg"
    >
      <div className="-m-5">
        <ImportStepIndicator step={state.step} />

        <div className="px-6 py-6 min-h-[320px]">
          {state.step === 'broker' && (
            <ImportStepBroker selected={state.brokerId} onSelect={handleSelectBroker} />
          )}

          {state.step === 'instructions' && state.brokerId && (
            <ImportStepInstructions brokerId={state.brokerId} />
          )}

          {state.step === 'upload' && state.brokerId && (
            <ImportStepUpload
              brokerId={state.brokerId}
              onFile={handleFile}
              processing={processing}
              error={state.parseError}
            />
          )}

          {state.step === 'preview' && (
            <PreviewStub
              count={state.transactions.length}
              fileName={state.fileName}
              onReset={() => goTo('upload')}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
          <div>
            {canBack && (
              <button
                onClick={back}
                disabled={processing}
                className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Zurück
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={processing}
              className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
            >
              Abbrechen
            </button>
            {canNext && (
              <button
                onClick={next}
                className="px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5"
              >
                Weiter
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// Vorläufiger Preview-Stub. Echte Preview-/Resolve-/Import-Steps kommen in Folge-Session.
function PreviewStub({
  count,
  fileName,
  onReset,
}: {
  count: number
  fileName: string
  onReset: () => void
}) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-1">{count} Transaktionen erkannt</h3>
      <p className="text-[12px] text-white/40 mb-1">{fileName}</p>
      <p className="text-[11px] text-white/25 mt-4 max-w-md mx-auto leading-relaxed">
        Die Schritte ISIN-Auflösung, Cash-Modus, Vorschau und Import kommen in der nächsten Session.
        Parser hat fehlerfrei {count} Einträge gelesen — die Foundation funktioniert.
      </p>
      <button
        onClick={onReset}
        className="mt-5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/60 hover:text-white transition-all"
      >
        Andere Datei wählen
      </button>
    </div>
  )
}
