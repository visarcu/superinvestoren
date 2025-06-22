// src/app/settings/page.tsx - Clean Theme Support + Grid Background
import Link from 'next/link'
import { 
  CogIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-theme-primary noise-bg px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-theme-primary mb-4">
            Einstellungen
          </h1>
          <p className="text-theme-secondary">App-Einstellungen und Präferenzen</p>
        </div>

        {/* Main Card */}
        <div className="bg-theme-card/70 backdrop-blur-sm rounded-2xl border border-theme p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-theme-secondary/30 rounded-2xl flex items-center justify-center">
            <CogIcon className="w-8 h-8 text-theme-secondary" />
          </div>
          
          <h2 className="text-xl font-semibold text-theme-primary mb-3">
            Einstellungen kommen bald
          </h2>
          
          <p className="text-theme-secondary mb-8 max-w-md mx-auto">
            Wir arbeiten an umfangreichen Einstellungsmöglichkeiten für eine bessere Benutzererfahrung.
          </p>
          
          {/* Feature List - Clean */}
          <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
            <div className="flex items-center gap-3 text-theme-tertiary">
              <div className="w-1.5 h-1.5 bg-theme-secondary rounded-full"></div>
              <span className="text-sm">Dark/Light Mode Toggle</span>
            </div>
            <div className="flex items-center gap-3 text-theme-tertiary">
              <div className="w-1.5 h-1.5 bg-theme-secondary rounded-full"></div>
              <span className="text-sm">Notification Preferences</span>
            </div>
            <div className="flex items-center gap-3 text-theme-tertiary">
              <div className="w-1.5 h-1.5 bg-theme-secondary rounded-full"></div>
              <span className="text-sm">Data Display Options</span>
            </div>
            <div className="flex items-center gap-3 text-theme-tertiary">
              <div className="w-1.5 h-1.5 bg-theme-secondary rounded-full"></div>
              <span className="text-sm">Language Settings</span>
            </div>
          </div>

          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-theme-secondary/30 hover:bg-theme-secondary/50 text-theme-primary rounded-lg transition-colors text-sm border border-theme"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zur Startseite
          </Link>
        </div>

        {/* Quick Links - Clean */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link 
            href="/dashboard"
            className="bg-theme-card/70 border border-theme rounded-xl p-4 hover:bg-theme-card/85 hover:border-border-hover transition-all text-center group backdrop-blur-sm"
          >
            <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-theme-primary">Dashboard</h3>
            <p className="text-xs text-theme-secondary">Zurück zur Übersicht</p>
          </Link>

          <Link 
            href="/analyse"
            className="bg-theme-card/70 border border-theme rounded-xl p-4 hover:bg-theme-card/85 hover:border-border-hover transition-all text-center group backdrop-blur-sm"
          >
            <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-theme-primary">Analyse</h3>
            <p className="text-xs text-theme-secondary">Aktien analysieren</p>
          </Link>

          <Link 
            href="/pricing"
            className="bg-theme-card/70 border border-theme rounded-xl p-4 hover:bg-theme-card/85 hover:border-border-hover transition-all text-center group backdrop-blur-sm"
          >
            <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-theme-primary">Premium</h3>
            <p className="text-xs text-theme-secondary">Upgrade verfügbar</p>
          </Link>
        </div>

        {/* Footer Note - Minimal */}
        <div className="text-center mt-8">
          <p className="text-theme-secondary text-xs">
            Ihre Präferenzen werden automatisch gespeichert.
          </p>
        </div>
      </div>
    </div>
  );
}