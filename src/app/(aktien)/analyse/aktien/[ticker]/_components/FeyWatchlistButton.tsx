'use client'

// Fey-Style Watchlist-Button: Stern-Icon, dezent.
// Nutzt useWatchlist-Hook (gleiche Logik wie src/components/WatchlistButton.tsx).
// Premium-User mit eigenen Listen bekommen ein Popover zur Listen-Auswahl,
// alle anderen den bisherigen Ein-Klick-Toggle.
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useWatchlist } from '@/lib/hooks/useWatchlist'

interface FeyWatchlistButtonProps {
  ticker: string
}

export default function FeyWatchlistButton({ ticker }: FeyWatchlistButtonProps) {
  const {
    exists,
    membership,
    groups,
    loading,
    isPremium,
    limitReached,
    isAuthenticated,
    initialized,
    toggle,
    toggleList,
  } = useWatchlist(ticker)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const hasListPicker = isPremium && groups.length > 0

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Solange noch nicht initialisiert: Skeleton mit gleicher Größe (kein Layout-Shift)
  if (!initialized) {
    return <div className="w-9 h-9 rounded-xl bg-white/[0.03] animate-pulse" aria-hidden />
  }

  // Nicht eingeloggt: Button leitet zu Login
  if (!isAuthenticated) {
    return (
      <a
        href="/auth/signin"
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-all"
        title="Anmelden, um zur Watchlist hinzuzufügen"
        aria-label="Zur Watchlist hinzufügen (Anmeldung erforderlich)"
      >
        <StarIcon filled={false} />
      </a>
    )
  }

  const titleText = hasListPicker
    ? 'Watchlist-Listen verwalten'
    : exists
      ? 'Aus Watchlist entfernen'
      : limitReached
        ? 'Watchlist voll – Upgrade auf Premium'
        : 'Zur Watchlist hinzufügen'

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => (hasListPicker ? setOpen(o => !o) : toggle())}
        disabled={loading && !hasListPicker}
        title={titleText}
        aria-label={titleText}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
          exists
            ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/15'
            : limitReached
              ? 'bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/15'
              : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
        } ${loading && !hasListPicker ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading && !hasListPicker ? (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <StarIcon filled={exists} />
        )}
      </button>

      {/* Listen-Popover (Premium mit eigenen Listen) */}
      {open && hasListPicker && (
        <div className="absolute right-0 top-full mt-2 w-56 z-50 rounded-xl bg-[#16161f] border border-white/[0.08] shadow-2xl shadow-black/50 p-1">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            {ticker.toUpperCase()} speichern in
          </p>

          <PickerRow
            label="Watchlist"
            checked={membership.ungrouped}
            disabled={loading}
            onClick={() => toggleList(null)}
          />
          {groups.map(g => (
            <PickerRow
              key={g.id}
              label={g.name}
              checked={membership.groupIds.includes(g.id)}
              disabled={loading}
              onClick={() => toggleList(g.id)}
            />
          ))}

          <div className="mt-1 pt-1 border-t border-white/[0.06]">
            <Link
              href="/analyse/meine-watchlist"
              className="block px-3 py-2 rounded-lg text-[11px] text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            >
              Listen verwalten →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function PickerRow({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors disabled:opacity-50"
    >
      <span className="truncate">{label}</span>
      {checked && (
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
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-4 h-4"
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}
