'use client'

// Pro-Zeile-Menü: Ticker zu Listen hinzufügen / daraus entfernen.
// Dropdown wird fixed positioniert, damit es nicht vom overflow-x-Container
// der Tabelle abgeschnitten wird.
import React, { useEffect, useRef, useState } from 'react'
import type { WatchlistGroup } from './types'

interface WatchlistItemMenuProps {
  ticker: string
  groups: WatchlistGroup[]
  memberGroupIds: Set<string>
  onToggle: (groupId: string, currentlyIn: boolean) => void
  // true (Default): Button erscheint erst beim Hover über den group-Container (Fey-Stil).
  // false: Button ist immer sichtbar (Terminal-Stil).
  hoverReveal?: boolean
}

export default function WatchlistItemMenu({
  ticker,
  groups,
  memberGroupIds,
  onToggle,
  hoverReveal = true,
}: WatchlistItemMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 208
    setPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  if (groups.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        onClick={e => {
          // Menü kann in Link-Karten sitzen → Navigation unterbinden
          e.preventDefault()
          e.stopPropagation()
          open ? setOpen(false) : openMenu()
        }}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
          open
            ? 'text-white bg-white/[0.08] opacity-100'
            : `text-white/30 hover:text-white/80 hover:bg-white/[0.06] ${
                hoverReveal ? 'opacity-0 group-hover:opacity-100' : ''
              }`
        }`}
        title={`${ticker} zu Listen hinzufügen`}
        aria-label={`${ticker} zu Listen hinzufügen`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 208 }}
          className="z-50 rounded-xl bg-[#16161f] border border-white/[0.08] shadow-2xl shadow-black/50 p-1"
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            {ticker} in Listen
          </p>
          {groups.map(g => {
            const inGroup = memberGroupIds.has(g.id)
            return (
              <button
                key={g.id}
                onClick={e => {
                  // Menü kann in Link-Karten sitzen → Navigation unterbinden
                  e.preventDefault()
                  e.stopPropagation()
                  onToggle(g.id, inGroup)
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <span className="truncate">{g.name}</span>
                {inGroup && (
                  <svg
                    className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
