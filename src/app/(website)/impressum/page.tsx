// src/app/impressum/page.tsx
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Impressum – FinClue',
}

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-black">
      
      {/* Hero Section - Clean professional style */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium mb-8">
              <BuildingOfficeIcon className="w-4 h-4" />
              <span>Rechtliche Informationen</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-white mb-8 leading-tight">
              Impressum
              <span className="block text-gray-300">
                & Kontakt
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Alle wichtigen Informationen über FinClue
              gemäß den gesetzlichen Bestimmungen.
            </p>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="bg-black pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Angaben gemäß TMG */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Angaben gemäß § 5 TMG
            </h2>
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="space-y-2 text-gray-300">
                <p className="font-medium text-white text-lg">Visar Curraj</p>
                <p>c/o Postflex #9551</p>
                <p>Emsdettener Str. 10</p>
                <p>48268 Greven</p>
                <p>Deutschland</p>
              </div>
            </div>
          </div>

          {/* Vertreten durch */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Vertreten durch
            </h2>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-gray-300 font-medium">
                <strong className="text-white">Geschäftsführer:</strong> Visar Curraj
              </p>
            </div>
          </div>

          {/* Kontakt */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Kontakt
            </h2>
            <div className="grid gap-4">
           
         
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl">
                <div className="flex-shrink-0 w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <div>
                  <p className="text-white font-medium">E-Mail</p>
                  <a href="mailto:team@finclue.de" className="text-white hover:text-gray-300 transition-colors text-sm">
                  team@finclue.de
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Umsatzsteuer-ID */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Umsatzsteuer-ID
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:
            </p>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-gray-300 font-mono text-lg">DE123456789</p>
            </div>
          </div>

          {/* Haftungsausschluss */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Haftungsausschluss
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Haftung für Inhalte</h3>
                <p className="text-gray-400 leading-relaxed">
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Haftung für Links</h3>
                <p className="text-gray-400 leading-relaxed">
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>
            </div>
          </div>

          {/* Streitschlichtung */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Streitschlichtung
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 leading-relaxed">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
              </p>
              <div className="bg-white/5 rounded-2xl p-4">
                <a 
                  href="https://ec.europa.eu/consumers/odr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300 transition-colors text-sm break-all"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
              </div>
              <p className="text-gray-400">
                Unsere E-Mail für Streitschlichtung:{' '}
                <a href="mailto:team@finclue.de" className="text-white hover:text-gray-300 transition-colors">
                  team@finclue.de
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Clean professional style */}
      <section className="bg-black pb-16 border-t border-white/5">
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