// src/app/settings/page.tsx - DASHBOARD DESIGN KONSISTENZ
import Link from 'next/link'
import { 
  CogIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  BellIcon,
  EyeIcon,
  LanguageIcon,
  SwatchIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const upcomingFeatures = [
    {
      icon: SwatchIcon,
      title: 'Dark/Light Mode Toggle',
      description: 'Wechsle zwischen dunklem und hellem Design',
      status: 'Geplant'
    },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Entwicklung':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'Geplant':
        return 'bg-green-500/20 text-green-400'
      default:
        return 'bg-gray-500/20 text-gray-900'
    }
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-4 py-4 space-y-4">
        
        {/* Header */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 mb-3">
                <Cog6ToothIcon className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Einstellungen</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-theme-primary mb-2">
                App-Konfiguration
                <span className="block text-green-400">und Präferenzen</span>
              </h1>
              
              <p className="text-theme-secondary max-w-2xl">
                Passe FinClue an deine Bedürfnisse an. Weitere Einstellungen werden laufend hinzugefügt.
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Status */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-8 text-center">
            <div className="w-24 h-24 mx-auto bg-theme-tertiary/30 rounded-2xl flex items-center justify-center mb-6">
              <CogIcon className="w-12 h-12 text-theme-secondary" />
            </div>
            
            <div className="space-y-4 mb-8 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">
                Einstellungen kommen bald
              </h2>
              <p className="text-theme-secondary text-sm">
                Wir arbeiten an umfangreichen Einstellungsmöglichkeiten für eine bessere Benutzererfahrung. Einige Features sind bereits in Entwicklung.
              </p>
            </div>
            
            <Link
              href="/analyse"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-colors font-medium"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zurück zum Dashboard
            </Link>
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <CogIcon className="w-5 h-5 text-purple-400" />
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Geplante Features</h2>
                <p className="text-theme-secondary text-sm">Diese Einstellungen werden bald verfügbar sein</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingFeatures.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div 
                    key={index}
                    className="p-4 rounded-lg hover:bg-theme-secondary/20 transition-colors border border-theme/10"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-theme-tertiary/50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-theme-muted" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-theme-primary mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-xs text-theme-secondary">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(feature.status)}`}>
                        {feature.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ArrowLeftIcon className="w-5 h-5 text-green-400" />
              <div>
                <h2 className="text-lg font-semibold text-theme-primary">Schnellzugriff</h2>
                <p className="text-theme-secondary text-sm">Zurück zu wichtigen Bereichen</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Link 
                  key={index}
                  href={action.href}
                  className="p-4 rounded-lg hover:bg-theme-secondary/20 transition-all group border border-theme/10 hover:border-green-500/20"
                >
                  <div className="text-center">
                    <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-green-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-xs text-theme-secondary">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-green-400/20 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <h3 className="text-base font-semibold text-theme-primary">Aktueller Status</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-theme/10">
                <h4 className="text-sm font-medium text-theme-primary mb-2">Automatische Synchronisation</h4>
                <p className="text-xs text-theme-secondary mb-3">
                  Deine Präferenzen werden automatisch gespeichert und geräteübergreifend synchronisiert.
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">Aktiv</span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border border-theme/10">
                <h4 className="text-sm font-medium text-theme-primary mb-2">Datenschutz</h4>
                <p className="text-xs text-theme-secondary mb-3">
                  Alle deine Daten werden verschlüsselt und sicher in der EU gespeichert.
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs text-green-400">Geschützt</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Development Timeline */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <h3 className="text-base font-semibold text-theme-primary mb-4">Entwicklungs-Roadmap</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-theme-primary">Dashboard & Watchlist</div>
                  <div className="text-xs text-theme-muted">Basis-Funktionalität - Abgeschlossen</div>
                </div>
                <div className="text-xs text-green-400 font-medium">✓ Fertig</div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-theme-primary">Erweiterte Einstellungen</div>
                  <div className="text-xs text-theme-muted">Theme-Anpassung, Benachrichtigungen</div>
                </div>
                <div className="text-xs text-yellow-400 font-medium">🔄 Q1 2025</div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-theme-primary">Personalisierung</div>
                  <div className="text-xs text-theme-muted">Individuelle Dashboards, Sprachen</div>
                </div>
                <div className="text-xs text-green-400 font-medium">📅 Q2 2025</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}