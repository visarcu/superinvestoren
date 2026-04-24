'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import NewDepotModal from '../../_components/NewDepotModal'
import Modal from '../../_components/Modal'
import DepotRowMenu from './DepotRowMenu'

interface DepotSummary {
  id: string
  name: string
  cash_position: number
  broker_credit: number
  is_default: boolean
  broker_type: string | null
  broker_name: string | null
  broker_color: string | null
  positionsCount: number
  stockValue: number
  totalValue: number
}

export default function DepotsClient() {
  const router = useRouter()
  const [depots, setDepots] = useState<DepotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewDepot, setShowNewDepot] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmAction, setConfirmAction] = useState<{
    kind: 'clear' | 'delete'
    depot: DepotSummary
  } | null>(null)
  const [actionRunning, setActionRunning] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  const runAction = useCallback(async () => {
    if (!confirmAction) return
    const { kind, depot } = confirmAction
    setActionRunning(true)
    setActionError(null)
    try {
      // FK-Referenzen zuerst löschen
      await supabase.from('portfolio_holdings').delete().eq('portfolio_id', depot.id)
      await supabase
        .from('portfolio_transactions')
        .delete()
        .eq('portfolio_id', depot.id)

      if (kind === 'delete') {
        const { error: delErr } = await supabase
          .from('portfolios')
          .delete()
          .eq('id', depot.id)
        if (delErr) throw delErr
      } else {
        // leeren: Cash + Kredit zurücksetzen
        const { error: updErr } = await supabase
          .from('portfolios')
          .update({ cash_position: 0, broker_credit: 0 })
          .eq('id', depot.id)
        if (updErr) throw updErr
      }

      setConfirmAction(null)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Ausführen')
    } finally {
      setActionRunning(false)
    }
  }, [confirmAction, reload])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user) {
          router.replace('/auth/signin')
          return
        }

        // Portfolios laden
        const { data: portfolios, error: pfErr } = await supabase
          .from('portfolios')
          .select('id, name, cash_position, broker_credit, is_default, broker_type, broker_name, broker_color')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true })

        if (pfErr) throw pfErr
        if (!portfolios || portfolios.length === 0) {
          if (!cancelled) {
            setDepots([])
            setLoading(false)
          }
          return
        }

        // Holdings + Quotes pro Depot aggregieren
        const summaries: DepotSummary[] = []
        for (const p of portfolios) {
          const { data: holdings } = await supabase
            .from('portfolio_holdings')
            .select('symbol, quantity, purchase_price')
            .eq('portfolio_id', p.id)

          const positionsCount = holdings?.length ?? 0
          let stockValue = 0

          // NaN-safe Helper: alle Holdings-Werte sind optional null/undefined
          const safe = (v: any) => {
            const n = Number(v)
            return Number.isFinite(n) ? n : 0
          }

          if (holdings && holdings.length > 0) {
            const symbolList = holdings
              .map(h => (h.symbol || '').trim())
              .filter(Boolean)
            const symbols = [...new Set(symbolList)].join(',')
            let quoteMap: Record<string, number> = {}

            if (symbols) {
              try {
                const res = await fetch(`/api/v1/quotes/batch?symbols=${symbols}`)
                if (res.ok) {
                  const data = await res.json()
                  for (const q of data.quotes || []) {
                    if (q.price && Number.isFinite(q.price)) {
                      quoteMap[q.symbol] = Number(q.price)
                    }
                  }
                }
              } catch {
                // fallback: purchase_price
              }
            }

            stockValue = holdings.reduce((s, h) => {
              const qty = safe(h.quantity)
              if (qty === 0) return s
              const pricePerShare =
                quoteMap[h.symbol] ?? safe(h.purchase_price)
              return s + safe(pricePerShare) * qty
            }, 0)
          }

          const totalValue =
            safe(stockValue) + safe(p.cash_position) - safe(p.broker_credit)

          summaries.push({
            ...p,
            cash_position: safe(p.cash_position),
            broker_credit: safe(p.broker_credit),
            positionsCount,
            stockValue: safe(stockValue),
            totalValue: Number.isFinite(totalValue) ? totalValue : 0,
          })
        }

        if (!cancelled) setDepots(summaries)
      } catch (err) {
        console.error('[DepotsClient]', err)
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router, reloadKey])

  const total = depots.reduce((s, d) => s + d.totalValue, 0)

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            aria-label="Zurück"
          >
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Depots</h1>
            <p className="text-[12px] text-white/25">
              {depots.length} {depots.length === 1 ? 'Depot' : 'Depots'} verwalten
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewDepot(true)}
          className="px-3 py-1.5 text-[11px] text-white bg-white/[0.08] border border-white/[0.1] rounded-lg hover:bg-white/[0.12] transition-all"
        >
          + Neues Depot
        </button>
      </header>

      <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        ) : depots.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/30 text-[14px]">Noch kein Depot</p>
            <p className="text-white/30 text-[12px] mt-1">
              Erstelle dein erstes Depot, um Holdings hinzuzufügen.
            </p>
            <button
              onClick={() => setShowNewDepot(true)}
              className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
            >
              + Neues Depot
            </button>
          </div>
        ) : (
          <>
            {/* Total */}
            <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mb-6">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Gesamtvermögen über alle Depots</p>
              <p className="text-3xl font-bold text-white tabular-nums mt-1">
                {total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
            </div>

            {/* Depot-Liste */}
            <div className="space-y-3">
              {depots.map(d => (
                <div
                  key={d.id}
                  className="relative bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.08] transition-all"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {d.broker_color && (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: d.broker_color }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-white">{d.name}</p>
                          {d.is_default && (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                              Standard
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          {d.broker_name ?? 'Eigenes Depot'} ·{' '}
                          {d.positionsCount === 0
                            ? 'Keine Positionen'
                            : `${d.positionsCount} ${d.positionsCount === 1 ? 'Position' : 'Positionen'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <p className="text-[16px] font-bold text-white tabular-nums">
                          {d.totalValue.toLocaleString('de-DE', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </p>
                        <p className="text-[10px] text-white/25 tabular-nums">
                          Aktien {d.stockValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € · Cash{' '}
                          {(d.cash_position ?? 0).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
                        </p>
                      </div>
                      <DepotRowMenu
                        onClear={() => {
                          setActionError(null)
                          setConfirmAction({ kind: 'clear', depot: d })
                        }}
                        onDelete={() => {
                          setActionError(null)
                          setConfirmAction({ kind: 'delete', depot: d })
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.03]">
                    <Link
                      href={`/analyse/mein-portfolio?depot=${d.id}`}
                      className="px-3 py-1.5 text-[11px] text-white/60 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white rounded-lg transition-all"
                    >
                      Öffnen
                    </Link>
                    <Link
                      href={`/analyse/mein-portfolio/einstellungen?depot=${d.id}`}
                      className="px-3 py-1.5 text-[11px] text-white/40 bg-white/[0.02] hover:bg-white/[0.06] hover:text-white/70 rounded-lg transition-all"
                    >
                      Einstellungen
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <NewDepotModal
        open={showNewDepot}
        onClose={() => setShowNewDepot(false)}
        onCreated={() => reload()}
      />

      <Modal
        open={!!confirmAction}
        title={confirmAction?.kind === 'delete' ? 'Depot löschen' : 'Depot leeren'}
        subtitle={confirmAction ? confirmAction.depot.name : ''}
        onClose={() => !actionRunning && setConfirmAction(null)}
        size="sm"
      >
        {confirmAction && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.15] px-4 py-3 text-[12px] text-red-300/90 leading-relaxed">
              {confirmAction.kind === 'delete' ? (
                <>
                  Das Depot <span className="font-semibold">"{confirmAction.depot.name}"</span>{' '}
                  wird inklusive aller Positionen und Transaktionen{' '}
                  <span className="font-semibold">unwiderruflich gelöscht</span>.
                </>
              ) : (
                <>
                  Alle Positionen, Transaktionen, Cash und Kredit dieses Depots
                  werden gelöscht. Das Depot selbst (Name + Broker) bleibt
                  erhalten — gut für einen sauberen Re-Import.
                </>
              )}
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3 text-[11px] text-white/55 tabular-nums">
              {confirmAction.depot.positionsCount}{' '}
              {confirmAction.depot.positionsCount === 1 ? 'Position' : 'Positionen'} ·{' '}
              {confirmAction.depot.totalValue.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              €
            </div>

            {actionError && (
              <div className="text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-2.5">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionRunning}
                className="px-4 py-2.5 rounded-full text-[12px] text-white/40 hover:text-white/70 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={runAction}
                disabled={actionRunning}
                className="px-5 py-2.5 rounded-full bg-red-500/90 text-white text-[12px] font-semibold hover:bg-red-500 transition-all disabled:opacity-50"
              >
                {actionRunning
                  ? '…'
                  : confirmAction.kind === 'delete'
                    ? 'Ja, Depot löschen'
                    : 'Ja, Depot leeren'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
