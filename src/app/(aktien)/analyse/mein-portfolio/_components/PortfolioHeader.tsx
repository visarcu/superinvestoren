'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Portfolio } from '../_lib/types'

interface PortfolioHeaderProps {
  portfolios: Portfolio[]
  activePortfolio: Portfolio | null
  isAllDepotsView: boolean
  onSelectPortfolio: (id: string | null) => void
}

const SUB_LINKS = [
  { href: '/analyse/mein-portfolio', label: 'Übersicht', exact: true },
  { href: '/analyse/mein-portfolio/performance', label: 'Performance' },
  { href: '/analyse/mein-portfolio/dividenden', label: 'Dividenden' },
  { href: '/analyse/mein-portfolio/depots', label: 'Depots' },
]

export default function PortfolioHeader({
  portfolios,
  activePortfolio,
  isAllDepotsView,
  onSelectPortfolio,
}: PortfolioHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const hasMultipleDepots = portfolios.length > 1

  return (
    <header className="sticky top-0 z-30 bg-[#06060e]/80 backdrop-blur-md border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 h-14 flex items-center justify-between gap-4">
        {/* Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            aria-label="Zurück"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-white tracking-tight">Portfolio</span>
            {hasMultipleDepots ? (
              <DepotSwitcher
                portfolios={portfolios}
                activePortfolio={activePortfolio}
                isAllDepotsView={isAllDepotsView}
                onSelectPortfolio={onSelectPortfolio}
              />
            ) : activePortfolio ? (
              <>
                <span className="text-white/15">/</span>
                <span className="text-[12px] text-white/50 truncate">{activePortfolio.name}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Sub-Page Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-0.5">
          {SUB_LINKS.map(link => {
            const active = link.exact ? pathname === link.href : pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors
                  ${
                    active
                      ? 'text-white bg-white/[0.06]'
                      : 'text-white/40 hover:text-white/75 hover:bg-white/[0.03]'
                  }
                `}
              >
                {link.label}
              </Link>
            )
          })}
          <div className="w-px h-5 bg-white/[0.06] mx-2" />
          <Link
            href="/analyse/mein-portfolio/einstellungen"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/75 hover:bg-white/[0.05] transition-colors"
            title="Einstellungen"
            aria-label="Einstellungen"
          >
            <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </nav>
      </div>

      {/* Sub-Page Links (Mobile) — horizontaler Scroll */}
      <nav className="md:hidden max-w-6xl mx-auto w-full px-6 pb-2 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {SUB_LINKS.map(link => {
          const active = link.exact ? pathname === link.href : pathname?.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors
                ${
                  active
                    ? 'text-white bg-white/[0.06]'
                    : 'text-white/40 hover:text-white/75 hover:bg-white/[0.03]'
                }
              `}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

function DepotSwitcher({
  portfolios,
  activePortfolio,
  isAllDepotsView,
  onSelectPortfolio,
}: Pick<
  PortfolioHeaderProps,
  'portfolios' | 'activePortfolio' | 'isAllDepotsView' | 'onSelectPortfolio'
>) {
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

  const currentLabel = isAllDepotsView ? 'Alle Depots' : activePortfolio?.name ?? '–'

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      <span className="text-white/15">/</span>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[12px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate max-w-[140px]">{currentLabel}</span>
        <svg
          className={`w-3 h-3 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 min-w-[220px] bg-[#0a0a12] border border-white/[0.06] rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden py-1 z-40"
        >
          <button
            role="option"
            aria-selected={isAllDepotsView}
            onClick={() => {
              onSelectPortfolio(null)
              setOpen(false)
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-left text-[12px] transition-colors ${
              isAllDepotsView ? 'text-white bg-white/[0.04]' : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span>Alle Depots</span>
            {isAllDepotsView && <Checkmark />}
          </button>
          <div className="h-px bg-white/[0.05] my-1" />
          {portfolios.map(p => {
            const isActive = !isAllDepotsView && activePortfolio?.id === p.id
            return (
              <button
                key={p.id}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onSelectPortfolio(p.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-[12px] transition-colors ${
                  isActive ? 'text-white bg-white/[0.04]' : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {p.broker_color && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: p.broker_color }}
                    />
                  )}
                  <span className="truncate">{p.name}</span>
                </span>
                {isActive && <Checkmark />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Checkmark() {
  return (
    <svg className="w-3 h-3 text-white/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}
