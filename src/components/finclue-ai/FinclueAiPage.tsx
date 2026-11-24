'use client'

// Eigene Seite der Finclue AI: Verlauf links, Gespräch rechts.
// ?q=… stellt die Frage sofort, ?t=… öffnet ein Gespräch, ?symbol=… setzt die Aktie.

import { useCallback, useEffect, useRef, useState } from 'react'
import { landingFontVars } from '@/components/landing/landingFonts'
import type { AiContext, AiThreadSummary } from '@/lib/ai/types'
import Conversation from './Conversation'
import { aiFetch, useFinclueAi } from './useFinclueAi'
import './finclue-ai.css'

const DEPOT_SUGGESTIONS = ['Wie steht mein Depot?', 'Wie groß ist mein KI-Anteil?']
const SUGGESTIONS = [
  'Was bewegt heute die Börse?',
  'Wie teuer ist Nvidia im Vergleich zu den letzten 10 Jahren?',
  'Was hat Warren Buffett zuletzt gekauft und verkauft?',
  'Coca-Cola oder PepsiCo: Wer arbeitet profitabler?',
  'Wie viel Nvidia steckt in einem MSCI-World-ETF?',
]

function groupLabel(iso: string): string {
  const day = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d)
  const now = new Date()
  const age = Math.round((Date.parse(day(now)) - Date.parse(day(new Date(iso)))) / 86_400_000)
  return age <= 0 ? 'Heute' : age === 1 ? 'Gestern' : age < 7 ? 'Diese Woche' : 'Früher'
}

export default function FinclueAiPage({ setup }: { setup: { eingerichtet: boolean; threads: AiThreadSummary[]; quota: any; hatDepot?: boolean } }) {
  const [threads, setThreads] = useState<AiThreadSummary[]>(setup.threads)
  const [menu, setMenu] = useState(false)
  const [kontext, setKontext] = useState<AiContext | null>(null)
  const refresh = useCallback(async () => {
    const res = await aiFetch('/api/ai/threads').catch(() => null)
    if (!res?.ok) return
    const data = await res.json()
    if (Array.isArray(data.threads)) setThreads(data.threads)
  }, [])
  const state = useFinclueAi(refresh)
  const { threadId, reset, openThread, ask, setQuota } = state
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    // Verzögert, damit der doppelte Effekt im Entwicklungsmodus die Anfrage nicht abbricht
    const timer = setTimeout(() => {
      started.current = true
      setQuota(setup.quota)
      const params = new URLSearchParams(window.location.search)
      const thread = params.get('t')
      const question = params.get('q')
      const symbol = params.get('symbol')
      const ctx = symbol ? { symbol: symbol.toUpperCase() } : null
      if (ctx) setKontext(ctx)
      if (thread) void openThread(thread)
      else if (question) void ask(question, { kontext: ctx })
    }, 0)
    return () => clearTimeout(timer)
  }, [ask, openThread, setQuota, setup.quota])

  // Adresse folgt dem Gespräch, damit Neuladen und Teilen des Links im eigenen Konto klappt
  useEffect(() => {
    if (!started.current) return
    const url = threadId ? `${window.location.pathname}?t=${threadId}` : window.location.pathname
    if (threadId && !window.location.search.includes(threadId)) window.history.replaceState(null, '', url)
  }, [threadId])

  const open = (id: string) => {
    setMenu(false)
    setKontext(null)
    void openThread(id)
  }
  const fresh = () => {
    setMenu(false)
    setKontext(null)
    reset()
    window.history.replaceState(null, '', window.location.pathname)
  }
  const remove = async (id: string) => {
    const before = threads
    setThreads(list => list.filter(t => t.id !== id))
    const res = await aiFetch(`/api/ai/threads/${id}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) setThreads(before)
    else if (id === threadId) fresh()
  }

  let group = ''
  return (
    <div className={`fai fai-page ${landingFontVars}`}>
      <nav className={`fai-hist ${menu ? 'open' : ''}`} aria-label="Verlauf">
        <button type="button" className="new" onClick={fresh}>Neue Frage</button>
        {threads.length === 0 && <p>Hier erscheinen deine Fragen.</p>}
        {threads.map(t => {
          const label = groupLabel(t.updatedAt)
          const head = label !== group ? <p>{label}</p> : null
          group = label
          return (
            <div key={t.id}>
              {head}
              <div className={`item ${t.id === threadId ? 'on' : ''}`}>
                <button type="button" onClick={() => open(t.id)}><span>{t.title}</span></button>
                <button type="button" className="del" onClick={() => void remove(t.id)} aria-label={`„${t.title}“ löschen`}>
                  <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true"><path d="m1.5 1.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.4" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </nav>
      {menu && <div className="fai-veil" style={{ zIndex: 59 }} onClick={() => setMenu(false)} />}
      <section className="fai-main">
        <div className="fai-mobilebar"><button type="button" onClick={() => setMenu(true)}>Verlauf</button><button type="button" onClick={fresh}>Neue Frage</button></div>
        {setup.eingerichtet ? (
          <Conversation
            state={state} kontext={kontext} inputId="fai-frage" autoFocus
            empty={
              state.loadingThread ? null : (
                <div className="fai-start">
                  <h1>Was möchtest du wissen?</h1>
                  <p>{setup.hatDepot ? 'Dein Depot, Kurse, Bewertungen, Geschäftszahlen, Nachrichten, ETFs und Superinvestoren.' : 'Kurse, Bewertungen, Geschäftszahlen, Nachrichten, ETFs und Superinvestoren.'} Jede Zahl kommt aus den Daten von Finclue und wird vor der Ausgabe geprüft.</p>
                  <div className="fai-sugs">
                    {[...(setup.hatDepot ? DEPOT_SUGGESTIONS : []), ...(setup.hatDepot ? SUGGESTIONS.slice(0, 4) : SUGGESTIONS)].map(s => <button key={s} type="button" onClick={() => void ask(s)}><span>{s}</span><span aria-hidden="true">→</span></button>)}
                  </div>
                </div>
              )
            }
          />
        ) : (
          <div className="fai-thread"><div className="fai-col fai-start"><h1>Finclue AI ist noch nicht eingerichtet</h1><p>Auf diesem Server fehlt der Zugang zum KI-Modell.</p></div></div>
        )}
      </section>
    </div>
  )
}
