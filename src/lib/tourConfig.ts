// src/lib/tourConfig.ts
// Definiert alle Schritte der Onboarding-Tour

export type TourPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TourStep {
  id: string
  route: string                 // Route auf der dieser Schritt angezeigt wird
  selector: string              // CSS-Selector des zu highlightenden Elements
  title: string
  description: string
  position: TourPosition        // Wo der Tooltip erscheint
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'stock-overview',
    route: '/analyse/stocks/aapl',
    selector: '[data-tour="stock-tabs"]',
    title: 'Kennzahlen & Chartentwicklung',
    description: 'Sieh wie sich Umsatz, Gewinn, Margen und andere Kennzahlen einer Aktie über die Jahre entwickelt haben — alles auf einen Blick.',
    position: 'bottom',
  },
  {
    id: 'stock-estimates',
    route: '/analyse/stocks/aapl/estimates',
    selector: '[data-tour="stock-tab-estimates"]',
    title: 'Analysten-Schätzungen',
    description: 'Was erwarten Analysten für Umsatz und Gewinn in den nächsten Quartalen und Jahren? Sieh Konsens-Schätzungen auf einen Blick.',
    position: 'bottom',
  },
  {
    id: 'stock-financials',
    route: '/analyse/stocks/aapl/financials',
    selector: '[data-tour="stock-tab-financials"]',
    title: 'Finanzen & Bilanz',
    description: 'Gewinn- und Verlustrechnung, Bilanz und Cashflow — alle Finanzdaten strukturiert aufbereitet, über 20+ Jahre historisch.',
    position: 'bottom',
  },
  {
    id: 'stock-insider',
    route: '/analyse/stocks/aapl/insider',
    selector: '[data-tour="stock-tab-insider"]',
    title: 'Insider Transaktionen',
    description: 'Wer aus dem Management kauft oder verkauft gerade die eigene Aktie? Insider-Käufe sind oft ein starkes bullisches Signal.',
    position: 'bottom',
  },
  {
    id: 'stock-super-investors',
    route: '/analyse/stocks/aapl/super-investors',
    selector: '[data-tour="stock-tab-super-investors"]',
    title: 'Superinvestoren',
    description: 'Welche bekannten Investoren wie Buffett, Ackman oder Burry halten diese Aktie — und wie hat sich ihre Position verändert?',
    position: 'bottom',
  },
  {
    id: 'compare',
    route: '/analyse/compare',
    selector: '[data-tour="nav-compare"]',
    title: 'Chart-Builder',
    description: 'Vergleiche beliebige Aktien und Kennzahlen auf einem Chart — KGV, Umsatz, Marge, P/FCF und mehr. Ideal für Branchen-Vergleiche.',
    position: 'right',
  },
  {
    id: 'dcf',
    route: '/analyse/dcf',
    selector: '[data-tour="nav-dcf"]',
    title: 'Fairer Wert (DCF)',
    description: 'Berechne ob eine Aktie über- oder unterbewertet ist — basierend auf dem freien Cashflow und deinen eigenen Wachstumsannahmen.',
    position: 'right',
  },
  {
    id: 'portfolio',
    route: '/analyse/portfolio/dashboard',
    selector: '[data-tour="nav-portfolio"]',
    title: 'Dein Portfolio',
    description: 'Tracke deine Investments, sieh deine Gesamtperformance und verfolge deine Dividenden-Einnahmen — alles an einem Ort.',
    position: 'right',
  },
  {
    id: 'watchlist',
    route: '/analyse/watchlist',
    selector: '[data-tour="nav-watchlist"]',
    title: 'Watchlist',
    description: 'Füge Aktien die du beobachten möchtest zur Watchlist hinzu und behalte Kurs, Bewertung und News im Blick.',
    position: 'right',
  },
  {
    id: 'dividends',
    route: '/analyse/dividends',
    selector: '[data-tour="nav-dividends"]',
    title: 'Dividenden-Kalender',
    description: 'Sieh wann welche Unternehmen Dividenden ausschütten, filtere nach Ex-Dividenden-Datum und plane deine Einnahmen.',
    position: 'right',
  },
]

export const TOUR_LS_COMPLETED = 'finclue_tour_completed'
export const TOUR_LS_STEP     = 'finclue_tour_step'
export const TOUR_LS_ACTIVE   = 'finclue_tour_active'
