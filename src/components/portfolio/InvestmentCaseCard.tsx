'use client'

// Investment-Case für die Prod-Portfolio-Aktienseite.
// Schreibt in dieselben Spalten wie die mein-portfolio-(v2)-Variante
// (portfolio_holdings.investment_case + _updated_at) — beide UIs teilen sich
// damit automatisch denselben Case pro Position.
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface InvestmentCaseCardProps {
  ticker: string
  /** Aus der URL: konkretes Depot oder 'all'/null für alle */
  portfolioId?: string | null
}

const MAX_LENGTH = 1000

export default function InvestmentCaseCard({ ticker, portfolioId }: InvestmentCaseCardProps) {
  const [holdingIds, setHoldingIds] = useState<string[]>([])
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // RLS begrenzt auf eigene Holdings; bei konkretem Depot zusätzlich filtern
        let query = supabase
          .from('portfolio_holdings')
          .select('id, investment_case, investment_case_updated_at')
          .eq('symbol', ticker)
        if (portfolioId && portfolioId !== 'all') {
          query = query.eq('portfolio_id', portfolioId)
        }

        const { data, error: dbErr } = await query
        if (cancelled) return
        if (dbErr) {
          console.warn('[InvestmentCase] load:', dbErr.message)
          return
        }

        const rows = data ?? []
        setHoldingIds(rows.map(r => r.id))

        // Zuletzt gepflegten Case anzeigen
        const withCase = rows
          .filter(r => r.investment_case)
          .sort((a, b) => String(b.investment_case_updated_at ?? '').localeCompare(String(a.investment_case_updated_at ?? '')))
        const note = withCase[0]?.investment_case ?? ''
        setText(note)
        setOriginalText(note)
        setUpdatedAt(withCase[0]?.investment_case_updated_at ?? null)
      } catch (err) {
        if (!cancelled) console.error('[InvestmentCase] load:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ticker, portfolioId])

  const save = async () => {
    if (holdingIds.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const trimmed = text.trim().slice(0, MAX_LENGTH)
      const now = new Date().toISOString()
      const { error: upErr } = await supabase
        .from('portfolio_holdings')
        .update({
          investment_case: trimmed || null,
          investment_case_updated_at: trimmed ? now : null,
        })
        .in('id', holdingIds)

      if (upErr) throw upErr
      setText(trimmed)
      setOriginalText(trimmed)
      setUpdatedAt(trimmed ? now : null)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setText(originalText)
    setEditing(false)
    setError(null)
  }

  const ageInMonths = updatedAt
    ? Math.floor((Date.now() - new Date(updatedAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : null

  // Keine Holdings (z. B. verkaufte Position) oder noch am Laden → nichts zeigen
  if (loading || holdingIds.length === 0) return null

  const pencil = (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  )

  return (
    <div className="bg-theme-card border border-theme rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-theme-primary">Mein Investment-Case</h2>
          {updatedAt && !editing && (
            <p className="mt-1 text-xs text-theme-muted">
              Zuletzt aktualisiert {new Date(updatedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
              {ageInMonths !== null && ageInMonths >= 6 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400/80">· vor {ageInMonths} Monaten — noch aktuell?</span>
              )}
            </p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-theme-primary"
          >
            {pencil}
            {text ? 'Bearbeiten' : 'Case schreiben'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
            placeholder={`Warum hast du ${ticker} gekauft? Z.B. "KGV unter 20, starker Cashflow, Buyback-Programm — Verkauf nur, wenn die Marge unter 40% fällt."`}
            rows={4}
            className="w-full resize-none rounded-lg border border-theme bg-theme-secondary px-3 py-2.5 text-[13px] text-theme-primary transition-colors placeholder:text-neutral-500 focus:border-teal-400/40 focus:outline-none"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] tabular-nums ${MAX_LENGTH - text.length < 50 ? 'text-amber-500 dark:text-amber-400' : 'text-neutral-500'}`}>
              {text.length}/{MAX_LENGTH}
            </span>
            <div className="flex items-center gap-2">
              {error && <span className="text-[11px] text-red-400">{error}</span>}
              <button
                onClick={cancel}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
              >
                {saving ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      ) : text ? (
        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-theme-secondary">{text}</p>
      ) : (
        <p className="mt-3 text-[12px] text-neutral-500">
          Warum hast du {ticker} gekauft? Schreib es auf — hilft gegen Panik-Verkäufe und FOMO.
        </p>
      )}
    </div>
  )
}
