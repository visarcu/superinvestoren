'use client'

// Investment-Case-Block: persönliche Notiz zur Anlagestrategie für diese Position.
// Idee: User schreibt vor/beim Kauf auf, warum er kauft → Disziplin gegen FOMO/Panik-Verkäufe.
// Datum letzte Änderung wird mitgespeichert für "Case ist X Monate alt"-Hinweise.
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface InvestmentCaseCardProps {
  /** Holding-IDs (eine pro Depot, in "Alle Depots" können mehrere sein) */
  holdingIds: string[]
  ticker: string
}

const MAX_LENGTH = 1000

export default function InvestmentCaseCard({ holdingIds, ticker }: InvestmentCaseCardProps) {
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Aktuelle Notiz laden (vom ersten Holding mit Case, sonst leer).
  // Wenn mehrere Depots: Wir zeigen den letzten gepflegten Case
  // (in "Alle Depots" macht es eh wenig Sinn, mehrere unterschiedliche Cases pro Symbol zu pflegen).
  useEffect(() => {
    let cancelled = false
    if (holdingIds.length === 0) {
      setLoading(false)
      return
    }

    async function load() {
      try {
        const { data, error: dbErr } = await supabase
          .from('portfolio_holdings')
          .select('investment_case, investment_case_updated_at')
          .in('id', holdingIds)
          .order('investment_case_updated_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        if (dbErr) {
          // Spalte fehlt in der DB? → einfach kein Case anzeigen
          if (dbErr.message?.toLowerCase().includes('column')) {
            console.warn('[InvestmentCase] Spalte nicht vorhanden — Migration ausstehend?')
          } else {
            setError(dbErr.message)
          }
          return
        }
        const note = data?.investment_case ?? ''
        setText(note)
        setOriginalText(note)
        setUpdatedAt(data?.investment_case_updated_at ?? null)
      } catch (err) {
        if (!cancelled) console.error('[InvestmentCase] load:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [holdingIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (holdingIds.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const trimmed = text.trim().slice(0, MAX_LENGTH)
      const now = new Date().toISOString()
      // Auf alle Holdings für dieses Symbol schreiben (einheitlich pflegen)
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

  if (loading) {
    return (
      <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
        <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
        <div className="h-3 w-full bg-white/[0.03] rounded animate-pulse mt-3" />
        <div className="h-3 w-3/4 bg-white/[0.03] rounded animate-pulse mt-2" />
      </section>
    )
  }

  // Empty-State: kein Case geschrieben → Edit-CTA
  if (!text && !editing) {
    return (
      <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-[13px] font-semibold text-white/80">Mein Investment-Case</h2>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">Notiz</span>
        </div>
        <p className="text-[12px] text-white/30 mb-4">
          Warum hast du {ticker} gekauft? Schreib es auf — hilft gegen Panik-Verkäufe und FOMO.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/60 hover:text-white transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          Case schreiben
        </button>
      </section>
    )
  }

  // Edit-Modus
  if (editing) {
    const remaining = MAX_LENGTH - text.length
    return (
      <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-[13px] font-semibold text-white/80">Mein Investment-Case</h2>
          <span
            className={`text-[10px] tabular-nums ${
              remaining < 50 ? 'text-amber-400' : 'text-white/35'
            }`}
          >
            {text.length}/{MAX_LENGTH}
          </span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={`Warum kaufst du ${ticker}? Z.B. "Defensive Position in Tech, KGV unter 20, starker Cashflow, Buyback-Programm 2025–2028."`}
          rows={5}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[13px] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors resize-none"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          {error && <span className="text-[11px] text-red-400 mr-auto">{error}</span>}
          <button
            onClick={cancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? 'Speichere…' : 'Speichern'}
          </button>
        </div>
      </section>
    )
  }

  // View-Modus
  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[13px] font-semibold text-white/80">Mein Investment-Case</h2>
          {updatedAt && (
            <p className="text-[10px] text-white/25 mt-0.5">
              Zuletzt aktualisiert{' '}
              {new Date(updatedAt).toLocaleDateString('de-DE', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {ageInMonths !== null && ageInMonths >= 6 && (
                <span className="text-amber-400/80 ml-2">
                  · vor {ageInMonths} Monaten — noch aktuell?
                </span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          Bearbeiten
        </button>
      </div>
      <p className="text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap">{text}</p>
    </section>
  )
}
