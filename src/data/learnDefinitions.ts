// src/data/learnDefinitions.ts - ERWEITERT MIT BILANZ-KENNZAHLEN
export const LEARN_DEFINITIONS = {

  // Haupteintrag DCF
'dcf': {
  term: 'DCF (Discounted Cash Flow)',
  definition: `Eine fundamentale Bewertungsmethode, die den fairen Wert einer Aktie durch Diskontierung zukünftiger freier Cashflows berechnet. DCF projiziert die erwarteten Cashflows für 5 Jahre, berechnet einen Terminalwert für alle Jahre danach und diskontiert alles mit dem WACC (Diskontierungssatz) auf den heutigen Barwert zurück. Das Ergebnis ist der theoretische "faire Wert" pro Aktie, unabhängig vom aktuellen Marktpreis. Warren Buffett sagte: "Der Wert jeder Investition ist die Summe aller zukünftigen Cashflows, diskontiert auf heute."`,
  
  calculation: `DCF = FCF₁/(1+WACC)¹ + FCF₂/(1+WACC)² + ... + Terminal Value/(1+WACC)⁵
  
  Terminal Value = FCF Jahr 6 ÷ (WACC - Terminal Growth Rate)
  Fair Value pro Aktie = (Summe diskontierte FCFs + Terminal Value) ÷ Anzahl Aktien`,
  
  example: `Apple DCF-Beispiel: 
  • Aktuelle FCF: $100 Mrd./Jahr
  • 5-Jahres Projektionen: 8% Wachstum → FCF Jahr 5: $147 Mrd.
  • Terminal Value: $147 Mrd. × 1,025 ÷ (10% - 2,5%) = $2,01 Billionen
  • Gesamtwert: $430 Mrd. (5-Jahre) + $1,25 Billionen (diskontierter Terminal Value) = $1,68 Billionen
  • Bei 15,7 Mrd. Aktien = $107 Fair Value pro Aktie
  
  Wichtig: Terminal Value macht oft 70-80% des Gesamtwerts aus!`,
  
  // ✅ NEU: Praktische Hinweise basierend auf deiner Recherche
  practicalNotes: [
    "✅ Ideal für: Etablierte Unternehmen mit stabilen, vorhersagbaren Cashflows (Apple, Microsoft, Coca-Cola)",
    "⚠️ Schwierig bei: Startups, zyklische Rohstoffunternehmen, Pre-Revenue Biotechs",
    "🚨 Häufiger Fehler: Terminal Growth Rate >4% (nie höher als GDP Wachstum!)",
    "🚨 Kritisch: WACC muss immer > Terminal Growth Rate sein (sonst Division durch Null)",
    "💡 Best Practice: Immer 3 Szenarien rechnen (Konservativ/Basis/Optimistisch)",
    "📊 Sensitivität: ±1% WACC kann Fair Value um ±20% ändern"
  ],
  
  // ✅ Links zu verwandten Begriffen und Tools
  relatedTerms: ['terminal_value', 'wacc', 'free_cash_flow', 'intrinsic_value', 'discount_rate'],
  
  // ✅ Link zum ausführlichen Blog-Guide
  blogGuideUrl: '/blog/dcf-bewertung-warren-buffett-guide',
  
  // ✅ Link zum DCF Calculator
  calculatorUrl: '/tools/dcf-calculator'
},

// Supporting Begriffe
'terminal_value': {
  term: 'Terminal Value (Endwert)',
  definition: 'Der geschätzte Wert eines Unternehmens am Ende der Projektionsperiode einer DCF-Analyse. Berechnet mit der Annahme, dass das Unternehmen danach mit einer konstanten Rate (meist 2-3%) für immer wächst.',
  calculation: 'Terminal Value = FCF Jahr 6 ÷ (WACC - Terminal Growth Rate)',
  example: 'FCF Jahr 6: $110M, WACC 10%, Terminal Growth 2% → Terminal Value = $110M ÷ (10% - 2%) = $1,375M'
},

'wacc': {
  term: 'WACC (Weighted Average Cost of Capital)',
  definition: 'Die gewichteten durchschnittlichen Kapitalkosten eines Unternehmens. WACC wird als Diskontierungssatz in DCF-Analysen verwendet und spiegelt das Risiko des Unternehmens wider. Berücksichtigt sowohl Eigen- als auch Fremdkapitalkosten.',
  calculation: 'WACC = (E/V × Re) + (D/V × Rd × (1-T))',
  example: 'Eigenkapitalkosten 12%, Fremdkapitalkosten 5%, Steuersatz 25%, 70% EK/30% FK → WACC = (0.7×12%) + (0.3×5%×0.75) = 9.5%'
},

'free_cash_flow': {
  term: 'Free Cash Flow (Freier Cashflow)',
  definition: 'Der Cashflow, der nach allen notwendigen Investitionen übrig bleibt. FCF zeigt, wie viel Geld ein Unternehmen tatsächlich für Dividenden, Aktienrückkäufe oder Schuldenabbau zur Verfügung hat. Basis für DCF-Bewertungen.',
  calculation: 'FCF = Operativer Cashflow - Investitionen (CapEx)',
  example: 'Operativer CF $150M - CapEx $50M = Free Cash Flow $100M. Dieses Geld steht den Aktionären zur Verfügung.'
},

'discount_rate': {
  term: 'Diskontierungssatz (Discount Rate)',
  definition: 'Der Zinssatz, der verwendet wird, um zukünftige Cashflows auf ihren heutigen Barwert zu diskontieren. Spiegelt das Risiko und die Zeitpräferenz wider. In DCF-Analysen meist der WACC.',
  calculation: 'Barwert = Zukünftiger Cashflow ÷ (1 + Diskontierungssatz)ⁿ',
  example: '$100 in einem Jahr bei 10% Diskontierungssatz → Barwert = $100 ÷ 1,10 = $90,91'
},

'intrinsic_value': {
  term: 'Intrinsischer Wert (Fair Value)',
  definition: 'Der theoretisch "faire" Wert einer Aktie basierend auf fundamentalen Daten, unabhängig vom aktuellen Marktpreis. DCF-Analysen berechnen den intrinsischen Wert durch Diskontierung zukünftiger Cashflows.',
  calculation: 'Intrinsischer Wert = Barwert aller zukünftigen Cashflows ÷ Anzahl Aktien',
  example: 'DCF ergibt $150 Fair Value, Marktpreis $120 → Aktie ist 25% unterbewertet (potenziell attraktive Investition)'
},
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
  },

  'ttm': {
    term: 'TTM (Trailing Twelve Months)',
    definition: 'TTM steht für "Trailing Twelve Months" und bezeichnet die letzten zwölf Monate. Kennzahlen mit TTM basieren auf den tatsächlichen Daten der vergangenen 12 Monate statt auf Jahresabschlüssen.',
    calculation: 'Summe der letzten vier Quartale',
    example: 'KGV TTM = Aktienkurs ÷ Gewinn der letzten 12 Monate (statt nur Jahresgewinn)'
  },

  'roa': {
    term: 'ROA (Return on Assets)',
    definition: 'Die Kapitalrendite (Return on Assets) zeigt, wie effizient ein Unternehmen seine Vermögenswerte nutzt, um Gewinne zu erzielen. Eine höhere ROA bedeutet bessere Effizienz.',
    calculation: '(Nettogewinn ÷ Gesamtvermögen) × 100',
    example: 'Nettogewinn $1 Mrd. ÷ Gesamtvermögen $10 Mrd. × 100 = 10% ROA'
  },

  'roe': {
    term: 'ROE (Return on Equity)',
    definition: 'Die Eigenkapitalrendite zeigt, wie viel Gewinn ein Unternehmen mit dem eingesetzten Eigenkapital erwirtschaftet. ROE ist ein wichtiger Indikator für die Managementeffektivität.',
    calculation: '(Nettogewinn ÷ Eigenkapital) × 100',
    example: 'Nettogewinn $2 Mrd. ÷ Eigenkapital $10 Mrd. × 100 = 20% ROE'
  },

  'asset_turnover': {
    term: 'Asset Turnover (Kapitalumschlag)',
    definition: 'Der Kapitalumschlag misst, wie effizient ein Unternehmen seine Vermögenswerte nutzt, um Umsatz zu generieren. Ein höherer Wert zeigt bessere operative Effizienz.',
    calculation: 'Umsatz ÷ Gesamtvermögen',
    example: 'Umsatz $50 Mrd. ÷ Gesamtvermögen $25 Mrd. = 2,0x Asset Turnover'
  },

  // ✅ NEUE BEWERTUNGS-KENNZAHLEN
  'peg_ratio': {
    term: 'PEG-Ratio (Price/Earnings-to-Growth)',
    definition: 'Das PEG-Verhältnis setzt das KGV ins Verhältnis zum erwarteten Gewinnwachstum. Ein PEG unter 1 gilt als günstig, über 1 als teuer. Es hilft dabei, wachstumsstarke Aktien fairer zu bewerten.',
    calculation: 'KGV ÷ Gewinnwachstumsrate (%)',
    example: 'KGV 20 ÷ Wachstum 10% = PEG 2,0 (eher teuer). KGV 15 ÷ Wachstum 20% = PEG 0,75 (günstig)'
  },

  'ev_sales': {
    term: 'EV/Umsatz (Enterprise Value-to-Sales)',
    definition: 'Das Verhältnis von Unternehmenswert zu Umsatz. Berücksichtigt die gesamte Finanzierungsstruktur und ist ideal für Vergleiche zwischen Unternehmen mit unterschiedlicher Verschuldung.',
    calculation: 'Enterprise Value ÷ Jahresumsatz',
    example: 'EV $50 Mrd. ÷ Umsatz $10 Mrd. = EV/Sales 5,0. Niedrigere Werte gelten als günstiger.'
  },

  'ev_ebitda': {
    term: 'EV/EBITDA (Enterprise Value-to-EBITDA)',
    definition: 'Das Verhältnis von Unternehmenswert zu EBITDA (Gewinn vor Zinsen, Steuern und Abschreibungen). Eine der wichtigsten Bewertungskennzahlen für operative Cashflow-Generierung.',
    calculation: 'Enterprise Value ÷ EBITDA',
    example: 'EV $60 Mrd. ÷ EBITDA $6 Mrd. = EV/EBITDA 10. Werte unter 10 gelten oft als attraktiv.'
  },

  'price_to_cashflow': {
    term: 'Kurs-Cashflow-Verhältnis (P/CF)',
    definition: 'Das Verhältnis von Aktienkurs zum operativen Cashflow pro Aktie. Zeigt, wie viel Investoren für jeden Euro operativen Cashflow bezahlen. Weniger manipulierbar als KGV.',
    calculation: 'Aktienkurs ÷ Operativer Cashflow pro Aktie',
    example: 'Kurs $100 ÷ Op. Cashflow $8 pro Aktie = P/CF 12,5. Niedrigere Werte sind besser.'
  },

  'price_to_fcf': {
    term: 'Kurs-Free-Cashflow-Verhältnis (P/FCF)',
    definition: 'Das Verhältnis von Aktienkurs zum freien Cashflow pro Aktie. Der freie Cashflow ist das Geld, das nach allen notwendigen Investitionen übrig bleibt - sehr wichtig für die Bewertung.',
    calculation: 'Aktienkurs ÷ Freier Cashflow pro Aktie',
    example: 'Kurs $120 ÷ FCF $6 pro Aktie = P/FCF 20. Je niedriger, desto attraktiver die Bewertung.'
  },

  'enterprise_value': {
    term: 'Enterprise Value (Unternehmenswert)',
    definition: 'Der Enterprise Value repräsentiert den theoretischen Kaufpreis für das gesamte Unternehmen. Er berücksichtigt sowohl Eigenkapital als auch Schulden und gibt ein vollständigeres Bild der Bewertung.',
    calculation: 'Marktkapitalisierung + Gesamtverschuldung - Barmittel',
    example: 'Marktkapital $100 Mrd. + Schulden $20 Mrd. - Cash $5 Mrd. = EV $115 Mrd.'
  },

  'ebitda': {
    term: 'EBITDA (Earnings Before Interest, Taxes, Depreciation and Amortization)',
    definition: 'EBITDA zeigt den Gewinn vor Zinsen, Steuern und Abschreibungen. Es ist eine wichtige Kennzahl zur Bewertung der operativen Cashflow-Generierung eines Unternehmens.',
    calculation: 'Betriebsgewinn + Abschreibungen',
    example: 'Betriebsgewinn $40 Mrd. + Abschreibungen $10 Mrd. = EBITDA $50 Mrd.'
  },

  'ebit': {
    term: 'EBIT (Earnings Before Interest and Taxes)',
    definition: 'EBIT zeigt den operativen Gewinn vor Zinsen und Steuern. Diese Kennzahl ermöglicht den Vergleich der operativen Leistung zwischen Unternehmen, unabhängig von deren Finanzierungsstruktur.',
    calculation: 'EBITDA - Abschreibungen (oder Betriebsgewinn)',
    example: 'EBITDA $50 Mrd. - Abschreibungen $5 Mrd. = EBIT $45 Mrd.'
  },

  // ✅ NEUE BILANZ-KENNZAHLEN
  'total_assets': {
    term: 'Bilanzsumme (Total Assets)',
    definition: 'Die Bilanzsumme zeigt das gesamte Vermögen eines Unternehmens. Sie umfasst alle Vermögenswerte wie Anlagen, Vorräte, Forderungen und Bargeld. Eine wachsende Bilanzsumme kann auf Expansion hindeuten.',
    calculation: 'Umlaufvermögen + Anlagevermögen',
    example: 'Apple: Umlaufvermögen $135 Mrd. + Anlagevermögen $217 Mrd. = Bilanzsumme $352 Mrd.'
  },

  'total_equity': {
    term: 'Eigenkapital (Total Equity)',
    definition: 'Das Eigenkapital zeigt, wie viel vom Unternehmen tatsächlich den Aktionären gehört. Es ist der Wert, der übrig bleibt, wenn alle Schulden abgezogen werden. Hohes Eigenkapital bedeutet finanzielle Stabilität.',
    calculation: 'Bilanzsumme - Gesamtverbindlichkeiten',
    example: 'Bilanzsumme $352 Mrd. - Verbindlichkeiten $287 Mrd. = Eigenkapital $65 Mrd.'
  },

  'debt_to_equity_ratio': {
    term: 'Verschuldungsgrad (Debt-to-Equity)',
    definition: 'Der Verschuldungsgrad zeigt das Verhältnis von Fremdkapital zu Eigenkapital. Ein niedrigerer Wert bedeutet weniger Verschuldung und geringeres Risiko. Werte über 2 gelten oft als riskant.',
    calculation: 'Gesamtverschuldung ÷ Eigenkapital',
    example: 'Gesamtschulden $100 Mrd. ÷ Eigenkapital $50 Mrd. = Verschuldungsgrad 2,0'
  },

  'cash_and_equivalents': {
    term: 'Liquide Mittel (Cash & Cash Equivalents)',
    definition: 'Liquide Mittel sind Bargeld und kurzfristig verfügbare Anlagen. Sie zeigen, wie viel sofort verfügbares Geld ein Unternehmen hat. Hohe Liquidität bietet Flexibilität und Sicherheit in Krisen.',
    calculation: 'Bargeld + kurzfristige Anlagen (< 90 Tage)',
    example: 'Apple: $29 Mrd. Bargeld + $165 Mrd. kurzfristige Anlagen = $194 Mrd. liquide Mittel'
  },

  'current_liabilities': {
    term: 'Kurzfristige Verbindlichkeiten (Current Liabilities)',
    definition: 'Kurzfristige Verbindlichkeiten sind Schulden, die innerhalb eines Jahres zurückgezahlt werden müssen. Dazu gehören Lieferantenverbindlichkeiten, kurzfristige Kredite und aufgelaufene Kosten.',
    calculation: 'Verbindlichkeiten mit Laufzeit ≤ 1 Jahr',
    example: 'Lieferanten $54 Mrd. + kurzfristige Kredite $11 Mrd. + Rückstellungen $13 Mrd. = $78 Mrd.'
  },

  'long_term_liabilities': {
    term: 'Langfristige Verbindlichkeiten (Long-term Liabilities)',
    definition: 'Langfristige Verbindlichkeiten sind Schulden mit einer Laufzeit von mehr als einem Jahr. Hauptsächlich langfristige Kredite, Anleihen und Pensionsrückstellungen.',
    calculation: 'Verbindlichkeiten mit Laufzeit > 1 Jahr',
    example: 'Langfristige Kredite $109 Mrd. + Pensionsrückstellungen $2 Mrd. = $111 Mrd.'
  },

  'working_capital': {
    term: 'Working Capital (Betriebskapital)',
    definition: 'Das Working Capital zeigt, wie viel kurzfristige Liquidität einem Unternehmen zur Verfügung steht. Positives Working Capital bedeutet, dass kurzfristige Vermögenswerte die kurzfristigen Schulden übersteigen.',
    calculation: 'Umlaufvermögen - Kurzfristige Verbindlichkeiten',
    example: 'Umlaufvermögen $135 Mrd. - Kurzfr. Verbindlichkeiten $78 Mrd. = Working Capital $57 Mrd.'
  },

  'current_ratio': {
    term: 'Current Ratio (Liquiditätsgrad 1)',
    definition: 'Die Current Ratio misst die Fähigkeit eines Unternehmens, kurzfristige Schulden zu bezahlen. Ein Wert über 1 ist gut, über 2 ist sehr sicher. Zu hohe Werte können auf ineffiziente Mittelverwendung hindeuten.',
    calculation: 'Umlaufvermögen ÷ Kurzfristige Verbindlichkeiten',
    example: 'Umlaufvermögen $135 Mrd. ÷ Kurzfr. Verbindlichkeiten $78 Mrd. = Current Ratio 1,73'
  },

  'quick_ratio': {
    term: 'Quick Ratio (Liquiditätsgrad 2)',
    definition: 'Die Quick Ratio ist eine strengere Liquiditätskennzahl, die nur die liquidesten Vermögenswerte berücksichtigt. Vorräte werden ausgeschlossen, da sie schwerer verkaufbar sind.',
    calculation: '(Umlaufvermögen - Vorräte) ÷ Kurzfristige Verbindlichkeiten',
    example: '($135 Mrd. - $4 Mrd. Vorräte) ÷ $78 Mrd. = Quick Ratio 1,68'
  }
} as const

// ✅ MASSIV ERWEITERTES DEUTSCHES MAPPING MIT BILANZ-KENNZAHLEN
export const GERMAN_TO_KEY_MAPPING: Record<string, keyof typeof LEARN_DEFINITIONS> = {
  // ===== BASIS-KENNZAHLEN =====
  'Marktkapitalisierung': 'market_cap',
  'Market Cap': 'market_cap',
  'Marktkapital': 'market_cap',
  
  // ===== KGV VARIANTEN =====
  'KGV': 'pe_ratio',
  'KGV TTM': 'pe_ratio',
  'KGV (TTM)': 'pe_ratio',
  'Kurs-Gewinn-Verhältnis': 'pe_ratio',
  'P/E Ratio': 'pe_ratio',
  'PE': 'pe_ratio',
  'PE TTM': 'pe_ratio',
  
  // KGV Erwartet
  'KGV Erw.': 'forward_pe',
  'KGV Erwartet': 'forward_pe',
  'KGV Erwartet (FWD)': 'forward_pe',
  'Forward PE': 'forward_pe',
  'Forward P/E': 'forward_pe',
  'KGV Forward': 'forward_pe',
  
  // ===== PEG RATIO =====
  'PEG': 'peg_ratio',
  'PEG (TTM)': 'peg_ratio',
  'PEG-Ratio': 'peg_ratio',
  'PEG Ratio': 'peg_ratio',
  'Price/Earnings-to-Growth': 'peg_ratio',
  
  // ===== KUV VARIANTEN =====
  'KUV': 'ps_ratio', 
  'KUV TTM': 'ps_ratio',
  'KUV (TTM)': 'ps_ratio',
  'Kurs-Umsatz-Verhältnis': 'ps_ratio',
  'P/S Ratio': 'ps_ratio',
  'PS': 'ps_ratio',
  'PS TTM': 'ps_ratio',
  
  // ===== KBV VARIANTEN =====
  'KBV': 'pb_ratio',
  'KBV TTM': 'pb_ratio',
  'KBV (TTM)': 'pb_ratio',
  'Kurs-Buchwert-Verhältnis': 'pb_ratio',
  'P/B Ratio': 'pb_ratio',
  'PB': 'pb_ratio',
  'PB TTM': 'pb_ratio',
  
  // ===== ENTERPRISE VALUE RATIOS =====
  'EV/Umsatz': 'ev_sales',
  'EV/Umsatz (TTM)': 'ev_sales',
  'EV/Sales': 'ev_sales',
  'Enterprise Value/Sales': 'ev_sales',
  
  'EV/EBITDA': 'ev_ebitda',
  'EV/EBITDA (TTM)': 'ev_ebitda',
  'Enterprise Value/EBITDA': 'ev_ebitda',
  
  'EV/EBIT': 'ev_ebit',
  'EV/EBIT (TTM)': 'ev_ebit',
  'Enterprise Value EBIT': 'ev_ebit',
  'EV EBIT': 'ev_ebit',
  
  // ===== CASHFLOW RATIOS =====
  'Kurs/Cashflow': 'price_to_cashflow',
  'Kurs/Cashflow (TTM)': 'price_to_cashflow',
  'P/CF': 'price_to_cashflow',
  'Price to Cash Flow': 'price_to_cashflow',
  'Kurs-Cashflow-Verhältnis': 'price_to_cashflow',
  
  'Kurs/Free Cashflow': 'price_to_fcf',
  'Kurs/Free Cashflow (TTM)': 'price_to_fcf',
  'P/FCF': 'price_to_fcf',
  'Price to Free Cash Flow': 'price_to_fcf',
  'Kurs-Free-Cashflow-Verhältnis': 'price_to_fcf',
  
  // ===== ENTERPRISE VALUE =====
  'Enterprise Value': 'enterprise_value',
  'Unternehmenswert': 'enterprise_value',
  'EV': 'enterprise_value',
  
  // ===== EBITDA & EBIT =====
  'EBITDA': 'ebitda',
  'Earnings before Interest Taxes Depreciation Amortization': 'ebitda',
  'Operatives Ergebnis vor Abschreibungen': 'ebitda',
  'Betriebsergebnis vor Abschreibungen': 'ebitda',
  
  'EBIT': 'ebit',
  'Earnings before Interest and Taxes': 'ebit',
  'Betriebsergebnis': 'ebit',
  'Operatives Ergebnis': 'ebit',
  
  // ===== BILANZ-KENNZAHLEN =====
  'Bilanzsumme': 'total_assets',
  'Total Assets': 'total_assets',
  'Bilanzsumme gesamt': 'total_assets',
  'Gesamtvermögen': 'total_assets',
  'Gesamtaktiva': 'total_assets',
  
  'Eigenkapital': 'total_equity',
  'Total Equity': 'total_equity',
  'Eigenkapital gesamt': 'total_equity',
  'Stockholders Equity': 'total_equity',
  'Shareholders Equity': 'total_equity',
  
  'Verschuldungsgrad': 'debt_to_equity_ratio',
  'Debt-to-Equity': 'debt_to_equity_ratio',
  'Debt to Equity Ratio': 'debt_to_equity_ratio',
  'Fremdkapitalquote': 'debt_to_equity_ratio',
  'Verschuldung': 'debt_to_equity_ratio',
  
  'Liquide Mittel': 'cash_and_equivalents',
  'Cash and Cash Equivalents': 'cash_and_equivalents',
  'Cash and Equivalents': 'cash_and_equivalents',
  'Bargeld': 'cash_and_equivalents',
  'Liquidität': 'cash_and_equivalents',
  'Cash': 'cash_and_equivalents',
  
  'Kurzfristige Verbindlichkeiten': 'current_liabilities',
  'Current Liabilities': 'current_liabilities',
  'Kurzfristige Schulden': 'current_liabilities',
  'Kurzfr. Verbindlichkeiten': 'current_liabilities',
  
  'Langfristige Verbindlichkeiten': 'long_term_liabilities',
  'Long-term Liabilities': 'long_term_liabilities',
  'Langfristige Schulden': 'long_term_liabilities',
  'Langfr. Verbindlichkeiten': 'long_term_liabilities',
  
  'Working Capital': 'working_capital',
  'Betriebskapital': 'working_capital',
  'Nettoumlaufvermögen': 'working_capital',
  'Net Working Capital': 'working_capital',
  
  'Current Ratio': 'current_ratio',
  'Liquiditätsgrad 1': 'current_ratio',
  'Liquiditätsgrad': 'current_ratio',
  'Liquiditätskennzahl': 'current_ratio',
  
  'Quick Ratio': 'quick_ratio',
  'Liquiditätsgrad 2': 'quick_ratio',
  'Acid-Test-Ratio': 'quick_ratio',
  'Schnelle Liquidität': 'quick_ratio',
  
  // ===== DIVIDENDEN =====
  'Dividendenrendite': 'dividend_yield',
  'Dividendenrendite (TTM)': 'dividend_yield',
  'Rendite': 'dividend_yield',
  'Dividenden-Rendite': 'dividend_yield',
  'Dividend Yield': 'dividend_yield',
  'Yield': 'dividend_yield',
  
  'Ausschüttungsquote': 'payout_ratio',
  'Payout Ratio': 'payout_ratio',
  'Payout': 'payout_ratio',
  
  // ===== BETA =====
  'Beta': 'beta',
  'Beta-Faktor': 'beta',
  'Beta TTM': 'beta',
  
  // ===== MARGEN =====
  'Bruttomarge': 'gross_margin',
  'Gross Margin': 'gross_margin',
  
  'Op. Marge': 'operating_margin',
  'Operative Marge': 'operating_margin',
  'Operating Margin': 'operating_margin',
  'EBIT Marge': 'operating_margin',
  'Op Marge': 'operating_margin',
  
  'Nettomarge': 'net_margin',
  'Net Margin': 'net_margin',
  'Nettogewinnmarge': 'net_margin',
  
  // ===== UNTERNEHMENSEFFIZIENZ =====
  'ROA': 'roa',
  'Return on Assets': 'roa',
  'Kapitalrendite': 'roa',
  'Gesamtkapitalrendite': 'roa',
  
  'ROE': 'roe',
  'Return on Equity': 'roe',
  'Eigenkapitalrendite': 'roe',
  'Eigenkapitalrentabilität': 'roe',
  
  'Asset Turnover': 'asset_turnover',
  'Kapitalumschlag': 'asset_turnover',
  'Vermögensumschlag': 'asset_turnover',
  'Total Asset Turnover': 'asset_turnover',
  
  // ===== TTM =====
  'TTM': 'ttm',
  'Trailing Twelve Months': 'ttm',

  // ===== DCF BEGRIFFE =====
  'DCF': 'dcf',
  'Discounted Cash Flow': 'dcf',
  'DCF Bewertung': 'dcf',
  'DCF Analyse': 'dcf',
  'Discounted-Cash-Flow': 'dcf',
  
  'Terminal Value': 'terminal_value',
  'Endwert': 'terminal_value',
  'Terminalwert': 'terminal_value',
  
  'WACC': 'wacc',
  'Weighted Average Cost of Capital': 'wacc',
  'Kapitalkosten': 'wacc',
  'Diskontierungssatz': 'discount_rate',
  
  'Free Cash Flow': 'free_cash_flow',
  'Freier Cashflow': 'free_cash_flow',
  'FCF': 'free_cash_flow',
  
  'Intrinsischer Wert': 'intrinsic_value',
  'Fair Value': 'intrinsic_value',
  'Fairer Wert': 'intrinsic_value',
  'Innerer Wert': 'intrinsic_value'
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

// ✅ ERWEITERTE KATEGORIEN MIT BILANZ
export const LEXIKON_CATEGORIES = {
 'bewertung': {
  title: 'Bewertungskennzahlen',
  icon: '📊',
  description: 'Kennzahlen zur Bewertung von Aktien',
  terms: [
    'market_cap', 'pe_ratio', 'forward_pe', 'pb_ratio', 'ps_ratio', 'peg_ratio', 
    'ev_ebit', 'ev_sales', 'ev_ebitda', 'enterprise_value', 'price_to_cashflow', 
    'price_to_fcf', 'ttm',
    // ✅ DCF-BEGRIFFE:
    'dcf', 'terminal_value', 'wacc', 'free_cash_flow', 'discount_rate', 'intrinsic_value'
  ]
},
  'bilanz': {
    title: 'Bilanz & Liquidität',
    icon: '🏦',
    description: 'Bilanzpositionen und Liquiditätskennzahlen',
    terms: ['total_assets', 'total_equity', 'debt_to_equity_ratio', 'cash_and_equivalents', 'current_liabilities', 'long_term_liabilities', 'working_capital', 'current_ratio', 'quick_ratio']
  },
  'dividenden': {
    title: 'Dividenden',
    icon: '💵', 
    description: 'Alles rund um Dividenden und Ausschüttungen',
    terms: ['dividend_yield', 'payout_ratio']
  },
  'profitabilität': {
    title: 'Profitabilität',
    icon: '💰',
    description: 'Margen und Rentabilitätskennzahlen',
    terms: ['gross_margin', 'operating_margin', 'net_margin', 'ebit', 'ebitda']
  },
  'effizienz': {
    title: 'Unternehmenseffizienz',
    icon: '⚡',
    description: 'Kennzahlen zur Effizienz und Produktivität',
    terms: ['roa', 'roe', 'asset_turnover']
  },
  'risiko': {
    title: 'Risiko & Markt',
    icon: '📈',
    description: 'Risikokennzahlen und Marktdaten',
    terms: ['beta']
  }
}