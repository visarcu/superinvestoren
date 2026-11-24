'use client'

import { useEffect, useRef, useState } from 'react'
import type { AiQuota } from '@/lib/ai/types'
import Mark from './Mark'

export default function AskBar({
  onAsk, onStop, busy, quota, depot, placeholder = 'Frag zu Aktien, Märkten oder Superinvestoren', autoFocus = false, id,
}: {
  onAsk: (frage: string, gruendlich: boolean) => void
  onStop: () => void
  busy: boolean
  quota: AiQuota | null
  depot?: { on: boolean; toggle: () => void }
  placeholder?: string
  autoFocus?: boolean
  id: string
}) {
  const [text, setText] = useState('')
  const [thorough, setThorough] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  const left = quota ? Math.max(0, quota.limit - quota.used) : null
  const submit = () => {
    if (busy || !text.trim()) return
    onAsk(text, thorough)
    setText('')
  }

  return (
    <form className="fai-ask" onSubmit={e => { e.preventDefault(); submit() }}>
      <div className="row">
        <Mark size={14} />
        <textarea
          ref={ref} id={id} rows={1} value={text} maxLength={1000} placeholder={placeholder} aria-label="Frage an Finclue AI"
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
        />
        {busy ? (
          <button type="button" className="send" onClick={onStop} aria-label="Abbrechen">
            <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true"><rect width="10" height="10" rx="1.5" fill="currentColor" /></svg>
          </button>
        ) : (
          <button type="submit" className="send" disabled={!text.trim()} aria-label="Senden">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 11.5v-9M3 6.3 7 2.4l4 3.9" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>
          </button>
        )}
      </div>
      <div className="opts">
        <span className="toggles">
          {depot && (
            <button type="button" className="fai-toggle" aria-pressed={depot.on} onClick={depot.toggle} title={depot.on ? 'Finclue AI darf dein Depot lesen' : 'Finclue AI kann dein Depot gerade nicht lesen'}>
              <i aria-hidden="true" />Depot
            </button>
          )}
          <button type="button" className="fai-toggle" aria-pressed={thorough} onClick={() => setThorough(v => !v)} title="Stärkeres Modell für schwierige Fragen, zählt als zwei Fragen">
            <i aria-hidden="true" />Gründlich{thorough ? ' (zählt als 2 Fragen)' : ''}
          </button>
        </span>
        {left != null && quota && <span className="fai-num">{left === 1 ? 'Noch 1 Frage' : `Noch ${left} Fragen`}{quota.period === 'monat' ? ' diesen Monat' : ' zum Testen'}</span>}
      </div>
    </form>
  )
}
