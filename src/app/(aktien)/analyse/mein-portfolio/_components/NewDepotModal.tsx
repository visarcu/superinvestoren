'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Modal from './Modal'
import { BROKER_CONFIGS, type BrokerType, brokerTypeToLogoId } from '@/lib/brokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'

interface NewDepotModalProps {
  open: boolean
  onClose: () => void
  /** Wird nach erfolgreichem Erstellen aufgerufen (z.B. zum Neu-Laden der Liste) */
  onCreated?: (portfolioId: string) => void
}

// Sortierung: Live-Broker zuerst, Manuell + Andere ans Ende
const BROKERS_ORDERED: BrokerType[] = [
  'trade_republic',
  'scalable_capital',
  'trading212',
  'finanzen_zero',
  'flatex',
  'smartbroker',
  'ing',
  'freedom24',
  'comdirect',
  'interactive_brokers',
  'andere',
  'manual',
]

export default function NewDepotModal({ open, onClose, onCreated }: NewDepotModalProps) {
  const [brokerType, setBrokerType] = useState<BrokerType | null>(null)
  const [name, setName] = useState('')
  const [customName, setCustomName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setBrokerType(null)
    setName('')
    setCustomName('')
    setIsDefault(false)
    setError(null)
  }

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleSelectBroker = (type: BrokerType) => {
    setBrokerType(type)
    const config = BROKER_CONFIGS.find(b => b.id === type)
    if (config && !name.trim()) {
      setName(type === 'andere' ? '' : `${config.displayName} Depot`)
    }
    setError(null)
  }

  const handleSubmit = async () => {
    if (!brokerType) {
      setError('Bitte Broker auswählen')
      return
    }
    const finalName = name.trim()
    if (!finalName) {
      setError('Bitte Depot-Namen eingeben')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Nicht angemeldet')

      const { count } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      const shouldBeDefault = isDefault || count === 0

      if (shouldBeDefault) {
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', session.user.id)
      }

      const config = BROKER_CONFIGS.find(b => b.id === brokerType)!

      const { data: newPortfolio, error: createError } = await supabase
        .from('portfolios')
        .insert({
          user_id: session.user.id,
          name: finalName,
          currency: 'EUR',
          cash_position: 0,
          is_default: shouldBeDefault,
          broker_type: brokerType,
          broker_name: brokerType === 'andere' ? customName.trim() || null : null,
          broker_color: config.color,
        })
        .select()
        .single()

      if (createError) throw createError

      onCreated?.(newPortfolio.id)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Neues Depot"
      subtitle="Wähle deinen Broker und vergib einen Namen"
      onClose={handleClose}
      size="lg"
    >
      <div className="space-y-5">
        {/* Broker-Auswahl */}
        <div>
          <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-2.5 block">
            Broker
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BROKERS_ORDERED.map(type => {
              const config = BROKER_CONFIGS.find(b => b.id === type)
              if (!config) return null
              const logoId = brokerTypeToLogoId(type)
              const isSelected = brokerType === type
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectBroker(type)}
                  className={`
                    flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all
                    ${
                      isSelected
                        ? 'bg-white/[0.06] border-white/[0.15]'
                        : 'bg-[#0a0a12] border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.03]'
                    }
                  `}
                >
                  <BrokerLogo brokerId={logoId as any} size={28} />
                  <span className="text-[12px] font-medium text-white/85 truncate tracking-tight">
                    {config.displayName}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom-Broker-Name bei "Andere" */}
        {brokerType === 'andere' && (
          <div>
            <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
              Broker-Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value.slice(0, 40))}
              placeholder="z.B. Consorsbank, Onvista, ..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors"
            />
          </div>
        )}

        {/* Depot-Name */}
        {brokerType && (
          <div>
            <label className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1.5 block">
              Depot-Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 60))}
              placeholder="z.B. Mein Trade Republic Depot"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] transition-colors"
            />
          </div>
        )}

        {/* Standard-Depot-Checkbox */}
        {brokerType && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded bg-white/[0.03] border-white/[0.1] text-white focus:ring-1 focus:ring-white/[0.2]"
            />
            <span className="text-[12px] text-white/70">
              Als Standard-Depot setzen
            </span>
          </label>
        )}

        {error && (
          <div className="text-[12px] text-red-400 bg-red-500/[0.05] border border-red-500/[0.15] rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2.5 rounded-full text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !brokerType || !name.trim()}
            className="px-5 py-2.5 rounded-full bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-40"
          >
            {saving ? 'Erstelle…' : 'Depot erstellen'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
