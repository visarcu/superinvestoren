// src/lib/colors.ts
// ═══════════════════════════════════════════════════════════════════════════════
// FINCLUE BRAND COLORS - ZENTRALE KONFIGURATION
// Ändere hier die Farben und sie ändern sich überall in der App
// ═══════════════════════════════════════════════════════════════════════════════

export const brandColors = {
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIMARY BRAND COLOR - Die Hauptfarbe deiner App
    // Ändere diese Werte um die gesamte App-Farbe zu ändern
    // ═══════════════════════════════════════════════════════════════════════════
    primary: {
      DEFAULT: '#2563eb',      // Blue-600 - Hauptfarbe
      hover: '#1d4ed8',        // Blue-700 - Hover State
      light: '#3b82f6',        // Blue-500 - Hellere Variante
      muted: '#dbeafe',        // Blue-100 - Sehr hell (Backgrounds)
      
      // Opacity Varianten (für Tailwind)
      '10': 'rgba(37, 99, 235, 0.1)',
      '15': 'rgba(37, 99, 235, 0.15)',
      '20': 'rgba(37, 99, 235, 0.2)',
      '30': 'rgba(37, 99, 235, 0.3)',
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // SEMANTIC COLORS - Diese sollten NICHT geändert werden
    // Grün = Positiv, Rot = Negativ ist universell verstanden
    // ═══════════════════════════════════════════════════════════════════════════
    semantic: {
      positive: '#16a34a',     // Green-600 - Für positive Zahlen, Gewinne
      negative: '#dc2626',     // Red-600 - Für negative Zahlen, Verluste
      warning: '#d97706',      // Amber-600 - Für Warnungen
      info: '#0284c7',         // Sky-600 - Für Info
    },
  
    // ═══════════════════════════════════════════════════════════════════════════
    // CHART COLORS - Für Datenvisualisierung
    // ═══════════════════════════════════════════════════════════════════════════
    chart: {
      primary: '#2563eb',      // Blue - Hauptfarbe in Charts
      secondary: '#7c3aed',    // Violet
      tertiary: '#0891b2',     // Cyan
      quaternary: '#059669',   // Emerald
      quinary: '#d97706',      // Amber
      senary: '#dc2626',       // Red
      
      // Spezielle Chart-Farben
      positive: '#16a34a',     // Grün für Gewinne/Cash
      negative: '#dc2626',     // Rot für Verluste/Schulden
      neutral: '#64748b',      // Grau für neutrale Daten
    },
  } as const
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TAILWIND-KOMPATIBLE KLASSEN
  // Nutze diese in deinen Komponenten statt hardcoded Farben
  // ═══════════════════════════════════════════════════════════════════════════════
  
  export const brandClasses = {
    // Buttons
    button: {
      primary: 'bg-brand text-white hover:bg-brand-hover',
      secondary: 'bg-transparent text-brand border border-brand hover:bg-brand/10',
      ghost: 'bg-transparent text-brand hover:bg-brand/10',
    },
    
    // Text
    text: {
      primary: 'text-brand',
      light: 'text-brand-light',
      hover: 'hover:text-brand',
    },
    
    // Backgrounds
    bg: {
      solid: 'bg-brand',
      muted: 'bg-brand/10',
      hover: 'hover:bg-brand/10',
    },
    
    // Borders & Rings
    border: {
      solid: 'border-brand',
      ring: 'ring-brand/30',
    },
    
    // States (für Toggle-Buttons, aktive Tabs, etc.)
    state: {
      active: 'bg-brand/15 text-brand-light ring-1 ring-brand/30',
      inactive: 'bg-theme-tertiary text-theme-secondary hover:bg-brand/10 hover:text-brand-light',
    },
    
    // Positive/Negative (NICHT ändern - semantisch)
    semantic: {
      positive: 'text-green-600',
      negative: 'text-red-600',
      positiveLight: 'text-green-500',
      negativeLight: 'text-red-500',
    }
  } as const
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Gibt die richtige Farbe für einen Wert zurück (positiv/negativ)
   */
  export function getValueColor(value: number): string {
    if (value > 0) return brandColors.semantic.positive
    if (value < 0) return brandColors.semantic.negative
    return brandColors.chart.neutral
  }
  
  /**
   * Gibt die richtige Tailwind-Klasse für einen Wert zurück
   */
  export function getValueColorClass(value: number): string {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-theme-secondary'
  }
  
  /**
   * Chart-Farbe nach Index
   */
  export function getChartColor(index: number): string {
    const colors = [
      brandColors.chart.primary,
      brandColors.chart.secondary,
      brandColors.chart.tertiary,
      brandColors.chart.quaternary,
      brandColors.chart.quinary,
      brandColors.chart.senary,
    ]
    return colors[index % colors.length]
  }