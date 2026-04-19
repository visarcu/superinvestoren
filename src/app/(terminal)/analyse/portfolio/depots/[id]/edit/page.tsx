// src/app/(terminal)/analyse/portfolio/depots/[id]/edit/page.tsx
// Depot bearbeiten: Name, Farbe, Hauptdepot-Status, Broker-Name (für "andere").
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import { BrokerType, getBrokerConfig, brokerTypeToLogoId } from '@/lib/brokerConfig'

interface Portfolio {
  id: string
  name: string
  broker_type: BrokerType | null
  broker_name: string | null
  broker_color: string | null
  is_default: boolean
  cash_position: number
}

export default function EditDepotPage() {
  const router = useRouter()
  const params = useParams()
  const depotId = params?.id as string

  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editierbare Felder
  const [depotName, setDepotName] = useState('')
  const [customBrokerName, setCustomBrokerName] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // Depot laden
  useEffect(() => {
    let cancelled = false

    async function loadDepot() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.replace('/auth/signin')
          return
        }

        const { data, error: loadError } = await supabase
          .from('portfolios')
          .select('id, name, broker_type, broker_name, broker_color, is_default, cash_position')
          .eq('id', depotId)
          .eq('user_id', session.user.id)
          .single()

        if (cancelled) return

        if (loadError || !data) {
          setError('Depot nicht gefunden oder kein Zugriff.')
          setLoading(false)
          return
        }

        setPortfolio(data)
        setDepotName(data.name || '')
        setCustomBrokerName(data.broker_name || '')
        setCustomColor(data.broker_color || '')
        setIsDefault(data.is_default || false)
      } catch (err: any) {
        if (!cancelled) {
          console.error('Error loading depot:', err)
          setError(err.message || 'Fehler beim Laden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (depotId) loadDepot()
    return () => { cancelled = true }
  }, [depotId, router])

  const handleSave = async () => {
    if (!portfolio || !depotName.trim()) return

    try {
      setSaving(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/auth/signin')
        return
      }

      // Wenn als Default gesetzt: alle anderen Depots des Users auf is_default = false
      if (isDefault && !portfolio.is_default) {
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', session.user.id)
      }

      const { error: updateError } = await supabase
        .from('portfolios')
        .update({
          name: depotName.trim(),
          broker_name: portfolio.broker_type === 'andere' ? customBrokerName.trim() || null : portfolio.broker_name,
          broker_color: customColor || null,
          is_default: isDefault,
        })
        .eq('id', depotId)

      if (updateError) throw updateError

      router.push('/analyse/portfolio/depots')
    } catch (err: any) {
      console.error('Error saving depot:', err)
      setError(err.message || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!portfolio) return

    try {
      setDeleting(true)
      setError(null)

      // Erst Transaktionen + Holdings löschen, dann das Depot
      await supabase.from('portfolio_transactions').delete().eq('portfolio_id', depotId)
      await supabase.from('portfolio_holdings').delete().eq('portfolio_id', depotId)

      const { error: deleteError } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', depotId)

      if (deleteError) throw deleteError

      router.push('/analyse/portfolio/depots')
    } catch (err: any) {
      console.error('Error deleting depot:', err)
      setError(err.message || 'Fehler beim Löschen')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-800 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[14px] text-neutral-400 mb-4">{error || 'Depot nicht gefunden.'}</p>
          <Link
            href="/analyse/portfolio/depots"
            className="inline-flex items-center gap-1.5 text-[13px] text-white hover:text-neutral-300 transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  const brokerConfig = portfolio.broker_type ? getBrokerConfig(portfolio.broker_type) : null
  const logoId = portfolio.broker_type ? brokerTypeToLogoId(portfolio.broker_type) : null

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800/80">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/analyse/portfolio/depots"
              className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Zurück zur Übersicht
            </Link>
            <Link
              href="/analyse/portfolio/depots"
              className="p-1.5 hover:bg-neutral-800/60 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4 text-neutral-500 hover:text-neutral-300" />
            </Link>
          </div>

          <h1 className="text-[18px] font-semibold text-white tracking-tight">
            Depot bearbeiten
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6 pb-32">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {/* Broker — Anzeige (nicht editierbar) */}
        <div className="mb-5 p-3.5 bg-neutral-900/50 border border-neutral-800/80 rounded-xl flex items-center gap-3">
          {logoId ? (
            <BrokerLogo brokerId={logoId} size={36} />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${brokerConfig?.color}15`, border: `1px solid ${brokerConfig?.color}30` }}
            >
              <span className="text-[10px] font-bold" style={{ color: brokerConfig?.color }}>
                {(brokerConfig?.displayName[0] ?? '?').toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider">Broker</p>
            <p className="text-[13px] font-medium text-white truncate">
              {portfolio.broker_name || brokerConfig?.displayName || 'Unbekannt'}
            </p>
          </div>
        </div>

        {/* Custom Broker Name (nur bei "andere") */}
        {portfolio.broker_type === 'andere' && (
          <div className="mb-4">
            <label className="block text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wider">
              Broker-Name
            </label>
            <input
              type="text"
              value={customBrokerName}
              onChange={(e) => setCustomBrokerName(e.target.value)}
              placeholder="z.B. Consorsbank, DKB, …"
              className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[13px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
            />
          </div>
        )}

        {/* Depot Name */}
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wider">
            Depot-Name
          </label>
          <input
            type="text"
            value={depotName}
            onChange={(e) => setDepotName(e.target.value)}
            placeholder="z.B. Haupt-Depot, Altersvorsorge, …"
            className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[13px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
          />
        </div>

        {/* Custom Color */}
        <div className="mb-5">
          <label className="block text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wider">
            Farbe
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor || brokerConfig?.color || '#FFFFFF'}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-neutral-800 bg-neutral-900 p-0"
            />
            <input
              type="text"
              value={customColor || brokerConfig?.color || ''}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#FFFFFF"
              className="flex-1 px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[13px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors font-mono tabular-nums"
            />
          </div>
          <p className="text-[11px] text-neutral-500 mt-1.5">
            Wird als dezenter Akzent-Punkt bei diesem Depot verwendet.
          </p>
        </div>

        {/* Set as Default */}
        <button
          onClick={() => setIsDefault(!isDefault)}
          className={`w-full mb-6 p-3.5 rounded-xl border text-left transition-all ${
            isDefault
              ? 'border-neutral-600 bg-neutral-900'
              : 'border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
              isDefault ? 'border-white bg-white' : 'border-neutral-600'
            }`}>
              {isDefault && <CheckIcon className="w-3 h-3 text-neutral-950" strokeWidth={3} />}
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-white">
                Als Hauptdepot festlegen
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                Wird beim Öffnen der Portfolio-Seite automatisch angezeigt.
              </p>
            </div>
          </div>
        </button>

        {/* Danger Zone — Depot löschen */}
        <div className="mt-12 pt-6 border-t border-neutral-800/40">
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
            Gefahrenzone
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-[12px] text-red-400 transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Depot löschen
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-[13px] font-medium text-red-300 mb-1">
                Depot wirklich löschen?
              </p>
              <p className="text-[12px] text-neutral-400 mb-4 leading-relaxed">
                Alle Transaktionen und Positionen dieses Depots werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500 hover:bg-red-400 disabled:bg-red-500/40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors"
                >
                  {deleting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Lösche…
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-3.5 h-3.5" />
                      Endgültig löschen
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3.5 py-2 text-[12px] text-neutral-400 hover:text-white transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/analyse/portfolio/depots"
            className="flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Abbrechen
          </Link>
          <button
            onClick={handleSave}
            disabled={!depotName.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-neutral-950 rounded-full animate-spin" />
                Speichere…
              </>
            ) : (
              <>
                Änderungen speichern
                <CheckIcon className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
