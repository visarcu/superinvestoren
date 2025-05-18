// src/app/privacy/page.tsx
export const metadata = {
    title: 'Datenschutzerklärung – SUPERINVESTOR',
  }
  
  export default function Page() {
    return (
      <main className="prose prose-invert mx-auto p-8">
        <h1>Datenschutzerklärung</h1>
  
        <h2>1. Verantwortlicher</h2>
        <p>
          Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:<br />
          <strong>Visar Curraj</strong><br />
          83943 Bad Aibling<br />
          Schützenstrasse 6<br />
          E-Mail: loeweninvest@gmail.com
        </p>
  
        <h2>2. Allgemeines zur Datenverarbeitung</h2>
        <p>
          Wir erheben, verarbeiten und nutzen personenbezogene Daten nur, soweit sie für
          die Begründung, inhaltliche Ausgestaltung oder Änderung des jeweiligen
          Rechtsverhältnisses erforderlich sind (Bestandsdaten). Personenbezogene Daten
          über die Inanspruchnahme unserer Internetseiten (Nutzungsdaten) erheben,
          verarbeiten und nutzen wir nur, soweit dies erforderlich ist, um dem Nutzer
          die Inanspruchnahme des Dienstes zu ermöglichen oder abzurechnen. Rechtsgrundlage
          ist dabei Art. 6 Abs. 1 lit. b DSGVO.
        </p>
  
        <h2>3. Erhebung von Nutzungsdaten</h2>
        <p>
          Bei jedem Zugriff auf unsere Website werden über Ihr Endgerät automatisiert
          Daten an unseren Server übertragen. Diese Nutzungsdaten (z. B. IP-Adresse,
          Datum und Uhrzeit des Zugriffs, betrachtete Unterseiten) werden lediglich zur
          Sicherstellung eines störungsfreien Betriebs und zur Verbesserung unseres
          Angebots ausgewertet (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
  
        <h2>4. Registrierung und Nutzerkonto</h2>
        <p>
          Für bestimmte Funktionen (z. B. Watchlist, persönliche Profile) ist eine
          Registrierung mit Angabe Ihrer E-Mail-Adresse und Ihres Namens erforderlich.
          Ihre Daten werden dabei verschlüsselt übertragen und – nach erfolgreicher
          E-Mail-Verifizierung – in unserer Datenbank gespeichert. Grundlage ist hier
          Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
        </p>
  
        <h2>5. E-Mail-Kommunikation (Newsletter)</h2>
        <p>
          Wenn Sie sich für unseren Quartals-Newsletter anmelden, verwenden wir Ihre
          E-Mail-Adresse ausschließlich zum Versand desselben. Rechtsgrundlage ist Ihre
          Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können den Newsletter
          jederzeit mit einem Klick auf „Abmelden“ in der E-Mail oder per Nachricht an
          newsletter@superinvestor.test widerrufen.
        </p>
  
        <h2>6. Einsatz von Cookies</h2>
        <p>
          Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die Ihr
          Browser automatisch erstellt und auf Ihrem Endgerät speichert, wenn Sie unsere
          Website besuchen. Sie helfen uns, die Website nutzerfreundlich und sicher zu
          gestalten. Sie können die Speicherung von Cookies in den Einstellungen Ihres
          Browsers verhindern; in diesem Fall funktionieren jedoch manche Features nicht
          mehr vollständig.
        </p>
  
        <h2>7. Externe Dienstleister & Auftragsverarbeitung</h2>
        <ul>
          <li>
            <strong>Prisma / Datenbank:</strong> Speicherung und Verwaltung Ihrer Kontodaten.
          </li>
          <li>
            <strong>NextAuth:</strong> Authentifizierung & Session-Management.
          </li>
          <li>
            <strong>SMTP-Provider:</strong> Versand von Bestätigungs-
            und System-E-Mails.
          </li>
        </ul>
        <p>
          Alle Dienstleister verarbeiten Ihre Daten nur im Rahmen unserer Weisungen und
          erfüllen die Anforderungen der Art. 28 DSGVO.
        </p>
  
        <h2>8. Speicherdauer</h2>
        <p>
          Wir speichern Ihre Bestandsdaten (z. B. E-Mail, Name) solange Ihr Konto
          besteht bzw. gesetzliche Aufbewahrungsfristen bestehen. Log- und
          Nutzungsdaten werden nach 7 Tagen gelöscht. Verifizierungs- und
          Reset-Tokens nach 24 Stunden bzw. 1 Stunde.
        </p>
  
        <h2>9. Betroffenenrechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung oder Einschränkung
          der Verarbeitung Ihrer personenbezogenen Daten sowie das Recht auf Datenübertragbarkeit
          und das Recht, eine Einwilligung jederzeit zu widerrufen. Wenden Sie sich hierfür
          bitte an <a href="mailto:datenschutz@superinvestor.test">datenschutz@superinvestor.test</a>.
        </p>
  
        <h2>10. Datensicherheit</h2>
        <p>
          Wir verwenden TLS zur Verschlüsselung der Datenübertragung und speichern Passwörter
          nur als sichere Hashes (bcrypt). Unsere Systeme werden regelmäßig aktualisiert
          und überwacht.
        </p>
  
        <h2>11. Änderungen dieser Datenschutzerklärung</h2>
        <p>
          Wir behalten uns vor, diese Erklärung bei Bedarf anzupassen. Die jeweils aktuelle
          Version finden Sie immer an dieser Stelle. Letzte Änderung: 16. Mai 2025.
        </p>
      </main>
    )
  }