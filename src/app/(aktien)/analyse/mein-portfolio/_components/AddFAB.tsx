'use client'

// Floating Action Button mit Quick-Menu für: Position / Aktivität.
// Position über der BottomNav, rechts unten.
import React, { useEffect, useRef, useState } from 'react'

interface AddFABProps {
  onAddPosition: () => void
  onAddActivity: () => void
}

export default function AddFAB({ onAddPosition, onAddActivity }: AddFABProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="fixed bottom-24 right-6 z-40 sm:bottom-28 sm:right-10">
      {/* Quick Menu */}
      {open && (
        <div className="absolute bottom-16 right-0 mb-1 bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden min-w-[200px]">
          <button
            onClick={() => {
              setOpen(false)
              onAddPosition()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white">Neue Position</p>
              <p className="text-[10px] text-white/30">Aktie + Kauf</p>
            </div>
          </button>

          <button
            onClick={() => {
              setOpen(false)
              onAddActivity()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-t border-white/[0.04]"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white">Aktivität</p>
              <p className="text-[10px] text-white/30">Verkauf, Dividende, Cash, Transfer</p>
            </div>
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-[0_12px_40px_rgba(255,255,255,0.15)] hover:bg-white/90 transition-all ${
          open ? 'rotate-45' : ''
        }`}
        aria-label="Hinzufügen"
        aria-expanded={open}
      >
        <svg
          className="w-6 h-6 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  )
}
