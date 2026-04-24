// src/lib/importBrokerConfig.ts
// Broker-Konfiguration für den CSV/PDF/XLSX-Import-Wizard.
// Design-Prinzip: dezenter, einheitlicher Premium-Stil (neutral + minimaler Broker-Akzent).

export type ImportBrokerId =
  | 'scalable'
  | 'traderepublic'
  | 'flatex'
  | 'smartbroker'
  | 'freedom24'
  | 'zero'
  | 'ing'
  | 'trading212'
  | 'other'

export interface ImportBrokerInfo {
  id: ImportBrokerId
  name: string
  shortName: string
  formats: string[]                // ['.csv'], ['.pdf'], …
  accept: string                   // HTML accept-Attribut für <input type="file">
  initial: string                  // Kurz-Label für Avatar
  accentDot: string                // dezenter Farbpunkt als Broker-Erkennungsmerkmal
  supportsMultiFile: boolean       // mehrere Dateien gleichzeitig möglich
  isBetterThanPdf?: boolean        // Hinweis: CSV > PDF
  instructions: {
    title: string
    steps: string[]
    hint?: string
    loginUrl?: string
    loginLabel?: string
  }
}

export const IMPORT_BROKERS: ImportBrokerInfo[] = [
  {
    id: 'scalable',
    name: 'Scalable Capital',
    shortName: 'Scalable',
    formats: ['.csv'],
    accept: '.csv',
    initial: 'S',
    accentDot: 'bg-emerald-400',
    supportsMultiFile: false,
    isBetterThanPdf: true,
    instructions: {
      title: 'So findest du die Export-Datei bei Scalable Capital',
      steps: [
        'Logge dich bei Scalable Capital ein (Web oder App)',
        'Öffne dein Broker-Depot und gehe zum Tab "Transaktionen"',
        'Klicke oben rechts auf das Download-Symbol',
        'Wähle "CSV exportieren" und speichere die Datei',
      ],
      hint: 'Der CSV-Export enthält alle Transaktionen: Käufe, Verkäufe, Dividenden, Ein-/Auszahlungen, Zinsen und Depotüberträge.',
      loginUrl: 'https://de.scalable.capital/broker/secure/transactions',
      loginLabel: 'Zu Scalable Capital',
    },
  },
  {
    id: 'traderepublic',
    name: 'Trade Republic',
    shortName: 'Trade Republic',
    formats: ['.csv', '.pdf'],
    accept: '.csv,.pdf',
    initial: 'TR',
    accentDot: 'bg-white',
    supportsMultiFile: true,
    isBetterThanPdf: true,
    instructions: {
      title: 'So findest du den Transaktionsexport bei Trade Republic',
      steps: [
        'Öffne die Trade Republic App auf deinem Smartphone',
        'Tippe auf dein Profil → "Transaktionsexport"',
        'Wähle den gewünschten Zeitraum und lade die CSV herunter',
        'Lade die CSV hier hoch — alle Käufe, Verkäufe, Dividenden, Cash & Corporate Actions in einer Datei',
      ],
      hint: 'Seit April 2026 bietet Trade Republic einen vollständigen CSV-Export mit allen Transaktionen. Das ist viel präziser als die Einzel-PDFs. Alternativ können PDFs hochgeladen werden.',
    },
  },
  {
    id: 'flatex',
    name: 'Flatex / DEGIRO',
    shortName: 'Flatex',
    formats: ['.xlsx', '.pdf', '.csv'],
    accept: '.xlsx,.pdf,.csv',
    initial: 'F',
    accentDot: 'bg-orange-400',
    supportsMultiFile: true,
    instructions: {
      title: 'So findest du die Export-Datei bei Flatex',
      steps: [
        'Logge dich bei Flatex ein',
        'Gehe zu "Konto/Depot" → "Depotumsätze"',
        'Wähle den gewünschten Zeitraum und klicke auf "XLSX-Export"',
        'Alternativ: PDFs aus dem Dokumentenarchiv hochladen (einzeln)',
      ],
      hint: 'Der XLSX-Export enthält alle Käufe, Verkäufe und Dividenden in einer Datei — einfacher und vollständiger als einzelne PDFs.',
      loginUrl: 'https://www.flatex.de',
      loginLabel: 'Zu Flatex',
    },
  },
  {
    id: 'smartbroker',
    name: 'Smartbroker+',
    shortName: 'Smartbroker',
    formats: ['.pdf'],
    accept: '.pdf',
    initial: 'SB',
    accentDot: 'bg-blue-400',
    supportsMultiFile: true,
    instructions: {
      title: 'So findest du die Abrechnungen bei Smartbroker+',
      steps: [
        'Logge dich bei Smartbroker+ ein',
        'Gehe zu "Mein Konto" → "Postbox / Dokumente"',
        'Lade die Wertpapierabrechnungen als PDF herunter',
        'Lade alle PDFs hier hoch — mehrere gleichzeitig möglich',
      ],
    },
  },
  {
    id: 'freedom24',
    name: 'Freedom24',
    shortName: 'Freedom24',
    formats: ['.xlsx', '.xls'],
    accept: '.xlsx,.xls',
    initial: 'F24',
    accentDot: 'bg-green-400',
    supportsMultiFile: false,
    instructions: {
      title: 'So findest du die Datei bei Freedom24',
      steps: [
        'Logge dich bei Freedom24 ein',
        'Gehe zu "Berichte" → "Handelsberichte"',
        'Wähle den gewünschten Zeitraum und exportiere als XLSX',
        'Alternativ: "Kontoauszüge" → "Steuerbericht" oder "Auftragshistorie"',
      ],
      hint: 'Der Handelsbericht ist die beste Wahl — er enthält das echte Transaktionsdatum und ISINs. Der Steuerbericht funktioniert auch, nutzt aber das Abrechnungsdatum (T+2).',
    },
  },
  {
    id: 'ing',
    name: 'ING',
    shortName: 'ING',
    formats: ['.pdf'],
    accept: '.pdf',
    initial: 'ING',
    accentDot: 'bg-orange-500',
    supportsMultiFile: true,
    instructions: {
      title: 'So findest du die Abrechnungen bei ING',
      steps: [
        'Logge dich im ING-Banking ein (Web oder App)',
        'Gehe zu "Postbox" oder "Dokumente & Postbox"',
        'Lade alle relevanten PDFs herunter:',
        '• Wertpapierabrechnungen (Kauf / Verkauf)',
        '• Ertragsabrechnungen (Dividenden)',
        '• Bestandsveränderungen (Depotüberträge)',
        'Lade alle PDFs hier hoch — mehrere gleichzeitig möglich',
      ],
      hint: 'ING bietet leider keinen Gesamt-CSV-Export an. Lade einfach alle Dokumente aus deiner Postbox gleichzeitig hoch — wir lesen sie automatisch aus. Depotauszüge / Kontoauszüge / Kostenaufstellungen werden erkannt und übersprungen.',
      loginUrl: 'https://banking.ing.de',
      loginLabel: 'Zum ING-Banking',
    },
  },
  {
    id: 'trading212',
    name: 'Trading 212',
    shortName: 'Trading 212',
    formats: ['.csv', '.pdf'],
    accept: '.csv,.pdf',
    initial: 'T212',
    accentDot: 'bg-sky-500',
    supportsMultiFile: true,
    isBetterThanPdf: true,
    instructions: {
      title: 'So kommst du an die Export-Datei bei Trading 212',
      steps: [
        'Öffne die Trading-212-App oder die Web-Oberfläche',
        'Menu (≡) → "Chronik" (im Deutschen) bzw. "History"',
        'Oben rechts auf den Export-Button tippen',
        'Alle Datentypen (Orders, Transaktionen, Dividenden) auswählen',
        'Als CSV exportieren — max. 365 Tage pro Export',
      ],
      hint: 'Die CSV enthält alle Käufe, Verkäufe, Dividenden, Stock Splits und Ein-/Auszahlungen in einer Datei. Falls du mehr als 1 Jahr Historie hast, einfach mehrere CSVs hintereinander hochladen. Monats-PDFs (Menu → Unterlagen → Kontoauszüge) funktionieren auch, sind aber weniger vollständig.',
      loginUrl: 'https://www.trading212.com',
      loginLabel: 'Zu Trading 212',
    },
  },
  {
    id: 'zero',
    name: 'finanzen.net zero',
    shortName: 'Zero',
    formats: ['.csv'],
    accept: '.csv',
    initial: '0',
    accentDot: 'bg-pink-400',
    supportsMultiFile: false,
    isBetterThanPdf: true,
    instructions: {
      title: 'So findest du die Export-Datei bei finanzen.net zero',
      steps: [
        'Logge dich bei finanzen.net zero ein (Web oder App)',
        'Gehe zu "Orders" bzw. "Orderhistorie"',
        'Klicke auf den Export / Download-Button',
        'Wähle "CSV-Export" und lade die Datei herunter',
      ],
      hint: 'Der Zero-Export enthält Käufe/Verkäufe inkl. Sparplan-Ausführungen. Dividenden und Ein-/Auszahlungen sind nicht enthalten — du kannst sie bei Bedarf manuell ergänzen.',
      loginUrl: 'https://www.finanzen.net/zero',
      loginLabel: 'Zu finanzen.net zero',
    },
  },
  {
    id: 'other',
    name: 'Anderer Broker',
    shortName: 'Anderer',
    formats: ['.csv', '.pdf', '.xlsx'],
    accept: '.csv,.pdf,.xlsx,.xls',
    initial: '?',
    accentDot: 'bg-neutral-500',
    supportsMultiFile: true,
    instructions: {
      title: 'Automatische Format-Erkennung',
      steps: [
        'Wir erkennen das Format deiner Datei automatisch',
        'Unterstützt: CSV (Scalable), PDF (Flatex/Smartbroker/TR), XLSX (Freedom24)',
        'Fehlt dein Broker? Schreib uns an support@finclue.de — wir bauen es ein!',
      ],
    },
  },
]

export function getImportBroker(id: ImportBrokerId | string | null | undefined): ImportBrokerInfo {
  return IMPORT_BROKERS.find(b => b.id === id) || IMPORT_BROKERS[IMPORT_BROKERS.length - 1]
}

// Mapping von server-erkanntem Format-String auf Broker-ID
export function formatToBrokerId(format: string | null | undefined): ImportBrokerId {
  if (!format) return 'other'
  if (format === 'scalable') return 'scalable'
  if (format === 'zero') return 'zero'
  if (format.startsWith('pdf_ing')) return 'ing'
  if (format.startsWith('pdf_trading212')) return 'trading212'
  if (format.startsWith('pdf_traderepublic')) return 'traderepublic'
  if (format === 'traderepublic_csv') return 'traderepublic'
  if (format.startsWith('pdf_smartbroker')) return 'smartbroker'
  if (format === 'flatex_depot') return 'flatex'
  if (format.startsWith('pdf_flatex')) return 'flatex'
  if (format.startsWith('pdf_freedom24')) return 'freedom24'
  if (format === 'freedom24_report') return 'freedom24'
  if (format.startsWith('freedom24')) return 'freedom24'
  return 'other'
}
