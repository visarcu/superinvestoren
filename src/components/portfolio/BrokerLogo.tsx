// src/components/portfolio/BrokerLogo.tsx
// Inline-SVG-Logos für unterstützte Broker.
// Approximationen der offiziellen Marken zur Identifikation im Import-Wizard.
// Markenrechte verbleiben bei den jeweiligen Inhabern (referentielle Markennutzung, §23 MarkenG).
import React from 'react'
import type { ImportBrokerId } from '@/lib/importBrokerConfig'

interface BrokerLogoProps {
  brokerId: ImportBrokerId
  size?: number
  className?: string
}

export function BrokerLogo({ brokerId, size = 36, className }: BrokerLogoProps) {
  const sizeStyle = { width: size, height: size }

  switch (brokerId) {
    case 'scalable':
      // Scalable Capital — dunkles Quadrat mit grünem geschwungenem "S"
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#0E2A3D" />
            <path
              d="M22.5 12.5c0-1.5-1.8-2.5-4.5-2.5s-4.5 1.2-4.5 3 1.5 2.6 4.5 3.2c3 .6 4.5 1.6 4.5 3.4s-1.8 3.4-4.5 3.4-4.5-1-4.5-2.5"
              stroke="#00E1A3"
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
      )

    case 'traderepublic':
      // Trade Republic — schwarzes Quadrat, weißes "TR" Wortmark
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#0A0A0A" />
            <text
              x="18"
              y="24"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              fontSize="13"
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
              letterSpacing="-0.5"
            >
              TR
            </text>
          </svg>
        </div>
      )

    case 'flatex':
      // Flatex / DEGIRO — orange Quadrat mit "f" Wortmark
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#F06400" />
            <path
              d="M21 11h-3.5c-1.4 0-2.5 1.1-2.5 2.5V16h-2v3h2v8h3.5v-8H22l.5-3h-3.5v-1.5c0-.3.2-.5.5-.5H22V11h-1z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      )

    case 'smartbroker':
      // Smartbroker+ — blaues Quadrat mit "SB+" oder Stern
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#0066CC" />
            <text
              x="14"
              y="23"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="12"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle"
              letterSpacing="-0.8"
            >
              SB
            </text>
            <text
              x="25"
              y="20"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="11"
              fontWeight="700"
              fill="#FFD400"
              textAnchor="middle"
            >
              +
            </text>
          </svg>
        </div>
      )

    case 'freedom24':
      // Freedom24 — schwarz mit grünem "F24"
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#000000" />
            <text
              x="18"
              y="22"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="11"
              fontWeight="800"
              fill="#10D070"
              textAnchor="middle"
              letterSpacing="-0.5"
            >
              F24
            </text>
          </svg>
        </div>
      )

    case 'zero':
      // finanzen.net zero — pink-magenta Akzent, stilisierte "0"
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#E4007F" />
            <text
              x="18"
              y="25"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              fontSize="18"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle"
              letterSpacing="-0.8"
            >
              0
            </text>
          </svg>
        </div>
      )

    case 'other':
    default:
      // Fallback — neutrales Quadrat mit Fragezeichen
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#27272A" />
            <text
              x="18"
              y="24"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="16"
              fontWeight="600"
              fill="#A1A1AA"
              textAnchor="middle"
            >
              ?
            </text>
          </svg>
        </div>
      )
  }
}
