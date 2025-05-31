// src/components/Hero.tsx
'use client'

import { useRouter } from 'next/navigation'
import SearchTickerInput from './SearchTickerInput'
import Logo from './Logo'

const FEATURED = [
  { ticker: 'nvda', src: '/logos/nvda.svg', alt: 'NVIDIA' },
  { ticker: 'aapl', src: '/logos/aapl.svg', alt: 'Apple' },
  { ticker: 'amzn', src: '/logos/amzn.svg', alt: 'Amazon' },
  { ticker: 'googl', src: '/logos/googl.svg', alt: 'Google' },
]

export default function Hero() {
  const router = useRouter()

  return (
    <section className="mt-0 relative w-[100vw] left-1/2 -ml-[50vw] bg-section1 overflow-hidden">
      {/* der eigentliche zentrierte Content-Wrapper */}
      <div className="relative z-10 top-10 max-w-4xl mx-auto px-6 py-32 text-center space-y-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          Analysiere Aktien
          <br />
          <span className="text-accent">Erhalte Einblicke</span>
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          Aktienanalyse für langfristige Investoren.
        </p>

        {/* Suche */}
        <div className="mt-8 flex justify-center">
          <SearchTickerInput
            placeholder="Suche 10.000+ Aktien & ETFs"
            onSelect={(t) => router.push(`/analyse/${t.toLowerCase()}`)}
            className="w-full max-w-2xl"
            inputClassName={`
              w-full px-6 py-4
              bg-gray-800 text-white placeholder-gray-500
              border border-gray-700
              rounded-full
              focus:outline-none focus:ring-2 focus:ring-accent
              transition
            `}
            buttonClassName="hidden"
          />
        </div>

        {/* Featured Logos */}
        <div className="mt-10 flex justify-center flex-wrap gap-8">
          {FEATURED.map(({ ticker, src, alt }) => (
            <button
              key={ticker}
              onClick={() => router.push(`/analyse/${ticker}`)}
              className="w-16 h-16 md:w-20 md:h-20 p-2 rounded-xl hover:bg-gray-900 transition"
            >
              <Logo
                src={src}
                alt={alt}
                className="w-full h-full object-contain"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}