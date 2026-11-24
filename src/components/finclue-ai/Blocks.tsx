'use client'

// Grafiken der Finclue AI. Alle Werte kommen unverändert aus den Werkzeugen.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiBlock } from '@/lib/ai/types'

const SERIES = ['var(--fai-ink)', 'var(--fai-s2)', 'var(--fai-s3)', 'var(--fai-s4)']

function fmt(value: number, digits: number, unit: string): string {
  const n = value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return unit ? `${n} ${unit}` : n
}

function useWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(Math.round(el.clientWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!(max > min)) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw) ?? raw
  const ticks: number[] = []
  for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-6; t += step) ticks.push(Math.abs(t) < step * 1e-6 ? 0 : t)
  return ticks
}

function axisLabel(v: number): string {
  const abs = Math.abs(v)
  return v.toLocaleString('de-DE', { maximumFractionDigits: abs < 1 && abs > 0 ? 2 : abs < 10 ? 1 : 0 })
}

function shortName(name: string): string {
  const short = name.replace(/\s*\(.*\)$/, '')
  return short.length > 11 ? `${short.slice(0, 10)}.` : short
}

function dateLabel(iso: string, long: boolean): string {
  const [y, m, d] = iso.split('-')
  return long ? `${d}.${m}.${y}` : `${d}.${m}.`
}

function Line({ block, flach }: { block: Extract<AiBlock, { type: 'linie' }>; flach?: boolean }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const digits = block.nachkommastellen ?? 1
  const height = flach ? 176 : 220

  const model = useMemo(() => {
    const series = block.serien.filter(s => s.punkte.length > 1)
    if (series.length === 0) return null
    const base = series.reduce((a, b) => (b.punkte.length > a.punkte.length ? b : a))
    const xs = base.punkte.map(p => p[0])
    const all = series.flatMap(s => s.punkte.map(p => p[1])).concat(block.referenz ? [block.referenz.wert] : [])
    let min = Math.min(...all)
    let max = Math.max(...all)
    if (!block.ohneNull && min > 0) min = 0
    const pad = (max - min) * 0.06 || 1
    max += pad
    if (min !== 0) min -= pad
    return { series, xs, index: new Map(xs.map((x, i) => [x, i])), min, max }
  }, [block])
  if (!model) return null

  const { series, xs, index, min, max } = model
  const left = 34
  const right = series.length > 1 ? 74 : block.referenz ? 60 : 14
  const top = 10
  const bottom = 22
  const w = Math.max(width, 240)
  const x = (i: number) => left + (i / Math.max(1, xs.length - 1)) * (w - left - right)
  const y = (v: number) => height - bottom - ((v - min) / (max - min)) * (height - top - bottom)

  const spanYears = block.uhrzeit ? 0 : (Date.parse(xs[xs.length - 1]) - Date.parse(xs[0])) / 31_557_600_000
  const wanted = Math.max(2, Math.floor((w - left - right) / 74))
  const xTicks: Array<{ i: number; text: string }> = []
  if (!block.uhrzeit && spanYears > 2.2) {
    const step = Math.max(1, Math.ceil(spanYears / wanted))
    let last = ''
    xs.forEach((d, i) => {
      const year = d.slice(0, 4)
      if (year !== last && i > 0 && Number(year) % step === 0) xTicks.push({ i, text: year })
      last = year
    })
  } else {
    const n = Math.min(wanted, 5)
    for (let k = 0; k <= n; k++) {
      const i = Math.round((k / n) * (xs.length - 1))
      xTicks.push({ i, text: block.uhrzeit ? xs[i] : spanYears > 0.9 ? `${xs[i].slice(5, 7)}/${xs[i].slice(2, 4)}` : dateLabel(xs[i], false) })
    }
  }

  // Beschriftung am Linienende, bei Überschneidung auseinanderrücken
  const ends = series
    .map((s, k) => ({ k, name: s.name, value: s.punkte[s.punkte.length - 1][1], py: y(s.punkte[s.punkte.length - 1][1]) }))
    .sort((a, b) => a.py - b.py)
  for (let k = 1; k < ends.length; k++) if (ends[k].py - ends[k - 1].py < 13) ends[k].py = ends[k - 1].py + 13

  const move = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const i = Math.round(((clientX - box.left - left) / (w - left - right)) * (xs.length - 1))
    setHover(i >= 0 && i < xs.length ? i : null)
  }
  const tipX = hover == null ? 0 : Math.min(Math.max(x(hover), 70), w - 70)

  return (
    <div
      className="fai-chart" ref={ref} style={{ height }}
      onPointerMove={e => move(e.clientX)} onPointerLeave={() => setHover(null)}
    >
      {width > 0 && (
        <svg viewBox={`0 0 ${w} ${height}`} height={height} role="img" aria-label={block.titel}>
          {niceTicks(min, max).map(t => (
            <g key={t}>
              <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke="var(--fai-line)" />
              <text x={left - 6} y={y(t) + 3} textAnchor="end">{axisLabel(t)}</text>
            </g>
          ))}
          {xTicks.map(t => <text key={`${t.i}-${t.text}`} x={x(t.i)} y={height - 6} textAnchor="middle">{t.text}</text>)}
          {block.referenz && (
            <>
              <line x1={left} x2={w - right} y1={y(block.referenz.wert)} y2={y(block.referenz.wert)} stroke="var(--fai-pos)" strokeWidth="1.3" strokeDasharray="4 4" />
              {series.length === 1 && <text className="strong" x={w - right + 7} y={y(block.referenz.wert) + 3}>{`${block.referenz.label} ${fmt(block.referenz.wert, digits, '')}`}</text>}
            </>
          )}
          {series.map((s, k) => {
            const path = s.punkte.map((p, i) => {
              const xi = index.get(p[0]) ?? (i / Math.max(1, s.punkte.length - 1)) * (xs.length - 1)
              return `${i ? 'L' : 'M'}${x(xi).toFixed(1)} ${y(p[1]).toFixed(1)}`
            }).join('')
            return (
              <g key={s.name}>
                {series.length === 1 && !block.ohneNull && min === 0 && <path d={`${path}L${x(xs.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z`} fill={SERIES[0]} opacity="0.07" />}
                <path d={path} fill="none" stroke={SERIES[k % SERIES.length]} strokeWidth={k === 0 ? 1.8 : 1.5} strokeLinejoin="round" />
              </g>
            )
          })}
          {series.length > 1 && ends.map(e => (
            <text key={e.name} x={w - right + 7} y={e.py + 3} style={{ fill: SERIES[e.k % SERIES.length] }}>
              {shortName(e.name)}
            </text>
          ))}
          {hover != null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={top} y2={height - bottom} stroke="var(--fai-mute)" strokeWidth="1" />
              {series.map((s, k) => {
                const p = s.punkte.find(q => q[0] === xs[hover])
                return p ? <circle key={s.name} cx={x(hover)} cy={y(p[1])} r="3" fill={SERIES[k % SERIES.length]} /> : null
              })}
            </>
          )}
        </svg>
      )}
      {hover != null && (
        <div className="fai-tip" style={{ left: tipX }}>
          {block.uhrzeit ? `${xs[hover]} Uhr` : dateLabel(xs[hover], true)}
          {series.map(s => {
            const p = s.punkte.find(q => q[0] === xs[hover])
            return p ? <div key={s.name}>{series.length > 1 ? `${s.name}: ` : ''}{fmt(p[1], digits, block.einheit)}</div> : null
          })}
        </div>
      )}
    </div>
  )
}

function Columns({ block, flach }: { block: Extract<AiBlock, { type: 'saeulen' }>; flach?: boolean }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const digits = block.nachkommastellen ?? 1
  const height = flach ? 168 : 210
  const values = block.serien.flatMap(s => s.werte).filter((v): v is number => v != null)
  if (values.length === 0) return null
  let min = Math.min(0, ...values)
  let max = Math.max(0, ...values)
  const pad = (max - min) * 0.06 || 1
  if (max > 0) max += pad
  if (min < 0) min -= pad
  const left = 36
  const right = 4
  const top = 8
  const bottom = 22
  const w = Math.max(width, 240)
  const slot = (w - left - right) / block.kategorien.length
  const y = (v: number) => height - bottom - ((v - min) / (max - min)) * (height - top - bottom)
  const bar = Math.min(26, (slot * 0.68) / block.serien.length)
  const every = Math.max(1, Math.ceil(46 / slot))
  const tipX = hover == null ? 0 : Math.min(Math.max(left + slot * (hover + 0.5), 80), w - 80)
  return (
    <div className="fai-chart" ref={ref} style={{ height }} onPointerLeave={() => setHover(null)}>
      {width > 0 && (
        <svg viewBox={`0 0 ${w} ${height}`} height={height} role="img" aria-label={block.titel}>
          {niceTicks(min, max).map(t => (
            <g key={t}>
              <line x1={left} x2={w - right} y1={y(t)} y2={y(t)} stroke="var(--fai-line)" />
              <text x={left - 6} y={y(t) + 3} textAnchor="end">{axisLabel(t)}</text>
            </g>
          ))}
          {block.kategorien.map((c, i) => {
            const center = left + slot * (i + 0.5)
            const start = center - (bar * block.serien.length) / 2
            return (
              <g key={`${c}-${i}`} onPointerEnter={() => setHover(i)}>
                <rect x={left + slot * i} y={top} width={slot} height={height - top - bottom} fill="var(--fai-ink)" opacity={hover === i ? 0.05 : 0} />
                {block.serien.map((s, k) => {
                  const v = s.werte[i]
                  if (v == null) return null
                  const y0 = y(Math.max(0, v))
                  return <rect key={s.name} x={start + bar * k + 1} y={y0} width={Math.max(1, bar - 2)} height={Math.max(1, Math.abs(y(v) - y(0)))} rx="1.5" fill={SERIES[k % SERIES.length]} opacity={k === 0 ? 0.92 : 1} />
                })}
                {(block.kategorien.length - 1 - i) % every === 0 && <text x={center} y={height - 6} textAnchor="middle">{c.replace(/^(Q\d) (\d\d)(\d\d)$/, '$1/$3')}</text>}
              </g>
            )
          })}
        </svg>
      )}
      {hover != null && (
        <div className="fai-tip" style={{ left: tipX }}>
          {block.kategorien[hover]}
          {block.serien.map(s => (s.werte[hover] == null ? null : <div key={s.name}>{block.serien.length > 1 ? `${s.name}: ` : ''}{fmt(s.werte[hover]!, digits, block.einheit)}</div>))}
        </div>
      )}
    </div>
  )
}

function Bars({ block }: { block: Extract<AiBlock, { type: 'balken' }> }) {
  const digits = block.nachkommastellen ?? 1
  const min = Math.min(0, ...block.werte.map(v => v.wert))
  const max = Math.max(0, ...block.werte.map(v => v.wert))
  const span = max - min || 1
  const signed = min < 0 || /heute|Vergleich am/.test(block.titel)
  return (
    <div className="fai-hbars">
      {block.werte.map(v => (
        <div key={v.name} className={v.hervor ? 'hervor' : ''}>
          <span className="name" title={v.name}>{v.name}</span>
          <span className="track"><i style={{ left: `${((Math.min(0, v.wert) - min) / span) * 100}%`, width: `${Math.max(0.6, (Math.abs(v.wert) / span) * 100)}%` }} /></span>
          <em>{signed && v.wert > 0 ? '+' : ''}{fmt(v.wert, digits, block.einheit)}</em>
        </div>
      ))}
    </div>
  )
}

/** flach: niedriger, wenn mehrere Grafiken untereinander stehen */
export default function Block({ block, flach }: { block: AiBlock; flach?: boolean }) {
  const legend = block.type === 'saeulen' && block.serien.length > 1 ? block.serien.map((s, i) => ({ name: s.name, color: SERIES[i % SERIES.length] })) : []
  const unit = block.type === 'saeulen' && block.einheit ? ` (${block.einheit})` : ''
  return (
    <figure className="fai-fig">
      <figcaption>
        <span>{block.titel}{unit}</span>
        {legend.map(l => <span key={l.name}><i style={{ background: l.color }} />{l.name}</span>)}
      </figcaption>
      {block.type === 'linie' && <Line block={block} flach={flach} />}
      {block.type === 'saeulen' && <Columns block={block} flach={flach} />}
      {block.type === 'balken' && <Bars block={block} />}
      {block.type === 'zeitleiste' && (
        <ul className="fai-time">
          {block.eintraege.map((e, i) => <li key={i}><time>{e.zeit}</time><span>{e.text} {e.quelle}</span></li>)}
        </ul>
      )}
      {block.type === 'tabelle' && (
        <div className="fai-scroll">
          <table>
            <thead><tr>{block.spalten.map((s, i) => <th key={i}>{s}</th>)}</tr></thead>
            <tbody>{block.zeilen.map((z, i) => <tr key={i}>{z.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
