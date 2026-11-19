// src/lib/displayFormat.ts
// Kleine Anzeige-Helfer für Marketing-, Investor- und Aktienseiten.

function currencySymbol(currency: string): string {
  try {
    return (
      new Intl.NumberFormat('de-DE', { style: 'currency', currency })
        .formatToParts(0)
        .find(p => p.type === 'currency')?.value ?? currency
    )
  } catch {
    return currency
  }
}

/** 5_121_000_000_000 → "5,12 Bio. $", 304_200_000_000 → "304,2 Mrd. $", 954_000_000 → "954 Mio. $" */
export function formatCompactAmount(value: number, currency = 'USD'): string {
  const symbol = currencySymbol(currency)
  const abs = Math.abs(value)
  if (abs >= 1e12) return `${(value / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio. ${symbol}`
  if (abs >= 1e9) return `${(value / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mrd. ${symbol}`
  if (abs >= 1e6) return `${Math.round(value / 1e6).toLocaleString('de-DE')} Mio. ${symbol}`
  return `${Math.round(value).toLocaleString('de-DE')} ${symbol}`
}

export function formatUsdCompact(value: number): string {
  return formatCompactAmount(value, 'USD')
}

/** 352.45, "USD" → "352,45 $" */
export function formatMoney(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value)
  } catch {
    return `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

/** 12.345 → "+12 %", -0.42 → "−0,4 %" (echtes Minuszeichen) */
export function formatSignedPercent(pct: number): string {
  const digits = Math.abs(pct) < 1 ? 1 : 0
  const abs = Math.abs(pct).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${pct >= 0 ? '+' : '−'}${abs} %`
}

/** "Amazon.com, Inc." → "Amazon.com", "The Coca-Cola Company" → "Coca-Cola" */
export function shortCompanyName(name: string): string {
  let short = name.replace(/\s*\(.*\)\s*$/, '').replace(/^The\s+/i, '')
  for (let i = 0; i < 3; i++) {
    short = short.replace(
      /,?\s+(Inc\.?|Corporation|Corp\.?|Company|Co\.|Holdings?|plc|N\.V\.|Ltd\.?|S\.A\.|AG|SE|KGaA|S\.p\.A\.|ASA|Oyj|A\/S)$/i,
      '',
    )
  }
  return short.trim()
}

/** "YYYY-MM-DD" → "DD.MM.YYYY" */
export function formatIsoDate(isoDate: string | null | undefined): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return null
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** ["A", "B", "C"] → "A, B und C" */
export function joinGerman(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`
}
