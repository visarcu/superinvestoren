'use client'

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
  const { text, status, schritte, payload } = exchange
  const running = status === 'laeuft'
  const { head, parts } = parse(text)
  const byId = new Map<string, AiBlock>(exchange.blocks.map(b => [b.id, b]))
  const done = schritte.filter(s => s.status !== 'laeuft').length
  const filled = status === 'fertig' ? 4 : running ? Math.min(3, done + (text ? 1 : 0)) : 0
  const check = payload?.pruefung

  // kein <article>: die globalen Regeln des hellen Designs färben dort Absätze um
  return (
    <section className="fai-sheet" aria-busy={running}>
      <div className="fai-q"><Mark size={12} filled={filled} /><span>{exchange.frage}</span></div>

      {running && !text && (
        <ul className="fai-work" aria-live="polite">
          {schritte.map(s => <li key={s.id} className={s.status}><i />{s.label}</li>)}
          {schritte.every(s => s.status !== 'laeuft') && <li className="laeuft"><i />{schritte.length === 0 ? 'Frage verstehen' : 'Antwort schreiben'}</li>}
        </ul>
      )}

      {text && (
        <div className="fai-a">
          {head && <p className="fai-head">{nbsp(head)}</p>}
          {parts.map((part, i) =>
            part.kind === 'block' ? (
              byId.has(part.id) ? <Block key={`${part.id}-${i}`} block={byId.get(part.id)!} /> : null
            ) : (
              <div className="fai-body" key={i}>
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
                  {nbsp(part.text)}
                </ReactMarkdown>
              </div>
            )
          )}
          {running && schritte.some(s => s.status === 'laeuft') && (
            <ul className="fai-work" style={{ padding: 0 }}>{schritte.filter(s => s.status === 'laeuft').map(s => <li key={s.id} className="laeuft"><i />{s.label}</li>)}</ul>
          )}
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
        </div>
      )}

      {status === 'fehler' && exchange.fehler && (
        <div className="fai-err">
          <span>{exchange.fehler.message}</span>
          {exchange.fehler.code === 'limit'
            ? <a href={upgradeHref} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Premium ansehen</a>
            : exchange.fehler.code !== '403' && exchange.fehler.code !== '503' && last && <button type="button" disabled={busy} onClick={() => onAsk(exchange.frage)} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Noch einmal versuchen</button>}
        </div>
      )}

      {status === 'fertig' && payload && ((check && check.gesamt > 0) || payload.quellen.length > 0) && (
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
      )}
    </section>
  )
}
