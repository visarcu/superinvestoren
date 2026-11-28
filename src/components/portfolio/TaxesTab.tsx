// src/components/portfolio/TaxesTab.tsx
// Workspace-Ansicht "Steuern": Sparerpauschbetrag, Freistellungsauftrag je
// Bank, Verlusttöpfe und Krypto-Haltefrist, geschätzt aus den Buchungen.
//
// Steuern gelten je Bank, deshalb zeigt die Ansicht immer alle Depots. Die
// Zahlen bis vor den Freibetrag kommen von /api/portfolio/taxes (FIFO,
// Einordnung der Wertpapiere), den Freibetrag rechnet die Ansicht selbst ein:
// Eine Änderung am Freistellungsauftrag wirkt sofort, gespeichert wird erst
// auf Knopfdruck.
'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { authHeaders } from '@/lib/clientAuth'
import type { Holding, Portfolio } from '@/hooks/usePortfolio'
import { DepotIcon } from '@/components/portfolio/DepotList'
import {
  DEFAULT_TAX_SETTINGS,
  saverAllowance,
  summarizeTaxYear,
  type DepotTaxYear,
  type PrivateLot,
  type TaxReportSale,
  type TaxSettings,
} from '@/lib/portfolio/taxes'
import { ChevronDownIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface TaxDepot {
  id: string
  name: string
  broker_name: string | null
  broker_type: string | null
  broker_color: string | null
}

interface TaxClassNote {
  symbol: string
  name: string
  label: string
}

interface TaxData {
  depots: TaxDepot[]
  years: number[]
  rows: DepotTaxYear[]
  privateLots: PrivateLot[]
  sales: TaxReportSale[]
  classes: TaxClassNote[]
  settings: TaxSettings
}

interface TaxesTabProps {
  holdings: Holding[]
  allPortfolios: Portfolio[]
  currentPortfolioId?: string
  formatCurrency: (value: number) => string
  /** Ändert sich mit den Buchungen (Import, neue Buchung), dann neu laden */
  reloadKey?: string | number
}

const berlinToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Hinweise erst ab dieser geschätzten Ersparnis */
const MIN_HINT_SAVING = 5

const joinNames = (names: string[]) =>
  names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`

/** "1.000", "600,50" und "600.5" verstehen */
function parseEuroInput(text: string): number {
  if (!text) return 0
  if (text.includes(',')) return Number(text.replace(/\./g, '').replace(',', '.'))
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) return Number(text.replace(/\./g, ''))
  return Number(text)
}

const sameSettings = (a: TaxSettings, b: TaxSettings) => {
  if (a.joint !== b.joint || a.churchTax !== b.churchTax) return false
  const keys = new Set([...Object.keys(a.exemptionOrders), ...Object.keys(b.exemptionOrders)])
  for (const key of keys) if ((a.exemptionOrders[key] || 0) !== (b.exemptionOrders[key] || 0)) return false
  return true
}

export default function TaxesTab({ holdings, allPortfolios, currentPortfolioId, formatCurrency, reloadKey }: TaxesTabProps) {
  const [data, setData] = useState<TaxData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [draft, setDraft] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS)
  const [orderInputs, setOrderInputs] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch('/api/portfolio/taxes', { headers: await authHeaders(), cache: 'no-store' })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json) throw new Error(json?.error || 'Steuerübersicht nicht verfügbar')
      const next = json as TaxData
      setData(next)
      setDraft(next.settings)
      setOrderInputs(Object.fromEntries(Object.entries(next.settings.exemptionOrders).map(([id, value]) => [id, String(value)])))
      setYear(prev => (prev !== null && next.years.includes(prev) ? prev : next.years[next.years.length - 1] ?? null))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Steuerübersicht nicht verfügbar')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const today = berlinToday()
  const currentYear = Number(today.slice(0, 4))
  const selectedYear = year ?? currentYear
  const summary = useMemo(
    () => (data ? summarizeTaxYear(data.rows, selectedYear, draft) : null),
    [data, selectedYear, draft],
  )
  const dirty = data ? !sameSettings(draft, data.settings) : false

  const depotById = useMemo(() => new Map((data?.depots ?? []).map(depot => [depot.id, depot])), [data])
  const portfolioById = useMemo(() => new Map(allPortfolios.map(p => [p.id, p])), [allPortfolios])
  const depotName = (id: string) => depotById.get(id)?.name ?? 'Depot'
  const iconFor = (id: string): Portfolio => {
    const known = portfolioById.get(id)
    if (known) return known
    const depot = depotById.get(id)
    return {
      id,
      name: depot?.name ?? '',
      currency: 'EUR',
      cash_position: 0,
      broker_credit: 0,
      created_at: '',
      broker_type: depot?.broker_type ?? null,
      broker_name: depot?.broker_name ?? null,
      broker_color: depot?.broker_color ?? null,
    }
  }

  const setOrder = (id: string, raw: string) => {
    const cleaned = raw.replace(/[^\d,.]/g, '')
    setOrderInputs(prev => ({ ...prev, [id]: cleaned }))
    const amount = parseEuroInput(cleaned)
    setDraft(prev => ({
      ...prev,
      exemptionOrders: { ...prev.exemptionOrders, [id]: Number.isFinite(amount) ? Math.min(Math.max(amount, 0), 2000) : 0 },
    }))
    setSaveState('idle')
  }

  const save = async () => {
    setSaveState('saving')
    try {
      const response = await fetch('/api/portfolio/taxes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(draft),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.settings) throw new Error(json?.error || 'Speichern fehlgeschlagen')
      setData(prev => (prev ? { ...prev, settings: json.settings } : prev))
      setDraft(json.settings)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-theme bg-theme-card px-6 py-12 text-center">
        <p className="text-sm font-medium text-theme-primary">{error}</p>
        <button onClick={load} className="mt-3 rounded-lg border border-theme px-3 py-1.5 text-xs text-theme-secondary hover:bg-theme-hover">
          Erneut laden
        </button>
      </div>
    )
  }

  if (!data || !summary) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-theme bg-theme-card" />
        ))}
      </div>
    )
  }

  if (data.depots.length === 0) {
    return (
      <div className="rounded-xl border border-theme bg-theme-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-theme-primary">Noch keine Depots</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-theme-muted">Sobald ein Depot mit Buchungen angelegt ist, siehst du hier Freibetrag und Verlusttöpfe.</p>
      </div>
    )
  }

  const yearRows = data.rows.filter(row => row.year === selectedYear)
  const isCurrentYear = selectedYear === currentYear
  const lossDeadline = `${currentYear}-12-15`
  const noOrders = summary.ordersTotal === 0
  // Ohne Freistellungsaufträge sähe jeder Ertrag versteuert aus, die Hinweise
  // über mehrere Banken wären dann falsch. Kleinstbeträge lohnen den Aufwand nicht.
  const lossHints = noOrders ? [] : summary.lossCertificates.filter(hint => hint.saving >= MIN_HINT_SAVING)
  const showLossHints = isCurrentYear && today <= lossDeadline && lossHints.length > 0
  const reallocation = !noOrders && summary.reallocation && summary.reallocation.saving >= MIN_HINT_SAVING ? summary.reallocation : null
  const taxedDepots = yearRows.filter(row => (summary.byDepot.get(row.portfolioId)?.taxable ?? 0) > 0.5).map(row => row.portfolioId)
  const unusedDepots = yearRows
    .filter(row => (summary.byDepot.get(row.portfolioId)?.taxable ?? 0) < 0.5 && (summary.byDepot.get(row.portfolioId)?.left ?? 0) > 0.5)
    .map(row => row.portfolioId)
  const overAssigned = summary.ordersTotal > summary.allowance + 0.005
  const incomplete = yearRows.reduce((sum, row) => sum + row.incompleteSales, 0)

  const allowance = summary.allowance
  const usedPct = allowance > 0 ? Math.min(100, (summary.used / allowance) * 100) : 0
  const leftPct = allowance > 0 ? Math.min(100 - usedPct, (summary.left / allowance) * 100) : 0

  // Krypto: Lose mit aktuellem Wert aus den Positionen des Workspace
  const priceByKey = new Map<string, number>()
  for (const h of holdings) {
    if (h.quantity > 0 && h.value > 0 && !h.price_missing) priceByKey.set(`${h.portfolio_id ?? ''}|${h.symbol.toUpperCase()}`, h.value / h.quantity)
  }
  const singleDepotPrice = new Map<string, number>()
  for (const h of holdings) {
    if (h.quantity > 0 && h.value > 0 && !h.price_missing) singleDepotPrice.set(h.symbol.toUpperCase(), h.value / h.quantity)
  }
  const lotPrice = (lot: PrivateLot) =>
    priceByKey.get(`${lot.portfolioId}|${lot.symbol}`) ?? (currentPortfolioId === lot.portfolioId ? singleDepotPrice.get(lot.symbol) : undefined)
  const showCrypto = data.privateLots.length > 0 || Math.abs(summary.privateShortTerm) > 0.005 || Math.abs(summary.privateLongTerm) > 0.005

  const yearSales = data.sales.filter(sale => sale.year === selectedYear)

  return (
    <div className="space-y-4">
      {/* Freibetrag */}
      <div className="rounded-xl border border-theme bg-theme-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-theme-primary">Steuern · {selectedYear}</h2>
            <p className="mt-0.5 text-xs text-theme-muted">Geschätzt aus deinen Buchungen, alle Depots zusammen</p>
          </div>
          {data.years.length > 1 && (
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-theme p-0.5">
              {[...data.years].reverse().map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors ${
                    selectedYear === y ? 'bg-theme-hover text-theme-primary' : 'text-theme-muted hover:text-theme-primary'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
          <span className="text-theme-secondary">
            Sparerpauschbetrag <span className="font-semibold tabular-nums text-theme-primary">{formatCurrency(allowance)}</span>
            {draft.joint ? ' (zusammen veranlagt)' : ''}
          </span>
          <span className="tabular-nums text-theme-muted">{formatCurrency(summary.used)} genutzt</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-theme-secondary" aria-hidden="true">
          <div className="h-full bg-emerald-500" style={{ width: `${usedPct}%` }} />
          <div className="h-full bg-emerald-500/25" style={{ width: `${leftPct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-theme-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />genutzt</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500/25" />frei per Freistellungsauftrag</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-theme-secondary ring-1 ring-theme" />nicht verteilt</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Genutzt" value={formatCurrency(summary.used)} />
          <Metric
            label="Noch frei"
            value={formatCurrency(summary.left + summary.unassigned)}
            valueClass="text-emerald-400"
            hint={summary.unassigned > 0.005 ? `${formatCurrency(summary.unassigned)} nicht verteilt` : undefined}
          />
          <Metric label="Über Freibetrag" value={formatCurrency(summary.taxable)} valueClass={summary.taxable > 0.005 ? 'text-amber-400' : undefined} />
          <Metric label="Steuer geschätzt" value={formatCurrency(summary.tax)} hint={draft.churchTax ? `mit ${draft.churchTax} % Kirchensteuer` : 'mit Soli'} />
          <Metric label="Verlusttopf Aktien" value={formatCurrency(summary.carryOutStock)} valueClass={summary.carryOutStock > 0.005 ? 'text-red-400' : undefined} />
          <Metric label="Verlusttopf allgemein" value={formatCurrency(summary.carryOutOther)} valueClass={summary.carryOutOther > 0.005 ? 'text-red-400' : undefined} />
        </div>
      </div>

      {/* Hinweise fürs laufende Jahr */}
      {isCurrentYear && (noOrders || overAssigned || showLossHints || reallocation) && (
        <div className="space-y-2">
          {noOrders && (
            <Hint tone="info" title="Trag deine Freistellungsaufträge ein">
              Unten bei „Deine Angaben“ trägst du ein, wie viel Freistellungsauftrag du bei welcher Bank erteilt hast. Erst dann sehen wir, wo der Freibetrag noch reicht.
            </Hint>
          )}
          {overAssigned && (
            <Hint tone="warn" title="Mehr verteilt als erlaubt">
              Du hast {formatCurrency(summary.ordersTotal)} auf deine Depots verteilt, erlaubt sind {formatCurrency(summary.allowance)}. Die Banken prüfen das nicht gegeneinander, das Finanzamt schon.
            </Hint>
          )}
          {showLossHints && lossHints.map(hint => (
            <Hint key={hint.portfolioId} tone="action" title={`Verlustbescheinigung bei ${depotName(hint.portfolioId)} bis 15. Dezember`}>
              Bei {depotName(hint.portfolioId)} liegen {formatCurrency(hint.stockLoss + hint.otherLoss)} im Verlusttopf
              {hint.stockLoss > 0.005 && hint.otherLoss > 0.005 ? ` (${formatCurrency(hint.stockLoss)} Aktien, ${formatCurrency(hint.otherLoss)} allgemein)` : ''},
              während bei deinen anderen Depots Gewinne versteuert werden. Mit einer Verlustbescheinigung verrechnest du davon bis zu {formatCurrency(hint.offsettable)} in
              der Steuererklärung, das spart etwa {formatCurrency(hint.saving)}. Ohne Bescheinigung bleibt der Verlust im Topf dieser Bank und wartet auf künftige Gewinne dort.
              Mit Bescheinigung startet der Topf im neuen Jahr leer.
            </Hint>
          ))}
          {reallocation && (
            <Hint tone="action" title="Freistellungsaufträge anpassen">
              Bei {joinNames(taxedDepots.map(depotName))} liegen {formatCurrency(reallocation.taxedAbove)} über dem Freistellungsauftrag, gleichzeitig sind{' '}
              {formatCurrency(reallocation.unusedElsewhere)} Freibetrag ungenutzt
              {unusedDepots.length > 0 ? ` (bei ${joinNames(unusedDepots.map(depotName))}${summary.unassigned > 0.5 ? ', dazu der nicht verteilte Rest' : ''})` : summary.unassigned > 0.5 ? ', weil er noch nicht verteilt ist' : ''}.
              Erhöhst du den Freistellungsauftrag dort um {formatCurrency(reallocation.movable)}{unusedDepots.length > 0 ? ' und senkst ihn, wo er ungenutzt bleibt' : ''},
              sparst du etwa {formatCurrency(reallocation.saving)}. Eine Änderung bis 31. Dezember gilt fürs ganze Jahr, die Bank erstattet dann die zu viel gezahlte Steuer.
            </Hint>
          )}
        </div>
      )}

      {/* Je Depot */}
      <div className="overflow-hidden rounded-xl border border-theme bg-theme-card">
        <div className="border-b border-theme px-5 py-3">
          <h3 className="text-xs font-semibold text-theme-primary">Je Bank</h3>
          <p className="mt-0.5 text-[11px] text-theme-muted">Jede Bank verrechnet nur ihre eigenen Gewinne und Verluste. Klick auf ein Depot zeigt die Zusammensetzung.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">
                <th className="px-5 py-2 text-left font-medium">Depot</th>
                <th className="px-3 py-2 text-right font-medium" title="Gewinne, Dividenden und Zinsen nach Verrechnung mit Verlusten">Erträge</th>
                <th className="px-3 py-2 text-right font-medium">Freistellung</th>
                <th className="px-3 py-2 text-right font-medium">Genutzt</th>
                <th className="px-3 py-2 text-right font-medium">Noch frei</th>
                <th className="px-3 py-2 text-right font-medium">Darüber</th>
                <th className="px-3 py-2 text-right font-medium" title="Verlusttopf Aktien / allgemein zum Jahresende">Verlusttöpfe</th>
                <th className="px-5 py-2 text-right font-medium" title="Abzüge minus Erstattungen laut Buchungen, inklusive Quellensteuer">Laut Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {data.depots.map(depot => {
                const row = yearRows.find(r => r.portfolioId === depot.id)
                const result = summary.byDepot.get(depot.id)
                if (!row || !result) return null
                const isOpen = expanded === depot.id
                const highlighted = currentPortfolioId === depot.id
                return (
                  <React.Fragment key={depot.id}>
                    <tr
                      onClick={() => setExpanded(isOpen ? null : depot.id)}
                      className={`cursor-pointer tabular-nums transition-colors hover:bg-theme-hover ${highlighted || isOpen ? 'bg-theme-hover' : ''}`}
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <DepotIcon depot={iconFor(depot.id)} size={24} />
                          <span className="max-w-[180px] truncate font-medium text-theme-primary">{depot.name}</span>
                          <ChevronDownIcon className={`h-3.5 w-3.5 shrink-0 text-theme-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-theme-primary">{formatCurrency(row.taxableBeforeAllowance)}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{result.order > 0 ? formatCurrency(result.order) : '–'}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">{formatCurrency(result.used)}</td>
                      <td className={`px-3 py-2.5 text-right ${result.left > 0.005 ? 'text-emerald-400' : 'text-theme-muted'}`}>{formatCurrency(result.left)}</td>
                      <td className={`px-3 py-2.5 text-right ${result.taxable > 0.005 ? 'font-semibold text-amber-400' : 'text-theme-muted'}`}>{formatCurrency(result.taxable)}</td>
                      <td className="px-3 py-2.5 text-right text-theme-secondary">
                        <span className={row.carryOutStock > 0.005 ? 'text-red-400' : ''}>{formatCurrency(row.carryOutStock)}</span>
                        <span className="text-theme-muted"> / </span>
                        <span className={row.carryOutOther > 0.005 ? 'text-red-400' : ''}>{formatCurrency(row.carryOutOther)}</span>
                      </td>
                      <td className="px-5 py-2.5 text-right text-theme-muted">{Math.abs(row.withheld) > 0.005 ? formatCurrency(row.withheld) : '–'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="px-5 py-4">
                          <DepotBreakdown
                            row={row}
                            sales={yearSales.filter(sale => sale.portfolioId === depot.id)}
                            formatCurrency={formatCurrency}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {incomplete > 0 && (
          <p className="flex items-start gap-1.5 border-t border-theme px-5 py-2.5 text-[11px] text-amber-400">
            <ExclamationTriangleIcon className="mt-px h-3.5 w-3.5 shrink-0" />
            Bei {incomplete} {incomplete === 1 ? 'Verkauf fehlt' : 'Verkäufen fehlt'} der Kauf oder der Einstand in den Buchungen. Der Gewinn dazu ist nicht oder nur teilweise enthalten.
          </p>
        )}
      </div>

      {/* Angaben */}
      <div className="rounded-xl border border-theme bg-theme-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-theme-primary">Deine Angaben</h3>
            <p className="mt-0.5 text-[11px] text-theme-muted">Gelten für alle Jahre. Den Freistellungsauftrag siehst du in der App oder im Postfach deiner Bank.</p>
          </div>
          <div className="flex items-center gap-2">
            {saveState === 'saved' && !dirty && <span className="text-[11px] text-emerald-400">Gespeichert</span>}
            {saveState === 'error' && <span className="text-[11px] text-red-400">Speichern fehlgeschlagen</span>}
            <button
              onClick={save}
              disabled={!dirty || saveState === 'saving'}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:bg-emerald-600 disabled:cursor-default disabled:opacity-40"
            >
              {saveState === 'saving' ? 'Speichert …' : 'Speichern'}
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Veranlagung</p>
              <Segmented
                value={draft.joint ? 'joint' : 'single'}
                options={[
                  { value: 'single', label: `Einzeln · ${formatCurrency(saverAllowance(selectedYear, false))}` },
                  { value: 'joint', label: `Zusammen · ${formatCurrency(saverAllowance(selectedYear, true))}` },
                ]}
                onChange={value => {
                  setDraft(prev => ({ ...prev, joint: value === 'joint' }))
                  setSaveState('idle')
                }}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Kirchensteuer</p>
              <Segmented
                value={String(draft.churchTax)}
                options={[
                  { value: '0', label: 'Keine' },
                  { value: '8', label: '8 %' },
                  { value: '9', label: '9 %' },
                ]}
                onChange={value => {
                  setDraft(prev => ({ ...prev, churchTax: Number(value) as 0 | 8 | 9 }))
                  setSaveState('idle')
                }}
              />
              <p className="mt-1 text-[11px] text-theme-muted">8 % in Bayern und Baden-Württemberg, sonst 9 %.</p>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Freistellungsauftrag je Bank</p>
              <p className={`text-[11px] tabular-nums ${overAssigned ? 'text-red-400' : 'text-theme-muted'}`}>
                {formatCurrency(summary.ordersTotal)} von {formatCurrency(summary.allowance)} verteilt
              </p>
            </div>
            <div className="divide-y divide-theme rounded-lg border border-theme">
              {data.depots.map(depot => (
                <label key={depot.id} className="flex items-center gap-2.5 px-3 py-2">
                  <DepotIcon depot={iconFor(depot.id)} size={22} />
                  <span className="min-w-0 flex-1 truncate text-xs text-theme-primary">{depot.name}</span>
                  <span className="relative">
                    <input
                      inputMode="decimal"
                      value={orderInputs[depot.id] ?? ''}
                      placeholder="0"
                      onChange={event => setOrder(depot.id, event.target.value)}
                      className="w-24 rounded-md border border-theme bg-theme-secondary py-1 pl-2 pr-6 text-right text-xs tabular-nums text-theme-primary outline-none focus:border-emerald-500"
                      aria-label={`Freistellungsauftrag ${depot.name}`}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-theme-muted">€</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Krypto */}
      {showCrypto && (
        <div className="overflow-hidden rounded-xl border border-theme bg-theme-card">
          <div className="border-b border-theme px-5 py-3">
            <h3 className="text-xs font-semibold text-theme-primary">Krypto · Haltefrist</h3>
            <p className="mt-0.5 text-[11px] text-theme-muted">
              Direkt gehaltene Kryptowerte sind nach einem Jahr steuerfrei. Gewinne davor bleiben steuerfrei bis zur Freigrenze von {formatCurrency(summary.privateLimit)} im Jahr,
              darüber zählt der ganze Betrag zum persönlichen Steuersatz. Krypto-ETPs rechnen die Banken wie andere Wertpapiere ab.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-3">
            <Metric
              label={`Innerhalb eines Jahres · ${selectedYear}`}
              value={formatCurrency(summary.privateShortTerm)}
              valueClass={summary.privateShortTerm > summary.privateLimit ? 'text-amber-400' : undefined}
              hint={summary.privateShortTerm > summary.privateLimit ? 'über der Freigrenze, voll steuerpflichtig' : 'unter der Freigrenze, steuerfrei'}
            />
            <Metric label={`Nach Haltefrist · ${selectedYear}`} value={formatCurrency(summary.privateLongTerm)} hint="steuerfrei" />
          </div>
          {data.privateLots.length > 0 && (
            <div className="overflow-x-auto border-t border-theme">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-theme-muted">
                    <th className="px-5 py-2 text-left font-medium">Kryptowert</th>
                    <th className="px-3 py-2 text-right font-medium">Stück</th>
                    <th className="px-3 py-2 text-right font-medium">Gekauft</th>
                    <th className="px-3 py-2 text-right font-medium">Steuerfrei ab</th>
                    <th className="px-5 py-2 text-right font-medium">Gewinn bisher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {data.privateLots.map((lot, index) => {
                    const price = lotPrice(lot)
                    const gain = price !== undefined && lot.unitCost !== null ? (price - lot.unitCost) * lot.quantity : null
                    const free = today >= lot.taxFreeFrom
                    const daysLeft = Math.ceil((Date.parse(lot.taxFreeFrom) - Date.parse(today)) / 86_400_000)
                    return (
                      <tr key={`${lot.portfolioId}-${lot.symbol}-${index}`} className="tabular-nums">
                        <td className="px-5 py-2.5">
                          <p className="font-medium text-theme-primary">{lot.name}</p>
                          <p className="text-[10px] text-theme-muted">{depotName(lot.portfolioId)}</p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-theme-secondary">{lot.quantity.toLocaleString('de-DE', { maximumFractionDigits: 8 })}</td>
                        <td className="px-3 py-2.5 text-right text-theme-secondary">{formatDate(lot.acquired)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <p className={free ? 'text-emerald-400' : 'text-theme-primary'}>{free ? 'steuerfrei' : formatDate(lot.taxFreeFrom)}</p>
                          {!free && <p className="text-[10px] text-theme-muted">in {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tagen'}</p>}
                        </td>
                        <td className={`px-5 py-2.5 text-right ${gain === null ? 'text-theme-muted' : gain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {gain === null ? '–' : `${gain > 0 ? '+' : ''}${formatCurrency(gain)}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* So rechnen wir */}
      <div className="rounded-xl border border-theme bg-theme-card px-5 py-4 text-[11px] leading-relaxed text-theme-muted">
        <p className="mb-1.5 flex items-center gap-1.5 font-medium text-theme-secondary">
          <InformationCircleIcon className="h-3.5 w-3.5" />
          So rechnen wir
        </p>
        <p>
          Verkäufe nach FIFO je Depot, wie es die Banken tun. Aktienverluste verrechnen wir nur mit Aktiengewinnen, alle anderen Verluste mit allem. Bei Aktien-ETFs und
          Aktienfonds sind 30 % steuerfrei (Teilfreistellung), Aktien aus der Zeit vor 2009 ganz. Dividenden zählen brutto vor Quellensteuer. Verlusttöpfe laufen ins nächste
          Jahr weiter, als hättest du keine Verlustbescheinigung beantragt. Nicht enthalten sind die Vorabpauschale, die Anrechnung der Quellensteuer und Mischfonds.
        </p>
        {data.classes.length > 0 && (
          <p className="mt-2">
            Geschätzt eingeordnet: {data.classes.slice(0, 8).map(entry => `${entry.name} (${entry.label})`).join(', ')}
            {data.classes.length > 8 ? ` und ${data.classes.length - 8} weitere` : ''}.
          </p>
        )}
        <p className="mt-2">Das ist eine Schätzung aus deinen importierten Buchungen und keine Steuerberatung. Maßgeblich sind die Abrechnungen deiner Banken.</p>
      </div>
    </div>
  )
}

function DepotBreakdown({ row, sales, formatCurrency }: { row: DepotTaxYear; sales: TaxReportSale[]; formatCurrency: (v: number) => string }) {
  const lines: Array<[string, number, string?]> = [
    ['Aktiengewinne', row.stockGains],
    ['Aktienverluste', -row.stockLosses],
    ['Andere Gewinne (ETFs, Fonds, ETCs)', row.otherGains],
    ['Andere Verluste', -row.otherLosses],
    ['Dividenden und Ausschüttungen', row.dividends],
    ['Zinsen', row.interest],
    ['Verlusttopf Aktien aus dem Vorjahr', -row.carryInStock],
    ['Verlusttopf allgemein aus dem Vorjahr', -row.carryInOther],
  ]
  const free: Array<[string, number]> = [
    ['Teilfreistellung', row.exempted],
    ['Altbestand vor 2009', row.grandfathered],
  ]
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Zusammensetzung</p>
        <dl className="space-y-1">
          {lines.filter(([, value]) => Math.abs(value) > 0.005).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 tabular-nums">
              <dt className="text-theme-secondary">{label}</dt>
              <dd className={value < 0 ? 'text-red-400' : 'text-theme-primary'}>{formatCurrency(value)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 border-t border-theme pt-1 font-semibold tabular-nums">
            <dt className="text-theme-primary">Erträge nach Verrechnung</dt>
            <dd className="text-theme-primary">{formatCurrency(row.taxableBeforeAllowance)}</dd>
          </div>
          {free.filter(([, value]) => Math.abs(value) > 0.005).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 tabular-nums text-theme-muted">
              <dt>{label} (steuerfrei)</dt>
              <dd>{formatCurrency(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">Verkäufe ({sales.length})</p>
        {sales.length === 0 ? (
          <p className="text-theme-muted">Keine Verkäufe in diesem Jahr.</p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {sales.map(sale => (
              <div key={sale.id} className="flex items-center justify-between gap-3 tabular-nums">
                <div className="min-w-0">
                  <p className="truncate text-theme-primary">{sale.name}</p>
                  <p className="text-[10px] text-theme-muted">
                    {new Date(`${sale.date}T12:00:00Z`).toLocaleDateString('de-DE')} · {sale.label}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {sale.gain === null ? (
                    <p className="text-amber-400">Einstand fehlt</p>
                  ) : (
                    <>
                      <p className={sale.gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>{`${sale.gain > 0 ? '+' : ''}${formatCurrency(sale.gain)}`}</p>
                      {sale.taxableGain !== null && Math.abs(sale.taxableGain - sale.gain) > 0.005 && (
                        <p className="text-[10px] text-theme-muted">steuerlich {formatCurrency(sale.taxableGain)}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, valueClass, hint }: { label: string; value: string; valueClass?: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-theme-muted">{label}</p>
      <p className={`mt-1 truncate text-[15px] font-semibold tabular-nums ${valueClass ?? 'text-theme-primary'}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-theme-muted">{hint}</p>}
    </div>
  )
}

function Hint({ tone, title, children }: { tone: 'info' | 'warn' | 'action'; title: string; children: React.ReactNode }) {
  const toneClass =
    tone === 'warn' ? 'border-red-500/30 bg-red-500/5' : tone === 'action' ? 'border-amber-500/30 bg-amber-500/5' : 'border-theme bg-theme-card'
  const iconClass = tone === 'warn' ? 'text-red-400' : tone === 'action' ? 'text-amber-400' : 'text-theme-muted'
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${toneClass}`}>
      {tone === 'info' ? (
        <InformationCircleIcon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
      ) : (
        <ExclamationTriangleIcon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-theme-primary">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-theme-secondary">{children}</p>
      </div>
    </div>
  )
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-theme p-0.5">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors ${
            value === option.value ? 'bg-theme-hover text-theme-primary' : 'text-theme-muted hover:text-theme-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
