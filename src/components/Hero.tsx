// src/components/Hero.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import SearchTickerInput from './SearchTickerInput'
import LogoMarquee from './LogoMarquee'

export default function Hero() {
  const router = useRouter()

  return (
    <section
      className="
        relative
        w-screen
        left-1/2
        -translate-x-1/2
        bg-black
        pb-32    /* Platz schaffen, damit das Marquee unterhalb des Textes bleibt */
      "
    >
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-32 text-center space-y-6">
        <h1 className="font-orbitron text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
          Analysiere Aktien
          <br />
          <span className="bg-gradient-to-r from-green-400 to-green-600 gradient-text">
            Erhalte Einblicke
          </span>
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          Aktienanalyse für langfristige Investoren – Live-Quote, Charts &amp; Kennzahlen in Sekundenschnelle.
        </p>
        <div className="mt-8 flex justify-center">
          <SearchTickerInput
            placeholder="Suche 10.000+ Aktien & ETFs"
            onSelect={(t) => router.push(`/analyse/${t.toLowerCase()}`)}
            className="w-full max-w-2xl"
            inputClassName={`
              w-full px-6 py-4
              bg-gray-800 text-white placeholder-gray-500
              border border-gray-700 rounded-full
              focus:outline-none focus:ring-2 focus:ring-green-400
              transition
            `}
            buttonClassName="hidden"
          />
        </div>
      </div>

      {/* Marquee absolut unten */}
      <div className="absolute bottom-0 left-0 w-full">
        <LogoMarquee />
      </div>
    </section>
  )
}