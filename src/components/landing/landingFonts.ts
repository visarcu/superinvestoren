// Schriften der Marketing-Seiten (Startseite, /depot): Instrument Sans für
// Überschriften, JetBrains Mono für Zahlen. Einmal geladen, überall gleich.
//
// Die Dateien liegen im Repo (./fonts, jeweils Googles latin-Subset, variabel),
// weil der Produktions-Build sonst abbricht, sobald Google Fonts nicht erreichbar
// ist. Lizenz beider Schriften: SIL OFL 1.1, Texte liegen daneben.

import localFont from 'next/font/local'

// Beide Schnitte kommen aus derselben variablen Datei, deshalb zweimal derselbe Pfad.
// adjustFontFallback bleibt aus, wie vorher mit next/font/google.
export const landingDisplay = localFont({
  src: [
    { path: './fonts/InstrumentSans-latin.woff2', weight: '500', style: 'normal' },
    { path: './fonts/InstrumentSans-latin.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  adjustFontFallback: false,
})
export const landingMono = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
})

/** Klassen für den Seiten-Wrapper, damit die CSS-Variablen gesetzt sind */
export const landingFontVars = `${landingDisplay.variable} ${landingMono.variable}`

export const DISPLAY = { fontFamily: 'var(--font-display)' } as const
export const MONO = { fontFamily: 'var(--font-mono)' } as const
