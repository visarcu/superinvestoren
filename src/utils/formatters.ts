// src/utils/formatters.ts
export const fmtP = (n?: number) =>
    typeof n === 'number' ? `${(n * 100).toFixed(2).replace('.', ',')} %` : '–'

  export const fmtDate = (d?: string | null) => d ?? '–'
  export const fmtPrice = (n?: number) =>
    typeof n === 'number'
      ? n.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })
      : '–'

// Format number with German locale (comma as decimal separator)
export const fmtNum = (n?: number | null, decimals = 2) =>
  n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '–'

// Format percentage with German locale (already in percentage, not decimal)
export const fmtPercent = (n?: number | null, decimals = 2) =>
  n != null ? `${n >= 0 ? '+' : ''}${n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%` : '–'

// Performance-Farben: Einheitlich grün/rot für positive/negative Werte
// Light-Mode: -600 Varianten (dunkel genug auf hellem Hintergrund)
// Dark-Mode: -400 Varianten (hell genug auf dunklem Hintergrund)
// variant: 'primary' = volle Farbe, 'muted' = gedämpft, 'bg' = Hintergrund-Badge
export const perfColor = (value: number, variant: 'primary' | 'muted' | 'bg' = 'primary') => {
  const isPositive = value >= 0
  switch (variant) {
    case 'muted':
      return isPositive
        ? 'text-emerald-600/70 dark:text-emerald-400/70'
        : 'text-red-600/70 dark:text-red-400/70'
    case 'bg':
      return isPositive
        ? 'bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-400/10 text-red-600 dark:text-red-400'
    default:
      return isPositive
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400'
  }
}

// Format volume (K, M, B) with German locale
export const fmtVolume = (vol?: number | null) => {
  if (vol == null) return '–'
  if (vol >= 1e9) return `${(vol / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mrd.`
  if (vol >= 1e6) return `${(vol / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mio.`
  if (vol >= 1e3) return `${(vol / 1e3).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tsd.`
  return vol.toLocaleString('de-DE')
}