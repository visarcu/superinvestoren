// src/lib/displayFormat.ts
// Kleine Anzeige-Helfer für Marketing- und Investor-Seiten.

/** 304_200_000_000 → "304,2 Mrd. $", 954_000_000 → "954 Mio. $" */
export function formatUsdCompact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd. $`
  return `${Math.round(value / 1e6).toLocaleString('de-DE')} Mio. $`
}

/** "Amazon.com, Inc." → "Amazon.com", "The Coca-Cola Company" → "Coca-Cola" */
export function shortCompanyName(name: string): string {
  let short = name.replace(/\s*\(.*\)\s*$/, '').replace(/^The\s+/i, '')
  for (let i = 0; i < 3; i++) {
    short = short.replace(/,?\s+(Inc\.?|Corporation|Corp\.?|Company|Co\.|Holdings?|plc|N\.V\.|Ltd\.?|S\.A\.)$/i, '')
  }
  return short.trim()
}

/** "YYYY-MM-DD" → "DD.MM.YYYY" */
export function formatIsoDate(isoDate: string | null | undefined): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return null
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}
