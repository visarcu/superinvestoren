// Gemeinsame Darstellung von Earnings-Ergebnissen (Beat/Miss/Gemischt) und
// Kursreaktion für die Kalender-Seiten /analyse/calendar und /analyse/kalendar.
// Die Werte kommen aus /api/v1/calendar/earnings.

import React from 'react'

export type EarningsOutcome = 'beat' | 'miss' | 'meet'
export type EarningsResultKind = EarningsOutcome | 'mixed'

export interface EarningsResultFields {
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
  result: EarningsResultKind | null
  epsResult?: EarningsOutcome | null
  revenueResult?: EarningsOutcome | null
  epsSurprisePct?: number | null
  revenueSurprisePct?: number | null
  reactionPct?: number | null
  typicalMovePct?: number | null
  typicalMoveCount?: number | null
  superinvestors?: SuperinvestorInfo | null
}

/** Spiegelt SuperinvestorSummary aus lib/stockSuperinvestors (Server) */
export interface SuperinvestorInfo {
  holders: number
  buying: number
  selling: number
  top: Array<{ slug: string; name: string; imageUrl: string | null; change: 'new' | 'increased' | 'reduced' | 'unchanged' }>
}

const SHORT: Record<EarningsResultKind, string> = { beat: 'B', miss: 'M', mixed: '±', meet: '=' }
const LABEL: Record<EarningsResultKind, string> = { beat: 'Beat', miss: 'Miss', mixed: 'Gemischt', meet: 'Inline' }

const COLORED: Partial<Record<EarningsResultKind, { badge: string; text: string }>> = {
  beat: { badge: 'bg-emerald-500/15 text-emerald-400', text: 'text-emerald-400' },
  miss: { badge: 'bg-red-500/15 text-red-400', text: 'text-red-400' },
  mixed: { badge: 'bg-amber-500/15 text-amber-400', text: 'text-amber-400' },
}

export function resultShort(r: EarningsResultKind): string {
  return SHORT[r]
}

export function resultLabel(r: EarningsResultKind): string {
  return LABEL[r]
}

/** Badge-Farben; `neutral` für "Inline" (je nach Seite Theme- oder Weiß-Klassen). */
export function resultBadgeClass(r: EarningsResultKind, neutral: string): string {
  return COLORED[r]?.badge ?? neutral
}

/** Textfarbe für den Ticker; ohne Ergebnis oder bei "Inline" gilt `neutral`. */
export function resultTextClass(r: EarningsResultKind | null, neutral: string): string {
  return (r && COLORED[r]?.text) || neutral
}

// ── Formatierung ────────────────────────────────────────────────────────────

function decimal(v: number, digits: number): string {
  return Math.abs(v).toFixed(digits).replace('.', ',')
}

/** Vorzeichen mit echtem Minuszeichen (U+2212) */
function sign(v: number): string {
  return v > 0 ? '+' : v < 0 ? '−' : ''
}

export function fmtEps(v: number): string {
  return `${v < 0 ? '−' : ''}${decimal(v, 2)} $`
}

export function fmtRevenue(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1e9) return `${(v / 1e9).toFixed(abs >= 1e11 ? 0 : 1).replace('.', ',')} Mrd $`
  if (abs >= 1e6) return `${(v / 1e6).toFixed(0)} Mio $`
  return `${Math.round(v).toLocaleString('de-DE')} $`
}

/** Prozentänderung, z.B. "+5,3 %" oder "−2,9 %" */
export function fmtSurprise(p: number): string {
  const rounded = Math.round(p * 10) / 10
  return `${sign(rounded)}${decimal(rounded, 1)} %`
}

/** Kompakt für enge Zellen: schmales geschütztes Leerzeichen vor % */
export function fmtMoveShort(p: number): string {
  const rounded = Math.round(p * 10) / 10
  return `${sign(rounded)}${decimal(rounded, 1)} %`
}

export function fmtTypicalMove(p: number): string {
  return `±${decimal(p, 1)} %`
}

export function moveTextClass(p: number, neutral: string): string {
  const rounded = Math.round(p * 10) / 10
  return rounded > 0 ? 'text-emerald-400' : rounded < 0 ? 'text-red-400' : neutral
}

function typicalTitle(e: EarningsResultFields): string | undefined {
  if (e.typicalMovePct == null) return undefined
  return `Durchschnittliche Kursbewegung am Tag nach den Zahlen (letzte ${e.typicalMoveCount ?? ''} Quartale, Betrag)`
}

/** Kurzfassung für title-Tooltips im Monats-/Wochenraster. */
export function resultTooltip(e: EarningsResultFields): string {
  const parts: string[] = []
  if (e.epsActual !== null) {
    let s = `EPS ${fmtEps(e.epsActual)}`
    if (e.epsEstimate !== null) s += ` (Prognose ${fmtEps(e.epsEstimate)})`
    parts.push(s)
  }
  if (e.revenueActual !== null) {
    let s = `Umsatz ${fmtRevenue(e.revenueActual)}`
    if (e.revenueEstimate !== null) s += ` (Prognose ${fmtRevenue(e.revenueEstimate)})`
    parts.push(s)
  }
  if (e.reactionPct != null) {
    let s = `Kurs ${fmtSurprise(e.reactionPct)}`
    if (e.typicalMovePct != null) s += ` (üblich ${fmtTypicalMove(e.typicalMovePct)})`
    parts.push(s)
  } else if (e.typicalMovePct != null) {
    parts.push(`Übliche Kursbewegung ${fmtTypicalMove(e.typicalMovePct)}`)
  }
  const si = superinvestorTooltip(e.superinvestors)
  if (si) parts.push(si)
  const head = e.result ? `${LABEL[e.result]}: ` : ''
  return head + parts.join(' · ')
}

// ── Superinvestoren ─────────────────────────────────────────────────────────

const CHANGE_MARK: Record<SuperinvestorInfo['top'][number]['change'], { text: string; className: string } | null> = {
  new: { text: 'neu', className: 'text-emerald-400' },
  increased: { text: '↑', className: 'text-emerald-400' },
  reduced: { text: '↓', className: 'text-red-400' },
  unchanged: null,
}

function superinvestorTooltip(si: SuperinvestorInfo | null | undefined): string | null {
  if (!si) return null
  const parts = [`${si.holders} Superinvestor${si.holders === 1 ? '' : 'en'}`]
  if (si.buying > 0) parts.push(`${si.buying} gekauft`)
  if (si.selling > 0) parts.push(`${si.selling} verkauft`)
  return parts.join(', ')
}

/**
 * "Ken Fisher ↑, Chase Coleman +21 · ↑15 ↓3" mit kleinen Porträts. Kauf/Verkauf
 * bezieht sich auf das letzte 13F-Quartal (gegenüber dem davor).
 */
export function SuperinvestorLine({ si, muted }: { si: SuperinvestorInfo | null | undefined; muted: string }) {
  if (!si || si.holders === 0) return null
  const shown = si.top.slice(0, 2)
  const rest = si.holders - shown.length
  // Platzhalterbild (neuer-investor.png) weglassen, es zeigt keine Person
  const avatars = si.top.filter(t => t.imageUrl && !t.imageUrl.includes('neuer-investor')).slice(0, 3)
  const title =
    `Im letzten 13F-Quartal: ${si.holders} Superinvestoren halten die Aktie` +
    (si.buying > 0 ? `, ${si.buying} neu eingestiegen oder aufgestockt` : '') +
    (si.selling > 0 ? `, ${si.selling} reduziert oder ausgestiegen` : '')

  return (
    <div className={`flex items-center gap-1.5 min-w-0 text-[10px] ${muted}`} title={title}>
      {avatars.length > 0 && (
        <span className="flex -space-x-1 flex-shrink-0">
          {avatars.map(a => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={a.slug} src={a.imageUrl!} alt="" className="w-3.5 h-3.5 rounded-full bg-white/10 object-cover ring-1 ring-black/40" />
          ))}
        </span>
      )}
      <span className="truncate">
        {shown.map((t, i) => {
          const mark = CHANGE_MARK[t.change]
          return (
            <React.Fragment key={t.slug}>
              {i > 0 && ', '}
              {t.name}
              {mark && <span className={`ml-0.5 ${mark.className}`}>{mark.text}</span>}
            </React.Fragment>
          )
        })}
        {rest > 0 && <span> +{rest}</span>}
        {(si.buying > 0 || si.selling > 0) && <span> · </span>}
        {si.buying > 0 && <span className="text-emerald-400">↑{si.buying}</span>}
        {si.buying > 0 && si.selling > 0 && ' '}
        {si.selling > 0 && <span className="text-red-400">↓{si.selling}</span>}
      </span>
    </div>
  )
}

// ── Wochenansicht: rechte Seite einer Zeile ─────────────────────────────────

/** Gibt es etwas für CompactResult anzuzeigen? */
export function hasCompactResult(e: EarningsResultFields): boolean {
  return !!e.result || e.reactionPct != null || e.typicalMovePct != null
}

/**
 * Nach dem Termin: Kursreaktion und Ergebnis-Badge. Davor: übliche
 * Kursbewegung, damit volatile Termine der Woche sofort auffallen.
 * Die Prozentwerte erst ab xl: in schmalen Spalten würden sie sonst den
 * Ticker verdrängen (der Tooltip der Zeile hat sie trotzdem).
 */
export function CompactResult({ event: e, neutralBadge, muted }: { event: EarningsResultFields; neutralBadge: string; muted: string }) {
  if (e.result || e.reactionPct != null) {
    return (
      <span className="ml-auto flex items-center gap-1 flex-shrink-0">
        {e.reactionPct != null && (
          <span className={`hidden xl:inline text-[9px] tabular-nums ${moveTextClass(e.reactionPct, muted)}`}>
            {fmtMoveShort(e.reactionPct)}
          </span>
        )}
        {e.result && (
          <span className={`text-[8.5px] font-bold px-1 rounded ${resultBadgeClass(e.result, neutralBadge)}`}>
            {SHORT[e.result]}
          </span>
        )}
      </span>
    )
  }
  if (e.typicalMovePct == null) return null
  return (
    <span className={`hidden xl:inline text-[9px] tabular-nums ml-auto flex-shrink-0 ${muted}`} title={typicalTitle(e)}>
      {fmtTypicalMove(e.typicalMovePct)}
    </span>
  )
}

// ── Zahlenblock für die Tagesansicht ────────────────────────────────────────

interface Tone {
  strong: string
  muted: string
}

function Surprise({ pct, outcome, muted }: { pct: number | null | undefined; outcome: EarningsOutcome | null | undefined; muted: string }) {
  if (pct === null || pct === undefined) return null
  const color = outcome === 'beat' ? 'text-emerald-400' : outcome === 'miss' ? 'text-red-400' : muted
  return <span className={`ml-1 ${color}`}>{fmtSurprise(pct)}</span>
}

function ReactionLine({ event: e, tone }: { event: EarningsResultFields; tone: Tone }) {
  const typical = e.typicalMovePct != null ? fmtTypicalMove(e.typicalMovePct) : null
  if (e.reactionPct != null) {
    return (
      <p className={`text-[11px] ${tone.strong}`} title={typicalTitle(e)}>
        Kurs <span className={moveTextClass(e.reactionPct, tone.muted)}>{fmtSurprise(e.reactionPct)}</span>
        {typical && <span className={tone.muted}> · üblich {typical}</span>}
      </p>
    )
  }
  if (!typical) return null
  return (
    <p className={`text-[10px] ${tone.muted}`} title={typicalTitle(e)}>
      Übliche Kursbewegung {typical}
    </p>
  )
}

/**
 * Rechte Spalte einer Earnings-Zeile: nach dem Termin Ist-Werte mit Abweichung
 * zur Prognose und Kursreaktion, davor Prognose und übliche Kursbewegung.
 */
export function EarningsFigures({ event: e, tone }: { event: EarningsResultFields; tone: Tone }) {
  const reported = e.epsActual !== null || e.revenueActual !== null

  if (reported) {
    const estimates = [
      e.epsActual !== null && e.epsEstimate !== null ? fmtEps(e.epsEstimate) : null,
      e.revenueActual !== null && e.revenueEstimate !== null ? fmtRevenue(e.revenueEstimate) : null,
    ].filter(Boolean)
    return (
      <div className="tabular-nums">
        {e.epsActual !== null && (
          <p className={`text-[12px] font-medium ${tone.strong}`}>
            EPS {fmtEps(e.epsActual)}
            <Surprise pct={e.epsSurprisePct} outcome={e.epsResult} muted={tone.muted} />
          </p>
        )}
        {e.revenueActual !== null && (
          <p className={`text-[11px] ${tone.strong}`}>
            Umsatz {fmtRevenue(e.revenueActual)}
            <Surprise pct={e.revenueSurprisePct} outcome={e.revenueResult} muted={tone.muted} />
          </p>
        )}
        <ReactionLine event={e} tone={tone} />
        {estimates.length > 0 && (
          <p className={`text-[10px] ${tone.muted}`}>Prognose {estimates.join(' · ')}</p>
        )}
      </div>
    )
  }

  if (e.epsEstimate === null && e.revenueEstimate === null && e.reactionPct == null && e.typicalMovePct == null) {
    return null
  }
  return (
    <div className={`tabular-nums text-[11px] ${tone.muted}`}>
      {e.epsEstimate !== null && <p>Prognose EPS {fmtEps(e.epsEstimate)}</p>}
      {e.revenueEstimate !== null && <p className="text-[10px]">Umsatz {fmtRevenue(e.revenueEstimate)}</p>}
      <ReactionLine event={e} tone={tone} />
    </div>
  )
}
