// src/app/settings/page.tsx - FEY STYLE REDESIGN with Theme Toggle
'use client'

import Link from 'next/link'
import {
  CogIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  BellIcon,
  EyeIcon,
  LanguageIcon,
  SwatchIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'

export default function SettingsPage() {
  const { theme, toggleTheme, lightThemeDisabled } = useTheme()

  const upcomingFeatures = [
    {
      icon: BellIcon,
      title: 'Benachrichtigungen',
      description: 'Erhalte Updates zu deiner Watchlist',
      status: 'In Entwicklung'
    },
    {
      icon: EyeIcon,
      title: 'Daten-Anzeige',
      description: 'Personalisiere deine Dashboard-Ansicht',
      status: 'Geplant'
    },
    {
      icon: LanguageIcon,
      title: 'Sprach-Einstellungen',
      description: 'Interface in deiner bevorzugten Sprache',
      status: 'Geplant'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Privatsphäre',
      description: 'Kontrolliere deine Daten und Einstellungen',
      status: 'In Entwicklung'
    },
    {
      icon: Cog6ToothIcon,
      title: 'Erweiterte Optionen',
      description: 'Tiefergehende Konfigurationsmöglichkeiten',
      status: 'Geplant'
    }
  ]

  const quickActions = [
    {
      title: 'Dashboard',
      description: 'Zurück zur Übersicht',
      href: '/analyse',
      color: 'green'
    },
    {
      title: 'Watchlist',
      description: 'Gespeicherte Aktien',
      href: '/analyse/watchlist',
      color: 'green'
    },
    {
      title: 'Premium',
      description: 'Upgrade verfügbar',
      href: '/pricing',
      color: 'purple'
    }
  ]

  const getStatusText = (status: string) => {
    switch (status) {
      case 'In Entwicklung':
        return 'text-yellow-400'
      case 'Geplant':
        return 'text-neutral-500'
      default:
        return 'text-neutral-600'
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8">

        {/* Header - Flat Style */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Cog6ToothIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm text-theme-muted">Einstellungen</span>
          </div>

          <h1 className="text-2xl font-semibold text-theme-primary mb-2">
            App-Konfiguration
          </h1>

          <p className="text-theme-secondary text-sm max-w-2xl">
            Passe FinClue an deine Bedürfnisse an. Weitere Einstellungen werden laufend hinzugefügt.
          </p>
        </div>

        {/* Appearance Section - Flat */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <SwatchIcon className="w-5 h-5 text-theme-muted" />
            <div>
              <h2 className="text-base font-medium text-theme-primary">Erscheinungsbild</h2>
              <p className="text-theme-muted text-sm">Wähle dein bevorzugtes Design</p>
            </div>
          </div>

          <div className="space-y-3 max-w-md">
            {/* Dark Theme */}
            <button
              onClick={() => theme === 'light' && !lightThemeDisabled && toggleTheme()}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                theme === 'dark'
                  ? 'bg-theme-secondary border border-emerald-500/30'
                  : 'bg-theme-card border border-theme hover:border-theme-muted cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-theme-tertiary rounded-lg flex items-center justify-center">
                  <MoonIcon className="w-5 h-5 text-theme-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-theme-primary">Dark</p>
                  <p className="text-xs text-theme-muted">
                    {theme === 'dark' ? 'Aktuell aktiv' : 'Dunkles Design'}
                  </p>
                </div>
              </div>
              {theme === 'dark' && (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </button>

            {/* Light Theme */}
            {lightThemeDisabled ? (
              <div className="flex items-center justify-between p-4 bg-theme-card border border-theme rounded-xl opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-tertiary rounded-lg flex items-center justify-center">
                    <SunIcon className="w-5 h-5 text-theme-muted" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-theme-muted">Light</p>
                    <p className="text-xs text-theme-muted">Wird überarbeitet</p>
                  </div>
                </div>
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded font-medium">
                  Bald verfügbar
                </span>
              </div>
            ) : (
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                  theme === 'light'
                    ? 'bg-theme-secondary border border-emerald-500/30'
                    : 'bg-theme-card border border-theme hover:border-theme-muted cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-theme-tertiary rounded-lg flex items-center justify-center">
                    <SunIcon className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-theme-primary">Light</p>
                    <p className="text-xs text-theme-muted">
                      {theme === 'light' ? 'Aktuell aktiv' : 'Helles Design'}
                    </p>
                  </div>
                </div>
                {theme === 'light' && (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Coming Soon - Flat with Icon Left */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-theme-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <CogIcon className="w-6 h-6 text-theme-muted" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-medium text-theme-primary mb-1">
                Weitere Einstellungen kommen bald
              </h2>
              <p className="text-theme-muted text-sm mb-4">
                Wir arbeiten an umfangreichen Einstellungsmöglichkeiten für eine bessere Benutzererfahrung.
              </p>
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Zurück zum Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Features - Flat List */}
        <div className="border-b border-theme pb-8 mb-8">
          <h2 className="text-sm font-medium text-theme-secondary mb-4">Geplante Features</h2>

          <div className="space-y-0">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="flex items-center justify-between py-4 border-b border-theme last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-theme-muted" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-theme-primary">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-theme-muted">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${getStatusText(feature.status)}`}>
                    {feature.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Navigation - Pill Buttons */}
        <div className="border-b border-theme pb-8 mb-8">
          <h2 className="text-sm font-medium text-theme-secondary mb-4">Schnellzugriff</h2>

          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary rounded-lg transition-colors"
              >
                <span className="text-sm text-theme-secondary">{action.title}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Current Status - Two Columns No Border */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <h2 className="text-sm font-medium text-theme-secondary">Aktueller Status</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-theme-primary mb-1">Automatische Synchronisation</h4>
              <p className="text-xs text-theme-muted mb-2">
                Deine Präferenzen werden automatisch gespeichert und geräteübergreifend synchronisiert.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span className="text-xs text-emerald-400">Aktiv</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-theme-primary mb-1">Datenschutz</h4>
              <p className="text-xs text-theme-muted mb-2">
                Alle deine Daten werden verschlüsselt und sicher in der EU gespeichert.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span className="text-xs text-emerald-400">Geschützt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Development Roadmap - Flat Timeline */}
        <div>
          <h2 className="text-sm font-medium text-theme-secondary mb-4">Entwicklungs-Roadmap</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-theme-primary">Dashboard & Watchlist</div>
                <div className="text-xs text-theme-muted">Basis-Funktionalität - Abgeschlossen</div>
              </div>
              <div className="text-xs text-emerald-400 font-medium">✓ Fertig</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-theme-primary">Theme-Anpassung</div>
                <div className="text-xs text-theme-muted">Dark & Light Mode</div>
              </div>
              <div className="text-xs text-emerald-400 font-medium">✓ Fertig</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-theme-primary">Erweiterte Einstellungen</div>
                <div className="text-xs text-theme-muted">Benachrichtigungen, Personalisierung</div>
              </div>
              <div className="text-xs text-yellow-400 font-medium">Q1 2026</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-theme-muted rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-theme-primary">Personalisierung</div>
                <div className="text-xs text-theme-muted">Individuelle Dashboards, Sprachen</div>
              </div>
              <div className="text-xs text-theme-muted font-medium">Q2 2026</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
