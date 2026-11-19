// Server-Komponente: Fächerdiagramm einer Monte-Carlo-Projektion (P5–P95,
// P25–P75, Median) als reines SVG – kein Chart-Paket im Browser nötig.

import type { MonteCarloBand } from '@/lib/portfolioQuant'

const W = 640
const H = 260
const PAD = { left: 76, right: 16, top: 12, bottom: 30 }

function niceStep(max: number): number {
  const raw = max / 4
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

export default function MonteCarloFanChart({
  bands,
  startValue,
  currencySymbol = '$',
}: {
  bands: MonteCarloBand[]
  startValue: number
  currencySymbol?: string
}) {
  if (bands.length < 2) return null
  const maxMonth = bands[bands.length - 1].month
  const step = niceStep(Math.max(...bands.map(b => b.p95)))
  const yMax = Math.ceil(Math.max(...bands.map(b => b.p95)) / step) * step

  const x = (month: number) => PAD.left + (month / maxMonth) * (W - PAD.left - PAD.right)
  const y = (value: number) => PAD.top + (1 - value / yMax) * (H - PAD.top - PAD.bottom)

  const area = (lo: keyof MonteCarloBand, hi: keyof MonteCarloBand) =>
    [
      ...bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.month).toFixed(1)},${y(b[hi]).toFixed(1)}`),
      ...[...bands].reverse().map(b => `L${x(b.month).toFixed(1)},${y(b[lo]).toFixed(1)}`),
      'Z',
    ].join(' ')
  const median = bands.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.month).toFixed(1)},${y(b.p50).toFixed(1)}`).join(' ')

  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => i * step)
  const yearTicks = Array.from({ length: Math.floor(maxMonth / 24) + 1 }, (_, i) => i * 24)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Monte-Carlo-Projektion über 10 Jahre">
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="stroke-neutral-800" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-neutral-500 text-[13px]">
            {v.toLocaleString('de-DE')} {currencySymbol}
          </text>
        </g>
      ))}
      {yearTicks.map(m => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="fill-neutral-500 text-[13px]">
          {m === 0 ? 'heute' : `${m / 12} J.`}
        </text>
      ))}
      <path d={area('p5', 'p95')} className="fill-emerald-400/10" />
      <path d={area('p25', 'p75')} className="fill-emerald-400/25" />
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(startValue)}
        y2={y(startValue)}
        className="stroke-neutral-500"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <path d={median} className="stroke-emerald-400" strokeWidth={2} fill="none" />
    </svg>
  )
}
