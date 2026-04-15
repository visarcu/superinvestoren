// mobile/lib/theme.ts
// Premium Dark Mode Theme — Apple-inspired, dezent, mit klarer Hierarchie.
// Wiederverwendbar für alle Mobile-Screens.

export const theme = {
  // === Hintergründe ===
  bg: {
    base: '#000000',          // App-Hintergrund (deep black)
    elevated: '#0A0A0B',      // leicht abgehoben (Header)
    card: '#141416',          // Karten / Container
    cardHover: '#1C1C1E',     // Hover / Active State
    cardElevated: '#1F1F22',  // Stark abgehoben (Modal Sheet)
    overlay: 'rgba(0,0,0,0.7)',
  },

  // === Borders ===
  border: {
    default: '#1F1F22',       // dezenter Rahmen
    strong: '#2A2A2D',        // stärker für Hover
    subtle: '#141416',        // sehr leicht (zwischen Listen-Items)
  },

  // === Text-Hierarchie ===
  text: {
    primary: '#F5F5F7',       // primärer Text (weiß)
    secondary: '#9CA0A8',     // sekundärer Text (Labels)
    tertiary: '#5C6068',      // tertiärer Text (Meta, Subtle)
    muted: '#3D4046',         // sehr dezent
    inverse: '#000000',       // auf weißem BG
  },

  // === Akzente (sparsam einsetzen!) ===
  accent: {
    positive: '#34C759',      // Apple-Green
    positiveSoft: 'rgba(52,199,89,0.10)',
    negative: '#FF453A',      // Apple-Red
    negativeSoft: 'rgba(255,69,58,0.10)',
    warning: '#FF9F0A',       // Apple-Orange
    warningSoft: 'rgba(255,159,10,0.10)',
    info: '#0A84FF',          // Apple-Blue
  },

  // === Typografie (Größen) ===
  font: {
    // Display
    display1: 32,             // Hero (Gesamtwert)
    display2: 24,
    // Headings
    title1: 18,
    title2: 16,
    title3: 14,
    // Body
    body: 13,
    bodySm: 12,
    caption: 11,
    captionSm: 10,
    micro: 9,
  },

  // === Font-Weights ===
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // === Letter-Spacing ===
  tracking: {
    tight: -0.6,    // Display-Texte
    normal: -0.2,
    wide: 0.4,      // Caps Labels
    wider: 0.8,     // ÜBERSCHRIFTEN
  },

  // === Spacing ===
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // === Border-Radius ===
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 999,
  },
}

// Helper: Performance-Farbe basierend auf Wert
export function perfColor(value: number, defaultColor = theme.text.primary): string {
  if (value > 0) return theme.accent.positive
  if (value < 0) return theme.accent.negative
  return defaultColor
}

// Helper: tabularNums style für saubere Zahlen-Anzeige
export const tabularStyle = {
  fontVariant: ['tabular-nums'] as ['tabular-nums'],
}
