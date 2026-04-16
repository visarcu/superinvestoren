// src/components/portfolio/BrokerLogo.tsx
// Broker-Logos für den Import-Wizard und die Depot-Auswahl.
//
// Zwei Render-Wege:
//   1) File-based (bevorzugt): offizielle SVG-Datei aus public/broker-logos/.
//      Dateien mit weißem Fill werden vor brand-farbigem Hintergrund gerendert.
//      Um ein neues Logo zu aktivieren: Datei ablegen, LOGO_FILES unten ergänzen.
//   2) Inline SVG (Fallback): selbst gezeichnete Approximation als Platzhalter.
//
// Markenrechte verbleiben bei den jeweiligen Inhabern (referentielle Markennutzung, §23 MarkenG).
import React from 'react'
import type { ImportBrokerId } from '@/lib/importBrokerConfig'

interface BrokerLogoProps {
  brokerId: ImportBrokerId
  size?: number
  className?: string
}

// Mapping ImportBrokerId → Datei in public/broker-logos/ + Hintergrundfarbe.
// `bg` ist die Fläche hinter dem Logo (meist passend zur Markenfarbe, weil die
// offiziellen SVGs oft weiß gefüllt sind). Fehlt ein Eintrag → Inline-Fallback.
const LOGO_FILES: Partial<Record<ImportBrokerId, { src: string; bg: string; padding?: string }>> = {
  // Scalable: helles Logo — weißer Hintergrund passt gut
  scalable: { src: '/broker-logos/scalable-capital.png', bg: '#FFFFFF', padding: 'p-1' },
  // Trade Republic: weißes Wordmark auf transparent → schwarzer Hintergrund macht's sichtbar
  traderepublic: { src: '/broker-logos/trade-republic.png', bg: '#0A0A0A', padding: 'p-1' },
  // Flatex-Logo ist orange/weiß auf weißem Hintergrund → weißer bg passt
  flatex: { src: '/broker-logos/flatex.png', bg: '#FFFFFF', padding: 'p-1' },
  // Smartbroker+: blau-weißes Logo → weißer Hintergrund
  smartbroker: { src: '/broker-logos/smartbroker.svg', bg: '#FFFFFF', padding: 'p-1' },
  // Freedom24: typischerweise dunkel gehaltenes Logo → weißer Hintergrund rendert neutral
  freedom24: { src: '/broker-logos/freedom24.png', bg: '#FFFFFF', padding: 'p-1' },
  // ING-Logo: dunkelblaue Wortmarke + oranger Löwe auf weißem Hintergrund
  ing: { src: '/broker-logos/ing.jpg', bg: '#FFFFFF', padding: 'p-1' },
  // Weitere Broker-Logos hier aktivieren, sobald Dateien in public/broker-logos/ liegen:
  // zero: { src: '/broker-logos/finanzen-net-zero.svg', bg: '#E4007F', padding: 'p-1.5' },
}

export function BrokerLogo({ brokerId, size = 36, className }: BrokerLogoProps) {
  const sizeStyle = { width: size, height: size }

  // 1) Echte Logo-Datei vorhanden? → als <img> rendern.
  const file = LOGO_FILES[brokerId]
  if (file) {
    return (
      <div
        style={{ ...sizeStyle, backgroundColor: file.bg }}
        className={`relative flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${file.padding ?? ''} ${className ?? ''}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.src}
          alt=""
          aria-hidden
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>
    )
  }

  // 2) Fallback: inline-gezeichnete Approximation.
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

    case 'ing':
      // ING-DiBa — weißer Hintergrund, orange "ING" Schriftzug (vereinfacht)
      return (
        <div style={sizeStyle} className={`relative flex-shrink-0 ${className ?? ''}`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <rect width="36" height="36" rx="8" fill="#FFFFFF" />
            <text
              x="18"
              y="22"
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              fontSize="11"
              fontWeight="800"
              fill="#FF6200"
              textAnchor="middle"
              letterSpacing="-0.4"
            >
              ING
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
