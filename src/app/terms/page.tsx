// src/app/terms/page.tsx
import Link from 'next/link'

export const metadata = {
  title: 'Allgemeine Geschäftsbedingungen – FinClue',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      
      {/* Hero Section - Same style as privacy page */}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Rechtliche Bedingungen</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
              Allgemeine
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-8 leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Geschäftsbedingungen
              </span>
            </h2>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
              Unsere Nutzungsbedingungen für FinClue.
              <br className="hidden sm:block" />
              Transparent und fair für alle Nutzer.
            </p>

            {/* Valid From Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-800 text-gray-300 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Gültig ab: 16. Mai 2025
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="bg-gray-950 pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Section 1 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">1</span>
              </div>
              Geltungsbereich
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die
              über die Website{' '}
              <Link href="/" className="text-green-400 hover:text-green-300 transition-colors">
                FinClue
              </Link>{' '}
              zwischen dem Anbieter FinClue (nachfolgend „Anbieter") und den Nutzern (nachfolgend
              „Kunde") geschlossen werden.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">2</span>
              </div>
              Vertragsschluss
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  1
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Die Darstellung der Produkte und Dienstleistungen auf der Website stellt
                  kein rechtlich bindendes Angebot dar, sondern einen unverbindlichen
                  Online-Katalog.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  2
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Durch das Ausfüllen und Absenden des Online-Formulars im Bereich
                  „Registrierung" gibt der Kunde ein verbindliches Angebot zum Abschluss
                  eines Nutzungsvertrages ab.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  3
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Der Vertrag kommt zustande, sobald der Anbieter dem Kunden eine
                  Bestätigungs-E-Mail gesendet hat.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">3</span>
              </div>
              Leistungen des Anbieters
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Der Anbieter stellt dem Kunden Zugriff auf:
            </p>
            <div className="grid gap-3">
              {[
                "Portfolios bekannter Investoren",
                "Historische Kennzahlen und Charts", 
                "Newsletter-Versand (optional)",
                "Aktienanalyse-Tools"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                <strong className="text-green-400">Hinweis:</strong> Premium-Features sind gekennzeichnet und gegen Gebühr erhältlich.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">4</span>
              </div>
              Preise und Zahlung
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Sofern kostenpflichtige Premium-Leistungen gebucht werden, gelten die zum
              Zeitpunkt der Buchung angezeigten Preise. Die Abrechnung erfolgt per
              Kreditkarte oder Lastschrift.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>Widerrufsrecht:</strong> Ein Widerruf ist gemäß § 312g BGB innerhalb von 14 Tagen möglich.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">5</span>
              </div>
              Pflichten des Kunden
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  1
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Der Kunde ist verpflichtet, bei der Registrierung wahrheitsgemäße
                  Angaben zu machen.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  2
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Benutzername und Passwort sind geheim zu halten.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-xs font-bold mt-1">
                  3
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Der Kunde hat Änderungen seiner Kontaktdaten unverzüglich mitzuteilen.
                </p>
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">6</span>
              </div>
              Haftung
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit sowie bei
              Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die
              Haftung ist auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
            </p>
          </div>

          {/* Section 7 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">7</span>
              </div>
              Laufzeit und Kündigung
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 leading-relaxed">
                Die Registrierung ist unbefristet. Premium-Abonnements laufen mindestens
                einen Monat und verlängern sich automatisch um einen weiteren Monat,
                sofern sie nicht 7 Tage vor Ablauf gekündigt werden.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Wichtig:</strong> Kündigungen müssen 7 Tage vor Ablauf des aktuellen Abrechnungszeitraums eingehen.
                </p>
              </div>
            </div>
          </div>

          {/* Section 8 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">8</span>
              </div>
              Datenschutz
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Hinweise zum Datenschutz finden Sie in unserer{' '}
              <Link href="/privacy" className="text-green-400 hover:text-green-300 transition-colors underline">
                Datenschutzerklärung
              </Link>.
            </p>
          </div>

          {/* Section 9 */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 font-bold text-sm">9</span>
              </div>
              Schlussbestimmungen
            </h2>
            <div className="grid gap-4">
              {[
                "Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.",
                "Gerichtsstand ist, soweit zulässig, der Sitz des Anbieters.",
                "Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt der Rest davon unberührt."
              ].map((point, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5">
                    ✓
                  </div>
                  <span className="text-gray-300 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Same style as privacy page */}
      <section className="bg-gray-950 pb-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          <p className="text-gray-400 mb-2">
            © 2025 FinClue. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-gray-500">
            Bei Fragen zu unseren AGBs wenden Sie sich gerne an uns.
          </p>
        </div>
      </section>
    </div>
  )
}