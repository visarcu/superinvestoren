// src/components/portfolio/QuickTradeEntry.tsx
// Kauf/Verkauf per Freitext oder Diktat: "hab für 500 Euro MSCI World
// gekauft" → Parser → Instrument-Kandidaten → Bestätigungskarte → Buchung.
// Es wird NIE ohne Bestätigung gespeichert; die Buchungssemantik spiegelt
// addPosition/topUpPosition/sellPosition aus usePortfolio.
'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Holding, type Portfolio } from '@/hooks/usePortfolio'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import {
  CheckIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Candidate {
  symbol: string
  name: string
  source: 'depot' | 'etf' | 'aktie'
}

interface TradeProposal {
  side: 'buy' | 'sell'
  query: string
  totalEur?: number
  quantity?: number
  pricePerUnit?: number
  date: string
  candidates: Candidate[]
}

const SOURCE_LABEL: Record<Candidate['source'], string> = {
  depot: 'im Depot',
  etf: 'ETF',
  aktie: 'Aktie',
}

export default function QuickTradeEntry({
  holdings,
  allPortfolios,
  isAllDepotsView,
  currentPortfolioId,
  formatCurrency,
  onSaved,
}: {
  holdings: Holding[]
  allPortfolios: Portfolio[]
  isAllDepotsView: boolean
  currentPortfolioId?: string
  formatCurrency: (amount: number) => string
  onSaved: () => void | Promise<void>
}) {
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<TradeProposal | null>(null)
  const [candidateSymbol, setCandidateSymbol] = useState<string>('')
  const [targetDepotId, setTargetDepotId] = useState<string>('')
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const speech = useSpeechInput(setInput)

  const parseNum = (s: string): number => parseFloat(s.replace(',', '.'))

  // Bestand des gewählten Instruments im Ziel-Depot (für Verkauf + Preis-Vorbelegung)
  const targetHolding = useMemo(() => {
    if (!candidateSymbol) return null
    return holdings.find(h =>
      h.symbol.toUpperCase() === candidateSymbol &&
      (!isAllDepotsView || h.portfolio_id === targetDepotId)
    ) || null
  }, [holdings, candidateSymbol, targetDepotId, isAllDepotsView])

  // ===== Parse =====
  const parseInput = useCallback(async () => {
    const text = input.trim()
    if (text.length < 3 || parsing) return
    setParsing(true)
    setError(null)
    setProposal(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nicht angemeldet')
      const res = await fetch('/api/portfolio/parse-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          holdings: holdings.map(h => ({ symbol: h.symbol, name: h.name })),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.reason || 'Eingabe nicht erkannt')
        return
      }
      if (!data.candidates || data.candidates.length === 0) {
        setError(`„${data.query}" konnte keinem Wertpapier zugeordnet werden — bitte präziser formulieren`)
        return
      }

      const p: TradeProposal = data
      setProposal(p)

      // Vorbelegung: bester Kandidat, Depot mit Bestand, Zahlen aus dem Parse
      const best = p.candidates[0]
      setCandidateSymbol(best.symbol)

      const holdingDepot = holdings.find(h => h.symbol.toUpperCase() === best.symbol)?.portfolio_id
      setTargetDepotId(
        isAllDepotsView
          ? holdingDepot || allPortfolios[0]?.id || ''
          : currentPortfolioId || ''
      )

      const holdingPrice = holdings.find(h => h.symbol.toUpperCase() === best.symbol)?.current_price_display
      const effPrice = p.pricePerUnit ?? (p.totalEur && p.quantity ? p.totalEur / p.quantity : holdingPrice)
      const effQty = p.quantity ?? (p.totalEur && effPrice ? p.totalEur / effPrice : undefined)
      setPrice(effPrice ? String(Math.round(effPrice * 10000) / 10000) : '')
      setQty(effQty ? String(Math.round(effQty * 1000000) / 1000000) : '')
      setDate(p.date)
    } catch {
      setError('Parser nicht erreichbar — bitte nochmal versuchen')
    } finally {
      setParsing(false)
    }
  }, [input, parsing, holdings, isAllDepotsView, allPortfolios, currentPortfolioId])

  // ===== Buchung (Semantik wie usePortfolio.addPosition/topUpPosition/sellPosition) =====
  const confirm = useCallback(async () => {
    if (!proposal || saving) return
    const candidate = proposal.candidates.find(c => c.symbol === candidateSymbol)
    const quantity = parseNum(qty)
    const unitPrice = parseNum(price)
    const depotId = isAllDepotsView ? targetDepotId : currentPortfolioId || ''
    if (!candidate || !depotId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      setError('Bitte Stückzahl, Preis und Depot prüfen')
      return
    }
    if (proposal.side === 'sell') {
      if (!targetHolding) {
        setError('Verkauf nicht möglich: Position liegt nicht im gewählten Depot')
        return
      }
      if (quantity > targetHolding.quantity + 1e-9) {
        setError(`Nur ${targetHolding.quantity} Stück im Bestand`)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      if (proposal.side === 'buy') {
        if (targetHolding) {
          const oldQty = targetHolding.quantity
          const oldPrice = targetHolding.purchase_price
          const totalQty = oldQty + quantity
          const weightedAvgPrice = ((oldQty * oldPrice) + (quantity * unitPrice)) / totalQty
          const { error: updError } = await supabase
            .from('portfolio_holdings')
            .update({
              quantity: totalQty,
              purchase_price: weightedAvgPrice,
              purchase_date: targetHolding.purchase_date < date ? targetHolding.purchase_date : date,
            })
            .eq('id', targetHolding.id)
          if (updError) throw updError
        } else {
          const { error: insError } = await supabase.from('portfolio_holdings').insert({
            portfolio_id: depotId,
            symbol: candidate.symbol,
            name: candidate.name,
            quantity,
            purchase_price: unitPrice,
            purchase_date: date,
            purchase_currency: 'EUR',
          })
          if (insError) throw insError
        }
      } else {
        // sell
        if (quantity >= targetHolding!.quantity - 1e-9) {
          const { error: delError } = await supabase
            .from('portfolio_holdings')
            .delete()
            .eq('id', targetHolding!.id)
          if (delError) throw delError
        } else {
          const { error: updError } = await supabase
            .from('portfolio_holdings')
            .update({ quantity: targetHolding!.quantity - quantity })
            .eq('id', targetHolding!.id)
          if (updError) throw updError
        }
      }

      const { error: txError } = await supabase.from('portfolio_transactions').insert({
        portfolio_id: depotId,
        type: proposal.side,
        symbol: candidate.symbol,
        name: candidate.name,
        quantity,
        price: unitPrice,
        total_value: quantity * unitPrice,
        date,
        notes: 'Per Schnelleingabe erfasst',
      })
      if (txError) throw txError

      setProposal(null)
      setInput('')
      await onSaved()
    } catch {
      setError('Buchung fehlgeschlagen — bitte nochmal versuchen')
    } finally {
      setSaving(false)
    }
  }, [proposal, saving, candidateSymbol, qty, price, date, targetDepotId, currentPortfolioId, isAllDepotsView, targetHolding, onSaved])

  const sum = parseNum(qty) > 0 && parseNum(price) > 0 ? parseNum(qty) * parseNum(price) : null

  return (
    <div className="mb-5 rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-5">
      <h3 className="text-sm font-semibold tracking-tight text-white">Transaktion per Schnelleingabe</h3>
      <p className="mt-0.5 text-[11px] text-neutral-500">
        Einfach hinschreiben{speech.available ? ' oder diktieren' : ''}: „hab für 500 € MSCI World gekauft" · „3 Apple verkauft zu 280"
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && parseInput()}
          placeholder={speech.recording ? 'Sprich jetzt …' : 'z.B. 2 Allianz Aktien gekauft für je 340'}
          className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-teal-300/40"
        />
        {speech.available && (
          <button
            type="button"
            onClick={speech.toggle}
            title={speech.recording ? 'Aufnahme stoppen' : 'Diktieren'}
            className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
              speech.recording
                ? 'border-red-400/40 bg-red-500/15 text-red-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-teal-300/30 hover:text-teal-300'
            }`}
          >
            <MicrophoneIcon className={`h-4.5 w-4.5 ${speech.recording ? 'animate-pulse' : ''}`} />
          </button>
        )}
        <button
          type="button"
          onClick={parseInput}
          disabled={parsing || input.trim().length < 3}
          className="flex h-[42px] items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-950 disabled:text-neutral-600"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {parsing ? 'Verstehe …' : 'Erfassen'}
        </button>
      </div>

      {error && <p className="mt-2 text-[12px] text-amber-400">{error}</p>}

      {proposal && (
        <div className="mt-3 rounded-xl border border-teal-300/20 bg-teal-400/[0.06] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <span
              className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                proposal.side === 'buy'
                  ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-400/30 bg-red-500/10 text-red-300'
              }`}
            >
              {proposal.side === 'buy' ? 'Kauf' : 'Verkauf'}
            </span>

            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Wertpapier</span>
              <select
                value={candidateSymbol}
                onChange={e => setCandidateSymbol(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
              >
                {proposal.candidates.map(c => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name} ({c.symbol} · {SOURCE_LABEL[c.source]})
                  </option>
                ))}
              </select>
            </label>

            {isAllDepotsView && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Depot</span>
                <select
                  value={targetDepotId}
                  onChange={e => setTargetDepotId(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
                >
                  {allPortfolios.map(depot => (
                    <option key={depot.id} value={depot.id}>{depot.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Stückzahl</span>
              <input
                type="text"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none focus:border-teal-300/40"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Preis €</span>
              <input
                type="text"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none focus:border-teal-300/40"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Datum</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
              />
            </label>

            <button
              type="button"
              onClick={confirm}
              disabled={saving}
              className="flex h-[34px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              {saving ? 'Bucht …' : 'Bestätigen'}
            </button>
            <button
              type="button"
              onClick={() => setProposal(null)}
              className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:text-white"
              title="Verwerfen"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 text-[11px] text-neutral-400">
            {sum !== null && <>Summe: <span className="tabular-nums text-neutral-200">{formatCurrency(sum)}</span> · </>}
            {proposal.side === 'sell' && targetHolding && <>Bestand: {targetHolding.quantity} Stück · </>}
            {proposal.side === 'buy' && targetHolding && <>Aufstockung — Ø-Einstand wird neu gewichtet · </>}
            Erst nach Bestätigen wird gebucht.
          </p>
        </div>
      )}
    </div>
  )
}
