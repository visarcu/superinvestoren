// src/app/(terminal)/analyse/portfolio/depots/neu/page.tsx
// Premium-Design Depot-Erstellen (3-Step): Broker wählen → Name → Fertig.
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import PortfolioBrokerSelector, { BrokerBadge } from '@/components/PortfolioBrokerSelector'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import { BrokerType, getBrokerConfig, brokerTypeToLogoId } from '@/lib/brokerConfig'

type Step = 1 | 2 | 3

const STEP_LABELS: Record<Step, string> = {
  1: 'Broker',
  2: 'Name',
  3: 'Fertig',
}

export default function NewDepotPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [selectedBroker, setSelectedBroker] = useState<BrokerType | null>(null)
  const [depotName, setDepotName] = useState('')
  const [customBrokerName, setCustomBrokerName] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdDepotId, setCreatedDepotId] = useState<string | null>(null)

  const getDefaultName = (broker: BrokerType): string => {
    const brokerConfig = getBrokerConfig(broker)
    if (broker === 'andere' && customBrokerName) {
      return `${customBrokerName} Depot`
    }
    return `${brokerConfig.displayName} Depot`
  }

  const handleBrokerSelect = (broker: BrokerType) => {
    setSelectedBroker(broker)
    const config = getBrokerConfig(broker)
    setDepotName(getDefaultName(broker))
    setCustomColor(config.color)
  }

  const handleNextStep = () => {
    if (step === 1 && selectedBroker) setStep(2)
    else if (step === 2 && depotName.trim()) createDepot()
  }

  const handlePrevStep = () => {
    if (step === 2) setStep(1)
  }

  const createDepot = async () => {
    if (!selectedBroker || !depotName.trim()) return

    try {
      setCreating(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/auth/signin')
        return
      }

      const { count } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      const shouldBeDefault = isDefault || (count === 0)

      if (shouldBeDefault) {
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', session.user.id)
      }

      const { data: newPortfolio, error: createError } = await supabase
        .from('portfolios')
        .insert({
          user_id: session.user.id,
          name: depotName.trim(),
          currency: 'EUR',
          cash_position: 0,
          is_default: shouldBeDefault,
          broker_type: selectedBroker,
          broker_name: selectedBroker === 'andere' ? customBrokerName.trim() || null : null,
          broker_color: customColor || null,
        })
        .select()
        .single()

      if (createError) throw createError

      setCreatedDepotId(newPortfolio.id)
      setStep(3)
    } catch (err: any) {
      console.error('Error creating depot:', err)
      setError(err.message || 'Fehler beim Erstellen des Depots')
    } finally {
      setCreating(false)
    }
  }

  const brokerConfig = selectedBroker ? getBrokerConfig(selectedBroker) : null
  const logoId = selectedBroker ? brokerTypeToLogoId(selectedBroker) : null

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
            Neues Depot erstellen
          </h1>

          {/* Step Indicator */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto">
            {([1, 2, 3] as Step[]).map((s, i) => {
              const isActive = step === s
              const isDone = step > s
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`w-4 h-px ${isDone ? 'bg-neutral-600' : 'bg-neutral-800'}`} />}
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap tracking-tight ${
                    isActive ? 'text-white' : isDone ? 'text-neutral-400' : 'text-neutral-600'
                  }`}>
                    {isDone ? (
                      <CheckIcon className="w-3 h-3 text-neutral-400" />
                    ) : (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${
                        isActive ? 'border-white text-white' : 'border-neutral-700 text-neutral-600'
                      }`}>
                        {s}
                      </span>
                    )}
                    {STEP_LABELS[s]}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Broker Selection */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1 tracking-tight">
                Von welchem Broker?
              </h2>
              <p className="text-[13px] text-neutral-500">
                Wähle deinen Broker — wir kategorisieren das Depot entsprechend.
              </p>
            </div>

            <PortfolioBrokerSelector
              selectedBroker={selectedBroker}
              onSelect={handleBrokerSelect}
            />

            <p className="text-[11px] text-neutral-600 mt-6 text-center">
              Dein Broker fehlt? Wähle <span className="text-neutral-400">„Anderer Broker"</span> oder schreib uns an{' '}
              <span className="text-neutral-400">support@finclue.de</span>.
            </p>
          </div>
        )}

        {/* Step 2: Name & Settings */}
        {step === 2 && selectedBroker && (
          <div>
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1 tracking-tight">
                Wie soll dein Depot heißen?
              </h2>
              <p className="text-[13px] text-neutral-500">
                Vergib einen Namen — so findest du es später leicht wieder.
              </p>
            </div>

            {/* Ausgewählter Broker — Preview Card */}
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
                  {brokerConfig?.displayName}
                </p>
              </div>
              <button
                onClick={handlePrevStep}
                className="text-[11px] text-neutral-400 hover:text-white transition-colors"
              >
                Ändern
              </button>
            </div>

            {/* Custom Broker Name (nur bei "andere") */}
            {selectedBroker === 'andere' && (
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-neutral-400 mb-2 uppercase tracking-wider">
                  Broker-Name
                </label>
                <input
                  type="text"
                  value={customBrokerName}
                  onChange={(e) => {
                    setCustomBrokerName(e.target.value)
                    setDepotName(e.target.value ? `${e.target.value} Depot` : 'Mein Depot')
                  }}
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
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && createdDepotId && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-base font-semibold text-white mb-1 tracking-tight">
              Depot erstellt
            </h2>
            <p className="text-[13px] text-neutral-500 mb-6 max-w-md mx-auto">
              <span className="text-white">„{depotName}"</span> ist bereit — du kannst jetzt Positionen
              importieren oder manuell hinzufügen.
            </p>

            {selectedBroker && <BrokerBadge brokerId={selectedBroker} customColor={customColor} />}

            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-8 max-w-md mx-auto">
              <Link
                href={`/analyse/portfolio/dashboard?depot=${createdDepotId}`}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-neutral-100 text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                Zum Depot
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/analyse/portfolio/depots"
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[13px] text-white rounded-lg transition-colors"
              >
                Zur Übersicht
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions — sticky am Bottom für Step 1+2 */}
      {(step === 1 || step === 2) && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800/80 bg-neutral-950/95 backdrop-blur">
          <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              {step === 2 && (
                <button
                  onClick={handlePrevStep}
                  className="flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
                  Zurück
                </button>
              )}
            </div>
            <button
              onClick={handleNextStep}
              disabled={
                (step === 1 && !selectedBroker) ||
                (step === 2 && (!depotName.trim() || creating))
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
            >
              {creating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-500 border-t-neutral-950 rounded-full animate-spin" />
                  Erstelle…
                </>
              ) : step === 1 ? (
                <>Weiter<ArrowRightIcon className="w-3.5 h-3.5" /></>
              ) : (
                <>Depot erstellen<CheckIcon className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
