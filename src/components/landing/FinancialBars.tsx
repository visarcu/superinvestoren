// Server-Komponente: Umsatz und Nettogewinn über die Jahre als schlichte
// Balken (reines SVG, kein Chart-Paket im Browser). Echte Daten von FMP.

import type { FinancialYear } from '@/lib/publicStockData'

const W = 560
const H = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 8 }

function billions(value: number): string {
  const b = value / 1e9
  return `${b.toLocaleString('de-DE', { maximumFractionDigits: b >= 100 ? 0 : 1 })} Mrd. $`
}

export default function FinancialBars({ years, tone = 'dark' }: { years: FinancialYear[]; tone?: 'dark' | 'light' }) {
  if (years.length < 3) return null
  const max = Math.max(...years.map(y => y.revenue))
  const plotH = H - PAD.top - PAD.bottom
  const slot = (W - PAD.left - PAD.right) / years.length
  const barW = Math.min(30, slot * 0.62)
  const y = (v: number) => PAD.top + plotH - (Math.max(0, v) / max) * plotH

  const revenueFill = tone === 'dark' ? '#3A3D36' : '#CFD1C7'
  const incomeFill = tone === 'dark' ? '#ECEDE8' : '#111210'
  const label = tone === 'dark' ? '#9A9C94' : '#5A5C55'
  const first = years[0]
  const last = years[years.length - 1]

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Umsatz und Nettogewinn ${first.year} bis ${last.year}`}>
        {years.map((yr, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2
          return (
            <g key={yr.year}>
              <rect x={x} y={y(yr.revenue)} width={barW} height={PAD.top + plotH - y(yr.revenue)} rx={3} fill={revenueFill} />
              <rect
                x={x + barW * 0.22}
                y={y(yr.netIncome)}
                width={barW * 0.56}
                height={PAD.top + plotH - y(yr.netIncome)}
                rx={2}
                fill={incomeFill}
              />
              {(i === 0 || i === years.length - 1 || i % 3 === 0) && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fill={label} style={{ fontSize: 12 }}>
                  {yr.year}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: label }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: revenueFill }} />
          Umsatz {billions(first.revenue)} → {billions(last.revenue)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: incomeFill }} />
          Nettogewinn {billions(first.netIncome)} → {billions(last.netIncome)}
        </span>
      </figcaption>
    </figure>
  )
}
