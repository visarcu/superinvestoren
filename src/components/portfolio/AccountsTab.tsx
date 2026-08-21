// src/components/portfolio/AccountsTab.tsx
// Konten-Übersicht: manuelle Konten (aus manual_assets, Konto-Kategorien)
// mit Salden und Buchungshistorie. Buchungen kommen per Freitext/Diktat
// ("500 Miete vom Girokonto") und laufen atomar über die RPC
// record_account_transaction — nie ohne Bestätigung.
'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { ACCOUNT_CATEGORIES, ASSET_CATEGORY_LABELS, type AssetCategory } from '@/lib/assetParser'
import {
  BanknotesIcon,
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Account {
  id: string
  name: string
  category: string
  value: number
  updated_at: string
}

interface AccountTx {
  id: string
  asset_id: string
  amount: number
  description: string | null
  date: string
}

interface TxProposal {
  amount: number
  description: string
  date: string
  candidates: { id: string; name: string }[]
}

export default function AccountsTab({
  formatCurrency,
}: {
  formatCurrency: (amount: number) => string
}) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<TxProposal | null>(null)
  const [targetAccountId, setTargetAccountId] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [txsByAccount, setTxsByAccount] = useState<Record<string, AccountTx[]>>({})

  const speech = useSpeechInput(setInput)

  const loadAccounts = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('manual_assets')
      .select('id, name, category, value, updated_at')
      .in('category', [...ACCOUNT_CATEGORIES])
      .order('value', { ascending: false })
    if (!loadError && data) {
      setAccounts(data.map(a => ({ ...a, value: Number(a.value) })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + a.value, 0), [accounts])

  const loadTxs = useCallback(async (assetId: string) => {
    const { data } = await supabase
      .from('manual_asset_transactions')
      .select('id, asset_id, amount, description, date')
      .eq('asset_id', assetId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(15)
    if (data) {
      setTxsByAccount(prev => ({
        ...prev,
        [assetId]: data.map(t => ({ ...t, amount: Number(t.amount) })),
      }))
    }
  }, [])

  const toggleExpand = useCallback((assetId: string) => {
    setExpandedId(prev => {
      const next = prev === assetId ? null : assetId
      if (next) loadTxs(next)
      return next
    })
  }, [loadTxs])

  // ===== Freitext → Buchungs-Vorschlag =====
  const parseInput = useCallback(async () => {
    const text = input.trim()
    if (text.length < 3 || parsing) return
    setParsing(true)
    setError(null)
    setProposal(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nicht angemeldet')
      const res = await fetch('/api/portfolio/parse-account-tx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text,
          accounts: accounts.map(a => ({ id: a.id, name: a.name })),
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.reason || 'Eingabe nicht erkannt')
        return
      }
      if (!data.candidates || data.candidates.length === 0) {
        setError(
          accounts.length === 0
            ? 'Noch kein Konto angelegt — erstelle eins auf der Vermögens-Seite, z.B. „Girokonto 2.000"'
            : `„${data.accountQuery}" passt zu keinem deiner Konten`
        )
        return
      }
      setProposal({
        amount: data.amount,
        description: data.description,
        date: data.date,
        candidates: data.candidates,
      })
      setTargetAccountId(data.candidates[0].id)
    } catch {
      setError('Parser nicht erreichbar — bitte nochmal versuchen')
    } finally {
      setParsing(false)
    }
  }, [input, parsing, accounts])

  // ===== Buchen (atomar via RPC) =====
  const confirmProposal = useCallback(async () => {
    if (!proposal || saving || !targetAccountId) return
    setSaving(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('record_account_transaction', {
        p_asset_id: targetAccountId,
        p_amount: proposal.amount,
        p_description: proposal.description,
        p_date: proposal.date,
      })
      if (rpcError) throw rpcError
      setProposal(null)
      setInput('')
      await loadAccounts()
      if (expandedId === targetAccountId) await loadTxs(targetAccountId)
    } catch (err) {
      console.error('Konto-Buchung fehlgeschlagen:', err)
      setError('Buchung fehlgeschlagen — bitte nochmal versuchen')
    } finally {
      setSaving(false)
    }
  }, [proposal, saving, targetAccountId, loadAccounts, expandedId, loadTxs])

  const deleteTx = useCallback(async (tx: AccountTx) => {
    const { error: rpcError } = await supabase.rpc('delete_account_transaction', { p_tx_id: tx.id })
    if (!rpcError) {
      await loadAccounts()
      await loadTxs(tx.asset_id)
    }
  }, [loadAccounts, loadTxs])

  return (
    <div className="space-y-5">
      {/* ===== Kopf: Summe ===== */}
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Konten gesamt</p>
        <p className={`text-xl font-semibold tabular-nums ${totalBalance < 0 ? 'text-red-400' : 'text-white'}`}>
          {formatCurrency(totalBalance)}
        </p>
        <p className="mt-1 text-[11px] text-neutral-500">
          {accounts.length} Konto{accounts.length === 1 ? '' : 'en'}, manuell gepflegt — Salden fließen ins Vermögen ein
        </p>
      </div>

      {/* ===== Buchung erfassen ===== */}
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <h3 className="text-sm font-semibold tracking-tight text-white">Buchung erfassen</h3>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Einfach hinschreiben{speech.available ? ' oder diktieren' : ''}: „500 Miete vom Girokonto" · „Gehalt 3.500 aufs Girokonto"
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && parseInput()}
            placeholder={speech.recording ? 'Sprich jetzt …' : 'z.B. 120 Einkauf vom Girokonto'}
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-teal-300/40"
          />
          {speech.available && (
            <button
              type="button"
              onClick={speech.toggle}
              title={speech.recording ? 'Aufnahme stoppen' : 'Diktieren'}
              className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
                speech.recording
                  ? 'border-red-400/40 bg-red-500/15 text-red-300'
                  : 'border-white/[0.08] bg-white/[0.04] text-neutral-400 hover:border-teal-300/30 hover:text-teal-300'
              }`}
            >
              <MicrophoneIcon className={`h-4.5 w-4.5 ${speech.recording ? 'animate-pulse' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={parseInput}
            disabled={parsing || input.trim().length < 3}
            className="flex h-[42px] items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-neutral-600"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            {parsing ? 'Verstehe …' : 'Erfassen'}
          </button>
        </div>

        {error && <p className="mt-2 text-[12px] text-amber-400">{error}</p>}

        {proposal && (
          <div className="mt-3 rounded-xl border border-teal-300/20 bg-teal-400/[0.06] p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Konto</span>
                <select
                  value={targetAccountId}
                  onChange={e => setTargetAccountId(e.target.value)}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
                >
                  {proposal.candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Betrag €</span>
                <input
                  type="number"
                  value={proposal.amount}
                  onChange={e => setProposal({ ...proposal, amount: Number(e.target.value) })}
                  className={`w-28 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-teal-300/40 ${
                    proposal.amount < 0 ? 'text-red-300' : 'text-emerald-300'
                  }`}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Beschreibung</span>
                <input
                  type="text"
                  value={proposal.description}
                  onChange={e => setProposal({ ...proposal, description: e.target.value })}
                  className="w-40 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500">Datum</span>
                <input
                  type="date"
                  value={proposal.date}
                  onChange={e => setProposal({ ...proposal, date: e.target.value })}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-teal-300/40"
                />
              </label>

              <button
                type="button"
                onClick={confirmProposal}
                disabled={saving || proposal.amount === 0}
                className="flex h-[34px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                {saving ? 'Bucht …' : 'Bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => setProposal(null)}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-white/[0.08] text-neutral-400 transition-colors hover:text-white"
                title="Verwerfen"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">
              {proposal.amount < 0 ? 'Ausgang' : 'Eingang'} — der Kontosaldo wird beim Bestätigen angepasst.
            </p>
          </div>
        )}
      </div>

      {/* ===== Konten-Liste ===== */}
      <div className="bg-theme-card border border-theme overflow-hidden rounded-xl">
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h3 className="text-sm font-semibold tracking-tight text-white">Deine Konten</h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">Aufklappen für Buchungen — Kontostand korrigieren auf der Vermögens-Seite</p>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.06]" />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCardIcon className="mx-auto mb-3 h-8 w-8 text-neutral-700" />
            <p className="text-sm font-medium text-white">Noch keine Konten</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-neutral-500">
              Lege dein erstes Konto auf der Vermögens-Seite an — einfach „Girokonto 2.000" oder
              „Geschäftskonto Sparkasse 15.000" eingeben.
            </p>
            <Link
              href="?depot=all&view=assets"
              className="mt-4 inline-flex items-center rounded-xl border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-400/15 hover:text-white"
            >
              Zur Vermögens-Seite
            </Link>
          </div>
        ) : (
          accounts.map(account => {
            const isOpen = expandedId === account.id
            const txs = txsByAccount[account.id] || []
            return (
              <div key={account.id} className="border-b border-white/[0.05] last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleExpand(account.id)}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                      <BanknotesIcon className="h-4 w-4 text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">{account.name}</p>
                      <p className="text-[11px] text-neutral-500">
                        {ASSET_CATEGORY_LABELS[account.category as AssetCategory] || account.category}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 flex flex-shrink-0 items-center gap-2.5">
                    <p className={`text-[13px] font-semibold tabular-nums ${account.value < 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(account.value)}
                    </p>
                    <ChevronDownIcon className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-white/[0.03] px-5 pb-3 pt-1">
                    {txs.length === 0 ? (
                      <p className="py-3 text-center text-[12px] text-neutral-500">Noch keine Buchungen</p>
                    ) : (
                      txs.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between border-t border-white/[0.05] py-2 first:border-t-0">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] text-neutral-200">{tx.description || (tx.amount > 0 ? 'Eingang' : 'Ausgang')}</p>
                            <p className="text-[11px] text-neutral-500">
                              {new Date(tx.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </p>
                          </div>
                          <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                            <p className={`text-[12px] font-semibold tabular-nums ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </p>
                            <button
                              type="button"
                              onClick={() => deleteTx(tx)}
                              className="text-neutral-600 transition-colors hover:text-red-400"
                              title="Buchung löschen (Saldo wird zurückgedreht)"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-neutral-500">
        Konten werden manuell gepflegt — Buchungen passen den Saldo an, Löschen dreht ihn zurück.
        Kontostand-Korrekturen („Girokonto ist jetzt 2.000") laufen über die Vermögens-Seite.
      </p>
    </div>
  )
}
