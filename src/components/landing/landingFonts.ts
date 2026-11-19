// Schriften der Marketing-Seiten (Startseite, /depot): Instrument Sans für
// Überschriften, JetBrains Mono für Zahlen. Einmal geladen, überall gleich.

import { Instrument_Sans, JetBrains_Mono } from 'next/font/google'

export const landingDisplay = Instrument_Sans({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display', display: 'swap' })
export const landingMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

/** Klassen für den Seiten-Wrapper, damit die CSS-Variablen gesetzt sind */
export const landingFontVars = `${landingDisplay.variable} ${landingMono.variable}`

export const DISPLAY = { fontFamily: 'var(--font-display)' } as const
export const MONO = { fontFamily: 'var(--font-mono)' } as const
