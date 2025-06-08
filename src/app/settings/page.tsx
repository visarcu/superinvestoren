// src/app/settings/page.tsx
export default function SettingsPage() {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Einstellungen</h1>
            <p className="text-gray-400">App-Einstellungen und Präferenzen</p>
          </div>
  
          {/* Coming Soon */}
          <div className="bg-gray-800/60 backdrop-blur-md p-8 rounded-2xl border border-gray-700 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">Einstellungen kommen bald</h2>
            <p className="text-gray-300 mb-6">
              Wir arbeiten an umfangreichen Einstellungsmöglichkeiten für eine bessere Benutzererfahrung.
            </p>
            
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>Dark/Light Mode Toggle</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>Notification Preferences</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>Data Display Options</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span>Language Settings</span>
              </div>
            </div>
          </div>
  
          {/* Back Button */}
          <div className="text-center mt-8">
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition"
            >
              ← Zurück zur Startseite
            </a>
          </div>
        </div>
      </div>
    );
  }