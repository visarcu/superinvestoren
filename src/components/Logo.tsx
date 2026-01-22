// src/components/Logo.tsx
'use client'
import Image from 'next/image'
import { useState } from 'react'

// Logo.dev API Token (public key - safe to expose in client)
const LOGO_DEV_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || ''

type LogoProps = {
  src?: string
  ticker?: string
  alt: string
  className?: string
}

// Lokale Logos für häufig verwendete Ticker (Performance)
const LOCAL_LOGOS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA',
  'BRK.B', 'UNH', 'JNJ', 'V', 'WMT', 'JPM', 'MA', 'PG', 'HD', 'CVX',
  'LLY', 'ABBV', 'BAC', 'KO', 'PEP', 'TMO', 'COST', 'AVGO', 'DIS', 'ABT',
  'VZ', 'ADBE', 'CMCSA', 'DHR', 'NKE', 'TXN', 'ORCL', 'NEE', 'XOM', 'NFLX',
  'CRM', 'WFC', 'RTX', 'UPS', 'INTU', 'IBM', 'AMD', 'QCOM', 'CAT', 'GS'
])

// Konsistente Farbe basierend auf Ticker
const getTickerColor = (ticker: string): string => {
  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600',
    'bg-orange-600', 'bg-pink-600', 'bg-lime-600', 'bg-sky-600'
  ]
  let hash = 0
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Logo({
  src,
  ticker,
  alt,
  className,
}: LogoProps) {
  const [fallbackStage, setFallbackStage] = useState(0)

  const upperTicker = ticker?.toUpperCase()

  // Smart Logo URL mit Fallback-Kette
  const getLogoUrl = (): string | null => {
    if (src) return src
    if (!upperTicker) return '/logos/default.svg'

    switch (fallbackStage) {
      case 0:
        // 1. Lokales Logo falls vorhanden
        if (LOCAL_LOGOS.has(upperTicker)) {
          return `/logos/${upperTicker.toLowerCase()}.svg`
        }
        // 2. Logo.dev API (beste Abdeckung)
        if (LOGO_DEV_TOKEN) {
          return `https://img.logo.dev/ticker/${upperTicker}?token=${LOGO_DEV_TOKEN}`
        }
        // Fallback zu FMP wenn kein Token
        return `https://financialmodelingprep.com/image-stock/${upperTicker}.png`
      case 1:
        // Fallback: FMP
        return `https://financialmodelingprep.com/image-stock/${upperTicker}.png`
      default:
        return null
    }
  }

  const getInitials = () => {
    if (!upperTicker) return '?'
    return upperTicker.substring(0, 2)
  }

  const logoUrl = getLogoUrl()

  // Initialen als finaler Fallback
  if (!logoUrl && upperTicker) {
    return (
      <div
        className={`
          relative
          rounded-lg
          overflow-hidden
          ${getTickerColor(upperTicker)}
          flex items-center justify-center
          ${className ?? ''}
        `}
      >
        <span className="text-white font-bold" style={{ fontSize: '0.4em' }}>
          {getInitials()}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`
        relative
        overflow-hidden
        ${className ?? ''}
      `}
    >
      <Image
        src={logoUrl || '/logos/default.svg'}
        alt={alt}
        fill
        className="object-contain"
        onError={() => setFallbackStage(prev => prev + 1)}
        unoptimized={!logoUrl?.startsWith('/')}
      />
    </div>
  )
}