// src/components/portfolio/T212SyncCard.tsx
// Trading-212-Anbindung (Beta): einmal verbinden, danach holt Finclue Käufe,
// Verkäufe, Dividenden und Geldbewegungen automatisch. Sichtbar nur für
// freigeschaltete Konten (sonst antwortet die Route mit 403) und nur an dem
// Depot, das verbunden ist oder werden kann.
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface Check {
  geprueft: number
  stimmen: number
  abweichungen: Array<{ name: string; symbol: string | null; trading212: number; finclue: number }>
  cash: { trading212: number; finclue: number } | null
  neu: number
  hinweise: string[]
}

interface Status {
  verbunden: boolean
  portfolioId: string | null
  stand: 'bereit' | 'laeuft' | 'fehler' | null
  meldung: string | null
  aktualisiert: string | null
  pruefung: Check | null
}

/** Beim Öffnen des Depots von selbst aktualisieren, wenn der Stand älter ist */
const AUTO_REFRESH_MS = 2 * 60 * 60 * 1000

async function authedFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Nicht angemeldet')
  return fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` } })
}

function when(iso: string): string {
  const day = (d: Date) => d.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
  const date = new Date(iso)
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
  return day(date) === day(new Date()) ? `heute um ${time} Uhr` : `am ${day(date)} um ${time} Uhr`
}

const number = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 6 })

export default function T212SyncCard({
  portfolioId, brokerType, formatCurrency, onSynced,
}: {
  portfolioId: string
  brokerType?: string | null
  formatCurrency: (amount: number) => string
  /** Depot neu laden, wenn der Abgleich etwas geändert hat */
  onSynced?: () => void
}) {
  const [status, setStatus] = useState<Status | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const running = useRef(false)
  const autoStarted = useRef(false)
  const synced = useRef(onSynced)
  synced.current = onSynced

  const load = useCallback(async () => {
    try {
      const res = await authedFetch('/api/broker-sync/t212')
      if (!res.ok) return null // nicht freigeschaltet: Karte bleibt weg
      const next = await res.json() as Status
      // Gerade fertig geworden: Depot neu laden
      if (running.current && next.stand !== 'laeuft') synced.current?.()
      running.current = next.stand === 'laeuft'
      setStatus(next)
      return next
    } catch {
      return null
    }
  }, [])

  const sync = useCallback(async () => {
    setError(null)
    running.current = true
    setStatus(s => (s ? { ...s, stand: 'laeuft', meldung: 'Verbinde mit Trading 212' } : s))
    try {
      const res = await authedFetch('/api/broker-sync/t212/sync', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok && data?.error) setError(data.error)
    } catch {
      // Abgebrochene Anfrage: Der Abgleich läuft auf dem Server weiter
    }
    await load()
  }, [load])

  useEffect(() => {
    void load().then(next => {
      if (!next?.verbunden || next.portfolioId !== portfolioId || next.stand === 'laeuft' || autoStarted.current) return
      if (next.aktualisiert && Date.now() - Date.parse(next.aktualisiert) < AUTO_REFRESH_MS) return
      autoStarted.current = true
      void sync()
    })
  }, [load, sync, portfolioId])

  useEffect(() => {
    if (status?.stand !== 'laeuft') return
    const timer = setInterval(() => void load(), 5000)
    return () => clearInterval(timer)
  }, [status?.stand, load])

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (connecting || !apiKey.trim() || !apiSecret.trim()) return
    setConnecting(true)
    setError(null)
    try {
      const res = await authedFetch('/api/broker-sync/t212', { method: 'POST', body: JSON.stringify({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), portfolioId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verbindung fehlgeschlagen.')
      setApiKey('')
      setApiSecret('')
      setShowForm(false)
      autoStarted.current = true
      await load()
      void sync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    if (!confirmLeave) return setConfirmLeave(true)
    setConfirmLeave(false)
    const res = await authedFetch('/api/broker-sync/t212', { method: 'DELETE' }).catch(() => null)
    if (res?.ok) await load()
    else setError('Trennen fehlgeschlagen.')
  }

  if (!status) return null
  const mine = status.verbunden && (status.portfolioId === portfolioId || (!status.portfolioId && brokerType === 'trading212'))
  if (!mine && (status.verbunden || brokerType !== 'trading212')) return null

  const busy = status.stand === 'laeuft'
  const check = status.pruefung
  const cashOff = check?.cash && Math.abs(check.cash.trading212 - check.cash.finclue) >= 0.05
  const field = 'w-full rounded-lg border border-theme bg-theme-primary px-3 py-2 text-sm text-theme-primary outline-none focus:border-neutral-500'

  return (
    <section className="mb-5 rounded-xl border border-theme bg-theme-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-theme-primary">Trading 212 <span className="ml-1 text-[11px] font-normal text-theme-muted">Beta</span></h3>
          <p className="mt-0.5 text-[13px] text-theme-muted" aria-live="polite">
            {!mine ? 'Einmal verbinden, danach holt Finclue Käufe, Verkäufe, Dividenden und Einzahlungen von selbst. Du brauchst keine Datei mehr.'
              : busy ? `${status.meldung ?? 'Wird aktualisiert'} …`
              : status.stand === 'fehler' ? status.meldung
              : status.aktualisiert ? `Zuletzt aktualisiert ${when(status.aktualisiert)}. Läuft mehrmals am Tag von selbst.`
              : 'Verbunden, noch nicht aktualisiert.'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          {mine ? (
            <>
              <button type="button" onClick={() => void sync()} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-theme px-3 py-1.5 text-theme-primary transition-colors hover:bg-theme-hover disabled:opacity-60">
                <ArrowPathIcon className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                {busy ? 'Läuft, 1 bis 2 Minuten' : 'Jetzt aktualisieren'}
              </button>
              <button type="button" onClick={() => void disconnect()} onBlur={() => setConfirmLeave(false)} disabled={busy} className="rounded-lg px-2 py-1.5 text-theme-muted hover:text-theme-primary disabled:opacity-60">
                {confirmLeave ? 'Schlüssel wirklich löschen?' : 'Trennen'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setShowForm(v => !v)} aria-expanded={showForm} className="rounded-lg bg-white px-3 py-1.5 font-medium text-black hover:bg-neutral-200">Verbinden</button>
          )}
        </div>
      </div>

      {!mine && showForm && (
        <form onSubmit={connect} className="mt-4 grid gap-4 border-t border-theme pt-4 md:grid-cols-2">
          <ol className="list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-theme-secondary">
            <li>In der Trading-212-App: Menü, Einstellungen, API. Dort einen neuen Schlüssel erzeugen.</li>
            <li>Diese Rechte einschalten: Account data, Portfolio, History, History - Dividends, History - Orders, History - Transactions.</li>
            <li>„Orders - Execute“ und „Pies - Write“ aus lassen und keine IP-Adressen eintragen. Finclue liest nur und handelt nie.</li>
            <li>Schlüssel und Secret hier eintragen. Das Secret zeigt Trading 212 nur einmal.</li>
          </ol>
          <div className="space-y-2">
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API-Schlüssel" aria-label="API-Schlüssel" autoComplete="off" className={field} />
            <input type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Secret" aria-label="Secret" autoComplete="off" className={field} />
            <button type="submit" disabled={connecting || !apiKey.trim() || !apiSecret.trim()} className="rounded-lg bg-white px-3 py-2 text-[13px] font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
              {connecting ? 'Wird geprüft' : 'Prüfen und verbinden'}
            </button>
            <p className="text-[12px] text-theme-muted">Beides wird verschlüsselt gespeichert und nur auf unserem Server zum Lesen benutzt.</p>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-[13px] text-amber-400">{error}</p>}

      {mine && !busy && check && status.stand !== 'fehler' && (
        <div className="mt-4 border-t border-theme pt-3 text-[13px] text-theme-secondary">
          <p>
            {check.abweichungen.length === 0 ? `Alle ${check.geprueft} Positionen stimmen mit Trading 212 überein.` : `${check.stimmen} von ${check.geprueft} Positionen stimmen mit Trading 212 überein.`}
            {check.neu > 0 && ` ${check.neu === 1 ? 'Eine neue Buchung' : `${check.neu} neue Buchungen`} beim letzten Mal.`}
            {check.cash && (cashOff ? ` Guthaben: Trading 212 ${formatCurrency(check.cash.trading212)}, Finclue ${formatCurrency(check.cash.finclue)}.` : ` Guthaben stimmt (${formatCurrency(check.cash.finclue)}).`)}
          </p>
          {check.abweichungen.length > 0 && (
            <table className="mt-2 w-full max-w-xl text-[13px] tabular-nums">
              <thead><tr className="text-left text-[12px] text-theme-muted"><th className="py-1 font-normal">Position</th><th className="py-1 text-right font-normal">Trading 212</th><th className="py-1 text-right font-normal">Finclue</th></tr></thead>
              <tbody>
                {check.abweichungen.slice(0, 10).map(a => (
                  <tr key={`${a.symbol}-${a.name}`} className="border-t border-theme"><td className="py-1.5 pr-3">{a.name}</td><td className="py-1.5 text-right">{number(a.trading212)}</td><td className="py-1.5 text-right">{number(a.finclue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {check.hinweise.length > 0 && <ul className="mt-2 space-y-0.5 text-[12px] text-theme-muted">{check.hinweise.map(h => <li key={h}>{h}</li>)}</ul>}
        </div>
      )}
    </section>
  )
}
