// src/components/portfolio/CashflowTab.tsx
// Cashflow: Einnahmen/Ausgaben aus den manuellen Konten-Buchungen plus
// Invest-Statistik aus den Depot-Transaktionen (investiert pro Monat/Jahr,
// Sparquote = Investiert / gebuchte Einnahmen). Ehrlich gelabelt: die
// Cashflow-Seite zählt, was gebucht wurde — keine Bank-Anbindung.
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowsRightLeftIcon, BanknotesIcon } from '@heroicons/react/24/outline'

interface LedgerTx {
  amount: number
  description: string | null
  date: string
}

interface InvestTx {
  date: string
  type: 'buy' | 'sell'
  value: number
}

interface MonthAgg {
  key: string
  label: string
  income: number
  expenses: number
  net: number
  invested: number
}

const MONTHS_SHOWN = 6

export default function CashflowTab({
  formatCurrency,
  portfolioIds,
}: {
  formatCurrency: (amount: number) => string
  /** Depots des Nutzers — Quelle für die Invest-Statistik */
  portfolioIds: string[]
}) {
  const [txs, setTxs] = useState<LedgerTx[]>([])
  const [investTxs, setInvestTxs] = useState<InvestTx[]>([])
  const [loading, setLoading] = useState(true)

  const portfolioIdsKey = portfolioIds.join('|')

  useEffect(() => {
    async function load() {
      // Konten-Buchungen: Zeitraum = angezeigte Monate, Volumen klein
      const from = new Date()
      from.setMonth(from.getMonth() - (MONTHS_SHOWN - 1))
      from.setDate(1)
      const ledgerPromise = supabase
        .from('manual_asset_transactions')
        .select('amount, description, date')
        .eq('kind', 'buchung')
        .gte('date', from.toISOString().split('T')[0])
        .order('date', { ascending: false })

      // Depot-Käufe/Verkäufe: GESAMTE Historie für die Jahres-Statistik —
      // paginiert, PostgREST kappt bei 1000 Zeilen (bekannte Falle)
      const investRows: InvestTx[] = []
      if (portfolioIds.length > 0) {
        const PAGE = 1000
        for (let offset = 0; ; offset += PAGE) {
          const { data: page, error } = await supabase
            .from('portfolio_transactions')
            .select('date, type, total_value, quantity, price')
            .in('portfolio_id', portfolioIds)
            .in('type', ['buy', 'sell'])
            .order('date', { ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + PAGE - 1)
          if (error || !page || page.length === 0) break
          for (const tx of page) {
            const value = Number(tx.total_value) || (Number(tx.quantity) || 0) * (Number(tx.price) || 0)
            if (value > 0) investRows.push({ date: tx.date, type: tx.type as 'buy' | 'sell', value })
          }
          if (page.length < PAGE) break
        }
      }

      const { data: ledger } = await ledgerPromise
      if (ledger) setTxs(ledger.map(t => ({ ...t, amount: Number(t.amount) })))
      setInvestTxs(investRows)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioIdsKey])

  // Netto investiert (Käufe − Verkäufe) je Monatsschlüssel
  const investedByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of investTxs) {
      const key = tx.date.slice(0, 7)
      map.set(key, (map.get(key) || 0) + (tx.type === 'buy' ? tx.value : -tx.value))
    }
    return map
  }, [investTxs])

  const months = useMemo<MonthAgg[]>(() => {
    const byMonth = new Map<string, { income: number; expenses: number }>()
    // Alle angezeigten Monate vorbelegen, damit leere Monate sichtbar bleiben
    for (let i = 0; i < MONTHS_SHOWN; i++) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      byMonth.set(d.toISOString().slice(0, 7), { income: 0, expenses: 0 })
    }
    for (const tx of txs) {
      const key = tx.date.slice(0, 7)
      const agg = byMonth.get(key)
      if (!agg) continue
      if (tx.amount > 0) agg.income += tx.amount
      else agg.expenses += Math.abs(tx.amount)
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, agg]) => ({
        key,
        label: new Date(`${key}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        income: agg.income,
        expenses: agg.expenses,
        net: agg.income - agg.expenses,
        invested: investedByMonth.get(key) || 0,
      }))
  }, [txs, investedByMonth])

  // Jahres-Statistik über die gesamte Depot-Historie
  const years = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of investTxs) {
      const year = tx.date.slice(0, 4)
      map.set(year, (map.get(year) || 0) + (tx.type === 'buy' ? tx.value : -tx.value))
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, invested]) => ({ year, invested }))
  }, [investTxs])

  const maxYearInvested = useMemo(
    () => Math.max(1, ...years.map(y => Math.abs(y.invested))),
    [years],
  )

  // Sparquote des aktuellen Monats: Investiert / gebuchte Einnahmen
  const savingsRate = useMemo(() => {
    const cur = months[0]
    if (!cur || cur.income <= 0 || cur.invested <= 0) return null
    return (cur.invested / cur.income) * 100
  }, [months])

  const current = months[0]
  const maxFlow = useMemo(
    () => Math.max(1, ...months.map(m => Math.max(m.income, m.expenses, m.invested))),
    [months],
  )
  const currentYearInvested = useMemo(() => {
    const year = new Date().getFullYear().toString()
    return years.find(y => y.year === year)?.invested || 0
  }, [years])

  // Top-Ausgaben des aktuellen Monats, nach Beschreibung gruppiert
  const topExpenses = useMemo(() => {
    if (!current) return []
    const map = new Map<string, number>()
    for (const tx of txs) {
      if (tx.amount >= 0 || tx.date.slice(0, 7) !== current.key) continue
      const label = (tx.description || 'Ohne Beschreibung').trim()
      map.set(label, (map.get(label) || 0) + Math.abs(tx.amount))
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [txs, current])

  const hasAnyTx = txs.length > 0
  const hasInvest = investTxs.length > 0

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme space-y-2 rounded-xl p-5">
        {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-white/[0.06]" />)}
      </div>
    )
  }

  if (!hasAnyTx && !hasInvest) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] p-12 text-center">
        <ArrowsRightLeftIcon className="mx-auto mb-3 h-8 w-8 text-neutral-700" />
        <h3 className="mb-1 text-sm font-semibold tracking-tight text-white">Noch kein Cashflow</h3>
        <p className="mx-auto max-w-sm text-[12px] leading-relaxed text-neutral-500">
          Sobald du auf der Konten-Seite Buchungen erfasst („500 Miete vom Girokonto",
          „Gehalt 3.500 aufs Girokonto"), entsteht hier deine Einnahmen-/Ausgaben-Übersicht.
        </p>
        <Link
          href="?depot=all&view=accounts"
          className="mt-4 inline-flex items-center rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
        >
          Zu den Konten
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ===== Aktueller Monat: Cashflow ===== */}
      {current && hasAnyTx && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Einnahmen ({current.label})</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-400">+{formatCurrency(current.income)}</p>
          </div>
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Ausgaben</p>
            <p className="text-xl font-semibold tabular-nums text-red-400">−{formatCurrency(current.expenses)}</p>
          </div>
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Netto</p>
            <p className={`text-xl font-semibold tabular-nums ${current.net >= 0 ? 'text-white' : 'text-red-400'}`}>
              {current.net >= 0 ? '+' : ''}{formatCurrency(current.net)}
            </p>
          </div>
        </div>
      )}

      {/* ===== Sparen & Investieren ===== */}
      {hasInvest && current && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Investiert ({current.label})</p>
            <p className="text-xl font-semibold tabular-nums text-teal-300">{formatCurrency(current.invested)}</p>
            <p className="mt-1 text-[11px] text-neutral-500">Depot-Käufe − Verkäufe</p>
          </div>
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Sparquote</p>
            {savingsRate !== null ? (
              <>
                <p className="text-xl font-semibold tabular-nums text-white">{savingsRate.toFixed(0)} %</p>
                <p className="mt-1 text-[11px] text-neutral-500">Investiert / gebuchte Einnahmen</p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold tabular-nums text-neutral-600">—</p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  Buche dein Gehalt auf der Konten-Seite, dann rechnen wir sie aus
                </p>
              </>
            )}
          </div>
          <div className="bg-theme-card border border-theme rounded-xl p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Investiert ({new Date().getFullYear()})</p>
            <p className="text-xl font-semibold tabular-nums text-teal-300">{formatCurrency(currentYearInvested)}</p>
            <p className="mt-1 text-[11px] text-neutral-500">seit Jahresbeginn</p>
          </div>
        </div>
      )}

      {/* ===== Monatsverlauf ===== */}
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <h3 className="text-sm font-semibold tracking-tight text-white">Monatsverlauf</h3>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {hasAnyTx ? 'Einnahmen, Ausgaben und Investitionen' : 'Investitionen — Einnahmen/Ausgaben erscheinen mit deinen Konten-Buchungen'}
        </p>
        <div className="mt-4 space-y-3">
          {months.map(month => (
            <div key={month.key}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[12px] text-neutral-300">{month.label}</p>
                {hasAnyTx && (
                  <p className={`text-[12px] font-semibold tabular-nums ${month.net >= 0 ? 'text-neutral-200' : 'text-red-400'}`}>
                    {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                {hasAnyTx && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${(month.income / maxFlow) * 100}%` }} />
                      </div>
                      <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-emerald-400">+{formatCurrency(month.income)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-red-400/70" style={{ width: `${(month.expenses / maxFlow) * 100}%` }} />
                      </div>
                      <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-red-400">−{formatCurrency(month.expenses)}</span>
                    </div>
                  </>
                )}
                {hasInvest && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-teal-300/80"
                        style={{ width: `${(Math.max(month.invested, 0) / maxFlow) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-teal-300">{formatCurrency(month.invested)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {hasInvest && (
          <p className="mt-3 text-[11px] text-neutral-500">
            <span className="mr-3 inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-emerald-400/80" /> Einnahmen</span>
            <span className="mr-3 inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-red-400/70" /> Ausgaben</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-teal-300/80" /> Investiert</span>
          </p>
        )}
      </div>

      {/* ===== Investiert pro Jahr ===== */}
      {years.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-xl p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <BanknotesIcon className="h-3.5 w-3.5 text-neutral-400" />
            Investiert pro Jahr
          </h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">Depot-Käufe minus Verkäufe, gesamte Historie</p>
          <div className="mt-4 space-y-2.5">
            {years.map(y => (
              <div key={y.year} className="flex items-center gap-3">
                <span className="w-10 flex-shrink-0 text-[12px] tabular-nums text-neutral-300">{y.year}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${y.invested >= 0 ? 'bg-teal-300/80' : 'bg-red-400/70'}`}
                    style={{ width: `${(Math.abs(y.invested) / maxYearInvested) * 100}%` }}
                  />
                </div>
                <span className={`w-28 flex-shrink-0 text-right text-[12px] font-semibold tabular-nums ${y.invested >= 0 ? 'text-teal-300' : 'text-red-400'}`}>
                  {formatCurrency(y.invested)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Top-Ausgaben ===== */}
      {topExpenses.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-xl p-5">
          <h3 className="text-sm font-semibold tracking-tight text-white">Größte Ausgaben ({current?.label})</h3>
          <div className="mt-3 space-y-1.5">
            {topExpenses.map(([label, sum]) => (
              <div key={label} className="flex items-center justify-between py-1">
                <p className="min-w-0 truncate text-[12px] text-neutral-200">{label}</p>
                <p className="ml-3 flex-shrink-0 text-[12px] font-medium tabular-nums text-red-400">−{formatCurrency(sum)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-neutral-500">
        Basiert auf den manuellen Konten-Buchungen — Depot-Transaktionen und Dividenden zählen hier nicht mit.
      </p>
    </div>
  )
}
