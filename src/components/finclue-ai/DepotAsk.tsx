'use client'

// Finclue AI im Depot: Frageleiste in der Übersicht (Antwort im seitlichen Blatt)
// und die Ansicht „Finclue AI“ mit dem ganzen Gespräch.

import { useEffect, useMemo, useState } from 'react'
import { landingFontVars } from '@/components/landing/landingFonts'
import type { AiContext } from '@/lib/ai/types'
import Conversation from './Conversation'
import FinclueAiPanel, { type PanelRequest } from './FinclueAiPanel'
import Mark from './Mark'
import { aiFetch, useFinclueAi } from './useFinclueAi'

const SUGGESTIONS = ['Wie groß ist mein KI-Anteil?', 'Schlage ich den Markt?', 'Wie viel investiere ich im Monat in ETFs und Aktien?', 'Wie viel Nvidia habe ich mit ETFs?']
const VIEW_SUGGESTIONS = [
  'Wie steht mein Depot?', 'Wie groß ist mein KI-Anteil?', 'Schlage ich den Markt?',
  'Wie viel habe ich in den letzten Monaten im Schnitt in ETFs und in Aktien investiert?', 'Was wäre in einer Krise wie 2008 passiert?', 'Welche Superinvestoren halten ähnliche Aktien?',
]

/** Darf der Nutzer die neue KI schon nutzen (Beta)? null = noch nicht bekannt */
export function useAiAccess(): boolean | null {
  const [access, setAccess] = useState<boolean | null>(null)
  useEffect(() => {
    let active = true
    aiFetch('/api/ai/threads')
      .then(async res => active && setAccess(res.ok ? !!(await res.json()).zugang : false))
      .catch(() => active && setAccess(false))
    return () => {
      active = false
    }
  }, [])
  return access
}

export default function DepotAsk({ depotId, depotName }: { depotId: string; depotName: string }) {
  const [text, setText] = useState('')
  const [request, setRequest] = useState<PanelRequest | null>(null)
  const kontext = useMemo<AiContext>(() => ({ depotId, name: depotName }), [depotId, depotName])
  const open = (frage: string) => {
    const question = frage.trim()
    if (!question) return
    setRequest(previous => ({ key: (previous?.key ?? 0) + 1, frage: question, kontext }))
    setText('')
  }
  return (
    <>
      <div className={`fai ${landingFontVars}`}>
        <div className="fai-depot">
          <form className="line" onSubmit={e => { e.preventDefault(); open(text) }}>
            <Mark size={14} />
            <input value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder="Frag dein Depot" aria-label="Frage zu deinem Depot" />
            <button type="submit" className="send" disabled={!text.trim()} aria-label="Fragen">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 11.5v-9M3 6.3 7 2.4l4 3.9" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
            </button>
          </form>
          <div className="sugs">
            {SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => open(s)}>{s}</button>)}
          </div>
        </div>
      </div>
      {request && <FinclueAiPanel request={request} onClose={() => setRequest(null)} />}
    </>
  )
}

export function DepotAiView({ depotId, depotName }: { depotId: string; depotName: string }) {
  const state = useFinclueAi()
  const kontext = useMemo<AiContext>(() => ({ depotId, name: depotName }), [depotId, depotName])
  const { setQuota, reset } = state

  useEffect(() => {
    let active = true
    aiFetch('/api/ai/threads').then(async res => active && res.ok && setQuota((await res.json()).quota ?? null)).catch(() => {})
    return () => {
      active = false
    }
  }, [setQuota])
  // Anderes Depot, anderes Gespräch
  useEffect(() => reset(), [depotId, reset])

  return (
    <div className={`fai ${landingFontVars}`}>
      <div className="fai-depotview">
        <Conversation
          state={state} kontext={kontext} inputId="fai-frage-depot" placeholder={`Frag zu ${depotName}`}
          empty={
            <div className="fai-start">
              <h1>Frag dein Depot</h1>
              <p>Wert, Rendite, Käufe, Dividenden, Themen und was in deinen ETFs steckt. Jede Zahl kommt aus deinen Buchungen und den Daten von Finclue.</p>
              <div className="fai-sugs">
                {VIEW_SUGGESTIONS.map(s => <button key={s} type="button" onClick={() => void state.ask(s, { kontext })}><span>{s}</span><span aria-hidden="true">→</span></button>)}
              </div>
            </div>
          }
        />
      </div>
    </div>
  )
}
