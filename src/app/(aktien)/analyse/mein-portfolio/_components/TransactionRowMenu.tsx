'use client'

import React, { useEffect, useRef, useState } from 'react'

interface TransactionRowMenuProps {
  onEdit: () => void
  onDelete: () => void
}

export default function TransactionRowMenu({ onEdit, onDelete }: TransactionRowMenuProps) {
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

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={e => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(o => !o)
        }}
        data-open={open || undefined}
        className="
          flex items-center justify-center w-7 h-7 rounded-md
          text-white/40 hover:text-white/90 hover:bg-white/[0.06]
          opacity-0 group-hover:opacity-100 data-[open]:opacity-100 transition-all
        "
        aria-label="Transaktions-Aktionen"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1 min-w-[160px] bg-[#0a0a12] border border-white/[0.06] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden py-1 z-50"
        >
          <MenuItem onClick={stop(onEdit)} label="Bearbeiten" />
          <MenuItem onClick={stop(onDelete)} label="Löschen" destructive />
        </div>
      )}
    </div>
  )
}

function MenuItem({
  onClick,
  label,
  destructive,
}: {
  onClick: (e: React.MouseEvent) => void
  label: string
  destructive?: boolean
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      className={`
        w-full flex items-center px-3 py-2 text-left text-[12px] transition-colors
        ${
          destructive
            ? 'text-red-300/90 hover:text-red-300 hover:bg-red-500/[0.08]'
            : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
        }
      `}
    >
      {label}
    </button>
  )
}
