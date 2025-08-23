// src/data/blog.ts - Erweiterte Blog/Newsletter Datenstruktur

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  author: {
    name: string
    image: string
    bio: string
    social?: {
      twitter?: string
      linkedin?: string
    }
  }
  publishedDate: string
  updatedDate?: string
  readTime: string
  category: 'newsletter' | 'analysis' | 'market-news' | 'education' | 'interview'
  tags: string[]
  image: {
    url: string
    alt: string
    caption?: string
  }
  featured: boolean
  premium: boolean
  seo: {
    metaTitle?: string
    metaDescription?: string
  }
  relatedStocks?: string[]
  newsletter?: {
    issue: number
    subscribers?: number
  }
}

export const blogPosts: BlogPost[] = [
  // 🔥 NVIDIA ARTIKEL (Featured)
  {
    id: '1',
    slug: 'nvidia-4-billionen-jensen-huang-verkauf-analyse',
    title: 'Nvidia knackt 4-Billionen-Grenze: Was Jensen Huangs 15-Millionen-Verkauf wirklich bedeutet',
    excerpt: 'Als erstes Unternehmen der Geschichte durchbricht Nvidia die 4-Billionen-Dollar-Marke. Doch warum verkauft CEO Jensen Huang ausgerechnet jetzt Aktien für 15 Millionen Dollar?',
    content: `# Nvidia knackt 4-Billionen-Grenze: Was Jensen Huangs 15-Millionen-Verkauf wirklich bedeutet

**Nvidia ist am Mittwoch als erstes Unternehmen der Geschichte über die magische 4-Billionen-Dollar-Marke bei der Marktkapitalisierung gesprungen.** Mit einem Intraday-High von $164 ließ der KI-Gigant sogar Apple und Microsoft hinter sich – ein historischer Meilenstein, der zeigt, wie sehr KI die Finanzwelt umkrempelt.

Doch während die Schlagzeilen den Rekord feiern, versteckt sich in den SEC-Filings eine interessante Geschichte: CEO Jensen Huang hat zeitgleich 100.000 Aktien für rund 15 Millionen Dollar verkauft. Was steckt dahinter?

## Der historische Sprung

Jensen Huang kann sich zurecht freuen – sein "Baby" ist nicht nur das wertvollste Unternehmen der Welt, sondern hat seine Marktkapitalisierung in nur 13 Monaten von 3 auf 4 Billionen Dollar gesteigert. Zum Vergleich: Apple brauchte dafür fast zwei Jahre.

**Die Zahlen sind beeindruckend:**
- Marktkapitalisierung: $4.02 Billionen (Allzeithoch)
- Kurs-Höchststand: $164 pro Aktie
- Jahresperformance: +190%
- Abstand zu Apple: Nvidia führt mit über $300 Milliarden

Die Investoren setzen weiterhin voll auf den KI-Boom, und Nvidia liefert buchstäblich die "Picks und Schaufeln" dafür. Jedes große Tech-Unternehmen, von Microsoft bis Meta, braucht Nvidias Chips für ihre KI-Ambitionen.

## Der Insider-Verkauf: Panik oder Plan?

**Hier wird es interessant:** Huang hat diese Woche 100.000 Aktien verkauft – ausgerechnet am Tag des Rekords. Grund zur Sorge?

**Spoiler: Nein.**

Der Verkauf ist Teil eines bereits im März angekündigten 10b5-1-Plans. Das bedeutet:

✅ **Automatisiert:** Die Verkäufe laufen nach festgelegtem Schema  
✅ **Transparent:** SEC-konform und öffentlich einsehbar  
✅ **Strategisch:** Diversifikation nach extremer Rallye  

Huang besitzt weiterhin über 75 Millionen Nvidia-Aktien (Wert: ~$12 Milliarden). Der Verkauf entspricht weniger als 0,15% seiner Gesamtposition.

## Was andere Super-Investoren machen

Interessant ist, wie sich andere Top-Investoren bei Nvidia positioniert haben:

**Warren Buffett:** Berkshire Hathaway hat Nvidia nie besessen – zu "spekulativ" für den Altmeister

**Cathie Wood (ARK):** Hat ihre Nvidia-Position Anfang 2023 komplett verkauft – ein $2-Milliarden-Fehler

**Ray Dalio:** Bridgewater hält eine kleine Position, setzt aber hauptsächlich auf China-Tech

## Die Bewertungsfrage

Bei einer Marktkapitalisierung von $4 Billionen zahlen Investoren das 60-fache des erwarteten Jahresgewinns. Teuer? Definitiv. Ungerechtfertigt? Das kommt darauf an.

**Bull-Case:**
- KI-Revolution steht erst am Anfang
- Nvidia hat ein faktisches Monopol bei High-End-KI-Chips
- Margenstärke bleibt hoch (70%+ Bruttomarge)

**Bear-Case:**
- Extremer Bewertungsaufschlag bereits eingepreist
- Konkurrenz von AMD, Intel und Custom-Chips wächst
- Zyklisches Chipgeschäft = volatiler als gedacht

## Was das für Privatanleger bedeutet

**Die Insider-Verkäufe sind normal.** Nach einer 190%-Rally ist es absolut rational, Gewinne mitzunehmen – selbst für den CEO.

**Wichtige Lessons:**
1. **Diversifikation schlägt Überzeugung:** Selbst Huang verkauft
2. **Timing ist unmöglich:** Niemand weiß, ob $164 der Peak war
3. **Innovation wird belohnt:** Nvidia zeigt, warum Disruption sich auszahlt

## Unser Take

Nvidia bleibt ein faszinierendes Investment-Case-Study. Die 4-Billionen-Marke ist historisch, aber auch ein Signal, vorsichtig zu werden. 

Wenn selbst der CEO bei diesen Preisen verkauft (auch wenn planmäßig), sollten Privatanleger überdenken, ob sie noch nachkaufen.

**Bottom Line:** Nvidia ist ein großartiges Unternehmen – aber bei $164 möglicherweise keine großartige Aktie mehr.`,
    author: {
      name: 'FinClue Research',
      image: '/images/finclue-logo.png',
      bio: 'Unser Research-Team analysiert täglich die Portfolios der erfolgreichsten Investoren weltweit.'
    },
    publishedDate: '2025-07-15',
    readTime: '8 min',
    category: 'analysis',
    tags: ['Nvidia', 'Insider Trading', 'KI-Aktien', 'Jensen Huang'],
    image: {
      url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
      alt: 'Nvidia Chip Technology',
      caption: 'Nvidia führt die KI-Revolution an'
    },
    featured: true,
    premium: false,
    seo: {
      metaTitle: 'Nvidia 4-Billionen-Dollar: Jensen Huang Verkauf Analyse | FinClue',
      metaDescription: 'Nvidia erreicht 4-Billionen-Dollar Marktkapitalisierung. Warum verkauft CEO Jensen Huang Aktien für 15 Millionen? Vollständige Analyse.'
    },
    relatedStocks: ['NVDA', 'AAPL', 'MSFT']
  },

  // 🏆 13F GUIDE (SEO-Gold!)
  {
    id: '2',
    slug: 'was-sind-13f-filings-super-investoren-tracken',
    title: 'Was sind 13F Filings? So trackst du Super-Investoren richtig',
    excerpt: 'Ein kompletter Guide für Einsteiger: Was sind 13F Filings, wo findest du sie und wie nutzt du sie für bessere Investment-Entscheidungen wie die Profis.',
    content: `# Was sind 13F Filings? So trackst du Super-Investoren richtig

*Der ultimative Einsteiger-Guide für Super-Investor Tracking*

**Stell dir vor, du könntest in die Portfolios von Warren Buffett, Bill Ackman und anderen Investment-Legenden schauen – und zwar völlig legal und kostenlos.** Das geht tatsächlich, dank der sogenannten 13F Filings. In diesem Guide erfährst du alles, was du über diese Goldgrube für Privatanleger wissen musst.

## Was sind 13F Filings?

**Ein 13F Filing ist ein Pflichtbericht, den große Investmentmanager vierteljährlich bei der SEC (Securities and Exchange Commission) einreichen müssen.** Diese Berichte offenbaren die kompletten Aktienbestände von Hedgefonds, Pensionsfonds und anderen institutionellen Investoren.

**Die wichtigsten Fakten:**
- **Einreichungspflicht:** Alle Manager mit über $100 Millionen verwalteten Vermögen
- **Offenlegungsfrist:** 45 Tage nach Quartalsende
- **Umfang:** Alle US-Aktien und ETFs mit über 10.000 Aktien oder $200.000 Wert
- **Öffentlich:** Kostenlos einsehbar auf SEC.gov

Das bedeutet: Jeden Februar, Mai, August und November erfährst du, was die besten Investoren der Welt in ihren Portfolios haben.

## Warum sind 13F Filings so wertvoll?

### 1. **Transparenz in die Strategien der Besten**

Warren Buffett kauft Apple-Aktien? Du siehst es im 13F. Bill Ackman steigt bei einer neuen Position ein? Es steht im Filing. Diese Einblicke sind unbezahlbar für das eigene Lernen.

### 2. **Frühe Trend-Erkennung**

Wenn mehrere Top-Investoren gleichzeitig in einen Sektor investieren, kann das ein starkes Signal sein. 2020 haben viele Super-Investoren Tech-Aktien gekauft – kurz vor der großen Rallye.

### 3. **Risiko-Management lernen**

Du siehst nicht nur, was gekauft wird, sondern auch, was verkauft wird. Wenn Buffett eine Position komplett auflöst, ist das oft ein Warnsignal.

## Wo findest du 13F Filings?

### **Offizielle Quellen:**
- **SEC EDGAR Database:** sec.gov/edgar (kostenlos, aber unübersichtlich)
- **Investor Relations:** Viele Fonds publizieren die Filings auf ihren Websites

### **Professionelle Tools:**
- **WhaleWisdom:** Benutzerfreundliche Aufbereitung der SEC-Daten
- **FinClue:** Automatisches Tracking von 90+ Super-Investoren mit Alerts

## So liest du ein 13F Filing richtig

### **Die wichtigsten Spalten verstehen:**

**1. Name of Issuer (Unternehmen)**
- Selbsterklärend: Der Name der Aktie

**2. Value (Wert)**
- Gesamtwert der Position in US-Dollar
- Wichtig für die Portfoliogewichtung

**3. Shares (Anzahl Aktien)**
- Absolute Anzahl der gehaltenen Aktien
- Hilft bei der Berechnung von Veränderungen

**4. Sole/Shared/None Voting Authority**
- Zeigt, wer die Stimmrechte hat
- Meist nicht relevant für Privatanleger

### **Worauf du achten solltest:**

✅ **Neue Positionen:** Komplett neue Käufe signalisieren oft starke Überzeugung

✅ **Aufstockungen:** Wenn eine bestehende Position vergrößert wird

✅ **Komplette Verkäufe:** Wenn eine Position auf Null reduziert wird

✅ **Portfoliogewichtung:** Welche Aktien machen den größten Anteil aus?

## Die größten Fallstricke vermeiden

### **❌ Timing-Problem**
13F Filings sind 45-75 Tage alt. Die Käufe sind bereits Geschichte. Nutze sie für langfristige Trends, nicht für Day-Trading.

### **❌ Unvollständiges Bild**
Filings zeigen nur US-Aktien. Internationale Positionen, Bonds oder Derivate sind nicht sichtbar.

### **❌ Falsche Interpretation**
Ein Verkauf kann viele Gründe haben: Portfoliorebalancing, Liquiditätsbedarf oder geänderte Meinung. Nicht jeder Verkauf ist ein Sell-Signal.

### **❌ Blind kopieren**
Super-Investoren haben andere Risikoprofile und Anlagehorizonte als Privatanleger. Verstehe erst die Strategie, bevor du kopierst.

## Praktisches Beispiel: Berkshire Hathaways Q2 2025 Filing

**Top 5 Holdings (Beispiel):**
1. **Apple (AAPL):** $178 Mrd (42% des Portfolios)
2. **Bank of America (BAC):** $31 Mrd (7.4%)
3. **American Express (AXP):** $22 Mrd (5.2%)
4. **Chevron (CVX):** $18 Mrd (4.3%)
5. **Coca-Cola (KO):** $16 Mrd (3.8%)

**Was wir daraus lernen:**
- Buffett konzentriert sich auf wenige, große Positionen
- Tech (Apple) ist mittlerweile der größte Baustein
- Traditionelle Value-Aktien (Banken, Energie) bleiben wichtig
- Keine neuen Positionen = vorsichtige Haltung?

## Super-Investoren, die du tracken solltest

### **Value-Investoren:**
- **Warren Buffett (Berkshire Hathaway):** Der Klassiker
- **Seth Klarman (Baupost Group):** Defensive Value-Strategie
- **David Einhorn (Greenlight Capital):** Activist-Investor

### **Growth-Investoren:**
- **Cathie Wood (ARK Investment):** Disruptive Innovation
- **Chase Coleman (Tiger Global):** Tech-fokussiert
- **Philippe Laffont (Coatue):** TMT-Spezialist

### **Activist-Investoren:**
- **Bill Ackman (Pershing Square):** Konzentrierte Bets
- **Carl Icahn (Icahn Enterprises):** Corporate Raider
- **Daniel Loeb (Third Point):** Event-driven

## Wie FinClue dir dabei hilft

Bei FinClue tracken wir über 90 Super-Investoren automatisch und schicken dir Alerts bei wichtigen Änderungen:

✅ **Echtzeit-Benachrichtigungen:** Neue Filings sofort im Dashboard

✅ **Trend-Analyse:** Welche Aktien kaufen mehrere Top-Investoren?

✅ **Portfolio-Vergleiche:** Sieh alle Holdings auf einen Blick

✅ **Historische Daten:** Verfolge Strategien über Jahre hinweg

## Deine nächsten Schritte

**1. Starte mit den Basics:**
- Folge 3-5 Super-Investoren, deren Stil dir gefällt
- Verstehe ihre Investmentphilosophie vor dem Tracking

**2. Entwickle dein System:**
- Quarterly Review: Neue Filings durchgehen
- Recherche: Warum kaufen/verkaufen sie bestimmte Aktien?
- Dokumentation: Führe ein Investment-Tagebuch

**3. Kombiniere mit eigener Analyse:**
- 13F Filings sind der Startpunkt, nicht das Ende
- Mache deine eigene Due Diligence vor jedem Investment
- Nutze die Insights als zusätzliche Datenquelle

## Fazit

13F Filings sind eine der mächtigsten, kostenlosen Ressourcen für Privatanleger. Sie geben dir Einblicke in die Denkweise der besten Investoren der Welt – wenn du weißt, wie du sie richtig interpretierst.

**Der Schlüssel liegt nicht darin, blind zu kopieren, sondern zu verstehen:** Warum kauft Buffett diese Aktie? Was sieht Ackman in diesem Unternehmen? Welcher Trend verbindet mehrere Super-Investor-Käufe?

Mit diesem Wissen wirst du zu einem besseren, informierteren Investor.

**Ready to start?** Tracke die besten Investoren der Welt mit FinClue und verpasse nie wieder einen wichtigen Move.`,
    author: {
      name: 'FinClue Research',
      image: '/images/finclue-logo.png',
      bio: 'Unser Research-Team analysiert täglich die Portfolios der erfolgreichsten Investoren weltweit.'
    },
    publishedDate: '2025-07-12',
    readTime: '12 min',
    category: 'education',
    tags: ['13F Filings', 'Super Investoren', 'SEC', 'Investment Education', 'Warren Buffett'],
    image: {
      url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop',
      alt: '13F Filing SEC Document',
      caption: 'SEC 13F Filings zeigen Super-Investor Portfolios'
    },
    featured: false,
    premium: false,
    seo: {
      metaTitle: '13F Filings erklärt: Super-Investoren tracken | Kompletter Guide',
      metaDescription: 'Was sind 13F Filings? Wie trackst du Warren Buffett & Co? Kompletter Einsteiger-Guide für Super-Investor Tracking mit praktischen Tipps.'
    },
    relatedStocks: ['BRK.A', 'BRK.B']
  },

  // 📧 NEWSLETTER
  {
    id: '3', 
    slug: 'newsletter-kw47-wochenrueckblick',
    title: 'Wochenrückblick KW47: Die Highlights der Woche',
    excerpt: 'Von Nvidias 4-Billionen-Meilenstein bis zu Metas 3,5-Milliarden-Brillen-Deal – hier sind die wichtigsten Investment-Moves der Woche im Überblick.',
    content: `# FinClue Newsletter KW47

Hallo liebe FinClue-Community!
 
Was für eine Woche! Die Märkte haben uns mal wieder daran erinnert, warum wir dieses Spiel so lieben. Von historischen Meilensteinen bis hin zu strategischen Schachzügen der Superinvestoren – hier ist euer kompakter Überblick über das, was diese Woche wirklich zählte.
­
## 🚀 Nvidia knackt die 4-Billionen-Grenze

**Nvidia ist am Mittwoch als erstes Unternehmen der Geschichte über die magische 4-Billionen-Dollar-Marke bei der Marktkapitalisierung gesprungen.** Mit einem Intraday-High von $164 ließ der KI-Gigant sogar Apple und Microsoft hinter sich.
 
Jensen Huang kann sich freuen – sein "Baby" ist nicht nur das wertvollste Unternehmen der Welt, sondern hat seine Marktkapitalisierung in nur 13 Monaten von 3 auf 4 Billionen Dollar gesteigert. Die Investoren setzen weiterhin voll auf den KI-Boom, und Nvidia liefert die Picks und Schaufeln dafür.
 
**Kleiner Insider-Twist:** Huang selbst hat übrigens diese Woche 100.000 Aktien für rund 15 Millionen Dollar verkauft – Teil eines bereits im März angekündigten Plans. Gewinnmitnahmen nach solchen Rallyes? Völlig normal.
­
## 🕶️ Metas milliardenschwerer Brillen-Deal

**Meta legt nochmal nach: 3,5 Milliarden Dollar investiert Zuckerberg in EssilorLuxottica, den Hersteller von Ray-Ban und Oakley.** Das sind knapp 3% am Unternehmen, mit Option auf weitere Aufstockung.
 
Die Strategie ist klar: Meta will endlich seine eigene Hardware-Pipeline kontrollieren, anstatt von Smartphone-Herstellern abhängig zu sein. Die Ray-Ban Meta-Brillen laufen bereits richtig gut – 2 Millionen Paar verkauft seit Ende 2023, Ziel sind 10 Millionen jährlich bis 2026.
 
Smart Move von Zuckerberg: Statt die Brillen-Expertise mühsam selbst aufzubauen, kauft er sich einfach beim Weltmarktführer ein.
­
## 🇩🇪 DAX auf Rekordkurs

**Unser heimischer DAX hat diese Woche auch abgeliefert: Neues Allzeithoch bei 24.609 Punkten am Mittwoch!** Das Ganze trotz der ganzen Trump-Zoll-Unsicherheit.
 
Der Grund laut Analysten: Kapital fließt von den USA nach Europa, weil Investoren der volatilen US-Zollpolitik entgehen wollen. Deutschland gilt momentan als das stabilere Investment – wer hätte das gedacht?
­
## 💰 Die großen Kassen klingeln

**Jeff Bezos** macht das, was Milliardäre so machen: Er hat diese Woche Amazon-Aktien im Wert von 1,4 Milliarden Dollar verkauft – praktisch zeitgleich mit seiner 50-Millionen-Dollar-Hochzeit in Venedig. Timing ist alles!
 
Der Verkauf läuft über seinen bereits festgelegten Plan, der ihm erlaubt, bis Mai 2026 insgesamt 25 Millionen Aktien zu verkaufen – Wert: rund 4,75 Milliarden Dollar. Vermutlich fließt ein Großteil davon in sein Raumfahrt-Projekt Blue Origin.
­
## 📊 Was bedeutet das für euch?

Diese Woche zeigt wieder: Die großen Trends setzen sich fort. KI bleibt das dominierende Thema, aber auch traditionelle Märkte wie Deutschland profitieren von geopolitischen Unsicherheiten.
 
**Besonders spannend:** Die Insider-Verkäufe zeigen, dass selbst die CEOs bei diesen Bewertungen Gewinne mitnehmen. Das ist nicht bearish, sondern gesunde Portfoliodiversifikation nach historischen Rallyes.
 
## 🎯 Euer FinClue-Vorteil

Ihr wollt diese Insider-Moves nicht mehr verpassen? Bei FinClue tracken wir nicht nur die Depots von über 90 Superinvestoren, sondern auch solche Insider-Käufe und -verkäufe in Echtzeit.`,
    author: {
      name: 'FinClue Team',
      image: '/images/finclue-logo.png',
      bio: 'Das FinClue Team kuratiert wöchentlich die wichtigsten Investment-News und Super-Investor Updates.'
    },
    publishedDate: '2025-07-14',
    readTime: '5 min',
    category: 'newsletter',
    tags: ['Newsletter', 'Wochenrückblick', 'Nvidia', 'Meta', 'Jeff Bezos'],
    image: {
      url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop',
      alt: 'Weekly Market Roundup',
      caption: 'Die wichtigsten Investment-News der Woche'
    },
    featured: false,
    premium: false,
    seo: {
      metaTitle: 'Newsletter KW47: Nvidia 4-Billionen, Meta-Deal, Bezos-Verkauf',
      metaDescription: 'Wöchentlicher Investment-Newsletter: Nvidia erreicht 4-Billionen, Metas Brillen-Deal, Bezos verkauft Amazon-Aktien. Alle wichtigen Updates.'
    },
    relatedStocks: ['NVDA', 'META', 'AMZN'],
    newsletter: {
      issue: 47,
      subscribers: 150
    }
  }
]

// Helper Functions
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug)
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  if (category === 'all') return blogPosts
  return blogPosts.filter(post => post.category === category)
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter(post => post.featured)
}

export function getRelatedPosts(currentPostId: string, limit: number = 3): BlogPost[] {
  const currentPost = blogPosts.find(post => post.id === currentPostId)
  if (!currentPost) return []
  
  return blogPosts
    .filter(post => 
      post.id !== currentPostId && 
      (post.category === currentPost.category || 
       post.tags.some(tag => currentPost.tags.includes(tag)))
    )
    .slice(0, limit)
}