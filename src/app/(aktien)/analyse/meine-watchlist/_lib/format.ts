// Formatierungs-Helpers für die Fey-Watchlist
import type { EarningsEvent } from './types'

export function fmtPrice(v?: number | null): string {
  if (v === null || v === undefined) return '–'
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtPct(v?: number | null, withSign = true): string {
  if (v === null || v === undefined) return '–'
  const sign = withSign && v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2).replace('.', ',')}%`
}

export function fmtVolume(v?: number | null): string {
  if (v === null || v === undefined) return '–'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace('.', ',')}K`
  return v.toLocaleString('de-DE')
}

export function fmtMarketCap(v?: number | null): string {
  if (v === null || v === undefined) return '–'
  if (v >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio.`
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio.`
  return v.toLocaleString('de-DE')
}

export function formatEarningsDate(event: EarningsEvent): string {
  const date = new Date(event.date)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const timeStr = event.time === 'bmo' ? '8:00' : event.time === 'amc' ? '17:00' : ''

  if (diffDays === 0) return timeStr ? `Heute · ${timeStr}` : 'Heute'
  if (diffDays === 1) return timeStr ? `Morgen · ${timeStr}` : 'Morgen'

  const dateFormatted = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  return timeStr ? `${dateFormatted} · ${timeStr}` : dateFormatted
}
