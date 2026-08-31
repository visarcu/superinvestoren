// src/components/portfolio/T212SyncCard.tsx
// Trading-212-Direktanbindung (Beta): Key-Paar hinterlegen, Bestände
// abgleichen, Positionen in ein leeres Depot importieren.
// Sichtbar nur für Allowlist-Nutzer (Route liefert sonst 403 → Karte
// rendert nichts). Der Nutzer erzeugt Key+Secret selbst in der T212-App —
// mit NUR Lese-Berechtigungen; Finclue ruft keine Order-Endpoints auf.
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, KeyIcon } from '@heroicons/react/24/outline'

interface T212Status {
  enabled: boolean
  connected: boolean
  accountId: number | null
  currency: string | null
  status: string | null
  lastSyncedAt: string | null
}

interface PreviewRow {
  isin: string
  name: string | null
  symbol: string | null
  brokerQty: number
  finclueQty: number
  diff: number
  state: 'ok' | 'abweichung' | 'fehlt_in_finclue' | 'fehlt_beim_broker'
  marketValue: number | null
}

interface ImportResult {
  portfolioName: string
  imported: number
  skipped: { isin: string; name: string | null }[]
  cashPosition: number
}

const STATE_LABEL: Record<PreviewRow['state'], { text: string; className: string }> = {
  ok: { text: 'stimmt überein', className: 'text-emerald-400' },
  abweichung: { text: 'Abweichung', className: 'text-amber-400' },
  fehlt_in_finclue: { text: 'fehlt in Finclue', className: 'text-amber-400' },
  fehlt_beim_broker: { text: 'fehlt beim Broker', className: 'text-red-400' },
}

export default function T212SyncCard({
  portfolioId,
  formatCurrency,
}: {
  portfolioId: string
  formatCurrency: (amount: number) => string
}) {
  const [status, setStatus] = useState<T212Status | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<{ portfolioName: string; brokerTotal: number; rows: PreviewRow[] } | null>(null)
  const [importArmed, setImportArmed] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const authedFetch = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Nicht angemeldet')
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    })
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      const res = await authedFetch('/api/broker-sync/t212')
      if (res.status === 403 || !res.ok) return // kein Beta-Nutzer → Karte ausblenden
      setStatus(await res.json())
    } catch {}
  }, [authedFetch])

  useEffect(() => { loadStatus() }, [loadStatus])

  const connect = useCallback(async () => {
    if (connecting || !apiKey.trim() || !apiSecret.trim()) return
    setConnecting(true)
    setError(null)
    try {
      const res = await authedFetch('/api/broker-sync/t212', {
        method: 'POST',
        body: JSON.stringify({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      // Key-Paar nach dem Speichern sofort aus dem Client-State entfernen
      setApiKey('')
      setApiSecret('')
      setShowForm(false)
      await loadStatus()
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Verbindung fehlgeschlagen')
    } finally {
      setConnecting(false)
    }
  }, [connecting, apiKey, apiSecret, authedFetch, loadStatus])

  const disconnect = useCallback(async () => {
    try {
      await authedFetch('/api/broker-sync/t212', { method: 'DELETE' })
      setPreview(null)
      await loadStatus()
    } catch {}
  }, [authedFetch, loadStatus])

  const runPreview = useCallback(async () => {
    if (previewing) return
    setPreviewing(true)
    setError(null)
    setImportResult(null)
    try {
      const res = await authedFetch('/api/broker-sync/t212/preview', {
        method: 'POST',
        body: JSON.stringify({ portfolioId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setPreview(data)
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Abgleich fehlgeschlagen')
    } finally {
      setPreviewing(false)
    }
  }, [previewing, portfolioId, authedFetch])

  const runImport = useCallback(async () => {
    // Zwei-Klick-Bestätigung: erster Klick scharfschalten, zweiter importiert
    if (!importArmed) {
      setImportArmed(true)
      return
    }
    setImportArmed(false)
    setImporting(true)
    setError(null)
    try {
      const res = await authedFetch('/api/broker-sync/t212/import', {
        method: 'POST',
        body: JSON.stringify({ portfolioId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import fehlgeschlagen')
      setImportResult(data)
      setPreview(null)
      // Positionen sind jetzt in der DB — Workspace neu laden
      setTimeout(() => window.location.reload(), 2500)
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Import fehlgeschlagen')
    } finally {
      setImporting(false)
    }
  }, [importArmed, portfolioId, authedFetch])

  // Kein Beta-Zugang oder Status noch nicht geladen → nichts rendern
  if (!status) return null

  return (
    <div className="mb-5 bg-theme-card border border-theme rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <KeyIcon className="h-4 w-4 text-teal-300" />
            Trading 212
            <span className="rounded-full border border-teal-300/25 bg-teal-400/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">Beta</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Eigener API-Key aus der T212-App (Einstellungen → API) — bitte nur Lese-Berechtigungen aktivieren
          </p>
        </div>

        <div className="flex items-center gap-2">
          {status.connected ? (
            <>
              <span className="flex items-center gap-1.5 text-[12px] text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                verbunden{status.currency ? ` · ${status.currency}-Konto` : ''}
              </span>
              <button
                type="button"
                onClick={runPreview}
                disabled={previewing}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${previewing ? 'animate-spin' : ''}`} />
                {previewing ? 'Gleicht ab …' : 'Abgleich'}
              </button>
              <button
                type="button"
                onClick={runImport}
                onBlur={() => setImportArmed(false)}
                disabled={importing}
                className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                  importArmed
                    ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                    : 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:text-white'
                }`}
              >
                {importing ? 'Importiert …' : importArmed ? 'Wirklich in dieses Depot importieren?' : 'In dieses Depot importieren'}
              </button>
              <button
                type="button"
                onClick={disconnect}
                title="Verbindung und gespeicherte Keys löschen"
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[12px] text-neutral-400 transition-colors hover:text-red-300"
              >
                Trennen
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(v => !v)}
              className="rounded-lg border border-teal-300/20 bg-teal-400/10 px-3 py-1.5 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
            >
              Konto verbinden
            </button>
          )}
        </div>
      </div>

      {!status.connected && showForm && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="API-Key"
            autoComplete="off"
            className="w-56 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-teal-300/40"
          />
          <input
            type="password"
            value={apiSecret}
            onChange={e => setApiSecret(e.target.value)}
            placeholder="API-Secret"
            autoComplete="off"
            className="w-56 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-teal-300/40"
          />
          <button
            type="button"
            onClick={connect}
            disabled={connecting || !apiKey.trim() || !apiSecret.trim()}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {connecting ? 'Prüft …' : 'Verbinden'}
          </button>
          <p className="w-full text-[11px] text-neutral-600">
            Der Key wird verschlüsselt gespeichert und nur serverseitig für Lese-Abrufe genutzt.
            Tipp: In der T212-App beim Erstellen die Order-Berechtigungen deaktivieren und optional die IP-Beschränkung setzen.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-amber-400">{error}</p>}

      {importResult && (
        <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[13px] text-emerald-200">
          <CheckCircleIcon className="mr-1.5 inline h-4 w-4" />
          {importResult.imported} Positionen in „{importResult.portfolioName}" importiert
          {importResult.cashPosition !== 0 && <> · Cash: {formatCurrency(importResult.cashPosition)}</>}
          {importResult.skipped.length > 0 && (
            <span className="text-amber-300"> · {importResult.skipped.length} übersprungen ({importResult.skipped.map(s => s.name || s.isin).join(', ')})</span>
          )}
          <span className="text-emerald-300/70"> — Seite lädt neu …</span>
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-neutral-400">
            Broker-Depotwert: <span className="tabular-nums text-white">{formatCurrency(preview.brokerTotal)}</span>
            {' '}· Abgleich mit „{preview.portfolioName}" — Vorschau, es wird nichts automatisch geändert
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-neutral-500">
                  <th className="py-2 text-left font-medium">Position</th>
                  <th className="py-2 text-right font-medium">Broker</th>
                  <th className="py-2 text-right font-medium">Finclue</th>
                  <th className="py-2 text-right font-medium">Differenz</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {preview.rows.map(row => {
                  const state = STATE_LABEL[row.state]
                  return (
                    <tr key={row.isin} className="border-b border-white/[0.04] last:border-b-0">
                      <td className="max-w-[220px] truncate py-1.5 pr-3 text-neutral-200">
                        {row.name || row.symbol || row.isin}
                        <span className="ml-2 text-[11px] text-neutral-500">{row.symbol || row.isin}</span>
                      </td>
                      <td className="py-1.5 text-right text-neutral-200">{row.brokerQty}</td>
                      <td className="py-1.5 text-right text-neutral-200">{row.finclueQty}</td>
                      <td className={`py-1.5 text-right font-medium ${Math.abs(row.diff) < 1e-6 ? 'text-neutral-500' : 'text-amber-400'}`}>
                        {row.diff > 0 ? '+' : ''}{row.diff}
                      </td>
                      <td className={`py-1.5 text-right text-[12px] ${state.className}`}>
                        {row.state === 'ok'
                          ? <CheckCircleIcon className="ml-auto h-4 w-4" />
                          : <span className="inline-flex items-center gap-1"><ExclamationTriangleIcon className="h-3.5 w-3.5" />{state.text}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
