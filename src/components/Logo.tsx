// src/components/Logo.tsx
'use client'
import Image from 'next/image'
import { useState } from 'react'

type LogoProps = {
  src?: string  // Optional, wird automatisch generiert falls nicht angegeben
  ticker?: string  // NEU: Ticker für automatische Logo-Erkennung
  alt: string
  className?: string
  padding?: 'none' | 'small' | 'medium' | 'large'
  size?: number  // NEU: Für API-Logos
}

// ✅ Liste der Tickers mit lokalen Logos (für Performance)
const LOCAL_LOGOS = new Set([
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 
  'BRK.B', 'UNH', 'JNJ', 'V', 'WMT', 'JPM', 'MA', 'PG', 'HD', 'CVX',
  'LLY', 'ABBV', 'BAC', 'KO', 'PEP', 'TMO', 'COST', 'AVGO', 'DIS', 'ABT',
  'VZ', 'ADBE', 'CMCSA', 'DHR', 'NKE', 'TXN', 'ORCL', 'NEE', 'XOM', 'NFLX',
  'CRM', 'WFC', 'RTX', 'UPS', 'INTU', 'IBM', 'AMD', 'QCOM', 'CAT', 'GS'
  // Erweitere diese Liste nach Bedarf
])

export default function Logo({ 
  src, 
  ticker, 
  alt, 
  className, 
  padding = 'small',
  size = 64 
}: LogoProps) {
  const [fallbackLevel, setFallbackLevel] = useState(0)
  
  // Padding-Klassen
  const paddingClasses = {
    none: 'p-0',
    small: 'p-1',
    medium: 'p-2', 
    large: 'p-3'
  }

  // ✅ Smart Logo URL Generation
  const getLogoUrl = () => {
    const upperTicker = ticker?.toUpperCase()
    
    // 1. Falls src explizit angegeben, verwende das
    if (src) return src
    
    // 2. Falls kein ticker, verwende default
    if (!upperTicker) return '/logos/default.svg'
    
    // 3. Smart Fallback System
    switch (fallbackLevel) {
      case 0:
        // Versuche lokales Logo falls in der Liste
        if (LOCAL_LOGOS.has(upperTicker)) {
          return `/logos/${upperTicker.toLowerCase()}.svg`
        }
        // Sonst direkt zu API-Logo
        return `https://financialmodelingprep.com/image-stock/${upperTicker}.png`
        
      case 1:
        // Financial Modeling Prep API (kostenlos, gute Qualität)
        return `https://financialmodelingprep.com/image-stock/${upperTicker}.png`
        
      case 2:
        // Yahoo Finance API (Alternative)
        return `https://logo.clearbit.com/${getCompanyDomain(upperTicker)}`
        
      case 3:
        // Ultimativer Fallback
        return '/logos/default.svg'
        
      default:
        return '/logos/default.svg'
    }
  }

  // ✅ Company Domain Mapping für Clearbit (nur für bekannte)
  const getCompanyDomain = (ticker: string) => {
    const domainMap: Record<string, string> = {
      'AAPL': 'apple.com',
      'MSFT': 'microsoft.com',
      'GOOGL': 'google.com',
      'AMZN': 'amazon.com',
      'TSLA': 'tesla.com',
      'META': 'meta.com',
      'NFLX': 'netflix.com',
      'NVDA': 'nvidia.com',
      // Füge weitere wichtige hinzu...
    }
    return domainMap[ticker] || `${ticker.toLowerCase()}.com`
  }

  // ✅ Error Handler für Fallback-Chain
  const handleError = () => {
    console.log(`Logo fallback level ${fallbackLevel} failed for ${ticker}`)
    if (fallbackLevel < 3) {
      setFallbackLevel(prev => prev + 1)
    }
  }

  return (
    <div
      className={`
        relative
        rounded-full
        overflow-hidden
        bg-white
        shadow-lg
        ${className ?? ''}
      `}
    >
      <Image
        src={getLogoUrl()}
        alt={alt}
        fill
        className={`object-contain ${paddingClasses[padding]}`}
        onError={handleError}
        unoptimized={!getLogoUrl().startsWith('/')} // Für alle externen URLs
      />
    </div>
  )
}