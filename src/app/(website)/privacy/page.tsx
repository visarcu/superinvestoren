// src/app/privacy/page.tsx
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export const metadata = {
  title: 'Datenschutzerklärung',
}

/** Karte mit Überschrift, wie auf der ganzen Seite */
function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 bg-white/[0.03] border border-white/10 rounded-3xl p-8">
      <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
        <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0"></div>
        {title}
      </h2>
      <div className="space-y-4 text-gray-400 leading-relaxed">{children}</div>
    </div>
  )
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <h3 className="text-lg font-medium text-white mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Basis({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
      <strong className="text-white">Rechtsgrundlage:</strong> {children}
    </div>
  )
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
              Letzte Änderung: 26. November 2026
            </div>
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="bg-black pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          <Section title="Verantwortlicher">
            <p>Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
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
          </Section>

          <Section title="Allgemeines zur Datenverarbeitung">
            <p>
              Wir verarbeiten personenbezogene Daten nur, soweit das nötig ist, um Ihnen unsere
              Website und App bereitzustellen, Verträge zu erfüllen, gesetzliche Pflichten
              einzuhalten oder wenn Sie eingewilligt haben. Die genauen Rechtsgrundlagen stehen
              bei den einzelnen Abschnitten.
            </p>
            <p>
              Unsere Dienstleister handeln, soweit nicht anders angegeben, als Auftragsverarbeiter
              nach unseren Weisungen (Art. 28 DSGVO). Gelangen Daten in Länder außerhalb der EU,
              stützen wir das auf die Standardvertragsklauseln der EU-Kommission
              (Art. 46 Abs. 2 lit. c DSGVO) oder auf einen Angemessenheitsbeschluss, zum Beispiel das
              Datenschutzrahmenwerk zwischen der EU und den USA (Art. 45 DSGVO).
            </p>
            <p>
              Kurse, Nachrichten und Unternehmenszahlen laden unsere Server von Datenanbietern.
              Dabei werden keine Angaben zu Ihrer Person übermittelt.
            </p>
          </Section>

          <Section title="Hosting und Datenbank">
            <p>
              <strong className="text-white font-medium">Vercel:</strong> Website und Schnittstellen
              laufen bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. Vercel verarbeitet
              die Daten, die beim Aufruf entstehen, überwiegend in den USA und nimmt am
              Datenschutzrahmenwerk zwischen der EU und den USA teil.
            </p>
            <p>
              <strong className="text-white font-medium">Supabase:</strong> Nutzerkonten und Inhalte wie
              Depots speichern wir in einer Datenbank in Frankfurt am Main. Anbieter ist Supabase Pte. Ltd.,
              65 Chulia Street #38-02/03, OCBC Centre, Singapur 049513. Grundlage für Zugriffe von außerhalb
              der EU sind die Standardvertragsklauseln.
            </p>
            <Basis>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und lit. f DSGVO (berechtigtes Interesse an einem sicheren und stabilen Betrieb)</Basis>
          </Section>

          <Section title="Erhebung von Nutzungsdaten">
            <p>
              Bei jedem Zugriff auf unsere Website werden über Ihr Endgerät automatisiert
              Daten an unseren Server übertragen. Diese Nutzungsdaten (z. B. IP-Adresse,
              Datum und Uhrzeit des Zugriffs, betrachtete Unterseiten) werden lediglich zur
              Sicherstellung eines störungsfreien Betriebs und zur Verbesserung unseres
              Angebots ausgewertet.
            </p>
            <Basis>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)</Basis>
          </Section>

          <Section title="Registrierung und Nutzerkonto">
            <p>
              Für bestimmte Funktionen (z. B. Depot, Watchlist, Premium) ist eine Registrierung mit
              E-Mail-Adresse, Name und Passwort nötig. Ihre Daten werden verschlüsselt übertragen und
              nach erfolgreicher E-Mail-Verifizierung in unserer Datenbank gespeichert.
            </p>
            <p>
              <strong className="text-white font-medium">Anmeldung mit Google:</strong> Wenn Sie diesen Weg
              wählen, leiten wir Sie zu Google Ireland Limited, Gordon House, Barrow Street, Dublin 4,
              Irland, weiter. Wir erhalten danach Ihren Namen, Ihre E-Mail-Adresse und Ihr Profilbild.
              Für die Verarbeitung bei Google ist Google selbst verantwortlich
              (<a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">Datenschutzerklärung</a>).
            </p>
            <Basis>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</Basis>
          </Section>

          <Section title="Depot, Watchlist und Einstellungen">
            <p>
              Wir speichern, was Sie selbst anlegen oder hochladen: Depots, Positionen, Käufe, Verkäufe,
              Dividenden, Ein- und Auszahlungen, Konten und Vermögenswerte, Watchlists, Kursalarme,
              Notizen und Einstellungen. Hochgeladene Dateien Ihres Brokers (CSV, PDF, Excel) werten wir
              aus. Gespeichert werden die darin enthaltenen Buchungen, nicht die Dateien selbst.
            </p>
            <Sub title="Broker-Anbindung (Beta)">
              <p>
                <strong className="text-white font-medium">Trading 212:</strong> Verbinden Sie Ihr Konto,
                speichern wir Ihren Zugangsschlüssel verschlüsselt und rufen damit Positionen und Buchungen
                bei Trading 212 ab. Sie können die Verbindung jederzeit trennen.
              </p>
              <p>
                <strong className="text-white font-medium">finAPI:</strong> Andere Depots werden über die
                finAPI GmbH, Adams-Lehmann-Straße 44, 80797 München, verbunden. Ihre Zugangsdaten geben Sie
                direkt bei finAPI ein, wir sehen sie nicht und erhalten nur Bestände und Buchungen.
              </p>
            </Sub>
            <Basis>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), bei der Broker-Anbindung zusätzlich Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)</Basis>
          </Section>

          <Section title="Premium und Bezahlung">
            <p>
              Zahlungen wickelt Stripe Payments Europe, Limited, One Wilton Park, Wilton Place, Dublin 2,
              D02 FX04, Irland, ab. Wir übermitteln Ihre E-Mail-Adresse und Ihre Kontokennung. Karten- und
              Bankdaten geben Sie direkt bei Stripe ein, wir speichern sie nicht. Wir erhalten nur, ob und
              bis wann Ihr Abo bezahlt ist. Stripe ist teils Auftragsverarbeiter und teils selbst
              verantwortlich, zum Beispiel für die Betrugsprüfung, und kann Daten in den USA verarbeiten
              (<a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">Datenschutzerklärung</a>).
            </p>
            <p>
              Bezahlen Sie mit PayPal, werden Ihre Zahlungsdaten an PayPal (Europe) S.à r.l. et Cie, S.C.A.,
              Luxemburg, weitergegeben, das dafür selbst verantwortlich ist
              (<a href="https://www.paypal.com/de/legalhub/privacy-full" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">Datenschutzerklärung</a>).
              Bei der SEPA-Lastschrift erhält Ihre Bank die Zahlungsdaten.
            </p>
            <Basis>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), für die Aufbewahrung von Rechnungen Art. 6 Abs. 1 lit. c DSGVO (gesetzliche Pflicht)</Basis>
          </Section>

          <Section title="E-Mails und Newsletter">
            <p>
              <strong className="text-white font-medium">E-Mails zu Ihrem Konto:</strong> Bestätigungen,
              Hinweise zur Nutzung und Benachrichtigungen, zum Beispiel Wochenübersichten zu Depot,
              Dividenden und Quartalszahlen oder neue Meldungen von Superinvestoren, versenden wir über
              Resend (Plus Five Five, Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA). Dabei
              werden Ihre E-Mail-Adresse und der Inhalt der Nachricht verarbeitet, bei Depotübersichten also
              auch Werte aus Ihrem Depot. Resend nimmt am Datenschutzrahmenwerk zwischen der EU und den USA teil.
            </p>
            <p>
              <strong className="text-white font-medium">Newsletter:</strong> Haben Sie dem Newsletter
              zugestimmt, übertragen wir Ihre E-Mail-Adresse und, soweit angegeben, Ihren Namen an Brevo GmbH,
              Köpenicker Str. 126, 10179 Berlin, die ihn für uns versendet. Sie können ihn jederzeit über
              „Abmelden“ in der E-Mail oder per Nachricht an uns abbestellen und erhalten danach keinen mehr.
              Löschen Sie Ihr Konto, entfernen wir Ihren Kontakt auch bei Brevo.
            </p>
            <Basis>
              E-Mails zum Konto: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Newsletter: Ihre Einwilligung
              (Art. 6 Abs. 1 lit. a DSGVO), jederzeit widerrufbar.
            </Basis>
          </Section>

          <Section title="Cookies und Speicher im Browser">
            <p>Wir setzen nur Cookies ein, die für den Betrieb nötig sind:</p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white font-medium">Anmeldung:</strong> hält Sie auf finclue.de und depot.finclue.de angemeldet.</li>
              <li><strong className="text-white font-medium">Cookie-Auswahl:</strong> merkt sich Ihre Entscheidung im Hinweis beim ersten Besuch.</li>
              <li><strong className="text-white font-medium">Depotzugriff der KI:</strong> merkt sich, ob der Schalter „Depot“ eingeschaltet ist (siehe Künstliche Intelligenz).</li>
            </ul>
            <p>
              Diese Cookies bleiben höchstens 400 Tage gespeichert. Einstellungen wie helles oder dunkles
              Design und zuletzt geöffnete Charts liegen im Speicher Ihres Browsers und werden nicht an uns
              übertragen. Sie können Cookies im Browser löschen oder verhindern, die Anmeldung funktioniert
              dann nicht mehr.
            </p>
            <Basis>§ 25 Abs. 2 Nr. 2 TDDDG (technisch notwendig), Art. 6 Abs. 1 lit. b und lit. f DSGVO</Basis>
          </Section>

          <Section title="Statistik">
            <p>
              Nur wenn Sie im Cookie-Hinweis der Analyse zustimmen, nutzen wir Vercel Web Analytics, um zu
              sehen, welche Seiten genutzt werden. Der Dienst setzt keine Cookies. Aus der Anfrage wird eine
              Kennung berechnet, die nach 24 Stunden verworfen wird. Erfasst werden aufgerufene Seite,
              verweisende Seite, ungefährer Standort, Gerätetyp, Betriebssystem und Browser.
            </p>
            <Basis>Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG), jederzeit widerrufbar</Basis>
          </Section>

          <Section title="Inhalte von anderen Anbietern">
            <p>
              Beim Laden folgender Inhalte ruft Ihr Browser fremde Server auf und übermittelt ihnen
              technisch bedingt Ihre IP-Adresse:
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li><strong className="text-white font-medium">Firmenlogos:</strong> Logodev, Inc., 3723 Greenville Ave., Ste 43522, Dallas, TX 75206, USA (logo.dev).</li>
              <li><strong className="text-white font-medium">Bilder zu Nachrichten und im Blog:</strong> Server der jeweiligen Verlage sowie Unsplash.</li>
              <li><strong className="text-white font-medium">Artikelansicht:</strong> Öffnen Sie einen Artikel bei uns, wird die Seite des Verlags eingebettet. Für sie gilt die Datenschutzerklärung des Verlags.</li>
            </ul>
            <Basis>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer übersichtlichen Darstellung)</Basis>
          </Section>

          {/* Künstliche Intelligenz */}
          <div id="ki" className="scroll-mt-24 bg-white/[0.03] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-medium text-white mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0"></div>
              Künstliche Intelligenz
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Einige Funktionen beantworten Fragen oder fassen Texte mit künstlicher
              Intelligenz zusammen. Diese Antworten werden automatisch erzeugt, können Fehler
              enthalten und sind keine Anlageberatung. Eine automatisierte Entscheidung im
              Sinne von Art. 22 DSGVO findet nicht statt. Bitte geben Sie in Fragen und
              Texteingaben keine sensiblen Angaben zu sich oder anderen Personen ein.
            </p>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Finclue AI (Anthropic)</h3>
                <div className="space-y-4 text-gray-400 leading-relaxed">
                  <p>
                    <strong className="text-white font-medium">Welche Daten:</strong> Ihre Frage, die
                    vorherigen Nachrichten desselben Gesprächs, die gerade geöffnete Aktie sowie die
                    Markt- und Unternehmensdaten, die für die Antwort nötig sind. Ihr Name, Ihre
                    E-Mail-Adresse, Ihre Zahlungsdaten und Ihre Nutzerkennung werden nicht übermittelt,
                    sofern Sie sie nicht selbst in eine Frage schreiben.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Depotdaten nur mit Ihrer Einwilligung:</strong> Erst
                    wenn Sie den Schalter „Depot“ einschalten, darf Finclue AI Ihr Depot lesen. Übermittelt
                    wird dann nur, was die jeweilige Antwort braucht, zum Beispiel die Namen Ihrer Depots,
                    Positionen mit Stückzahl, Wert und Kaufkurs, Buchungen, Dividenden und Ihre eigenen
                    Notizen zu Positionen. Sie können den Schalter jederzeit wieder ausschalten. Danach
                    werden keine Depotdaten mehr übermittelt, auch nicht aus früheren Antworten.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Empfänger:</strong> Anthropic Ireland, Limited
                    verarbeitet die Daten als Auftragsverarbeiter (Art. 28 DSGVO). Gespeichert wird in den
                    USA, die Verarbeitung kann auch in anderen Ländern außerhalb der EU stattfinden.
                    Grundlage der Übermittlung sind die Standardvertragsklauseln der EU-Kommission
                    (Art. 46 Abs. 2 lit. c DSGVO). Anthropic darf die Inhalte laut Vertrag nicht zum
                    Training von KI-Modellen verwenden und löscht sie in der Regel innerhalb von 30 Tagen.
                    Länger, bis zu zwei Jahre, werden sie aufbewahrt, wenn ein Verstoß gegen die
                    Nutzungsregeln vermutet wird, oder soweit es das Gesetz verlangt.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Websuche:</strong> Reichen unsere Daten für
                    eine Antwort nicht aus, kann Finclue AI im Internet suchen. Dabei gehen Suchbegriffe, die
                    die KI aus Ihrer Frage bildet, an die Websuche von Anthropic.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Speicherung bei uns:</strong> Ihre Gespräche
                    bleiben gespeichert, bis Sie sie oder Ihr Konto löschen. Zur Abrechnung des Fragenlimits
                    speichern wir je Frage Zeitpunkt, Modell, Umfang und Kosten bis zur Löschung des Kontos.
                    Antworten auf kurze, allgemeine Fragen ohne Personenbezug und ohne Depotdaten können
                    für 20 Minuten zwischengespeichert und anderen Nutzern mit derselben Frage gezeigt werden.
                    Ihre Wahl beim Schalter „Depot“ merken wir uns in einem technisch notwendigen Cookie
                    (§ 25 Abs. 2 Nr. 2 TDDDG), das eine gekürzte Kontokennung enthält und höchstens 400 Tage
                    gespeichert bleibt.
                  </p>
                </div>
                <div className="mt-4 text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
                  <strong className="text-white">Rechtsgrundlage:</strong> Für Ihre Fragen Art. 6 Abs. 1 lit. b DSGVO
                  (Vertragserfüllung). Für Depotdaten Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die Sie
                  jederzeit mit Wirkung für die Zukunft über den Schalter widerrufen können.
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Spaltenvorschlag beim Depot-Import (Anthropic)</h3>
                <div className="space-y-4 text-gray-400 leading-relaxed">
                  <p>
                    Kennt der Depot-Import das Format einer CSV- oder Excel-Datei nicht, ordnen Sie die
                    Spalten selbst zu: Datum, ISIN oder WKN, Buchungsart, Stückzahl, Kurs und Gebühren.
                    Auf Wunsch schlägt eine KI diese Zuordnung vor.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Nur mit Ihrer Einwilligung:</strong> Der
                    Vorschlag startet erst, wenn Sie im Zuordnungsschritt den Schalter dafür einschalten.
                    Ohne den Schalter bleibt die Datei bei uns und Sie ordnen die Spalten von Hand zu.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Welche Daten:</strong> Übermittelt werden die
                    Kopfzeile der Datei, höchstens drei Beispielzeilen und die Werte der Spalte mit der
                    Buchungsart. Vorher entfernen wir Spalten mit Inhaber, Kunden-, Konto- oder Depotnummer
                    sowie IBANs und andere lange Nummern in allen Zellen. Die übrigen Zeilen der Datei, Ihr
                    Name, Ihre E-Mail-Adresse und Ihre Nutzerkennung werden nicht übermittelt. Zurück kommt
                    nur die Zuordnung der Spalten. Die Zahlen liest unser System selbst aus der Datei, und
                    Sie prüfen die Zuordnung, bevor etwas in Ihr Depot übernommen wird.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Empfänger und Speicherung:</strong> Es gelten
                    dieselben Bedingungen wie bei Finclue AI: Anthropic Ireland, Limited verarbeitet die
                    Daten als Auftragsverarbeiter auf Grundlage der Standardvertragsklauseln, verwendet sie
                    nicht zum Training und löscht sie in der Regel innerhalb von 30 Tagen. Wir speichern den
                    Inhalt der Anfrage nicht. Im Serverprotokoll bleiben für kurze Zeit nur Umfang, Dauer und
                    Kosten der Anfrage ohne Inhalte.
                  </p>
                </div>
                <div className="mt-4 text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
                  <strong className="text-white">Rechtsgrundlage:</strong> Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO),
                  die Sie jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie den Schalter ausschalten.
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-white mb-3">Weitere KI-Funktionen</h3>
                <div className="space-y-4 text-gray-400 leading-relaxed">
                  <p>
                    <strong className="text-white font-medium">OpenAI:</strong> Die bisherige KI im Terminal und
                    in der App, die KI-Analyse des Depots, die Aktiensuche per Text, die Texteingabe von
                    Käufen, Konten und Vermögenswerten sowie Zusammenfassungen nutzen Modelle von OpenAI
                    Ireland Ltd., 1st Floor, The Liffey Trust Centre, 117-126 Sheriff Street Upper, Dublin 1,
                    Irland. Übermittelt wird der eingegebene Text. Bei Fragen zum eigenen Depot und bei der
                    KI-Analyse, die Sie selbst starten, kommen Positionen mit Stückzahl, Wert, Kaufkurs,
                    Gewinn und Dividenden hinzu. Über die Schnittstelle gesendete Daten werden nach Angaben
                    von OpenAI standardmäßig nicht zum Training verwendet und zur Missbrauchskontrolle bis zu
                    30 Tage gespeichert.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Perplexity:</strong> Für aktuelle Nachrichten
                    fragen einzelne Funktionen Perplexity AI, Inc. (USA). Übermittelt werden Firmennamen oder
                    Wertpapierkürzel, bei der bisherigen KI auch Ihre Frage. Laut Vertrag werden die Inhalte
                    nicht zum Training verwendet.
                  </p>
                  <p>
                    <strong className="text-white font-medium">Pinecone:</strong> Für die Suche in
                    Unternehmensdokumenten wandelt die bisherige KI Ihre Frage in eine Zahlenfolge um und
                    vergleicht sie in einer Datenbank von Pinecone Systems, Inc. (USA) mit den Dokumenten.
                  </p>
                  <p>
                    Auch diese Anbieter handeln in unserem Auftrag (Art. 28 DSGVO). Soweit Daten in die USA
                    gelangen, sind die Standardvertragsklauseln der EU-Kommission die Grundlage
                    (Art. 46 Abs. 2 lit. c DSGVO).
                  </p>
                </div>
                <div className="mt-4 text-sm text-gray-400 bg-white/5 rounded-2xl p-3">
                  <strong className="text-white">Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
                </div>
              </div>
            </div>
          </div>

          <Section title="Finclue App">
            <p>
              In der App gelten dieselben Regeln wie auf der Website. Zusätzlich:
            </p>
            <p>
              <strong className="text-white font-medium">Mitteilungen:</strong> Wenn Sie Mitteilungen erlauben,
              speichern wir eine Gerätekennung. Der Versand läuft über Expo (650 Industries, Inc., USA) und die
              Mitteilungsdienste von Apple oder Google. Verarbeitet werden Gerätekennung und Text der Mitteilung.
              Expo nimmt am Datenschutzrahmenwerk zwischen der EU und den USA teil. Sie können Mitteilungen in den
              Einstellungen Ihres Geräts jederzeit abschalten.
            </p>
            <p>
              <strong className="text-white font-medium">Fehlerberichte:</strong> Bei Abstürzen und Fehlern erhält
              Sentry (Functional Software, Inc., 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA)
              technische Angaben zu Gerät, App-Version und Fehler sowie Ihre Kontokennung, aber weder Name noch
              E-Mail-Adresse. Sentry nimmt am Datenschutzrahmenwerk zwischen der EU und den USA teil.
            </p>
            <Basis>Mitteilungen: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Fehlerberichte: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer stabilen App)</Basis>
          </Section>

          <Section title="Speicherdauer">
            <p>
              Wir speichern Ihre Daten, solange Ihr Konto besteht. Löschen Sie Ihr Konto, löschen wir
              die Inhalte in unserer Datenbank und kündigen ein laufendes Abo. Rechnungs- und Zahlungsdaten
              bewahren wir so lange auf, wie es das Steuer- und Handelsrecht verlangt, bis zu zehn Jahre.
              Log- und Nutzungsdaten werden nach 7 Tagen gelöscht. Verifizierungs- und Reset-Tokens nach
              24 Stunden bzw. 1 Stunde.
            </p>
          </Section>

          <Section title="Betroffenenrechte">
            <p>Sie haben umfassende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
            <div className="space-y-4">
              {[
                { title: "Auskunftsrecht", desc: "Sie können jederzeit Auskunft über die von uns gespeicherten Daten verlangen" },
                { title: "Berichtigungsrecht", desc: "Unrichtige Daten können Sie korrigieren lassen" },
                { title: "Löschungsrecht", desc: "Sie können die Löschung Ihrer Daten verlangen" },
                { title: "Einschränkungsrecht", desc: "Sie können die Verarbeitung einschränken lassen" },
                { title: "Datenübertragbarkeit", desc: "Sie können Ihre Daten in strukturierter Form erhalten" },
                { title: "Widerspruchsrecht", desc: "Sie können der Verarbeitung widersprechen, die wir auf ein berechtigtes Interesse stützen" },
                { title: "Widerruf von Einwilligungen", desc: "Eine Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen" },
                { title: "Beschwerderecht", desc: "Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel an Ihrem Wohnort" }
              ].map((right, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-white mb-1">{right.title}</h4>
                    <p className="text-sm text-gray-400">{right.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p>Schreiben Sie uns dafür einfach an team@finclue.de.</p>
          </Section>

          <Section title="Datensicherheit">
            <p>
              Wir verwenden TLS zur Verschlüsselung der Datenübertragung und speichern Passwörter
              nur als sichere Hashes (bcrypt). Unsere Systeme werden regelmäßig aktualisiert
              und überwacht.
            </p>
          </Section>

          <Section title="Änderungen dieser Datenschutzerklärung">
            <p>
              Wir behalten uns vor, diese Erklärung bei Bedarf anzupassen. Die jeweils aktuelle
              Version finden Sie immer an dieser Stelle.
            </p>
          </Section>
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