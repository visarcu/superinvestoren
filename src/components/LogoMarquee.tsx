// src/components/LogoMarquee.tsx
'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import { logos } from '@/data/logos'
// Beispiel für logos:
// export const logos = [
//   { src: '/logos/nvda.svg', alt: 'NVIDIA',  ticker: 'nvda' },
//   { src: '/logos/aapl.svg', alt: 'Apple',   ticker: 'aapl' },
//   { src: '/logos/amzn.svg', alt: 'Amazon',  ticker: 'amzn' },
//   { src: '/logos/googl.svg', alt: 'Google',  ticker: 'googl' },
//   // … weitere Logos
// ]

export default function LogoMarquee() {
  const router = useRouter()

  return (
    <div
      className="
        w-[100vw]
        ml-[calc(50%_-_50vw)]
        bg-gray-900/30
        py-6
      "
    >
      <div className="flex items-center justify-center flex-wrap gap-8">
        {logos.map((logo, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (logo.ticker) {
                router.push(`/analyse/${logo.ticker}`)
              }
            }}
            className="focus:outline-none"
          >
            <Logo
              src={logo.src}
              alt={logo.alt}
              className="w-24 h-24 p-2"
            />
          </button>
        ))}
      </div>
    </div>
  )
}