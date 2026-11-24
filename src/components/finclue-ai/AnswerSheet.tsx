'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AiBlock } from '@/lib/ai/types'
import Block from './Blocks'
import Mark from './Mark'
import type { Exchange } from './useFinclueAi'

/** Kopfsatz, Absätze und Grafiken aus dem Antworttext lösen */
function parse(text: string): { head: string; parts: Array<{ kind: 'text'; text: string } | { kind: 'block'; id: string }> } {
  // angefangene Marken beim Schreiben noch nicht zeigen
  const visible = text
    .replace(/\[\[[^\]]*$/, '')
    .replace(/\[\[\s*(?:fragen:|depot-einschalten)[^\]]*\]\]/gi, '')
    .trimStart()
    .replace(/^((?:\[\[\s*g\d+\s*\]\]\s*)+)([^\n]+)(\n|$)/, '$2\n\n$1')
  const cut = visible.indexOf('\n')
  const head = (cut < 0 ? visible : visible.slice(0, cut)).replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/\[\[g\d+\]\]/g, '').trim()
  const rest = cut < 0 ? '' : visible.slice(cut + 1)
  const parts: Array<{ kind: 'text'; text: string } | { kind: 'block'; id: string }> = []
  for (const piece of rest.split(/(\[\[\s*g\d+\s*\]\])/)) {
    const id = piece.match(/^\[\[\s*(g\d+)\s*\]\]$/)?.[1]
    if (id) parts.push({ kind: 'block', id })
    else if (piece.trim()) parts.push({ kind: 'text', text: piece.trim() })
  }
  return { head, parts }
}

function nbsp(text: string): string {
  return text.replace(/(\d)[ ](%|€|\$|Mio\.|Mrd\.|Bio\.|Prozent)/g, '$1 $2')
}

// Ab dieser Breite liegt das Blatt zweispaltig: Text links, Grafiken und Belege rechts
const WIDE = 840
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect

function useWide(): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null)
  const [wide, setWide] = useState(false)
  useBeforePaint(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWide(el.clientWidth >= WIDE)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, wide]
}

/** Tabellen mit vielen Spalten brauchen die ganze Breite */
const needsFullWidth = (b: AiBlock) => b.type === 'tabelle' && b.spalten.length > 4
const hasWideTable = (text: string) => text.split('\n').some(l => l.trimStart().startsWith('|') && l.split('|').length > 6)

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.7 9 10 3.2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
)
const WarnIcon = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2.2v4.6M6 9v.6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
)

export default function AnswerSheet({
  exchange, onAsk, onDepot, busy, last, upgradeHref = '/pricing',
}: {
  exchange: Exchange
  onAsk: (frage: string) => void
  /** dieselbe Frage mit eingeschaltetem Depot stellen */
  onDepot?: () => void
  busy: boolean
  last: boolean
  upgradeHref?: string
}) {
  const [ref, wide] = useWide()
  const { text, status, schritte, payload } = exchange
  const running = status === 'laeuft'
  const { head, parts } = parse(text)
  const byId = new Map<string, AiBlock>(exchange.blocks.map(b => [b.id, b]))
  const done = schritte.filter(s => s.status !== 'laeuft').length
  const filled = status === 'fertig' ? 4 : running ? Math.min(3, done + (text ? 1 : 0)) : 0
  const check = payload?.pruefung

  const textPart = (part: string, key: number) => (
    <div className="fai-body" key={key}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>,
          img: () => null,
          h1: ({ children }) => <p><strong>{children}</strong></p>,
          h2: ({ children }) => <p><strong>{children}</strong></p>,
          h3: ({ children }) => <p><strong>{children}</strong></p>,
          table: ({ children }) => <div className="fai-scroll"><table>{children}</table></div>,
        }}
      >
        {nbsp(part)}
      </ReactMarkdown>
    </div>
  )
  const work = running && schritte.some(s => s.status === 'laeuft') && (
    <ul className="fai-work" style={{ padding: 0 }}>{schritte.filter(s => s.status === 'laeuft').map(s => <li key={s.id} className="laeuft"><i />{s.label}</li>)}</ul>
  )
  const follow = (
    <>
      {last && status === 'fertig' && payload?.depotNoetig && onDepot && (
        <div className="fai-follow">
          <button type="button" disabled={busy} onClick={onDepot}><span>Depot einschalten und noch einmal fragen</span><span aria-hidden="true">→</span></button>
        </div>
      )}
      {last && status === 'fertig' && payload && payload.fragen.length > 0 && (
        <div className="fai-follow">
          {payload.fragen.map(f => <button key={f} type="button" disabled={busy} onClick={() => onAsk(f)}><span>{f}</span><span aria-hidden="true">→</span></button>)}
        </div>
      )}
    </>
  )
  const evidence = status === 'fertig' && payload && ((check && check.gesamt > 0) || payload.quellen.length > 0) && (
    <div className="fai-foot">
      {check && check.gesamt > 0 && (
        check.offen.length === 0
          ? <div className="fai-check"><CheckIcon />{check.gesamt === 1 ? 'Die Zahl ist belegt' : check.gesamt === 2 ? 'Beide Zahlen belegt' : `Alle ${check.gesamt} Zahlen belegt`}</div>
          : <div className="fai-check warn"><WarnIcon />Nicht belegt: {check.offen.join(', ')}</div>
      )}
      {payload.quellen.length > 0 && (
        <div className="fai-srcs">
          {payload.quellen.map((q, i) => {
            const label = q.stand ? `${q.label}, ${q.stand}` : q.label
            return q.url && /^https?:\/\//.test(q.url) ? <a key={i} href={q.url} target="_blank" rel="noopener noreferrer nofollow">{label}</a> : <span key={i}>{label}</span>
          })}
        </div>
      )}
    </div>
  )

  const shown = parts.flatMap(p => (p.kind === 'block' && byId.has(p.id) ? [byId.get(p.id)!] : []))
  const side = shown.filter(b => !needsFullWidth(b))
  // Grafiken liegen vor, bevor der Text auf sie verweist: so springt das Blatt beim Schreiben nicht um
  const figures = running ? exchange.blocks.some(b => !needsFullWidth(b)) : side.length > 0
  const layout = !figures ? 'solo' : parts.some(p => p.kind === 'text' && hasWideTable(p.text)) ? 'tabelle' : side.length === 1 ? 'eine' : ''

  // kein <article>: die globalen Regeln des hellen Designs färben dort Absätze um
  return (
    <section ref={ref} className={`fai-sheet ${wide ? 'wide' : ''}`} aria-busy={running}>
      <div className="fai-q"><Mark size={12} filled={filled} /><span>{exchange.frage}</span></div>

      {running && !text && (
        <ul className="fai-work" aria-live="polite">
          {schritte.map(s => <li key={s.id} className={s.status}><i />{s.label}</li>)}
          {schritte.every(s => s.status !== 'laeuft') && <li className="laeuft"><i />{schritte.length === 0 ? 'Frage verstehen' : 'Antwort schreiben'}</li>}
        </ul>
      )}

      {text && !wide && (
        <div className="fai-a">
          {head && <p className="fai-head">{nbsp(head)}</p>}
          {parts.map((part, i) =>
            part.kind === 'block' ? (
              byId.has(part.id) ? <Block key={`${part.id}-${i}`} block={byId.get(part.id)!} /> : null
            ) : textPart(part.text, i)
          )}
          {work}
          {follow}
        </div>
      )}

      {text && wide && (
        <>
          {head && <p className="fai-head">{nbsp(head)}</p>}
          <div className={`fai-split ${layout}`}>
            <div className="fai-text">
              {parts.map((part, i) => (part.kind === 'text' ? textPart(part.text, i) : null))}
              {work}
              {figures && follow}
            </div>
            <div className="fai-side">
              {side.map((b, i) => <Block key={`${b.id}-${i}`} block={b} flach={side.length > 1} />)}
              {!figures && follow}
              {evidence}
            </div>
          </div>
          {shown.filter(needsFullWidth).map((b, i) => <div className="fai-full" key={`${b.id}-${i}`}><Block block={b} /></div>)}
        </>
      )}

      {status === 'fehler' && exchange.fehler && (
        <div className="fai-err">
          <span>{exchange.fehler.message}</span>
          {exchange.fehler.code === 'limit'
            ? <a href={upgradeHref} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Premium ansehen</a>
            : exchange.fehler.code !== '403' && exchange.fehler.code !== '503' && last && <button type="button" disabled={busy} onClick={() => onAsk(exchange.frage)} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Noch einmal versuchen</button>}
        </div>
      )}

      {!(text && wide) && evidence}
    </section>
  )
}
