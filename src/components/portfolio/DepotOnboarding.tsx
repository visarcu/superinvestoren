// src/components/portfolio/DepotOnboarding.tsx
// Erststart-Zustand des Portfolios: Der User hat noch kein Depot.
// Statt still ein Depot anzulegen, ist das Anlegen hier der erste sichtbare Schritt.
'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRightIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import { BROKER_CONFIGS, BrokerType, brokerTypeToLogoId } from '@/lib/brokerConfig'

// Broker mit Logo zuerst — die vollständige Liste steckt im Wizard.
const QUICK_BROKERS: BrokerType[] = [
  'trade_republic',
  'scalable_capital',
  'finanzen_zero',
  'flatex',
  'ing',
  'trading212',
]

const STEPS = [
  { title: 'Depot anlegen', text: 'Broker wählen, Namen vergeben — dauert 20 Sekunden.' },
  { title: 'Aktivitäten erfassen', text: 'Käufe, Verkäufe, Dividenden und Cash — manuell oder per CSV-Import.' },
  { title: 'Portfolio analysieren', text: 'Rendite, Allokation, Dividenden und Superinvestor-Overlap.' },
]

const newDepotHref = (broker?: BrokerType) =>
  `/analyse/portfolio/depots/neu?first=1${broker ? `&broker=${broker}` : ''}`

export default function DepotOnboarding() {
  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary">
      <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        {/* Intro */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/10 px-3 py-1 text-[11px] font-medium text-teal-500 dark:text-teal-300">
            Schritt 1 von 3
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-theme-primary sm:text-4xl">
            Leg dein erstes Depot an
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-theme-secondary">
            Ein Depot bildet ab, was bei deinem Broker liegt. Du kannst später beliebig viele
            anlegen und sie zusammen als &bdquo;Alle Depots&ldquo; auswerten.
          </p>
        </div>

        {/* Broker-Schnellauswahl */}
        <div className="bg-theme-card border border-theme rounded-xl p-6">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.14em] text-theme-muted">
            Bei welchem Broker liegt dein Depot?
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUICK_BROKERS.map(brokerId => {
              const config = BROKER_CONFIGS.find(b => b.id === brokerId)!
              const logoId = brokerTypeToLogoId(brokerId)
              return (
                <Link
                  key={brokerId}
                  href={newDepotHref(brokerId)}
                  className="group flex items-center gap-3 rounded-xl border border-theme bg-theme-secondary/40 px-3.5 py-3 transition-colors hover:border-teal-300/25 hover:bg-theme-hover"
                >
                  {logoId ? (
                    <BrokerLogo brokerId={logoId} size={32} />
                  ) : (
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${config.color}15`, border: `1px solid ${config.color}30` }}
                    >
                      <span className="text-[11px] font-bold" style={{ color: config.color }}>
                        {config.displayName[0]}
                      </span>
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-theme-primary">
                    {config.displayName}
                  </span>
                  <ArrowRightIcon className="h-4 w-4 flex-shrink-0 text-theme-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={newDepotHref()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              <PlusIcon className="h-4 w-4" />
              Anderen Broker wählen
            </Link>
            <Link
              href={newDepotHref('manual')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-theme px-4 py-2.5 text-sm font-medium text-theme-secondary transition-colors hover:bg-theme-hover hover:text-theme-primary"
            >
              <PencilSquareIcon className="h-4 w-4" />
              Ohne Broker starten
            </Link>
          </div>
        </div>

        {/* Ablauf */}
        <ol className="mt-8 space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3.5">
              <span
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  index === 0
                    ? 'bg-teal-400/15 text-teal-500 dark:text-teal-300'
                    : 'bg-theme-secondary text-theme-muted'
                }`}
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-theme-primary">{step.title}</p>
                <p className="text-[13px] leading-relaxed text-theme-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
