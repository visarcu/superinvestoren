'use client'

// Gespräch mit der Finclue AI: Verlauf, laufende Antwort, Limit.

import { useCallback, useEffect, useRef, useState } from 'react'
import { COOKIE_MAX_AGE_SECONDS, cookieAttributes, readCookies, sharedCookieDomain } from '@/lib/siteCookies'
import { supabase } from '@/lib/supabaseClient'
import { looksLikeDepotQuestion } from './depotQuestion'
import type { AiBlock, AiContext, AiEvent, AiMessage, AiMessagePayload, AiQuota, AiStep } from '@/lib/ai/types'

export interface Exchange {
  id: string
  frage: string
  text: string
  blocks: AiBlock[]
  schritte: AiStep[]
  payload: AiMessagePayload | null
  status: 'laeuft' | 'fertig' | 'fehler'
  fehler?: { code: string; message: string }
  gruendlich: boolean
}

export interface AskOptions {
  gruendlich?: boolean
  kontext?: AiContext | null
  /** Depotfrage bewusst ohne Depotzugriff stellen */
  ohneDepot?: boolean
}

// Cookie statt localStorage, damit die Wahl auf finclue.de und depot.finclue.de
// gilt. Wert "<Konto>.1" = darf das Depot lesen, "<Konto>.0" = ausgeschaltet,
// nichts = nie gefragt. Das Konto steht dabei, damit die Wahl nicht auf eine
// zweite Person am selben Gerät übergeht.
const DEPOT_COOKIE = 'fai_depot'
const DEPOT_EVENT = 'fai-depot'

async function account(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id.slice(0, 8) ?? null
}

async function storedDepot(): Promise<'1' | '0' | null> {
  const owner = await account()
  if (!owner) return null
  const [id, flag] = (readCookies().get(DEPOT_COOKIE) ?? '').split('.')
  return id === owner && (flag === '1' || flag === '0') ? flag : null
}

async function storeDepot(on: boolean): Promise<void> {
  const owner = await account()
  if (owner) document.cookie = `${DEPOT_COOKIE}=${owner}.${on ? '1' : '0'}${cookieAttributes(sharedCookieDomain(), COOKIE_MAX_AGE_SECONDS)}`
}

export async function aiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return fetch(path, { ...init, headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
}

function toExchanges(messages: AiMessage[]): Exchange[] {
  const list: Exchange[] = []
  for (const m of messages) {
    if (m.role === 'user') {
      list.push({ id: m.id, frage: m.content, text: '', blocks: [], schritte: [], payload: null, status: 'fehler', fehler: { code: 'unvollstaendig', message: 'Zu dieser Frage gibt es keine Antwort.' }, gruendlich: false })
    } else if (list.length > 0) {
      const last = list[list.length - 1]
      last.text = m.content
      last.payload = m.payload
      last.blocks = m.payload?.blocks ?? []
      last.status = 'fertig'
      last.fehler = undefined
    }
  }
  return list
}

export function useFinclueAi(onChange?: () => void) {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [depot, setDepotState] = useState(false)
  /** wartet auf die Einwilligung; frage null = nur der Schalter wurde gedrückt */
  const [pending, setPending] = useState<{ frage: string | null; options: AskOptions } | null>(null)
  const depotRef = useRef(false)
  const depotReady = useRef<Promise<void>>(Promise.resolve())
  const abort = useRef<AbortController | null>(null)
  const threadRef = useRef<string | null>(null)
  const changed = useRef(onChange)
  changed.current = onChange

  useEffect(() => () => abort.current?.abort(), [])

  useEffect(() => {
    let active = true
    const read = () => {
      depotReady.current = storedDepot().then(flag => {
        if (!active) return
        depotRef.current = flag === '1'
        setDepotState(depotRef.current)
      }).catch(() => {})
    }
    read()
    window.addEventListener(DEPOT_EVENT, read)
    return () => {
      active = false
      window.removeEventListener(DEPOT_EVENT, read)
    }
  }, [])

  const setDepot = useCallback((on: boolean) => {
    depotRef.current = on
    setDepotState(on)
    // Andere offene Stellen (Blatt, Ansicht) ziehen nach
    void storeDepot(on).then(() => window.dispatchEvent(new Event(DEPOT_EVENT))).catch(() => {})
  }, [])

  const reset = useCallback(() => {
    abort.current?.abort()
    threadRef.current = null
    setThreadId(null)
    setExchanges([])
    setPending(null)
    setBusy(false)
  }, [])

  const openThread = useCallback(async (id: string): Promise<boolean> => {
    abort.current?.abort()
    setBusy(false)
    setLoadingThread(true)
    try {
      const res = await aiFetch(`/api/ai/threads/${id}`)
      if (!res.ok) return false
      const data = (await res.json()) as { messages: AiMessage[] }
      threadRef.current = id
      setThreadId(id)
      setExchanges(toExchanges(data.messages))
      return true
    } catch {
      return false
    } finally {
      setLoadingThread(false)
    }
  }, [])

  const ask = useCallback(async (frage: string, options: AskOptions = {}) => {
    const text = frage.trim()
    if (!text) return
    await depotReady.current
    // Depotfragen erst nach dem Einschalten stellen, sonst wäre eine Frage verbraucht
    if (!depotRef.current && !options.ohneDepot && (options.kontext?.depotId || looksLikeDepotQuestion(text))) {
      setPending({ frage: text, options })
      return
    }
    setPending(null)
    const { depotId, ...rest } = options.kontext ?? {}
    const kontext: AiContext = { ...rest, depot: depotRef.current, ...(depotRef.current && depotId ? { depotId } : {}) }
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const id = `x${Date.now()}`
    setExchanges(list => [...list, { id, frage: text, text: '', blocks: [], schritte: [], payload: null, status: 'laeuft', gruendlich: !!options.gruendlich }])
    setBusy(true)
    const patch = (fn: (x: Exchange) => Exchange) => setExchanges(list => list.map(x => (x.id === id ? fn(x) : x)))
    const fail = (code: string, message: string) => patch(x => ({ ...x, status: 'fehler', fehler: { code, message } }))

    try {
      const res = await aiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frage: text, threadId: threadRef.current, kontext, gruendlich: !!options.gruendlich }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        if (data.quota) setQuota(data.quota)
        fail(data.code ?? String(res.status), data.error ?? 'Das hat nicht geklappt. Bitte versuche es noch einmal.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let cut = buffer.indexOf('\n\n')
        while (cut >= 0) {
          const chunk = buffer.slice(0, cut)
          buffer = buffer.slice(cut + 2)
          cut = buffer.indexOf('\n\n')
          if (!chunk.startsWith('data: ')) continue
          const event = JSON.parse(chunk.slice(6)) as AiEvent
          switch (event.type) {
            case 'start':
              setQuota(event.quota)
              break
            case 'schritt':
              patch(x => {
                const rest = x.schritte.filter(s => s.id !== event.schritt.id)
                const index = x.schritte.findIndex(s => s.id === event.schritt.id)
                if (index < 0) return { ...x, schritte: [...rest, event.schritt] }
                const copy = [...x.schritte]
                copy[index] = event.schritt
                return { ...x, schritte: copy }
              })
              break
            case 'block':
              patch(x => ({ ...x, blocks: [...x.blocks, event.block] }))
              break
            case 'text':
              patch(x => ({ ...x, text: x.text + event.delta }))
              break
            case 'ersetzen':
              patch(x => ({ ...x, text: event.text }))
              break
            case 'fertig':
              finished = true
              threadRef.current = event.threadId
              setThreadId(event.threadId)
              if (event.quota) setQuota(event.quota)
              patch(x => ({ ...x, text: event.text, payload: event.payload, blocks: event.payload.blocks, status: 'fertig' }))
              changed.current?.()
              break
            case 'fehler':
              finished = true
              if (event.quota) setQuota(event.quota)
              fail(event.code, event.message)
              break
          }
        }
      }
      if (!finished && !controller.signal.aborted) fail('abgebrochen', 'Die Verbindung wurde unterbrochen. Die Frage wurde dir nicht abgezogen.')
    } catch {
      if (!controller.signal.aborted) fail('verbindung', 'Keine Verbindung. Bitte versuche es noch einmal.')
      else {
        patch(x => (x.status === 'laeuft' ? { ...x, text: '', status: 'fehler', fehler: { code: 'abgebrochen', message: 'Abgebrochen.' } } : x))
        // Der Server gibt die Frage zurück, sobald er den Abbruch bemerkt
        setTimeout(() => {
          void aiFetch('/api/ai/threads').then(async r => r.ok && setQuota((await r.json()).quota ?? null)).catch(() => {})
        }, 1500)
      }
    } finally {
      if (abort.current === controller) setBusy(false)
    }
  }, [])

  const stop = useCallback(() => abort.current?.abort(), [])

  const toggleDepot = useCallback(async () => {
    if (depotRef.current) setDepot(false)
    else if ((await storedDepot()) !== null) setDepot(true)
    else setPending(current => (current?.frage ? current : { frage: null, options: {} }))
  }, [setDepot])

  const resolvePending = useCallback((choice: 'an' | 'ohne' | 'zu') => {
    const current = pending
    setPending(null)
    if (choice === 'an') setDepot(true)
    if (current?.frage && choice !== 'zu') void ask(current.frage, { ...current.options, ohneDepot: choice === 'ohne' })
  }, [pending, setDepot, ask])

  /** Frage mit Depot wiederholen, vorher gegebenenfalls einwilligen lassen */
  const askWithDepot = useCallback(async (frage: string, options: AskOptions = {}) => {
    if (!depotRef.current && (await storedDepot()) === null) {
      setPending({ frage, options })
      return
    }
    if (!depotRef.current) setDepot(true)
    void ask(frage, options)
  }, [ask, setDepot])

  return { exchanges, threadId, quota, setQuota, busy, loadingThread, ask, stop, reset, openThread, depot, toggleDepot, pending, resolvePending, askWithDepot }
}

export type FinclueAiState = ReturnType<typeof useFinclueAi>
