// src/data/newsletters.ts

export interface Newsletter {
    id: string
    issueNumber: number
    title: string
    excerpt: string
    publishedDate: string
    content: string
  }
  
  export const newsletters: Newsletter[] = [
    {
      id: 'newsletter-52',
      issueNumber: 52,
      title: 'FinClue Newsletter #52: Warren Buffetts Apple-Verkäufe',
      excerpt: 'Diese Woche: Berkshire Hathaway reduziert Apple-Position um weitere 25%. Was steckt dahinter und was bedeutet das für Privatanleger?',
      publishedDate: '2024-12-16',
      content: `
  # Warren Buffett verkauft Apple - Was jetzt?
  
  Liebe FinClue Community,
  
  diese Woche dominiert eine Nachricht die Schlagzeilen: Warren Buffett hat erneut Apple-Aktien verkauft. Die Oracle of Omaha reduzierte Berkshires Apple-Position um weitere 25%, nachdem bereits im Sommer erhebliche Verkäufe getätigt wurden.
  
  ## 📊 Die wichtigsten Punkte:
  
  ### Apple-Position dramatisch reduziert
  - **25% Reduktion** der Apple-Position in Q3
  - Von einst über 900 Millionen Aktien auf jetzt etwa 300 Millionen
  - Position immer noch größte Holding, aber deutlich reduziert
  
  ### Cash-Berg wächst weiter  
  - **$325 Milliarden Cash** - Rekordniveau
  - 18% Anstieg zum Vorquartal
  - Entspricht etwa 30% des gesamten Portfolios
  
  ### Weitere bedeutende Verkäufe
  - **Bank of America**: $3.8 Milliarden verkauft
  - Verschiedene kleinere Positionen reduziert
  - Kaum neue Investments getätigt
  
  ## 🤔 Was steckt dahinter?
  
  ### Bewertungs-Vorsicht
  Buffett könnte die aktuellen Marktbewertungen als zu hoch erachten. Apple handelt bei einem KGV von 28 - deutlich über historischen Durchschnittswerten.
  
  ### Steuer-Optimierung
  Mögliche Erwartung steigender Kapitalertragssteuern könnte die Verkäufe motivieren. Gewinne jetzt zu realisieren könnte steuerlich vorteilhaft sein.
  
  ### Opportunitäts-Vorbereitung
  Der massive Cash-Bestand könnte auf kommende Marktchancen hindeuten. Buffett wartet möglicherweise auf bessere Kaufgelegenheiten.
  
  ## 💡 Was bedeutet das für Privatanleger?
  
  ### Kein Grund zur Panik
  - Buffett verkauft oft aus steuerlichen oder Portfolio-Gründen
  - Apple bleibt weiterhin größte Position bei Berkshire
  - Fundamentals von Apple bleiben stark
  
  ### Lehren für die eigene Strategie
  - **Gewinnmitnahmen** bei hoch bewerteten Positionen überdenken
  - **Cash-Reserven** für Chancen bereithalten
  - **Nicht blind** Buffett kopieren - eigene Analyse wichtig
  
  ### Markt-Timing vs. Time in Market
  Buffetts Verkäufe zeigen: Auch legendäre Investoren nehmen Gewinne mit. Für Privatanleger bleibt die Devise: Langfristig denken, aber wachsam bleiben.
  
  ## 📈 Kommende Katalysatoren
  
  **Für Apple:**
  - iPhone 16 Verkaufszahlen Q4
  - KI-Integration in iOS Ecosystem  
  - Services-Wachstum Fortsetzung
  
  **Für Berkshire:**
  - Q4 Earnings Ende Februar
  - Mögliche neue Positionen
  - Cash-Deployment Strategie
  
  ## 🔚 Fazit
  
  Buffetts Apple-Verkäufe sind weniger ein Signal gegen Apple, sondern vielmehr Ausdruck seiner Vorsicht bei den aktuellen Marktbewertungen. Für Privatanleger bietet dies eine gute Gelegenheit, die eigene Portfolio-Struktur zu überdenken.
  
  ---
  
  **Was denkst du über Buffetts Strategie? Antwort einfach auf diese E-Mail!**
  
  Beste Grüße und erfolgreiche Investments,  
  Dein FinClue Team
  
  *P.S.: Verfolge Berkshires Portfolio-Änderungen live auf [finclue.de/superinvestor/buffett](https://finclue.de/superinvestor/buffett)*
      `
    },
    
    {
      id: 'newsletter-51',
      issueNumber: 51,
      title: 'FinClue Newsletter #51: Fed-Entscheidung und Marktausblick',
      excerpt: 'Fed hält Zinsen stabil, Tech-Aktien erholen sich. Plus: Neue Positionen bei Pershing Square und eine Überraschung von Howard Marks.',
      publishedDate: '2024-12-09',
      content: `
  # Fed-Pause und was als nächstes kommt
  
  Liebe Investoren,
  
  die Fed hat wie erwartet die Zinsen bei 5.25-5.50% belassen, aber Jerome Powells Kommentare deuten auf eine vorsichtigere Haltung für 2025 hin.
  
  ## 🏛️ Fed-Update
  
  ### Zinsentscheidung
  - **Zinsen unverändert** bei 5.25-5.50%
  - Einstimmige Entscheidung des FOMC
  - Inflation weiterhin über 2%-Ziel
  
  ### Powell's Signale
  - **Weniger aggressive Senkungen** 2025
  - Abhängig von Inflationsentwicklung
  - Arbeitsmarkt robust, aber schwächelt leicht
  
  ## 📊 Marktreaktionen
  
  **Gewinner:**
  - Tech-Aktien: +2.3% am Tag der Entscheidung
  - Small Caps: Outperformance nach wochenlangen Verlusten
  - REITs: Zinssensitive Sektoren erholen sich
  
  **Verlierer:**
  - Anleihen: 10-jährige Rendite steigt auf 4.4%
  - Utilities: Dividenden-Aktien unter Druck
  - Gold: -1.8% nach starkem Lauf
  
  ## 🎯 Super-Investor Updates
  
  ### Bill Ackman (Pershing Square)
  **Neue Position enthüllt:**
  - Unbekannte Position in Q3 aufgebaut
  - Spekulationen um Netflix-Aufstockung
  - Portfolio-Konzentration steigt weiter
  
  ### Howard Marks (Oaktree)
  **Überraschende Wendung:**
  - Erstmals seit Jahren wieder Growth-Aktien
  - Position in Nvidia aufgebaut
  - "Paradigmenwechsel" in Strategie?
  
  Mehr Details zu allen Moves findest du hier: [finclue.de/superinvestor](https://finclue.de/superinvestor)
  
  ---
  
  Beste Grüße,  
  Dein FinClue Team
      `
    }
  
    // Hier fügst du weitere Newsletter hinzu...
  ]