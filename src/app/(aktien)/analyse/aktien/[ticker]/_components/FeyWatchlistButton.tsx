'use client'

// Fey-Style Watchlist-Button: Stern-Icon, dezent.
// Nutzt useWatchlist-Hook (gleiche Logik wie src/components/WatchlistButton.tsx).
import React from 'react'
import { useWatchlist } from '@/lib/hooks/useWatchlist'

interface FeyWatchlistButtonProps {
  ticker: string
}

export default function FeyWatchlistButton({ ticker }: FeyWatchlistButtonProps) {
  const { exists, loading, limitReached, isAuthenticated, initialized, toggle } = useWatchlist(ticker)

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

  const titleText = exists
    ? 'Aus Watchlist entfernen'
    : limitReached
      ? 'Watchlist voll – Upgrade auf Premium'
      : 'Zur Watchlist hinzufügen'

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={titleText}
      aria-label={titleText}
      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
        exists
          ? 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/15'
          : limitReached
            ? 'bg-amber-500/10 text-amber-400/80 hover:bg-amber-500/15'
            : 'bg-white/[0.04] text-white/40 hover:bg-white/[0.08] hover:text-white/70'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <StarIcon filled={exists} />
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
