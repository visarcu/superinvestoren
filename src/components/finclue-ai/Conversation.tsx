'use client'

// Gesprächsverlauf mit Frageleiste, gemeinsam für Seite und seitliches Blatt.

import { useEffect, useRef } from 'react'
import type { AiContext } from '@/lib/ai/types'
import { leaveDepotHref } from '@/lib/siteHosts'
import AnswerSheet from './AnswerSheet'
import AskBar from './AskBar'
import type { FinclueAiState } from './useFinclueAi'

export default function Conversation({
  state, kontext = null, empty, placeholder, inputId, autoFocus = false,
}: {
  state: FinclueAiState
  kontext?: AiContext | null
  empty?: React.ReactNode
  placeholder?: string
  inputId: string
  autoFocus?: boolean
}) {
  const { exchanges, busy, quota, ask, stop, depot, toggleDepot, pending, resolvePending, askWithDepot } = state
  const thread = useRef<HTMLDivElement>(null)
  const lastRef = useRef<HTMLDivElement>(null)
  const count = exchanges.length

  // Neue Frage: ihr Blatt nach oben holen und dort stehen lassen, die Antwort wächst nach unten
  useEffect(() => {
    if (count === 0) return
    const box = thread.current
    const el = lastRef.current
    if (box && el) box.scrollTo({ top: el.offsetTop - box.offsetTop - 14, behavior: count > 1 ? 'smooth' : 'auto' })
  }, [count])

  const submit = (frage: string, gruendlich = false) => void ask(frage, { gruendlich, kontext })

  return (
    <>
      <div className="fai-thread" ref={thread}>
        <div className="fai-col">
          {count === 0 && empty}
          {exchanges.map((x, i) => (
            <div key={x.id} ref={i === count - 1 ? lastRef : undefined} className={count > 1 && i === count - 1 ? 'fai-last' : undefined}>
              <AnswerSheet exchange={x} onAsk={f => submit(f)} onDepot={() => void askWithDepot(x.frage, { kontext })} busy={busy} last={i === count - 1} upgradeHref={leaveDepotHref('/pricing')} />
            </div>
          ))}
        </div>
      </div>
      <div className="fai-dock">
        <div className="fai-col" style={{ gap: 0 }}>
          {pending && (
            <div className="fai-consent" role="group" aria-label="Depotzugriff">
              {pending.frage && <p className="frage">{pending.frage}</p>}
              <p><b>{pending.frage ? 'Dafür muss Finclue AI dein Depot lesen.' : 'Finclue AI dein Depot lesen lassen?'}</b> Was eine Antwort davon braucht (Depotnamen, Positionen, Buchungen, Werte, deine Notizen), verarbeitet Anthropic, auch in den USA. Dein Name und deine E-Mail gehen nicht mit. Du kannst es jederzeit ausschalten. <a href={leaveDepotHref('/privacy#ki')} target="_blank" rel="noopener">Datenschutz</a></p>
              <div>
                <button type="button" className="yes" onClick={() => resolvePending('an')}>{pending.frage ? 'Einschalten und fragen' : 'Depot einschalten'}</button>
                {pending.frage && <button type="button" onClick={() => resolvePending('ohne')}>Ohne Depot fragen</button>}
                <button type="button" onClick={() => resolvePending('zu')}>Abbrechen</button>
              </div>
            </div>
          )}
          <AskBar id={inputId} onAsk={submit} onStop={stop} busy={busy} quota={quota} depot={{ on: depot, toggle: () => void toggleDepot() }} placeholder={count > 0 ? 'Weiter fragen' : placeholder} autoFocus={autoFocus} />
          <p className="fai-note">Finclue AI ist eine KI und keine Anlageberatung. {depot ? 'Deine Fragen und nötige Depotdaten' : 'Deine Fragen'} verarbeitet Anthropic, auch in den USA. <a href={leaveDepotHref('/privacy#ki')} target="_blank" rel="noopener">Datenschutz</a></p>
        </div>
      </div>
    </>
  )
}
