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
    holdings,
    transactions,
    isAllDepotsView,
    loading,
    formatCurrency,
    updatePortfolioName,
    updateCashPosition,
    updateBrokerCredit,
    clearDepot,
  } = usePortfolio()

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

  const handleClearDepot = async () => {
    if (!portfolio?.id || portfolio.id === 'all') return
    setClearing(true)
    setClearError(null)
    try {
      await clearDepot(portfolio.id)
      setClearConfirmOpen(false)
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Fehler beim Leeren')
    } finally {
      setClearing(false)
    }
  }

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

            {/* Gefahrenzone */}
            <section className="mt-6 rounded-xl bg-[#0a0a12]/70 border border-red-500/[0.12] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] p-5">
              <h2 className="text-[13px] font-semibold text-red-300/90 tracking-tight mb-1">
                Gefahrenzone
              </h2>
              <p className="text-[11px] text-white/40 mb-4 leading-relaxed">
                Alle Positionen, Transaktionen, Dividenden, Cash und Kredit dieses
                Depots unwiderruflich löschen. Das Depot selbst (Name + Broker) bleibt
                erhalten — nützlich vor einem kompletten Re-Import.
              </p>

              {!clearConfirmOpen ? (
                <button
                  onClick={() => {
                    setClearError(null)
                    setClearConfirmOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/[0.08] border border-red-500/[0.15] text-[12px] font-medium text-red-300 hover:bg-red-500/[0.14] transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                  Depot leeren
                </button>
              ) : (
                <div className="rounded-xl bg-red-500/[0.06] border border-red-500/[0.2] px-4 py-3.5">
                  <p className="text-[12px] font-semibold text-red-200 mb-2">
                    Bist du sicher?
                  </p>
                  <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
                    Das Depot <span className="text-white/85 font-medium">"{portfolio.name}"</span>{' '}
                    wird zurückgesetzt:{' '}
                    <span className="tabular-nums">{holdings.length}</span> Positionen,{' '}
                    <span className="tabular-nums">{transactions.length}</span> Transaktionen,{' '}
                    Cash ({formatCurrency(cashPosition)}) und Kredit werden gelöscht.{' '}
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  {clearError && (
                    <p className="text-[11px] text-red-400 mb-3">{clearError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClearConfirmOpen(false)}
                      disabled={clearing}
                      className="px-3 py-1.5 rounded-full text-[12px] text-white/50 hover:text-white/80 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleClearDepot}
                      disabled={clearing}
                      className="px-4 py-1.5 rounded-full bg-red-500/90 hover:bg-red-500 text-[12px] font-semibold text-white transition-all disabled:opacity-50"
                    >
                      {clearing ? 'Lösche…' : `Ja, ${portfolio.name} leeren`}
                    </button>
                  </div>
                </div>
              )}
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
