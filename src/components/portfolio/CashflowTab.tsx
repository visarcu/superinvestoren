// src/components/portfolio/CashflowTab.tsx
// Cashflow: Einnahmen/Ausgaben-Auswertung über die manuellen Konten-Buchungen
// (manual_asset_transactions). Bewusst ehrlich gelabelt: Es zählt, was auf der
// Konten-Seite gebucht wurde — keine Bank-Anbindung, keine Depot-Cashflows.
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline'

interface LedgerTx {
  amount: number
  description: string | null
  date: string
}

interface MonthAgg {
  key: string
  label: string
  income: number
  expenses: number
  net: number
}

const MONTHS_SHOWN = 6

export default function CashflowTab({
  formatCurrency,
}: {
  formatCurrency: (amount: number) => string
}) {
  const [txs, setTxs] = useState<LedgerTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Zeitraum: die angezeigten Monate — Volumen bleibt klein, kein Paging nötig
      const from = new Date()
      from.setMonth(from.getMonth() - (MONTHS_SHOWN - 1))
      from.setDate(1)
      const { data } = await supabase
        .from('manual_asset_transactions')
        .select('amount, description, date')
        .eq('kind', 'buchung')
        .gte('date', from.toISOString().split('T')[0])
        .order('date', { ascending: false })
      if (data) setTxs(data.map(t => ({ ...t, amount: Number(t.amount) })))
      setLoading(false)
    }
    load()
  }, [])

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
      }))
  }, [txs])

  const current = months[0]
  const maxFlow = useMemo(
    () => Math.max(1, ...months.map(m => Math.max(m.income, m.expenses))),
    [months],
  )

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

  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-5">
        {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-800/50" />)}
      </div>
    )
  }

  if (!hasAnyTx) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800/80 bg-neutral-900/30 p-12 text-center">
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
      {/* ===== Aktueller Monat ===== */}
      {current && (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-800/80 sm:grid-cols-3">
          <div className="bg-neutral-950 p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Einnahmen ({current.label})</p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-400">+{formatCurrency(current.income)}</p>
          </div>
          <div className="bg-neutral-950 p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Ausgaben</p>
            <p className="text-2xl font-semibold tabular-nums text-red-400">−{formatCurrency(current.expenses)}</p>
          </div>
          <div className="bg-neutral-950 p-5">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Netto</p>
            <p className={`text-2xl font-semibold tabular-nums ${current.net >= 0 ? 'text-white' : 'text-red-400'}`}>
              {current.net >= 0 ? '+' : ''}{formatCurrency(current.net)}
            </p>
          </div>
        </div>
      )}

      {/* ===== Monatsverlauf ===== */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-5">
        <h3 className="text-sm font-semibold tracking-tight text-white">Monatsverlauf</h3>
        <p className="mt-0.5 text-[11px] text-neutral-500">Einnahmen und Ausgaben aus deinen Konten-Buchungen</p>
        <div className="mt-4 space-y-3">
          {months.map(month => (
            <div key={month.key}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[12px] text-neutral-300">{month.label}</p>
                <p className={`text-[12px] font-semibold tabular-nums ${month.net >= 0 ? 'text-neutral-200' : 'text-red-400'}`}>
                  {month.net >= 0 ? '+' : ''}{formatCurrency(month.net)}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800/60">
                    <div className="h-full rounded-full bg-emerald-400/80" style={{ width: `${(month.income / maxFlow) * 100}%` }} />
                  </div>
                  <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-emerald-400">+{formatCurrency(month.income)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-800/60">
                    <div className="h-full rounded-full bg-red-400/70" style={{ width: `${(month.expenses / maxFlow) * 100}%` }} />
                  </div>
                  <span className="w-24 flex-shrink-0 text-right text-[11px] tabular-nums text-red-400">−{formatCurrency(month.expenses)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Top-Ausgaben ===== */}
      {topExpenses.length > 0 && (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-5">
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
