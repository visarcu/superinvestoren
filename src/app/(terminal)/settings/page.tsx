// src/app/settings/page.tsx - THEME-AWARE DESIGN
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
      description: 'Wechsle zwischen dunklem und hellem Design'
    },
    {
      icon: BellIcon,
      title: 'Benachrichtigungen',
      description: 'Erhalte Updates zu deiner Watchlist'
    },
    {
      icon: EyeIcon,
      title: 'Daten-Anzeige',
      description: 'Personalisiere deine Dashboard-Ansicht'
    },
    {
      icon: LanguageIcon,
      title: 'Sprach-Einstellungen',
      description: 'Interface in deiner bevorzugten Sprache'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Privatsphäre',
      description: 'Kontrolliere deine Daten und Einstellungen'
    },
    {
      icon: Cog6ToothIcon,
      title: 'Erweiterte Optionen',
      description: 'Tiefergehende Konfigurationsmöglichkeiten'
    }
  ]

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Professional Header */}
      <div className="bg-theme-primary border-b border-theme py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Cog6ToothIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">Einstellungen</h1>
              <p className="text-theme-secondary text-sm">
                App-Konfiguration und Präferenzen
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Coming Soon Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-theme-secondary border border-theme rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-theme-tertiary rounded-lg flex items-center justify-center mb-6">
              <CogIcon className="w-8 h-8 text-theme-muted" />
            </div>
            
            <div className="space-y-4 mb-8">
              <h2 className="text-xl font-semibold text-theme-primary">
                Einstellungen kommen bald
              </h2>
              <p className="text-theme-secondary">
                Wir arbeiten an umfangreichen Einstellungsmöglichkeiten für eine bessere Benutzererfahrung.
              </p>
            </div>
            
            {/* Back Button */}
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
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <CogIcon className="w-4 h-4 text-purple-400" />
            </div>
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
                  className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-theme-tertiary rounded-lg flex items-center justify-center flex-shrink-0">
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
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ArrowLeftIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">Schnellzugriff</h2>
              <p className="text-theme-secondary text-sm">Zurück zu wichtigen Bereichen</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/analyse"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all group"
            >
              <div className="text-center">
                <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-green-400 transition-colors">
                  Dashboard
                </h3>
                <p className="text-xs text-theme-secondary">Zurück zur Übersicht</p>
              </div>
            </Link>

            <Link 
              href="/analyse/watchlist"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all group"
            >
              <div className="text-center">
                <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-green-400 transition-colors">
                  Watchlist
                </h3>
                <p className="text-xs text-theme-secondary">Gespeicherte Aktien</p>
              </div>
            </Link>

            <Link 
              href="/pricing"
              className="bg-theme-secondary border border-theme rounded-lg p-4 hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all group"
            >
              <div className="text-center">
                <h3 className="font-medium text-theme-primary text-sm mb-1 group-hover:text-green-400 transition-colors">
                  Premium
                </h3>
                <p className="text-xs text-theme-secondary">Upgrade verfügbar</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Status Note */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-theme-secondary border border-theme rounded-lg p-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium text-theme-primary">Status</span>
              </div>
              <p className="text-theme-secondary text-xs">
                Ihre aktuellen Präferenzen werden automatisch gespeichert und synchronisiert.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}