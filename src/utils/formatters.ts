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

// Format volume (K, M, B) with German locale
export const fmtVolume = (vol?: number | null) => {
  if (vol == null) return '–'
  if (vol >= 1e9) return `${(vol / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mrd.`
  if (vol >= 1e6) return `${(vol / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Mio.`
  if (vol >= 1e3) return `${(vol / 1e3).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Tsd.`
  return vol.toLocaleString('de-DE')
}