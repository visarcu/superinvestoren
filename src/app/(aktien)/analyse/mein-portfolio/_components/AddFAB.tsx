'use client'

// Floating Action Button mit Quick-Menu für: Position / Aktivität / Import.
import React, { useEffect, useRef, useState } from 'react'

interface AddFABProps {
  onAddPosition: () => void
  onAddActivity: () => void
  onImport: () => void
}

export default function AddFAB({ onAddPosition, onAddActivity, onImport }: AddFABProps) {
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
    <div ref={ref} className="fixed bottom-6 right-6 z-40 sm:bottom-10 sm:right-10">
      {/* Quick-Menu */}
      {open && (
        <div
          role="menu"
          className="absolute bottom-[4.25rem] right-0 min-w-[240px] bg-[#0a0a12] border border-white/[0.06] rounded-xl shadow-[0_100px_50px_rgba(0,0,0,0.6)] overflow-hidden py-1"
        >
          <MenuItem
            onClick={() => {
              setOpen(false)
              onAddPosition()
            }}
            tone="emerald"
            title="Neue Position"
            subtitle="Aktie + Kauf"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            }
          />
          <MenuItem
            onClick={() => {
              setOpen(false)
              onAddActivity()
            }}
            tone="blue"
            title="Aktivität"
            subtitle="Verkauf, Dividende, Cash, Transfer"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
              />
            }
          />
          <MenuItem
            onClick={() => {
              setOpen(false)
              onImport()
            }}
            tone="violet"
            title="Import"
            subtitle="CSV / PDF / XLSX vom Broker"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            }
          />
        </div>
      )}

      {/* FAB — Fey-Signature White Pill mit Glow */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          relative w-14 h-14 rounded-full bg-[#E6E6E6] hover:bg-white text-black
          flex items-center justify-center
          shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_0_24px_rgba(255,255,255,0.18),0_12px_32px_rgba(0,0,0,0.4)]
          hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_32px_rgba(255,255,255,0.28),0_16px_40px_rgba(0,0,0,0.5)]
          transition-all duration-200
          ${open ? 'rotate-45' : ''}
        `}
        aria-label="Hinzufügen"
        aria-expanded={open}
      >
        <svg
          className="w-6 h-6 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.4}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  )
}

function MenuItem({
  onClick,
  title,
  subtitle,
  icon,
  tone,
}: {
  onClick: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: 'emerald' | 'blue' | 'violet'
}) {
  const toneMap = {
    emerald: 'bg-emerald-400/[0.10] text-emerald-300',
    blue: 'bg-blue-400/[0.10] text-blue-300',
    violet: 'bg-violet-400/[0.10] text-violet-300',
  } as const

  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
    >
      <div
        className={`w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0 ${toneMap[tone]}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          {icon}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white tracking-tight">{title}</p>
        <p className="text-[10px] text-white/40">{subtitle}</p>
      </div>
    </button>
  )
}
