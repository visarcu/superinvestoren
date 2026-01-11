// src/app/(terminal)/analyse/portfolio/depots/neu/page.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  BriefcaseIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import PortfolioBrokerSelector from '@/components/PortfolioBrokerSelector'
import { BrokerBadge } from '@/components/PortfolioBrokerSelector'
import { BrokerType, getBrokerConfig, getBrokerDisplayName } from '@/lib/brokerConfig'

type Step = 1 | 2 | 3

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

  // Generiere Default-Namen basierend auf Broker
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
    if (step === 1 && selectedBroker) {
      setStep(2)
    } else if (step === 2 && depotName.trim()) {
      createDepot()
    }
  }

  const handlePrevStep = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const createDepot = async () => {
    if (!selectedBroker || !depotName.trim()) return

    try {
      setCreating(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      // Wenn es das erste Portfolio ist, setze es als Default
      const { count } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      const shouldBeDefault = isDefault || (count === 0)

      // Falls neues Default, erst alle anderen auf nicht-default setzen
      if (shouldBeDefault) {
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', session.user.id)
      }

      // Neues Portfolio erstellen
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
          broker_color: customColor || null
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

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="bg-theme-card border-b border-theme/10">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/analyse/portfolio/depots"
              className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="text-sm">Zurück</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-3">
            <BriefcaseIcon className="w-7 h-7" />
            Neues Depot erstellen
          </h1>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    step >= s
                      ? step === s
                        ? 'bg-brand text-white'
                        : 'bg-brand/20 text-brand'
                      : 'bg-theme-secondary/30 text-theme-muted'
                  }`}
                >
                  {step > s ? <CheckIcon className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-colors ${
                      step > s ? 'bg-brand' : 'bg-theme-secondary/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-6 mt-2 text-sm">
            <span className={step >= 1 ? 'text-theme-primary' : 'text-theme-muted'}>
              Broker wählen
            </span>
            <span className={step >= 2 ? 'text-theme-primary' : 'text-theme-muted'}>
              Name vergeben
            </span>
            <span className={step >= 3 ? 'text-theme-primary' : 'text-theme-muted'}>
              Fertig
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Broker Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-theme-primary mb-2">
              Welchen Broker nutzt du?
            </h2>
            <p className="text-theme-secondary mb-6">
              Wähle deinen Broker aus, um dein Depot zu kategorisieren.
            </p>

            <PortfolioBrokerSelector
              selectedBroker={selectedBroker}
              onSelect={handleBrokerSelect}
            />

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleNextStep}
                disabled={!selectedBroker}
                className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 disabled:bg-brand/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                Weiter
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Name & Settings */}
        {step === 2 && selectedBroker && (
          <div>
            <h2 className="text-lg font-semibold text-theme-primary mb-2">
              Wie soll dein Depot heißen?
            </h2>
            <p className="text-theme-secondary mb-6">
              Vergib einen Namen, um das Depot leicht wiederzufinden.
            </p>

            {/* Selected Broker Preview */}
            <div className="bg-theme-card border border-theme/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${brokerConfig?.color}20` }}
                >
                  <BriefcaseIcon className="w-5 h-5" style={{ color: brokerConfig?.color }} />
                </div>
                <div>
                  <p className="text-sm text-theme-muted">Ausgewählter Broker</p>
                  <BrokerBadge brokerId={selectedBroker} size="sm" />
                </div>
              </div>
            </div>

            {/* Custom Broker Name (nur bei "andere") */}
            {selectedBroker === 'andere' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-theme-primary mb-2">
                  Broker-Name
                </label>
                <input
                  type="text"
                  value={customBrokerName}
                  onChange={(e) => {
                    setCustomBrokerName(e.target.value)
                    setDepotName(e.target.value ? `${e.target.value} Depot` : 'Mein Depot')
                  }}
                  placeholder="z.B. Consorsbank, DKB, ..."
                  className="w-full px-4 py-3 bg-theme-secondary border border-theme/20 rounded-xl text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            )}

            {/* Depot Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Depot-Name
              </label>
              <input
                type="text"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                placeholder="z.B. Haupt-Depot, Altersvorsorge, ..."
                className="w-full px-4 py-3 bg-theme-secondary border border-theme/20 rounded-xl text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* Custom Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-theme-primary mb-2">
                Farbe für Unterscheidung
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customColor || brokerConfig?.color || '#10B981'}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={customColor || brokerConfig?.color || ''}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#10B981"
                  className="flex-1 px-4 py-3 bg-theme-secondary border border-theme/20 rounded-xl text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand font-mono text-sm"
                />
              </div>
            </div>

            {/* Set as Default */}
            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-5 h-5 rounded border-theme/20 text-brand focus:ring-brand bg-theme-secondary"
                />
                <span className="text-theme-primary">Als Hauptdepot festlegen</span>
              </label>
              <p className="text-sm text-theme-muted mt-1 ml-8">
                Das Hauptdepot wird beim Öffnen der Portfolio-Seite automatisch angezeigt.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handlePrevStep}
                className="flex items-center gap-2 px-6 py-3 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück
              </button>
              <button
                onClick={handleNextStep}
                disabled={!depotName.trim() || creating}
                className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 disabled:bg-brand/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    Depot erstellen
                    <CheckIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && createdDepotId && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <SparklesIcon className="w-10 h-10 text-brand" />
            </div>

            <h2 className="text-2xl font-bold text-theme-primary mb-2">
              Depot erfolgreich erstellt!
            </h2>
            <p className="text-theme-secondary mb-8 max-w-md mx-auto">
              Dein neues Depot <strong className="text-theme-primary">"{depotName}"</strong> ist bereit.
              Du kannst jetzt Positionen hinzufügen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/analyse/portfolio/dashboard?depot=${createdDepotId}`}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 text-white font-semibold rounded-xl transition-colors"
              >
                Zum Depot
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/analyse/portfolio/depots"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-primary font-semibold rounded-xl transition-colors"
              >
                Zur Übersicht
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
