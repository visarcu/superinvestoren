---
title: "DCF-Methode erklärt: So bewertest du Aktien wie die Profis"
slug: "dcf-methode-erklaert"
excerpt: "Die Discounted-Cash-Flow-Methode ist das wichtigste Bewertungstool für Value-Investoren. Wir erklären Schritt für Schritt, wie du den fairen Wert einer Aktie berechnest."
author: "FinClue Research"
authorImage: "/images/finclue-logo.png"
publishedDate: "2026-01-27"
readTime: "10 min"
category: "Wissen"
tags: ["DCF", "Discounted Cash Flow", "Aktienbewertung", "Value Investing", "Fair Value", "WACC", "Free Cash Flow", "Intrinsic Value"]
imageUrl: "/images/dcf-methode-erklaert.png"
imageAlt: "DCF-Methode Aktienbewertung"
imageCaption: "Die DCF-Methode berechnet den fairen Wert einer Aktie basierend auf zukünftigen Cashflows"
featured: false
premium: false
relatedStocks: []
---

# DCF-Methode erklärt: So bewertest du Aktien wie die Profis

Die Discounted-Cash-Flow-Methode (DCF) ist das Herzstück der fundamentalen Aktienbewertung. Warren Buffett, Charlie Munger und praktisch jeder erfolgreiche Value-Investor nutzt diese Methode, um den inneren Wert eines Unternehmens zu bestimmen.

In diesem Artikel erklären wir die DCF-Methode Schritt für Schritt – genau so, wie sie auch in unserer AI-Analyse verwendet wird.

## Was ist die DCF-Methode?

Die DCF-Methode basiert auf einem einfachen Prinzip: Ein Unternehmen ist so viel wert wie die Summe aller zukünftigen Cashflows, die es generieren wird – abgezinst auf den heutigen Wert.

Warum abzinsen? Weil ein Euro heute mehr wert ist als ein Euro in fünf Jahren. Das liegt an:
- **Inflation**: Geld verliert über Zeit an Kaufkraft
- **Opportunitätskosten**: Du könntest das Geld heute anders investieren
- **Risiko**: Zukünftige Cashflows sind nicht garantiert

## Die Grundformel

Die DCF-Formel sieht auf den ersten Blick komplex aus, ist aber logisch aufgebaut:

**Fairer Wert = Summe der abgezinsten zukünftigen Cashflows + Terminal Value**

Oder mathematisch:

```
Enterprise Value = FCF₁/(1+WACC)¹ + FCF₂/(1+WACC)² + ... + FCF₅/(1+WACC)⁵ + TV/(1+WACC)⁵
```

Wobei:
- **FCF** = Free Cash Flow (freier Cashflow)
- **WACC** = Diskontierungsrate
- **TV** = Terminal Value (Endwert)

## Schritt 1: Free Cash Flow verstehen

Der Free Cash Flow (FCF) ist das Geld, das einem Unternehmen nach allen operativen Ausgaben und Investitionen übrig bleibt:

**Free Cash Flow = Operating Cash Flow − Capital Expenditures**

Der FCF zeigt, wie viel Geld das Unternehmen tatsächlich an Aktionäre ausschütten oder reinvestieren könnte. Wir nutzen den aktuellsten FCF aus der Kapitalflussrechnung als Ausgangspunkt.

## Schritt 2: Wachstumsrate schätzen

Jetzt musst du schätzen, wie schnell der FCF in den nächsten Jahren wachsen wird. Das ist der schwierigste Teil der DCF-Analyse.

### So berechnen wir die Wachstumsrate

Unsere AI-Analyse berechnet die historische FCF-Wachstumsrate (CAGR) aus den letzten 5 Jahren:

```
Historische Wachstumsrate = (FCF_aktuell / FCF_vor_5_Jahren)^(1/5) − 1
```

Diese Rate wird zwischen 0% und 25% gekappt, um unrealistische Extremwerte zu vermeiden.

### Drei Szenarien

Um verschiedene Zukunftsszenarien abzubilden, rechnen wir mit drei Wachstumsraten:

| Szenario | FCF-Wachstum | Terminal Growth |
|----------|--------------|-----------------|
| **Bear Case** | Historisch × 0,5 | 1,5% |
| **Base Case** | Historisch × 1,0 | 2,5% |
| **Bull Case** | Historisch × 1,5 | 3,0% |

## Schritt 3: Diskontierungsrate (WACC) bestimmen

Die Diskontierungsrate spiegelt das Risiko der zukünftigen Cashflows wider. Je höher das Risiko, desto höher die Rate – und desto niedriger der faire Wert.

### Unsere WACC-Berechnung

Wir verwenden eine vereinfachte, aber bewährte Formel:

**WACC = Risk-Free Rate + Beta × Equity Risk Premium**

Mit den Standardwerten:
- **Risk-Free Rate**: 4,5% (basierend auf US-Staatsanleihen)
- **Equity Risk Premium**: 5,0% (historischer Durchschnitt)
- **Beta**: Aus den Unternehmensdaten (misst die Volatilität relativ zum Markt)

**Beispiel**: Ein Unternehmen mit Beta 1,2:
```
WACC = 4,5% + 1,2 × 5,0% = 10,5%
```

Ein höheres Beta (mehr Volatilität) führt zu einem höheren WACC und damit zu einem niedrigeren fairen Wert.

## Schritt 4: Terminal Value berechnen

Da wir nicht ewig in die Zukunft projizieren können, berechnen wir einen Terminal Value für alle Cashflows nach Jahr 5.

Wir nutzen das **Gordon Growth Model**:

**Terminal Value = FCF₅ × (1 + Terminal Growth) / (WACC − Terminal Growth)**

Der Terminal Growth liegt typisch bei 2-3% – nahe am langfristigen Wirtschaftswachstum.

### Achtung: Terminal Value dominiert

Der Terminal Value macht oft 60-80% des gesamten Unternehmenswerts aus. Deshalb ist die Wahl der Terminal Growth Rate so wichtig.

## Schritt 5: Vom Enterprise Value zum Fair Value pro Aktie

Jetzt rechnen wir alles zusammen:

**1. Projiziere FCF für 5 Jahre:**
```
Jahr 1: FCF × (1 + Wachstumsrate)
Jahr 2: FCF × (1 + Wachstumsrate)²
...
```

**2. Zinse jeden FCF ab:**
```
Barwert Jahr 1: FCF₁ / (1 + WACC)¹
Barwert Jahr 2: FCF₂ / (1 + WACC)²
...
```

**3. Berechne Terminal Value und zinse ihn ab:**
```
TV = FCF₅ × (1 + g) / (WACC − g)
Barwert TV = TV / (1 + WACC)⁵
```

**4. Enterprise Value:**
```
Enterprise Value = Summe aller Barwerte + Barwert Terminal Value
```

**5. Equity Value:**
```
Equity Value = Enterprise Value − Total Debt + Cash
```

**6. Fair Value pro Aktie:**
```
Fair Value = Equity Value / Ausstehende Aktien
```

## Praktisches Beispiel

Nehmen wir ein Unternehmen mit folgenden Daten:
- Aktueller FCF: 10 Mrd. $
- Historische Wachstumsrate: 12%
- Beta: 1,1
- Total Debt: 20 Mrd. $
- Cash: 15 Mrd. $
- Ausstehende Aktien: 1 Mrd.

**WACC berechnen:**
```
WACC = 4,5% + 1,1 × 5,0% = 10,0%
```

**FCF-Projektion (Base Case mit 12% Wachstum):**

| Jahr | FCF (Mrd. $) | Barwert (Mrd. $) |
|------|--------------|------------------|
| 1 | 11,2 | 10,2 |
| 2 | 12,5 | 10,3 |
| 3 | 14,0 | 10,5 |
| 4 | 15,7 | 10,7 |
| 5 | 17,6 | 10,9 |
| **Summe** | | **52,6** |

**Terminal Value:**
```
TV = 17,6 × 1,025 / (0,10 − 0,025) = 240,5 Mrd. $
Barwert TV = 240,5 / (1,10)⁵ = 149,3 Mrd. $
```

**Enterprise Value:**
```
EV = 52,6 + 149,3 = 201,9 Mrd. $
```

**Equity Value:**
```
Equity = 201,9 − 20 + 15 = 196,9 Mrd. $
```

**Fair Value pro Aktie:**
```
Fair Value = 196,9 / 1 = 196,90 $
```

## Margin of Safety

Der berechnete faire Wert ist eine Schätzung, keine Garantie. Deshalb zeigen wir die **Margin of Safety** – den Abstand zwischen aktuellem Kurs und fairem Wert:

**Margin of Safety = (Fair Value − Aktueller Kurs) / Fair Value × 100%**

Interpretation:
- **> 30%**: Stark unterbewertet (grüne Zone)
- **10-30%**: Unterbewertet (lime Zone)
- **−10% bis +10%**: Fair bewertet (gelbe Zone)
- **−10% bis −30%**: Überbewertet (orange Zone)
- **< −30%**: Stark überbewertet (rote Zone)

## Stärken und Schwächen der DCF-Methode

### Stärken
- Fundamentaler Ansatz, unabhängig von Marktstimmung
- Zwingt zur systematischen Analyse eines Unternehmens
- Macht Annahmen explizit und transparent

### Schwächen
- Sehr sensitiv gegenüber Annahmen (vor allem Wachstum und WACC)
- Nicht geeignet für Unternehmen ohne positive Cashflows
- Zukunft ist grundsätzlich ungewiss

## Typische Fehler vermeiden

1. **Zu optimistische Wachstumsraten**: Wir kappen bei 25%
2. **Beta ignorieren**: Riskantere Unternehmen brauchen höheren WACC
3. **Terminal Value unterschätzen**: Er dominiert das Ergebnis
4. **Keine Szenarien**: Deshalb zeigen wir Bear, Base und Bull Case
5. **Schulden vergessen**: Immer von EV zu Equity Value umrechnen

## Fazit

Die DCF-Methode ist das wichtigste Werkzeug für fundamentale Aktienbewertung. Sie zwingt dich, systematisch über ein Unternehmen nachzudenken: Wie viel Cash generiert es heute? Wie wird es sich entwickeln? Welches Risiko besteht?

Aber vergiss nicht: Jedes DCF-Modell ist nur so gut wie seine Annahmen. Nutze es als einen von mehreren Faktoren in deiner Anlageentscheidung – nicht als alleinige Wahrheit.

---

**Automatische DCF-Analyse auf FinClue:** Du willst nicht selbst rechnen? Nutze unsere [AI-gestützte DCF-Analyse](/analyse), die automatisch Finanzdaten abruft und den fairen Wert mit Bear, Base und Bull Case berechnet.

---

*Disclaimer: Dieser Artikel dient ausschließlich zu Bildungszwecken und stellt keine Anlageberatung dar. Investitionen in Aktien sind mit Risiken verbunden. Bitte informiere dich gründlich und ziehe bei Bedarf einen Finanzberater hinzu.*
