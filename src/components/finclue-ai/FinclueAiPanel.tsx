'use client'

// Seitliches Blatt: beantwortet Fragen, ohne die Seite zu verlassen.

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { landingFontVars } from '@/components/landing/landingFonts'
import type { AiContext } from '@/lib/ai/types'
import { leaveDepotHref } from '@/lib/siteHosts'
import Conversation from './Conversation'
import Mark from './Mark'
import { useFinclueAi } from './useFinclueAi'
import './finclue-ai.css'

export interface PanelRequest {
  /** steigt mit jeder neuen Frage, damit dieselbe Frage zweimal gestellt werden kann */
  key: number
  frage: string
  kontext: AiContext | null
}

export default function FinclueAiPanel({ request, onClose }: { request: PanelRequest | null; onClose: () => void }) {
  const state = useFinclueAi()
  const { ask, reset } = state
  const handled = useRef(0)

  useEffect(() => {
    if (!request || request.key === handled.current) return
    // Verzögert, damit der doppelte Effekt im Entwicklungsmodus die Anfrage nicht abbricht
    const timer = setTimeout(() => {
      handled.current = request.key
      reset()
      if (request.frage) void ask(request.frage, { kontext: request.kontext })
    }, 0)
    return () => clearTimeout(timer)
  }, [request, ask, reset])

  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [request, onClose])

  if (!request) return null
  const about = request.kontext?.name || request.kontext?.symbol
  return (
    <div className={`fai ${landingFontVars}`}>
      <div className="fai-veil" onClick={onClose} />
      <div className="fai-panel" role="dialog" aria-label="Finclue AI">
        <header>
          <Mark size={13} />
          <b>Finclue AI</b>
          {about && <span>{about}</span>}
          <span className="sp" />
          {state.threadId && !state.busy && <Link href={leaveDepotHref(`/analyse/finclue-ai?t=${state.threadId}`)} onClick={onClose}>Groß öffnen</Link>}
          <button type="button" onClick={onClose} aria-label="Schließen">Schließen</button>
        </header>
        <Conversation state={state} kontext={request.kontext} inputId="fai-frage-panel" placeholder={about ? `Frag zu ${about}` : undefined} autoFocus />
      </div>
    </div>
  )
}
