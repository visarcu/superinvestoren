'use client'

// Premium-Gate im Fey-Stil: Blur über Inhalten + zentriertes Lock-Overlay mit CTA.
// Für Premium-User wird der Inhalt unverändert durchgereicht (kein Wrapper-Overhead).
import React from 'react'
import Link from 'next/link'

interface FeyPremiumGateProps {
  isPremium: boolean
  /** Optional: Während User-Status noch lädt, zeigt nur Skeleton. */
  loading?: boolean
  /** Tab-Name für CTA: "Quartalszahlen", "Earnings-Details", … */
  feature: string
  /** Kurz-Beschreibung was der User mit Premium freischaltet */
  description?: string
  children: React.ReactNode
}

export default function FeyPremiumGate({
  isPremium,
  loading = false,
  feature,
  description,
  children,
}: FeyPremiumGateProps) {
  // Premium → Inhalt durchreichen
  if (isPremium) return <>{children}</>

  // User-Status lädt → unaufdringliches Skeleton statt Flash-of-Locked-Content
  if (loading) {
    return (
      <div className="w-full max-w-4xl py-20 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  // Free-User → Blur + Overlay
  return (
    <div className="relative w-full">
      <div className="filter blur-md opacity-40 pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      <div className="absolute inset-0 flex items-start justify-center pt-20 sm:pt-28 px-4">
        <div className="max-w-md w-full text-center bg-[#0c0c16]/90 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {/* Lock Icon im violetten Akzent */}
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-5 h-5 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>

          <p className="text-[10px] font-medium text-violet-400/80 tracking-widest uppercase mb-2">Premium</p>
          <h3 className="text-[16px] font-semibold text-white mb-2">{feature}</h3>
          {description && (
            <p className="text-[12px] text-white/40 leading-relaxed mb-6">{description}</p>
          )}

          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
          >
            14 Tage kostenlos testen
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          <p className="text-[10px] text-white/35 mt-3">Jederzeit kündbar</p>
        </div>
      </div>
    </div>
  )
}
