// src/components/FundamentalAlertsButton.tsx
// Glocken-Button + Modal für Fundamental-Alerts auf der Aktienseite.
// Kennzahlen-Alerts (KGV, Margen, ...) mit Schwelle sowie Event-Alerts
// (Superinvestor-Aktivität, Insider-Cluster-Buy). Geprüft wird täglich
// serverseitig; benachrichtigt wird nur beim Über-/Unterschreiten.
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BellAlertIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import {
  EVENT_METRICS,
  METRIC_INFO,
  VALUE_METRICS,
  formatMetricValue,
  isValueMetric,
  type FundamentalAlertRow,
  type FundamentalMetric,
} from '@/lib/fundamentalAlerts'

interface Props {
  ticker: string
}

export default function FundamentalAlertsButton({ ticker }: Props) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<FundamentalAlertRow[]>([])
  const [values, setValues] = useState<Partial<Record<FundamentalMetric, number | null>>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [premiumRequired, setPremiumRequired] = useState(false)
  const [betaEnabled, setBetaEnabled] = useState(true)

  // Formular
  const [metric, setMetric] = useState<FundamentalMetric>('pe')
  const [condition, setCondition] = useState<'below' | 'above'>('below')
  const [threshold, setThreshold] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token ?? null
      setToken(accessToken)
      if (!accessToken) return

      const headers = { Authorization: `Bearer ${accessToken}` }
      const [alertsRes, metricsRes] = await Promise.all([
        fetch(`/api/fundamental-alerts?symbol=${ticker}`, { headers }),
        fetch(`/api/fundamental-alerts/metrics/${ticker}`, { headers }),
      ])
      if (alertsRes.ok) {
        const d = await alertsRes.json()
        setAlerts(d.alerts ?? [])
        setBetaEnabled(d.enabled !== false)
      }
      if (metricsRes.ok) {
        const d = await metricsRes.json()
        setValues(d.values ?? {})
      }
    } catch {
      setError('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  // Schwelle mit aktuellem Wert vorbefüllen, wenn die Metrik wechselt
  useEffect(() => {
    if (!isValueMetric(metric)) return
    const v = values[metric]
    if (v != null && Number.isFinite(v)) {
      setThreshold(v.toLocaleString('de-DE', { maximumFractionDigits: 1, useGrouping: false }))
    } else {
      setThreshold('')
    }
  }, [metric, values])

  const createAlert = async () => {
    if (!token) return
    setSaving(true)
    setError(null)
    setPremiumRequired(false)
    try {
      const body: Record<string, unknown> = { symbol: ticker, metric }
      if (isValueMetric(metric)) {
        const parsed = parseFloat(threshold.replace(',', '.'))
        if (!Number.isFinite(parsed)) {
          setError('Bitte eine gültige Schwelle eingeben')
          setSaving(false)
          return
        }
        body.condition = condition
        body.threshold = parsed
      }
      const res = await fetch('/api/fundamental-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setAlerts(prev => [d.alert, ...prev])
      } else {
        setError(d.error || 'Alert konnte nicht erstellt werden')
        if (d.premiumRequired) setPremiumRequired(true)
      }
    } catch {
      setError('Alert konnte nicht erstellt werden')
    } finally {
      setSaving(false)
    }
  }

  const deleteAlert = async (id: string) => {
    if (!token) return
    const res = await fetch(`/api/fundamental-alerts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const describeAlert = (a: FundamentalAlertRow): string => {
    if (isValueMetric(a.metric)) {
      const dir = a.condition === 'below' ? 'unter' : 'über'
      return `${METRIC_INFO[a.metric].label} ${dir} ${formatMetricValue(a.metric, Number(a.threshold))}`
    }
    return METRIC_INFO[a.metric].label
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-secondary text-sm font-medium transition-colors"
        title="Fundamental-Alerts für diese Aktie"
      >
        <BellAlertIcon className="w-4 h-4" />
        <span>Alerts</span>
        {alerts.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-brand/20 text-brand-light text-xs font-bold">
            {alerts.filter(a => a.active).length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-theme-card border border-theme-light rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme-light">
              <div>
                <p className="text-sm font-semibold text-theme-primary">Fundamental-Alerts · {ticker}</p>
                <p className="text-xs text-theme-muted mt-0.5">Täglich geprüft, benachrichtigt beim Zustandswechsel</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-theme-secondary/30 text-theme-muted"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {!token && !loading ? (
              <p className="px-5 py-6 text-sm text-theme-secondary">Bitte melde dich an, um Alerts zu erstellen.</p>
            ) : !betaEnabled ? (
              <p className="px-5 py-6 text-sm text-theme-secondary">
                Fundamental-Alerts sind aktuell in einer privaten Beta und bald für alle verfügbar.
              </p>
            ) : (
              <>
                {/* Neuer Alert */}
                <div className="px-5 py-4 border-b border-theme-light space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={metric}
                      onChange={e => setMetric(e.target.value as FundamentalMetric)}
                      className="flex-1 bg-theme-secondary/30 border border-theme-light rounded-lg px-3 py-2 text-sm text-theme-primary"
                    >
                      <optgroup label="Kennzahlen">
                        {VALUE_METRICS.map(m => (
                          <option key={m} value={m}>
                            {METRIC_INFO[m].label}
                            {values[m] != null ? ` · aktuell ${formatMetricValue(m, values[m])}` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Smart Money">
                        {EVENT_METRICS.map(m => (
                          <option key={m} value={m}>{METRIC_INFO[m].label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {isValueMetric(metric) ? (
                    <div className="flex gap-2">
                      <select
                        value={condition}
                        onChange={e => setCondition(e.target.value as 'below' | 'above')}
                        className="bg-theme-secondary/30 border border-theme-light rounded-lg px-3 py-2 text-sm text-theme-primary"
                      >
                        <option value="below">fällt unter</option>
                        <option value="above">steigt über</option>
                      </select>
                      <div className="relative flex-1">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={threshold}
                          onChange={e => setThreshold(e.target.value)}
                          placeholder="Schwelle"
                          className="w-full bg-theme-secondary/30 border border-theme-light rounded-lg px-3 py-2 text-sm text-theme-primary"
                        />
                        {METRIC_INFO[metric].unit === '%' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-theme-muted">%</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-theme-muted">{METRIC_INFO[metric].hint}</p>
                  )}

                  {error && (
                    <p className="text-xs text-red-400">
                      {error}
                      {premiumRequired && (
                        <>
                          {' '}
                          <Link href="/pricing" className="text-brand-light underline">Premium holen</Link>
                        </>
                      )}
                    </p>
                  )}

                  <button
                    onClick={createAlert}
                    disabled={saving || loading}
                    className="w-full btn-primary py-2 text-sm disabled:opacity-50"
                  >
                    {saving ? 'Wird erstellt…' : 'Alert erstellen'}
                  </button>
                </div>

                {/* Bestehende Alerts */}
                <div className="max-h-64 overflow-y-auto">
                  {loading ? (
                    <p className="px-5 py-4 text-xs text-theme-muted">Lade…</p>
                  ) : alerts.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-theme-muted">Noch keine Alerts für {ticker}.</p>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-theme-light/50 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-theme-primary truncate">{describeAlert(a)}</p>
                          <p className="text-xs text-theme-muted">
                            {a.triggered_at
                              ? `Zuletzt ausgelöst am ${new Date(a.triggered_at).toLocaleDateString('de-DE')}`
                              : a.last_state
                                ? `Aktueller Stand: ${isValueMetric(a.metric) ? formatMetricValue(a.metric, a.last_value != null ? Number(a.last_value) : null) : '–'}`
                                : 'Wird beim nächsten Check armiert'}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteAlert(a.id)}
                          className="p-1.5 rounded-lg hover:bg-theme-secondary/30 text-theme-muted hover:text-red-400"
                          title="Alert löschen"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
