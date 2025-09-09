// src/app/terms/page.tsx
import Link from 'next/link'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Allgemeine Geschäftsbedingungen – FinClue',
}

export default function TermsPage() {
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
              <DocumentTextIcon className="w-4 h-4" />
              <span>Rechtliche Bedingungen</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-white mb-8 leading-tight">
              Allgemeine
              <span className="block text-gray-300">
                Geschäftsbedingungen
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Unsere Nutzungsbedingungen für FinClue.
              Transparent und fair für alle Nutzer.
            </p>

            {/* Valid From Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Gültig ab: 16. Mai 2025
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="bg-black pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Section 1 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Geltungsbereich
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die
              über die Website{' '}
              <Link href="/" className="text-white hover:text-gray-300 transition-colors">
                FinClue
              </Link>{' '}
              zwischen dem Anbieter FinClue (nachfolgend „Anbieter") und den Nutzern (nachfolgend
              „Kunde") geschlossen werden.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Vertragsschluss
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Die Darstellung der Produkte und Dienstleistungen auf der Website stellt
                  kein rechtlich bindendes Angebot dar, sondern einen unverbindlichen
                  Online-Katalog.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Durch das Ausfüllen und Absenden des Online-Formulars im Bereich
                  „Registrierung" gibt der Kunde ein verbindliches Angebot zum Abschluss
                  eines Nutzungsvertrages ab.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Der Vertrag kommt zustande, sobald der Anbieter dem Kunden eine
                  Bestätigungs-E-Mail gesendet hat.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Leistungen des Anbieters
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Der Anbieter stellt dem Kunden Zugriff auf:
            </p>
            <div className="space-y-4">
              {[
                "Portfolios bekannter Investoren",
                "Historische Kennzahlen und Charts", 
                "Newsletter-Versand (optional)",
                "Aktienanalyse-Tools"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-white/5 rounded-2xl p-4">
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Hinweis:</strong> Premium-Features sind gekennzeichnet und gegen Gebühr erhältlich.
              </p>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Preise und Zahlung
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Sofern kostenpflichtige Premium-Leistungen gebucht werden, gelten die zum
              Zeitpunkt der Buchung angezeigten Preise. Die Abrechnung erfolgt per
              Kreditkarte oder Lastschrift.
            </p>
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Widerrufsrecht:</strong> Ein Widerruf ist gemäß § 312g BGB innerhalb von 14 Tagen möglich.
              </p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Pflichten des Kunden
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Der Kunde ist verpflichtet, bei der Registrierung wahrheitsgemäße
                  Angaben zu machen.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Benutzername und Passwort sind geheim zu halten.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                <p className="text-gray-400 leading-relaxed">
                  Der Kunde hat Änderungen seiner Kontaktdaten unverzüglich mitzuteilen.
                </p>
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Haftung
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit sowie bei
              Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die
              Haftung ist auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
            </p>
          </div>

          {/* Section 7 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Laufzeit und Kündigung
            </h2>
            <div className="space-y-4">
              <p className="text-gray-400 leading-relaxed">
                Die Registrierung ist unbefristet. Premium-Abonnements laufen mindestens
                einen Monat und verlängern sich automatisch um einen weiteren Monat,
                sofern sie nicht 7 Tage vor Ablauf gekündigt werden.
              </p>
              <div className="bg-white/5 rounded-2xl p-4">
                <p className="text-gray-300 text-sm">
                  <strong className="text-white">Wichtig:</strong> Kündigungen müssen 7 Tage vor Ablauf des aktuellen Abrechnungszeitraums eingehen.
                </p>
              </div>
            </div>
          </div>

          {/* Section 8 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Datenschutz
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Hinweise zum Datenschutz finden Sie in unserer{' '}
              <Link href="/privacy" className="text-white hover:text-gray-300 transition-colors underline">
                Datenschutzerklärung
              </Link>.
            </p>
          </div>

          {/* Section 9 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Schlussbestimmungen
            </h2>
            <div className="space-y-4">
              {[
                "Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.",
                "Gerichtsstand ist, soweit zulässig, der Sitz des Anbieters.",
                "Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt der Rest davon unberührt."
              ].map((point, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                  <span className="text-gray-300">{point}</span>
                </div>
              ))}
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
            Bei Fragen zu unseren AGBs wenden Sie sich gerne an uns.
          </p>
        </div>
      </section>
    </div>
  )
}