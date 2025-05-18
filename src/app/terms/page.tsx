// src/app/terms/page.tsx
import React from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Allgemeine Geschäftsbedingungen – SUPERINVESTOR',
}

export default function TermsPage() {
  return (
    <main className="prose prose-invert mx-auto p-8">
      <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

      <p>Gültig ab: 16. Mai 2025</p>

      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die
        über die Website <Link href="/">superinvestor.test</Link> zwischen der
        SUPERINVESTOR GmbH (nachfolgend „Anbieter“) und den Nutzern (nachfolgend
        „Kunde“) geschlossen werden.
      </p>

      <h2>2. Vertragsschluss</h2>
      <ol>
        <li>Die Darstellung der Produkte und Dienstleistungen auf der Website stellt
            kein rechtlich bindendes Angebot dar, sondern einen unverbindlichen
            Online-Katalog.</li>
        <li>Durch das Ausfüllen und Absenden des Online-Formulars im Bereich
            „Registrierung“ gibt der Kunde ein verbindliches Angebot zum Abschluss
            eines Nutzungsvertrages ab.</li>
        <li>Der Vertrag kommt zustande, sobald der Anbieter dem Kunden eine
            Bestätigungs-E-Mail gesendet hat.</li>
      </ol>

      <h2>3. Leistungen des Anbieters</h2>
      <p>
        Der Anbieter stellt dem Kunden Zugriff auf:
      </p>
      <ul>
        <li>Portfolios bekannter Investoren</li>
        <li>Historische Kennzahlen und Charts</li>
        <li>Newsletter-Versand (optional)</li>
      </ul>
      <p>Premium-Features sind gekennzeichnet und gegen Gebühr erhältlich.</p>

      <h2>4. Preise und Zahlung</h2>
      <p>
        Sofern kostenpflichtige Premium-Leistungen gebucht werden, gelten die zum
        Zeitpunkt der Buchung angezeigten Preise. Die Abrechnung erfolgt per
        Kreditkarte oder Lastschrift. Ein Widerruf ist gemäß § 312g BGB innerhalb
        von 14 Tagen möglich.
      </p>

      <h2>5. Pflichten des Kunden</h2>
      <ol>
        <li>Der Kunde ist verpflichtet, bei der Registrierung wahrheitsgemäße
            Angaben zu machen.</li>
        <li>Benutzername und Passwort sind geheim zu halten.</li>
        <li>Der Kunde hat Änderungen seiner Kontaktdaten unverzüglich mitzuteilen.</li>
      </ol>

      <h2>6. Haftung</h2>
      <p>
        Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit sowie bei
        Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Die
        Haftung ist auf den vertragstypischen, vorhersehbaren Schaden begrenzt.
      </p>

      <h2>7. Laufzeit und Kündigung</h2>
      <p>
        Die Registrierung ist unbefristet. Premium-Abonnements laufen mindestens
        einen Monat und verlängern sich automatisch um einen weiteren Monat,
        sofern sie nicht 7 Tage vor Ablauf gekündigt werden.
      </p>

      <h2>8. Datenschutz</h2>
      <p>
        Hinweise zum Datenschutz finden Sie in unserer{' '}
        <Link href="/privacy">Datenschutzerklärung</Link>.
      </p>

      <h2>9. Schlussbestimmungen</h2>
      <ul>
        <li>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.</li>
        <li>Gerichtsstand ist, soweit zulässig, der Sitz des Anbieters.</li>
        <li>Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt der Rest
            davon unberührt.</li>
      </ul>
    </main>
  )
}