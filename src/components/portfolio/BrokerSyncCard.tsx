// src/components/portfolio/BrokerSyncCard.tsx
// Broker-Sync (Beta): Depot per finAPI verbinden, Bestände abgleichen und
// Positionen in ein leeres Depot importieren.
// Sichtbar nur für Allowlist-Nutzer (Route liefert sonst 403 → Karte
// rendert nichts). Abgleich ist read-only; der Import läuft nur nach
// explizitem Bestätigungs-Klick und nur in leere Depots.
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ArrowPathIcon, BuildingLibraryIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface SyncConnection {
  id: number
  bank: string | null
  updateStatus: string
}

interface SyncStatus {
  enabled: boolean
  banks: { id: number; name: string }[]
  lastSyncedAt: string | null
  connections: SyncConnection[]
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

export default function BrokerSyncCard({
  portfolioId,
  formatCurrency,
}: {
  portfolioId: string
  formatCurrency: (amount: number) => string
}) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [selectedBank, setSelectedBank] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [previewingId, setPreviewingId] = useState<number | null>(null)
  const [preview, setPreview] = useState<{ connectionId: number; portfolioName: string; brokerTotal: number; rows: PreviewRow[] } | null>(null)
  const [importArmedId, setImportArmedId] = useState<number | null>(null)
  const [importingId, setImportingId] = useState<number | null>(null)
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
      const res = await authedFetch('/api/broker-sync')
      if (res.status === 403 || !res.ok) return // kein Beta-Nutzer → Karte ausblenden
      const data = await res.json()
      setStatus(data)
      if (data.banks?.length) setSelectedBank((prev: number | null) => prev ?? data.banks[0].id)
    } catch {}
  }, [authedFetch])

  useEffect(() => { loadStatus() }, [loadStatus])

  const connect = useCallback(async () => {
    if (!selectedBank || connecting) return
    setConnecting(true)
    setError(null)
    try {
      const res = await authedFetch('/api/broker-sync', {
        method: 'POST',
        body: JSON.stringify({ bankId: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok || !data.webFormUrl) throw new Error(data.error || 'Fehler')
      // WebForm in neuem Tab: Zugangsdaten gehen direkt an finAPI, nie an Finclue
      window.open(data.webFormUrl, '_blank', 'noopener')
    } catch {
      setError('Verbindung konnte nicht gestartet werden — bitte nochmal versuchen')
    } finally {
      setConnecting(false)
    }
  }, [selectedBank, connecting, authedFetch])

  const runPreview = useCallback(async (connectionId: number) => {
    if (previewingId !== null) return
    setPreviewingId(connectionId)
    setError(null)
    setImportResult(null)
    try {
      const res = await authedFetch('/api/broker-sync/preview', {
        method: 'POST',
        body: JSON.stringify({ portfolioId, connectionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setPreview({ connectionId, ...data })
    } catch {
      setError('Abgleich fehlgeschlagen — ist die Verbindung fertig eingerichtet?')
    } finally {
      setPreviewingId(null)
    }
  }, [previewingId, portfolioId, authedFetch])

  const runImport = useCallback(async (connectionId: number) => {
    // Zwei-Klick-Bestätigung: erster Klick scharfschalten, zweiter importiert
    if (importArmedId !== connectionId) {
      setImportArmedId(connectionId)
      return
    }
    setImportArmedId(null)
    setImportingId(connectionId)
    setError(null)
    try {
      const res = await authedFetch('/api/broker-sync/import', {
        method: 'POST',
        body: JSON.stringify({ portfolioId, connectionId }),
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
      setImportingId(null)
    }
  }, [importArmedId, portfolioId, authedFetch])

  // Kein Beta-Zugang oder Status noch nicht geladen → nichts rendern
  if (!status) return null

  const hasConnection = status.connections.length > 0

  return (
    <div className="mb-5 bg-theme-card border border-theme rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <BuildingLibraryIcon className="h-4 w-4 text-teal-300" />
            Broker-Sync
            <span className="rounded-full border border-teal-300/25 bg-teal-400/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">Beta</span>
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Zugangsdaten gehen direkt an finAPI (BaFin-lizenziert), nie an Finclue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBank ?? ''}
            onChange={e => setSelectedBank(Number(e.target.value))}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
          >
            {status.banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            type="button"
            onClick={connect}
            disabled={connecting}
            className="rounded-lg border border-teal-300/20 bg-teal-400/10 px-3 py-1.5 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white disabled:opacity-50"
          >
            {connecting ? 'Öffnet …' : hasConnection ? 'Weitere verbinden' : 'Depot verbinden'}
          </button>
          {hasConnection && (
            <button
              type="button"
              onClick={loadStatus}
              title="Verbindungen aktualisieren"
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-neutral-400 transition-colors hover:text-white"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {hasConnection && (
        <div className="mt-3 space-y-1.5">
          {status.connections.map(conn => (
            <div key={conn.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-neutral-200">
                <span className={`h-1.5 w-1.5 rounded-full ${conn.updateStatus === 'READY' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {conn.bank || `Verbindung ${conn.id}`}
                <span className="text-[11px] text-neutral-500">{conn.updateStatus === 'READY' ? 'bereit' : conn.updateStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runPreview(conn.id)}
                  disabled={previewingId !== null}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${previewingId === conn.id ? 'animate-spin' : ''}`} />
                  {previewingId === conn.id ? 'Gleicht ab …' : 'Abgleich'}
                </button>
                <button
                  type="button"
                  onClick={() => runImport(conn.id)}
                  onBlur={() => setImportArmedId(null)}
                  disabled={importingId !== null}
                  className={`rounded-lg border px-2.5 py-1 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                    importArmedId === conn.id
                      ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                      : 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:text-white'
                  }`}
                >
                  {importingId === conn.id
                    ? 'Importiert …'
                    : importArmedId === conn.id
                      ? 'Wirklich in dieses Depot importieren?'
                      : 'In dieses Depot importieren'}
                </button>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-neutral-600">
            Import übernimmt die Broker-Positionen in das aktuell ausgewählte Depot — nur möglich, wenn es leer ist.
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
