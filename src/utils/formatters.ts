// src/utils/formatters.ts
export const fmtP = (n?: number) =>
    typeof n === 'number' ? `${(n * 100).toFixed(2).replace('.', ',')} %` : '–'
  
  export const fmtDate = (d?: string | null) => d ?? '–'
  export const fmtPrice = (n?: number) =>
    typeof n === 'number'
      ? n.toLocaleString('de-DE', { style: 'currency', currency: 'USD' })
      : '–'