'use client'

import React from 'react'
import Link from 'next/link'

export default function WatchlistEmpty() {
  return (
    <div className="w-full max-w-md mx-auto text-center py-32">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-5">
        <svg
          className="w-6 h-6 text-white/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </div>
      <h3 className="text-[15px] font-semibold text-white/80 mb-2">Noch keine Aktien</h3>
      <p className="text-[12px] text-white/30 leading-relaxed mb-6">
        Suche eine Aktie und klicke auf den Stern im Header, um sie deiner Watchlist hinzuzufügen.
      </p>
      <Link
        href="/analyse/home"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white text-[12px] font-medium transition-all"
      >
        Aktien entdecken
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  )
}
