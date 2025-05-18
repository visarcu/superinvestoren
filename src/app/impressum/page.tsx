
// src/app/impressum/page.tsx
export const metadata = {
    title: 'Impressum – SUPERINVESTOR',
  }
  
  export default function ImpressumPage() {
    return (
      <main className="prose prose-invert mx-auto p-8">
        <h1>Impressum</h1>
  
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Visar Curraj<br/>
          Schützenstrasse 6<br/>
          83043<br/>
          Bad Aibling
        </p>
  
        <h2>Vertreten durch</h2>
        <p>
          Geschäftsführer: Visar Curraj
        </p>
  
        <h2>Kontakt</h2>
        <p>
          Telefon: +49 (0)30 12345678<br/>
          E-Mail: <a href="mailto:loeweninvest@gmail.com">loeweninvest@gmail.com</a>
        </p>
  
        <h2>Registereintrag</h2>
  
        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz:<br/>
          DE123456789
        </p>
  
        <h2>Haftungsausschluss</h2>
        <p><strong>Haftung für Inhalte</strong><br/>
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich...</p>
        <p><strong>Haftung für Links</strong><br/>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben...</p>
  
        <h2>Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr">https://ec.europa.eu/consumers/odr</a>.<br/>
          Unsere E-Mail: <a href="mailto:kontakt@superinvestor.test">kontakt@superinvestor.test</a>
        </p>
      </main>
    )
  }