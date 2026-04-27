// Formatierungs-Helpers für die Aktien-Detail-Seite (Fey-Style)
import type React from 'react'

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio. $`
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd. $`
  if (a >= 1e6) return `${(v / 1e6).toFixed(0)} Mio. $`
  return `${v.toLocaleString('de-DE')} $`
}

/**
 * Kompakte Variante für Tabellen — ohne $-Suffix (wird im Tabellenkopf gezeigt).
 * Bei Zahlen <1Mio fällt auf Roh-Wert mit Tausenderpunkten zurück.
 */
export function fmtCompact(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio.`
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (a >= 1e6) return `${(v / 1e6).toFixed(0)} Mio.`
  return v.toLocaleString('de-DE')
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`
}

export function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Tooltip-Style für Recharts (alle Charts auf der Seite)
export const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}
