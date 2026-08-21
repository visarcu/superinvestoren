// OG-Share-Image für den Smart-Money-Chart (1200×630).
// Edge-Runtime (Pflicht für ImageResponse in Next 13) — darf deshalb keine
// schweren Daten importieren und holt sich alles per Self-Fetch von den APIs.
import { ImageResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

const W = 1200
const H = 630
const CHART_W = 1104 // W - 2*48 padding
const CHART_H = 360

interface OgCluster {
  quarter: string
  buys: number
  sells: number
  startFrac: number
  endFrac: number
  color: string
}

function clusterColor(buys: number, sells: number): string {
  if (buys >= sells * 1.5 && buys > sells) return '#10b981'
  if (sells >= buys * 1.5 && sells > buys) return '#ef4444'
  return '#f59e0b'
}

function formatQuarterDE(q: string): string {
  const m = q.match(/^(\d{4})-Q([1-4])$/)
  return m ? `Q${m[2]} ${m[1]}` : q
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase()
  if (!/^[A-Z0-9.\-]{1,12}$/.test(ticker)) {
    return new Response('Invalid ticker', { status: 400 })
  }

  const origin = new URL(req.url).origin

  // Kursdaten + Smart-Money-Events parallel von den eigenen APIs
  const [histRes, smRes, quoteRes] = await Promise.allSettled([
    fetch(`${origin}/api/historical/${ticker}`),
    fetch(`${origin}/api/stocks/${ticker}/smart-money`),
    fetch(`${origin}/api/quote/${ticker}`),
  ])

  let history: { date: string; close: number }[] = []
  if (histRes.status === 'fulfilled' && histRes.value.ok) {
    const d = await histRes.value.json()
    history = (d.historical || [])
      .slice()
      .reverse()
      .map((h: any) => ({ date: h.date, close: h.close }))
  }

  let events: any[] = []
  if (smRes.status === 'fulfilled' && smRes.value.ok) {
    const d = await smRes.value.json()
    events = Array.isArray(d.events) ? d.events : []
  }

  let companyName = ticker
  if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
    const d = await quoteRes.value.json()
    if (Array.isArray(d) && d[0]?.name) companyName = d[0].name
  }

  // Letztes Jahr, auf ~140 Punkte gesampelt
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  let points = history.filter(h => new Date(h.date) >= cutoff)
  if (points.length > 140) {
    const step = points.length / 140
    points = Array.from({ length: 140 }, (_, i) => points[Math.floor(i * step)])
  }

  const closes = points.map(p => p.close)
  const lo = Math.min(...closes)
  const hi = Math.max(...closes)
  const range = hi - lo || 1

  const toX = (i: number) => (i / Math.max(points.length - 1, 1)) * CHART_W
  const toY = (c: number) => CHART_H - ((c - lo) / range) * (CHART_H - 40) - 20

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.close).toFixed(1)}`)
    .join(' ')
  const areaPath = points.length
    ? `${linePath} L${CHART_W},${CHART_H} L0,${CHART_H} Z`
    : ''

  const lastClose = closes[closes.length - 1] ?? 0
  const firstClose = closes[0] ?? 0
  const perf = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0
  const perfColor = perf >= 0 ? '#10b981' : '#ef4444'

  // Quartals-Cluster auf den sichtbaren Zeitraum mappen
  const firstTime = points.length ? new Date(points[0].date).getTime() : 0
  const lastTime = points.length ? new Date(points[points.length - 1].date).getTime() : 1
  const span = Math.max(lastTime - firstTime, 1)

  const byQuarter = new Map<string, { buys: number; sells: number; start: string; end: string }>()
  for (const ev of events) {
    const q = byQuarter.get(ev.reportQuarter) || { buys: 0, sells: 0, start: ev.quarterStart, end: ev.quarterEnd }
    if (ev.action === 'new' || ev.action === 'add') q.buys++
    else q.sells++
    byQuarter.set(ev.reportQuarter, q)
  }

  const clusters: OgCluster[] = []
  byQuarter.forEach((q, quarter) => {
    const s = new Date(q.start).getTime()
    const e = new Date(q.end).getTime()
    if (e < firstTime || s > lastTime) return
    clusters.push({
      quarter,
      buys: q.buys,
      sells: q.sells,
      startFrac: Math.max((s - firstTime) / span, 0),
      endFrac: Math.min((e - firstTime) / span, 1),
      color: clusterColor(q.buys, q.sells),
    })
  })
  clusters.sort((a, b) => a.startFrac - b.startFrac)

  const priceLabel = lastClose >= 1000
    ? lastClose.toLocaleString('de-DE', { maximumFractionDigits: 0 })
    : lastClose.toLocaleString('de-DE', { maximumFractionDigits: 2 })

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#09090b',
          padding: 48,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: '#ffffff' }}>Finclue</div>
            <div style={{ display: 'flex', fontSize: 20, color: '#10b981', marginTop: 4 }}>Smart Money · Superinvestoren im Chart</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', fontSize: 26, color: '#a1a1aa' }}>
              {ticker} · {companyName.slice(0, 34)}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#ffffff' }}>{priceLabel} $</div>
              <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: perfColor }}>
                {perf >= 0 ? '+' : ''}{perf.toLocaleString('de-DE', { maximumFractionDigits: 1 })}% (1J)
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ display: 'flex', position: 'relative', marginTop: 28, width: CHART_W, height: CHART_H }}>
          {/* Quartals-Bänder */}
          {clusters.map(c => (
            <div
              key={c.quarter}
              style={{
                display: 'flex',
                position: 'absolute',
                left: c.startFrac * CHART_W,
                top: 0,
                width: Math.max((c.endFrac - c.startFrac) * CHART_W, 2),
                height: CHART_H,
                backgroundColor: c.color,
                opacity: c.color === '#f59e0b' ? 0.06 : 0.13,
              }}
            />
          ))}

          {/* Kurslinie */}
          {points.length > 1 && (
            <svg width={CHART_W} height={CHART_H} style={{ position: 'absolute', left: 0, top: 0 }}>
              <path d={areaPath} fill={perfColor} opacity={0.12} />
              <path d={linePath} stroke={perfColor} strokeWidth={4} fill="none" />
            </svg>
          )}

          {/* Zähler-Badges */}
          {clusters.map(c => (
            <div
              key={`b-${c.quarter}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: ((c.startFrac + c.endFrac) / 2) * CHART_W - 60,
                top: 8,
                width: 120,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  backgroundColor: c.color,
                  color: '#ffffff',
                  fontSize: 20,
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: 999,
                }}
              >
                {`+${c.buys} / -${c.sells}`}
              </div>
              <div style={{ display: 'flex', fontSize: 16, color: '#71717a', marginTop: 6 }}>
                {formatQuarterDE(c.quarter)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 26, alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 19, color: '#71717a' }}>
            Käufe/Verkäufe von 110+ Superinvestoren pro Quartal (13F, SEC)
          </div>
          <div style={{ display: 'flex', fontSize: 22, fontWeight: 600, color: '#10b981' }}>finclue.de</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  )
}
