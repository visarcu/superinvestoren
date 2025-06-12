// src/app/impressum/page.tsx
export const metadata = {
  title: 'Impressum – FinClue',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Hero Section - Same style as other pages */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-gray-950 to-gray-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Rechtliche Informationen</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Impressum
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                & Kontakt
              </span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Alle wichtigen Informationen über FinClue
              <br className="hidden sm:block" />
              gemäß den gesetzlichen Bestimmungen.
            </p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="bg-gray-950 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Angaben gemäß TMG */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              Angaben gemäß § 5 TMG
            </h2>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <div className="space-y-2 text-gray-300">
                <p className="font-semibold text-white text-lg">Visar Curraj</p>
                <p>Schützenstrasse 5</p>
                <p>83943 Bad Aibling</p>
                <p>Deutschland</p>
              </div>
            </div>
          </div>

          {/* Vertreten durch */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              Vertreten durch
            </h2>
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-300 font-medium">
                <strong>Geschäftsführer:</strong> Visar Curraj
              </p>
            </div>
          </div>

          {/* Kontakt */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              Kontakt
            </h2>
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">Telefon</p>
                  <p className="text-gray-400 text-sm">+49 (0)30 12345678</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-300 font-medium">E-Mail</p>
                  <a href="mailto:loeweninvest@gmail.com" className="text-green-400 hover:text-green-300 transition-colors text-sm">
                    team.finclue@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Umsatzsteuer-ID */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Umsatzsteuer-ID
            </h2>
            <p className="text-gray-400 mb-4">
              Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <p className="text-gray-300 font-mono text-lg">DE123456789</p>
            </div>
          </div>

          {/* Haftungsausschluss */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              Haftungsausschluss
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Haftung für Inhalte</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Haftung für Links</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>
            </div>
          </div>

          {/* Streitschlichtung */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-3m-3 3l-3-3" />
                </svg>
              </div>
              Streitschlichtung
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 leading-relaxed">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm break-all"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
              </div>
              <p className="text-gray-400">
                Unsere E-Mail für Streitschlichtung:{' '}
                <a href="mailto:team.finclue@gmail.com" className="text-green-400 hover:text-green-300 transition-colors">
                  team.finclue@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Same style as other pages */}
      <section className="bg-gray-950 pb-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          <p className="text-gray-400 mb-2">
            © 2025 FinClue. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-gray-500">
            Bei Fragen erreichen Sie uns jederzeit über die angegebenen Kontaktdaten.
          </p>
        </div>
      </section>
    </div>
  )
}