// src/components/portfolio/AssetsTab.tsx
// Vermögen light: Depotwert + manuell gepflegte Vermögenswerte (Tagesgeld,
// Sachwerte, Krypto ...) — ohne Bank-Anbindung. Einträge kommen per
// Freitext/Sprache über den Asset-Parser und werden IMMER erst nach
// Bestätigung gespeichert.
'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  ASSET_CATEGORY_LABELS,
  ASSET_CATEGORIES,
  type AssetCategory,
} from '@/lib/assetParser'
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CheckIcon,
  CurrencyEuroIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface ManualAsset {
  id: string
  name: string
  category: string
  value: number
  updated_at: string
}

interface ParsedProposal {
  name: string
  category: AssetCategory
  value: number
}

const CATEGORY_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  cash: CurrencyEuroIcon,
  tagesgeld: BanknotesIcon,
  festgeld: BanknotesIcon,
  depot_extern: WalletIcon,
  immobilie: BuildingOffice2Icon,
  fahrzeug: TruckIcon,
  krypto: CurrencyEuroIcon,
  edelmetall: CurrencyEuroIcon,
  sonstiges: WalletIcon,
}

// Web Speech API ist nur in Chromium-Browsern verfügbar — Feature-Detection,
// Texteingabe funktioniert überall.
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export default function AssetsTab({
  depotValue,
  formatCurrency,
}: {
  depotValue: number
  formatCurrency: (amount: number) => string
}) {
  const [assets, setAssets] = useState<ManualAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [proposal, setProposal] = useState<ParsedProposal | null>(null)
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const recognitionRef = useRef<any>(null)

  const speechAvailable = useMemo(() => getSpeechRecognition() !== null, [])

  const loadAssets = useCallback(async () => {
    const { data, error } = await supabase
      .from('manual_assets')
      .select('id, name, category, value, updated_at')
      .order('value', { ascending: false })
    if (!error && data) {
      setAssets(data.map(a => ({ ...a, value: Number(a.value) })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  const assetsSum = useMemo(() => assets.reduce((s, a) => s + a.value, 0), [assets])

  // ===== Freitext → Vorschlag =====
  const parseInput = useCallback(async () => {
    const text = input.trim()
    if (text.length < 3 || parsing) return
    setParsing(true)
    setParseError(null)
    setProposal(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Nicht angemeldet')
      const res = await fetch('/api/portfolio/parse-asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.ok) {
        setProposal({ name: data.name, category: data.category, value: data.value })
      } else {
        setParseError(data.reason || 'Eingabe nicht erkannt')
      }
    } catch {
      setParseError('Parser nicht erreichbar — bitte nochmal versuchen')
    } finally {
      setParsing(false)
    }
  }, [input, parsing])

  // ===== Spracheingabe (Chromium) =====
  const toggleRecording = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) setInput(transcript)
      setRecording(false)
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognitionRef.current = recognition
    setRecording(true)
    recognition.start()
  }, [recording])

  // ===== Vorschlag bestätigen → Insert oder Update (gleicher Name) =====
  const existingMatch = useMemo(() => {
    if (!proposal) return null
    return assets.find(a => a.name.toLowerCase() === proposal.name.toLowerCase()) || null
  }, [proposal, assets])

  const confirmProposal = useCallback(async () => {
    if (!proposal || saving) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')
      if (existingMatch) {
        await supabase
          .from('manual_assets')
          .update({ value: proposal.value, category: proposal.category, updated_at: new Date().toISOString() })
          .eq('id', existingMatch.id)
      } else {
        await supabase.from('manual_assets').insert({
          user_id: user.id,
          name: proposal.name,
          category: proposal.category,
          value: proposal.value,
        })
      }
      setProposal(null)
      setInput('')
      await loadAssets()
    } finally {
      setSaving(false)
    }
  }, [proposal, saving, existingMatch, loadAssets])

  // ===== Inline-Edit + Löschen =====
  const saveEdit = useCallback(async (asset: ManualAsset) => {
    const value = parseFloat(editValue.replace(/\./g, '').replace(',', '.'))
    if (Number.isFinite(value) && value >= 0) {
      await supabase
        .from('manual_assets')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('id', asset.id)
      await loadAssets()
    }
    setEditingId(null)
  }, [editValue, loadAssets])

  const deleteAsset = useCallback(async (asset: ManualAsset) => {
    await supabase.from('manual_assets').delete().eq('id', asset.id)
    await loadAssets()
  }, [loadAssets])

  const totalWealth = depotValue + assetsSum

  return (
    <div className="space-y-5">
      {/* ===== Übersicht ===== */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-800/80 sm:grid-cols-3">
        <div className="bg-neutral-950 p-5">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Gesamtvermögen</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{formatCurrency(totalWealth)}</p>
          <p className="mt-1 text-[11px] text-neutral-500">Depot + Vermögenswerte</p>
        </div>
        <div className="bg-neutral-950 p-5">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Depot (aktuelle Auswahl)</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{formatCurrency(depotValue)}</p>
          <p className="mt-1 text-[11px] text-neutral-500">Wertpapiere inkl. Cash</p>
        </div>
        <div className="bg-neutral-950 p-5">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-neutral-500">Vermögenswerte</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{formatCurrency(assetsSum)}</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            {assets.length} Eintr{assets.length === 1 ? 'ag' : 'äge'}, manuell gepflegt
          </p>
        </div>
      </div>

      {/* ===== Schnelleingabe ===== */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-5">
        <h3 className="text-sm font-semibold tracking-tight text-white">Eintrag hinzufügen oder aktualisieren</h3>
        <p className="mt-0.5 text-[11px] text-neutral-500">
          Einfach hinschreiben{speechAvailable ? ' oder diktieren' : ''}: „Tagesgeld ING jetzt 5.000" · „Auto noch 15k wert"
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && parseInput()}
            placeholder={recording ? 'Sprich jetzt …' : 'z.B. Festgeld Sparkasse 10.000'}
            className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none transition-colors focus:border-teal-300/40"
          />
          {speechAvailable && (
            <button
              type="button"
              onClick={toggleRecording}
              title={recording ? 'Aufnahme stoppen' : 'Diktieren'}
              className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
                recording
                  ? 'border-red-400/40 bg-red-500/15 text-red-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-teal-300/30 hover:text-teal-300'
              }`}
            >
              <MicrophoneIcon className={`h-4.5 w-4.5 ${recording ? 'animate-pulse' : ''}`} />
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

        {parseError && (
          <p className="mt-2 text-[12px] text-amber-400">{parseError}</p>
        )}

        {/* Bestätigungskarte — nichts wird ohne diesen Schritt gespeichert */}
        {proposal && (
          <div className="mt-3 rounded-xl border border-teal-300/20 bg-teal-400/[0.06] p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-white">
                  {proposal.name}
                  <span className="ml-2 rounded-full border border-neutral-700 bg-neutral-900/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                    {ASSET_CATEGORY_LABELS[proposal.category]}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {existingMatch
                    ? `Aktualisiert „${existingMatch.name}" (bisher ${formatCurrency(existingMatch.value)})`
                    : 'Wird als neuer Eintrag angelegt'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={proposal.value}
                  onChange={e => setProposal({ ...proposal, value: Number(e.target.value) })}
                  className="w-32 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-right text-sm tabular-nums text-white outline-none focus:border-teal-300/40"
                />
                <span className="text-sm text-neutral-400">€</span>
                <select
                  value={proposal.category}
                  onChange={e => setProposal({ ...proposal, category: e.target.value as AssetCategory })}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-300 outline-none focus:border-teal-300/40"
                >
                  {ASSET_CATEGORIES.map(c => (
                    <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={confirmProposal}
                  disabled={saving || !(proposal.value > 0)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <CheckIcon className="h-4 w-4" />
                  {saving ? 'Speichert …' : 'Bestätigen'}
                </button>
                <button
                  type="button"
                  onClick={() => setProposal(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:text-white"
                  title="Verwerfen"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== Liste ===== */}
      <div className="overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/50">
        <div className="border-b border-neutral-800/80 px-5 py-4">
          <h3 className="text-sm font-semibold tracking-tight text-white">Vermögenswerte</h3>
          <p className="mt-0.5 text-[11px] text-neutral-500">Manuell gepflegt — Werte per Eingabe oben aktualisieren</p>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-800/50" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="p-10 text-center">
            <WalletIcon className="mx-auto mb-3 h-8 w-8 text-neutral-700" />
            <p className="text-sm font-medium text-white">Noch keine Vermögenswerte</p>
            <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-neutral-500">
              Erfasse Tagesgeld, Sachwerte oder externe Konten oben per Freitext — zusammen mit deinem
              Depot ergibt das dein Gesamtvermögen.
            </p>
          </div>
        ) : (
          assets.map(asset => {
            const Icon = CATEGORY_ICONS[asset.category] || WalletIcon
            const isEditing = editingId === asset.id
            return (
              <div
                key={asset.id}
                className="flex items-center justify-between border-b border-neutral-800/60 px-5 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950">
                    <Icon className="h-4 w-4 text-neutral-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-white">{asset.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      {ASSET_CATEGORY_LABELS[asset.category as AssetCategory] || asset.category} · Stand{' '}
                      {new Date(asset.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(asset)}
                        autoFocus
                        className="w-28 rounded-lg border border-teal-300/40 bg-neutral-950 px-2 py-1 text-right text-sm tabular-nums text-white outline-none"
                      />
                      <button type="button" onClick={() => saveEdit(asset)} className="text-emerald-400 hover:text-emerald-300" title="Speichern">
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-neutral-500 hover:text-white" title="Abbrechen">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[13px] font-semibold tabular-nums text-white">{formatCurrency(asset.value)}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(asset.id)
                          setEditValue(String(asset.value).replace('.', ','))
                        }}
                        className="text-neutral-500 transition-colors hover:text-white"
                        title="Wert bearbeiten"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAsset(asset)}
                        className="text-neutral-600 transition-colors hover:text-red-400"
                        title="Löschen"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-neutral-500">
        Vermögenswerte werden manuell gepflegt und nicht automatisch aktualisiert. Keine Anlageberatung.
      </p>
    </div>
  )
}
