'use client'

import React, { useRef, useState } from 'react'
import { getImportBroker, type ImportBrokerId } from '@/lib/importBrokerConfig'

interface Props {
  brokerId: ImportBrokerId
  onFile: (file: File) => void
  processing: boolean
  error: string | null
}

export default function ImportStepUpload({ brokerId, onFile, processing, error }: Props) {
  const broker = getImportBroker(brokerId)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onFile(files[0])
  }

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1">Datei hochladen</h3>
      <p className="text-[12px] text-white/30 mb-5">
        Erlaubte Formate: <span className="text-white/60">{broker.formats?.join(', ')}</span>
      </p>

      <div
        onDragOver={e => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-white/[0.3] bg-white/[0.04]'
            : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.15] hover:bg-white/[0.03]'
        } ${processing ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={broker.accept}
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
          disabled={processing}
        />

        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
            <p className="text-[12px] text-white/40">Datei wird ausgewertet…</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-[14px] font-medium text-white/80">Datei hier ablegen</p>
            <p className="text-[11px] text-white/30 mt-1">oder klicken zum Auswählen</p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-3">
          <p className="font-semibold mb-1">Fehler beim Parsen</p>
          <p className="text-red-400/80">{error}</p>
        </div>
      )}

      {broker.isBetterThanPdf && (
        <div className="mt-4 text-[11px] text-white/40 bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3">
          💡 Tipp: Wenn der Broker auch CSV/XLSX exportiert, ist das **deutlich genauer** als PDF.
        </div>
      )}
    </div>
  )
}
