'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/hooks/usePortfolio'

export default function EinstellungenClient() {
  const router = useRouter()
  const {
    portfolio,
    cashPosition,
    isAllDepotsView,
    loading,
    formatCurrency,
    updatePortfolioName,
    updateCashPosition,
    updateBrokerCredit,
  } = usePortfolio()

  const [name, setName] = useState('')
  const [cash, setCash] = useState<string>('')
  const [credit, setCredit] = useState<string>('')
  const [savingField, setSavingField] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    field: string
    type: 'success' | 'error'
    msg: string
  } | null>(null)

  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name)
      setCash(String(portfolio.cash_position ?? 0))
      setCredit(String(portfolio.broker_credit ?? 0))
    }
  }, [portfolio?.id, portfolio])

  const handleSave = async (
    field: 'name' | 'cash' | 'credit',
    value: string,
    action: (v: any) => Promise<any>
  ) => {
    setSavingField(field)
    setFeedback(null)
    try {
      const parsed = field === 'name' ? value : parseFloat(value.replace(',', '.'))
      if (field !== 'name' && isNaN(parsed as number)) {
        throw new Error('Ungültige Zahl')
      }
      await action(parsed)
      setFeedback({ field, type: 'success', msg: 'Gespeichert' })
      setTimeout(() => setFeedback(null), 2000)
    } catch (err) {
      setFeedback({
        field,
        type: 'error',
        msg: err instanceof Error ? err.message : 'Fehler beim Speichern',
      })
    } finally {
      setSavingField(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#06060e] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#06060e]/80 backdrop-blur-md border-b border-white/[0.04]">
        <div className="max-w-3xl mx-auto w-full px-6 sm:px-10 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
            aria-label="Zurück"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-white tracking-tight">Einstellungen</span>
            <span className="text-white/15">/</span>
            <span className="text-[12px] text-white/50 truncate">
              {portfolio?.name ?? 'Mein Portfolio'}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full px-6 sm:px-10 py-6 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : isAllDepotsView ? (
          <div className="rounded-xl bg-[#0a0a12]/70 border border-amber-500/15 p-6 text-center shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
            <p className="text-[14px] text-amber-400/90 font-medium tracking-tight">
              Einstellungen pro Depot
            </p>
            <p className="text-[12px] text-white/40 mt-1 leading-relaxed">
              Wechsle in der Portfolio-Übersicht zu einem einzelnen Depot, um dessen
              Einstellungen zu bearbeiten.
            </p>
            <Link
              href="/analyse/mein-portfolio/depots"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[12px] font-medium text-white transition-all"
            >
              Depots öffnen →
            </Link>
          </div>
        ) : !portfolio ? (
          <div className="text-center py-32">
            <p className="text-white/30 text-[14px]">Kein Depot gefunden</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field
              label="Depot-Name"
              hint="Wird in Header und Listen angezeigt"
              field="name"
              value={name}
              onChange={setName}
              onSave={() => handleSave('name', name, updatePortfolioName)}
              saving={savingField === 'name'}
              feedback={feedback}
            />

            <Field
              label="Cash-Position"
              hint="Verfügbares Bargeld im Depot (in EUR)"
              field="cash"
              value={cash}
              onChange={setCash}
              onSave={() => handleSave('cash', cash, updateCashPosition)}
              saving={savingField === 'cash'}
              feedback={feedback}
              suffix="€"
              currentValue={formatCurrency(cashPosition)}
            />

            <Field
              label="Wertpapierkredit"
              hint="Lombardkredit / Margin — wird vom Gesamtwert abgezogen"
              field="credit"
              value={credit}
              onChange={setCredit}
              onSave={() => handleSave('credit', credit, updateBrokerCredit)}
              saving={savingField === 'credit'}
              feedback={feedback}
              suffix="€"
              currentValue={formatCurrency(portfolio.broker_credit ?? 0)}
            />

            {/* Mehr Aktionen */}
            <section className="mt-6 rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
              <div className="px-5 py-3.5 border-b border-white/[0.04]">
                <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">
                  Weitere Aktionen
                </h2>
              </div>
              <div className="p-2">
                <Link
                  href="/analyse/mein-portfolio/depots"
                  className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.04] text-[12px] text-white/70 hover:text-white transition-all"
                >
                  Alle Depots verwalten →
                </Link>
                <Link
                  href="/analyse/mein-portfolio/performance"
                  className="block px-3 py-2.5 rounded-lg hover:bg-white/[0.04] text-[12px] text-white/70 hover:text-white transition-all"
                >
                  Performance-Detail öffnen →
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  field,
  value,
  onChange,
  onSave,
  saving,
  feedback,
  suffix,
  currentValue,
}: {
  label: string
  hint: string
  field: string
  value: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
  feedback: { field: string; type: 'success' | 'error'; msg: string } | null
  suffix?: string
  currentValue?: string
}) {
  const fb = feedback?.field === field ? feedback : null

  return (
    <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] p-5">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[12px] font-semibold text-white/90 tracking-tight">{label}</label>
        {currentValue && (
          <p className="text-[10px] text-white/30 uppercase tracking-wider tabular-nums">
            Aktuell {currentValue}
          </p>
        )}
      </div>
      <p className="text-[11px] text-white/35 mb-3 leading-relaxed">{hint}</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors tabular-nums"
            disabled={saving}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-white/30">
              {suffix}
            </span>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
        >
          {saving ? '…' : 'Speichern'}
        </button>
      </div>

      {fb && (
        <p
          className={`text-[11px] mt-2 ${
            fb.type === 'success' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {fb.msg}
        </p>
      )}
    </section>
  )
}
