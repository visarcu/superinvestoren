// src/app/privacy/page.tsx
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Datenschutzerklärung – Finclue',
}

export default function Page() {
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
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Datenschutz & Transparenz</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium text-white mb-8 leading-tight">
              Datenschutz
              <span className="block text-gray-300">
                erklärung
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Transparenz und Schutz Ihrer persönlichen Daten.
              Erfahren Sie, wie wir mit Ihren Daten umgehen.
            </p>

            {/* Last Updated Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 text-gray-400 rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Letzte Änderung: 16. Mai 2025
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
              Verantwortlicher
            </h2>
            <p className="text-gray-400 mb-6">
              Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
            </p>
            <div className="bg-white/5 rounded-2xl p-6">
              <div className="space-y-2 text-gray-300">
                <p className="font-medium text-white">Visar Curraj</p>
                <p>c/o Postflex #9551</p>
                <p>Emsdettener Str. 10</p>
                <p>48268 Greven</p>
                <p>Deutschland</p>
                <p>
                  E-Mail: <a href="mailto:team@finclue.de" className="text-white hover:text-gray-300 transition-colors">
                  team@finclue.de
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Allgemeines zur Datenverarbeitung
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Wir erheben, verarbeiten und nutzen personenbezogene Daten nur, soweit sie für
              die Begründung, inhaltliche Ausgestaltung oder Änderung des jeweiligen
              Rechtsverhältnisses erforderlich sind (Bestandsdaten). Personenbezogene Daten
              über die Inanspruchnahme unserer Internetseiten (Nutzungsdaten) erheben,
              verarbeiten und nutzen wir nur, soweit dies erforderlich ist, um dem Nutzer
              die Inanspruchnahme des Dienstes zu ermöglichen oder abzurechnen.
            </p>
            <div className="bg-white/5 rounded-2xl p-4">
              <h3 className="font-medium text-white mb-2">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO</h3>
              <p className="text-gray-300 text-sm">Die Verarbeitung erfolgt zur Erfüllung eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen.</p>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Erhebung von Nutzungsdaten
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Bei jedem Zugriff auf unsere Website werden über Ihr Endgerät automatisiert
              Daten an unseren Server übertragen. Diese Nutzungsdaten (z. B. IP-Adresse,
              Datum und Uhrzeit des Zugriffs, betrachtete Unterseiten) werden lediglich zur
              Sicherstellung eines störungsfreien Betriebs und zur Verbesserung unseres
              Angebots ausgewertet.
            </p>
            <div className="text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
              <strong className="text-white">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Registrierung und Nutzerkonto
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Für bestimmte Funktionen (z. B. Watchlist, persönliche Profile) ist eine
              Registrierung mit Angabe Ihrer E-Mail-Adresse und Ihres Namens erforderlich.
              Ihre Daten werden dabei verschlüsselt übertragen und – nach erfolgreicher
              E-Mail-Verifizierung – in unserer Datenbank gespeichert.
            </p>
            <div className="text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
              <strong className="text-white">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              E-Mail-Kommunikation (Newsletter)
            </h2>
            <p className="text-gray-400 mb-4 leading-relaxed">
              Wenn Sie sich für unseren Quartals-Newsletter anmelden, verwenden wir Ihre
              E-Mail-Adresse ausschließlich zum Versand desselben. Sie können den Newsletter
              jederzeit mit einem Klick auf „Abmelden" in der E-Mail oder per E-Mail an uns
              abbestellen.
            </p>
            <div className="text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
              <strong className="text-white">Rechtsgrundlage:</strong> Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Einsatz von Cookies
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die Ihr
              Browser automatisch erstellt und auf Ihrem Endgerät speichert, wenn Sie unsere
              Website besuchen. Sie helfen uns, die Website nutzerfreundlich und sicher zu
              gestalten. Sie können die Speicherung von Cookies in den Einstellungen Ihres
              Browsers verhindern; in diesem Fall funktionieren jedoch manche Features nicht
              mehr vollständig.
            </p>
          </div>

          {/* Section 7 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Externe Dienstleister & Auftragsverarbeitung
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Hosting & Datenbanken</h3>
                <p className="text-gray-400 leading-relaxed">
                  Unsere Website wird extern gehostet. Der Hoster speichert alle Daten, die im
                  Rahmen der Nutzung unserer Website anfallen.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Sicherheitsmaßnahmen</h3>
                <p className="text-gray-400 leading-relaxed">
                  Alle Dienstleister verarbeiten Ihre Daten nur im Rahmen unserer Weisungen und
                  erfüllen die Anforderungen der Art. 28 DSGVO.
                </p>
              </div>
            </div>
          </div>

          {/* Section 8 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Speicherdauer
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Wir speichern Ihre Bestandsdaten (z. B. E-Mail, Name) solange Ihr Konto
              besteht bzw. gesetzliche Aufbewahrungsfristen bestehen. Log- und
              Nutzungsdaten werden nach 7 Tagen gelöscht. Verifizierungs- und
              Reset-Tokens nach 24 Stunden bzw. 1 Stunde.
            </p>
          </div>

          {/* Section 9 - Betroffenenrechte */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Betroffenenrechte
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Sie haben umfassende Rechte bezüglich Ihrer personenbezogenen Daten:
            </p>
            
            <div className="space-y-4 mb-6">
              {[
                { title: "Auskunftsrecht", desc: "Sie können jederzeit Auskunft über die von uns gespeicherten Daten verlangen" },
                { title: "Berichtigungsrecht", desc: "Unrichtige Daten können Sie korrigieren lassen" },
                { title: "Löschungsrecht", desc: "Sie können die Löschung Ihrer Daten verlangen" },
                { title: "Einschränkungsrecht", desc: "Sie können die Verarbeitung einschränken lassen" },
                { title: "Datenübertragbarkeit", desc: "Sie können Ihre Daten in strukturierter Form erhalten" },
                { title: "Widerspruchsrecht", desc: "Sie können der Verarbeitung widersprechen" }
              ].map((right, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-white mb-1">{right.title}</h4>
                    <p className="text-sm text-gray-400">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          
          </div>

          {/* Section 10 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Datensicherheit
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Wir verwenden TLS zur Verschlüsselung der Datenübertragung und speichern Passwörter
              nur als sichere Hashes (bcrypt). Unsere Systeme werden regelmäßig aktualisiert
              und überwacht.
            </p>
          </div>

          {/* Section 11 */}
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              Änderungen dieser Datenschutzerklärung
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Wir behalten uns vor, diese Erklärung bei Bedarf anzupassen. Die jeweils aktuelle
              Version finden Sie immer an dieser Stelle.
            </p>
          </div>
        </div>
      </section>

      {/* Footer - Clean professional style */}
      <section className="bg-black pb-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
          <p className="text-gray-400 mb-2">
            © 2025 Finclue. Alle Rechte vorbehalten.
          </p>
          <p className="text-sm text-gray-500">
            Bei Fragen zum Datenschutz wenden Sie sich gerne an uns.
          </p>
        </div>
      </section>
    </div>
  )
}