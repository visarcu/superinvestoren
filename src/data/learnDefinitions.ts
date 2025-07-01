// src/data/learnDefinitions.ts - KOMPLETT MIT ALLEN NEUEN BEGRIFFEN
export const LEARN_DEFINITIONS = {
    // ✅ BESTEHENDE DEFINITIONEN
    'market_cap': {
      term: 'Marktkapitalisierung',
      definition: 'Die Marktkapitalisierung zeigt den Gesamtwert aller Aktien eines Unternehmens an der Börse. Sie wird berechnet, indem man die Anzahl aller Aktien mit dem aktuellen Aktienkurs multipliziert.',
      calculation: 'Anzahl Aktien × Aktienkurs',
      example: 'Apple hat 15,7 Mrd. Aktien × $190 = $2,98 Billionen Marktkapitalisierung'
    },
    
    'pe_ratio': {
      term: 'KGV (Kurs-Gewinn-Verhältnis)',
      definition: 'Das KGV zeigt, wie viele Jahre es dauern würde, bis sich eine Aktie über die Gewinne "bezahlt" macht. Ein niedriges KGV kann günstig sein, ein hohes KGV kann auf Wachstumserwartungen hindeuten.',
      calculation: 'Aktienkurs ÷ Gewinn pro Aktie',
      example: 'Aktienkurs $100 ÷ Gewinn $5 pro Aktie = KGV von 20'
    },
    
    'ps_ratio': {
      term: 'KUV (Kurs-Umsatz-Verhältnis)',
      definition: 'Das KUV vergleicht den Aktienkurs mit dem Umsatz pro Aktie. Es ist besonders nützlich bei Unternehmen, die noch keinen Gewinn machen, aber wachsen.',
      calculation: 'Aktienkurs ÷ Umsatz pro Aktie',
      example: 'Aktienkurs $50 ÷ Umsatz $25 pro Aktie = KUV von 2'
    },
    
    'dividend_yield': {
      term: 'Dividendenrendite',
      definition: 'Die Dividendenrendite zeigt, wie viel Prozent des Aktienkurses jährlich als Dividende ausgeschüttet wird. Eine hohe Rendite kann attraktiv sein, könnte aber auch auf Probleme hindeuten.',
      calculation: '(Jährliche Dividende ÷ Aktienkurs) × 100',
      example: 'Dividende $3 ÷ Aktienkurs $60 × 100 = 5% Dividendenrendite'
    },
    
    'payout_ratio': {
      term: 'Payout Ratio (Ausschüttungsquote)',
      definition: 'Die Payout Ratio zeigt, welcher Anteil des Gewinns als Dividende ausgeschüttet wird. Ein niedriger Wert bedeutet mehr Gewinnretention für Wachstum, ein hoher Wert fokussiert auf Ausschüttungen.',
      calculation: '(Dividende pro Aktie ÷ Gewinn pro Aktie) × 100',
      example: 'Dividende $2 ÷ Gewinn $5 pro Aktie × 100 = 40% Payout Ratio'
    },
    
    'beta': {
      term: 'Beta-Faktor',
      definition: 'Beta misst die Volatilität einer Aktie im Verhältnis zum Gesamtmarkt. Beta = 1 bewegt sich wie der Markt, > 1 ist volatiler, < 1 ist stabiler.',
      calculation: 'Kovarianz(Aktie, Markt) ÷ Varianz(Markt)',
      example: 'Beta 1.5 bedeutet: Steigt der Markt um 10%, steigt die Aktie typischerweise um 15%'
    },
    
    'pb_ratio': {
      term: 'KBV (Kurs-Buchwert-Verhältnis)',
      definition: 'Das KBV vergleicht den Aktienkurs mit dem Buchwert pro Aktie. Es zeigt, wie viel Investoren bereit sind, für jeden Euro Eigenkapital zu bezahlen.',
      calculation: 'Aktienkurs ÷ Buchwert pro Aktie',
      example: 'Aktienkurs $100 ÷ Buchwert $25 pro Aktie = KBV von 4'
    },
  
    'dividend_frequency': {
      term: 'Dividendenfrequenz',
      definition: 'Wie oft im Jahr ein Unternehmen Dividenden ausschüttet. US-Unternehmen zahlen meist quartalsweise, europäische oft jährlich. Eine regelmäßige Frequenz zeigt Berechenbarkeit.',
      calculation: 'Anzahl Ausschüttungen pro Jahr',
      example: 'Apple zahlt quartalsweise = 4 Dividenden pro Jahr. BMW zahlt jährlich = 1 Dividende pro Jahr.'
    },
  
    'dividend_growth_rate': {
      term: 'Dividendenwachstumsrate',
      definition: 'Zeigt das durchschnittliche jährliche Wachstum der Dividende über einen bestimmten Zeitraum. Eine konstante Wachstumsrate deutet auf ein gesundes, wachsendes Unternehmen hin.',
      calculation: '((Aktuelle Dividende ÷ Dividende vor X Jahren)^(1/X)) - 1',
      example: 'Dividende wuchs von $2 auf $3 in 5 Jahren: (3/2)^(1/5) - 1 = 8,4% jährliches Wachstum'
    },
  
    'ex_dividend_date': {
      term: 'Ex-Dividenden-Datum',
      definition: 'Das Datum, ab dem eine Aktie ohne den Anspruch auf die nächste Dividende gehandelt wird. Wer die Aktie am Ex-Tag kauft, erhält die kommende Dividende nicht mehr.',
      calculation: 'Meist 1-2 Werktage vor Record Date',
      example: 'Ex-Date: 15. März → Käufer ab 15. März erhalten die März-Dividende nicht mehr'
    },
  
    'dividend_safety_score': {
      term: 'Dividenden-Sicherheitsscore',
      definition: 'Ein zusammengesetzter Score, der die Nachhaltigkeit einer Dividende bewertet. Berücksichtigt Payout Ratio, Gewinnstabilität, Cashflow und Verschuldung.',
      calculation: 'Gewichteter Score aus Payout Ratio (40%), Gewinnstabilität (30%), Free Cashflow (20%), Verschuldung (10%)',
      example: 'Score 8,5/10 = Sehr sichere Dividende. Score 4/10 = Dividendenkürzung möglich'
    },
  
    'dividend_aristocrat': {
      term: 'Dividend Aristocrat',
      definition: 'S&P 500 Unternehmen, die ihre Dividende mindestens 25 Jahre in Folge erhöht haben. Diese Titel gelten als besonders zuverlässige Dividendenzahler.',
      calculation: 'Mindestens 25 Jahre ununterbrochene Dividendenerhöhungen',
      example: 'Coca-Cola ist seit über 50 Jahren Dividend Aristocrat - erhöht jedes Jahr die Dividende'
    },
  
    'multi_source_data': {
      term: 'Multi-Source Datenabgleich',
      definition: 'Vergleicht Dividendendaten aus verschiedenen Finanzquellen um Inkonsistenzen zu erkennen. Unterschiedliche APIs können abweichende Werte liefern - der Abgleich erhöht die Datenqualität.',
      calculation: 'Durchschnitt aus mindestens 2 unabhängigen Datenquellen',
      example: 'FMP zeigt $2.40 Dividende, Alpha Vantage $2.38 → Multi-Source Durchschnitt: $2.39'
    },

    'trading_volume': {
      term: 'Handelsvolumen',
      definition: 'Das Handelsvolumen zeigt, wie viele Aktien an einem Tag gehandelt wurden. Ein hohes Volumen deutet auf großes Interesse und gute Liquidität hin.',
      calculation: 'Anzahl gehandelter Aktien pro Zeitraum',
      example: 'Apple: 50 Millionen Aktien heute gehandelt = hohes Interesse und gute Liquidität'
    },
  
    'dividend_safety': {
      term: 'Dividenden-Sicherheit',
      definition: 'Bewertet die Wahrscheinlichkeit, dass ein Unternehmen seine Dividende beibehalten oder erhöhen kann. Basiert auf Finanzstabilität und Cashflow.',
      calculation: 'Bewertung basierend auf Payout Ratio, Gewinnstabilität, Verschuldung und Cashflow',
      example: '"Sehr sicher" = Payout Ratio unter 60%, stabile Gewinne, niedrige Schulden'
    },
  
    'forward_pe': {
      term: 'KGV Erwartet (Forward P/E)',
      definition: 'Das erwartete KGV basiert auf den prognostizierten Gewinnen für die nächsten 12 Monate. Zeigt, wie der Markt die Zukunft des Unternehmens bewertet.',
      calculation: 'Aktienkurs ÷ Erwarteter Gewinn pro Aktie (nächste 12 Monate)',
      example: 'Aktuelles KGV 25, Forward KGV 20 = Markt erwartet 25% Gewinnwachstum'
    },
  
    'ev_ebit': {
      term: 'EV/EBIT',
      definition: 'Das Verhältnis von Unternehmenswert zu operativem Gewinn. Berücksichtigt auch Schulden und ist gut für Vergleiche zwischen Unternehmen mit unterschiedlicher Finanzierung.',
      calculation: 'Enterprise Value ÷ EBIT (Gewinn vor Zinsen und Steuern)',
      example: 'EV/EBIT 12 bedeutet: Das Unternehmen kostet 12-mal seinen jährlichen operativen Gewinn'
    },
  
    'gross_margin': {
      term: 'Bruttomarge',
      definition: 'Die Bruttomarge zeigt, wie viel Prozent des Umsatzes nach Abzug der direkten Herstellungskosten übrig bleibt. Indikator für Preissetzungsmacht.',
      calculation: '(Umsatz - Herstellungskosten) ÷ Umsatz × 100',
      example: 'Umsatz 100€, Herstellungskosten 60€ → Bruttomarge = 40%'
    },
  
    'operating_margin': {
      term: 'Operative Marge',
      definition: 'Die operative Marge zeigt den Gewinn aus dem Kerngeschäft als Prozent des Umsatzes. Misst die operative Effizienz ohne Finanzierungseffekte.',
      calculation: 'Operativer Gewinn (EBIT) ÷ Umsatz × 100',
      example: 'Operativer Gewinn 20€, Umsatz 100€ → Operative Marge = 20%'
    },
  
    'net_margin': {
      term: 'Nettomarge',
      definition: 'Die Nettomarge zeigt den finalen Gewinn als Prozent des Umsatzes nach allen Kosten, Zinsen und Steuern. Ultimative Profitabilitätskennzahl.',
      calculation: 'Nettogewinn ÷ Umsatz × 100',
      example: 'Nettogewinn 15€, Umsatz 100€ → Nettomarge = 15%'
    }
  } as const
  
  // ✅ ERWEITERTES DEUTSCHES MAPPING
  export const GERMAN_TO_KEY_MAPPING: Record<string, keyof typeof LEARN_DEFINITIONS> = {
    // Basis-Kennzahlen
    'Marktkapitalisierung': 'market_cap',
    'KGV': 'pe_ratio',
    'Kurs-Gewinn-Verhältnis': 'pe_ratio',
    'KUV': 'ps_ratio', 
    'Kurs-Umsatz-Verhältnis': 'ps_ratio',
    'KBV': 'pb_ratio',
    'Kurs-Buchwert-Verhältnis': 'pb_ratio',
    'Beta': 'beta',
    'Beta-Faktor': 'beta',
    
    // Dividenden
    'Dividendenrendite': 'dividend_yield',
    'Rendite': 'dividend_yield',
    'Dividenden-Rendite': 'dividend_yield',
    'Ausschüttungsquote': 'payout_ratio',
    'Payout Ratio': 'payout_ratio',
    'Dividendenfrequenz': 'dividend_frequency',
    'Dividenden-Frequenz': 'dividend_frequency',
    'Dividendenwachstum': 'dividend_growth_rate',
    'Dividendenwachstumsrate': 'dividend_growth_rate',
    'Ex-Dividenden-Datum': 'ex_dividend_date',
    'Ex-Date': 'ex_dividend_date',
    'Dividenden-Sicherheit': 'dividend_safety_score',
    'Dividendensicherheit': 'dividend_safety_score',
    'Dividend Aristocrat': 'dividend_aristocrat',
    'Multi-Source': 'multi_source_data',
    'Multi-Source-Daten': 'multi_source_data',
    
    // ✅ NEUE MAPPINGS für fehlende Begriffe
    'Volumen': 'trading_volume',
    'Handelsvolumen': 'trading_volume',
    'Trading Volume': 'trading_volume',
    
    'Sicherheit': 'dividend_safety',
  
  
    
    'KGV Erw.': 'forward_pe',
    'KGV Erwartet': 'forward_pe',
    'Forward PE': 'forward_pe',
    'Forward P/E': 'forward_pe',
    
    'EV/EBIT': 'ev_ebit',
    'Enterprise Value EBIT': 'ev_ebit',
    
    'Bruttomarge': 'gross_margin',
    'Gross Margin': 'gross_margin',
    
    'Op. Marge': 'operating_margin',
    'Operative Marge': 'operating_margin',
    'Operating Margin': 'operating_margin',
    'EBIT Marge': 'operating_margin',
    
    'Nettomarge': 'net_margin',
    'Net Margin': 'net_margin',
    'Nettogewinnmarge': 'net_margin'
  }
  
  // ✅ HELPER FUNCTION: Deutschen Begriff zu englischem Key konvertieren
  export function getKeyFromGermanTerm(germanTerm: string): keyof typeof LEARN_DEFINITIONS | null {
    // Exakte Übereinstimmung zuerst versuchen
    if (germanTerm in GERMAN_TO_KEY_MAPPING) {
      return GERMAN_TO_KEY_MAPPING[germanTerm]
    }
    
    // Fallback: Prüfen ob es bereits ein englischer Key ist
    if (germanTerm in LEARN_DEFINITIONS) {
      return germanTerm as keyof typeof LEARN_DEFINITIONS
    }
    
    // Fuzzy matching (case-insensitive)
    const lowerTerm = germanTerm.toLowerCase()
    for (const [key, value] of Object.entries(GERMAN_TO_KEY_MAPPING)) {
      if (key.toLowerCase() === lowerTerm) {
        return value
      }
    }
    
    return null
  }
  
  export type LearnDefinitionKey = keyof typeof LEARN_DEFINITIONS
  
  // ✅ ERWEITERTE KATEGORIEN
  export const LEXIKON_CATEGORIES = {
    'bewertung': {
      title: 'Bewertungskennzahlen',
      icon: '📊',
      description: 'Kennzahlen zur Bewertung von Aktien',
      terms: ['market_cap', 'pe_ratio', 'forward_pe', 'pb_ratio', 'ps_ratio', 'ev_ebit']
    },
    'dividenden': {
      title: 'Dividenden',
      icon: '💵', 
      description: 'Alles rund um Dividenden und Ausschüttungen',
      terms: ['dividend_yield', 'payout_ratio', 'dividend_frequency', 'dividend_growth_rate', 'ex_dividend_date', 'dividend_safety_score', 'dividend_safety', 'dividend_aristocrat', 'multi_source_data']
    },
    'profitabilität': {
      title: 'Profitabilität',
      icon: '💰',
      description: 'Margen und Rentabilitätskennzahlen',
      terms: ['gross_margin', 'operating_margin', 'net_margin']
    },
    'risiko': {
      title: 'Risiko & Markt',
      icon: '⚡',
      description: 'Risikokennzahlen und Marktdaten',
      terms: ['beta', 'trading_volume']
    }
  }