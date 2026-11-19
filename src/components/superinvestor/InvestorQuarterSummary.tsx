// Server Component: Quartals-Zusammenfassung oben auf der Investor-Seite.
// Steht im HTML (SEO) und gibt Besuchern in zwei Sätzen den Einstieg.

import Link from 'next/link'
import { formatIsoDate, formatUsdCompact } from '@/lib/displayFormat'
import { describeChanges, type InvestorQuarterSummaryData, type QuarterMove } from '@/lib/investorQuarterSummary'

function moveLabel(m: QuarterMove): string {
  if (m.kind === 'new') return 'Neu'
  if (m.kind === 'sold') return 'Verkauft'
  const pct = Math.round(m.pctChange ?? 0)
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('de-DE')} %`
}

function MoveColumn({ title, moves, tone }: { title: string; moves: QuarterMove[]; tone: 'buy' | 'sell' }) {
  if (moves.length === 0) return null
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-theme-muted mb-2">{title}</h3>
      <ul className="divide-y divide-theme">
        {moves.map(m => {
          const label = (
            <span className="min-w-0">
              <span className="text-sm text-theme-primary">{m.name}</span>
              {m.ticker && <span className="ml-2 text-xs text-theme-muted">{m.ticker}</span>}
            </span>
          )
          return (
            <li key={m.cusip} className="flex items-center justify-between gap-4 py-2">
              {m.ticker ? (
                <Link href={`/aktie/${m.ticker.toLowerCase()}`} className="truncate hover:underline underline-offset-4">
                  {label}
                </Link>
              ) : (
                <span className="truncate">{label}</span>
              )}
              <span className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                <span className="text-theme-muted">≈ {formatUsdCompact(m.deltaValue)}</span>
                <span className={tone === 'buy' ? 'text-emerald-400' : 'text-red-400'}>{moveLabel(m)}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function InvestorQuarterSummary({ name, summary: s }: { name: string; summary: InvestorQuarterSummaryData }) {
  const top3Names = s.top3.map(t => t.name)
  const filingDate = formatIsoDate(s.filingDate)
  const top3Share = (s.top3Share * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })

  return (
    <section
      aria-labelledby="quartal-ueberblick"
      className="mt-4 bg-theme-card border border-theme-light rounded-xl p-6 lg:p-8"
    >
      <h2 id="quartal-ueberblick" className="text-sm font-semibold text-theme-primary">
        {s.periodLabel} im Überblick
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-theme-secondary">
        {describeChanges(name, s)} Das Portfolio umfasst {s.positionCount.toLocaleString('de-DE')} Positionen im Wert
        von {formatUsdCompact(s.totalValue)}
        {s.positionCount >= 3
          ? `; die drei größten – ${top3Names.slice(0, 2).join(', ')} und ${top3Names[2]} – machen ${top3Share} % aus.`
          : '.'}
      </p>

      {(s.topBuys.length > 0 || s.topSells.length > 0) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <MoveColumn title="Größte Käufe" moves={s.topBuys} tone="buy" />
          <MoveColumn title="Größte Verkäufe" moves={s.topSells} tone="sell" />
        </div>
      )}

      {filingDate && (
        <p className="mt-6 text-xs text-theme-muted">
          Quelle: 13F-Filing bei der SEC vom {filingDate}
          {s.filingUrl && (
            <>
              {' · '}
              <a href={s.filingUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-theme-primary">
                Original ansehen
              </a>
            </>
          )}
        </p>
      )}
    </section>
  )
}
