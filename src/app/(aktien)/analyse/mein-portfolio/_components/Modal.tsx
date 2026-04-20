'use client'

import React, { useEffect } from 'react'

interface ModalProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

export default function Modal({ open, title, subtitle, onClose, children, size = 'md' }: ModalProps) {
  // Esc to close + body scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className={`relative w-full ${SIZE_CLASS[size]} bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] my-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-white/[0.04]">
          <div>
            <h2 className="text-[16px] font-bold text-white">{title}</h2>
            {subtitle && <p className="text-[12px] text-white/30 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-all"
            aria-label="Schließen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
