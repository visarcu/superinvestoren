// src/lib/news/rssSources.ts
// RSS Feed Quellen für die Finclue News API
// Alle URLs sind verifiziert und liefern gültiges RSS/XML.

export interface RSSSource {
  id: string
  name: string
  url: string
  language: 'de' | 'en'
  category: 'general' | 'stocks' | 'macro' | 'tech' | 'analysis'
  priority: number        // 1 = höchste Priorität, 5 = niedrigste
  region: 'DE' | 'US' | 'INT'
}

// ─── Deutsche Quellen ────────────────────────────────────────────────────────

const GERMAN_SOURCES: RSSSource[] = [
  {
    id: 'deraktionaer',
    name: 'Der Aktionär',
    url: 'https://www.deraktionaer.de/aktionaer-news.rss',
    language: 'de',
    category: 'stocks',
    priority: 1,
    region: 'DE',
  },
  {
    id: 'handelsblatt-finanzen',
    name: 'Handelsblatt',
    url: 'https://www.handelsblatt.com/contentexport/feed/finanzen',
    language: 'de',
    category: 'general',
    priority: 1,
    region: 'DE',
  },
  {
    id: 'faz-finanzen',
    name: 'FAZ Finanzen',
    url: 'https://www.faz.net/rss/aktuell/finanzen/',
    language: 'de',
    category: 'general',
    priority: 2,
    region: 'DE',
  },
  {
    id: 'manager-magazin',
    name: 'Manager Magazin',
    url: 'https://www.manager-magazin.de/finanzen/index.rss',
    language: 'de',
    category: 'analysis',
    priority: 2,
    region: 'DE',
  },
  {
    id: 'ntv-wirtschaft',
    name: 'n-tv Wirtschaft',
    url: 'https://www.n-tv.de/wirtschaft/rss',
    language: 'de',
    category: 'macro',
    priority: 2,
    region: 'DE',
  },
  {
    id: 'tagesschau-wirtschaft',
    name: 'tagesschau',
    url: 'https://www.tagesschau.de/wirtschaft/index~rss2.xml',
    language: 'de',
    category: 'macro',
    priority: 3,
    region: 'DE',
  },
  {
    id: 'finanznachrichten',
    name: 'FinanzNachrichten.de',
    url: 'https://www.finanznachrichten.de/rss-aktien-nachrichten',
    language: 'de',
    category: 'stocks',
    priority: 2,
    region: 'DE',
  },
  {
    id: 'wallstreet-online',
    name: 'wallstreet:online',
    url: 'https://www.wallstreet-online.de/rss/nachrichten-alle.xml',
    language: 'de',
    category: 'stocks',
    priority: 3,
    region: 'DE',
  },
]

// ─── Internationale Quellen ──────────────────────────────────────────────────

const INTERNATIONAL_SOURCES: RSSSource[] = [
  {
    id: 'yahoo-finance',
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/news/rssindex',
    language: 'en',
    category: 'general',
    priority: 1,
    region: 'US',
  },
  {
    id: 'cnbc-finance',
    name: 'CNBC',
    url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',
    language: 'en',
    category: 'general',
    priority: 1,
    region: 'US',
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    url: 'https://feeds.marketwatch.com/marketwatch/topstories/',
    language: 'en',
    category: 'general',
    priority: 1,
    region: 'US',
  },
  {
    id: 'seeking-alpha',
    name: 'Seeking Alpha',
    url: 'https://seekingalpha.com/market_currents.xml',
    language: 'en',
    category: 'analysis',
    priority: 2,
    region: 'US',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    url: 'https://feeds.bloomberg.com/markets/news.rss',
    language: 'en',
    category: 'general',
    priority: 1,
    region: 'INT',
  },
  {
    id: 'ft-markets',
    name: 'Financial Times',
    url: 'https://www.ft.com/markets?format=rss',
    language: 'en',
    category: 'general',
    priority: 2,
    region: 'INT',
  },
]

// ─── Export ──────────────────────────────────────────────────────────────────

export const ALL_SOURCES: RSSSource[] = [...GERMAN_SOURCES, ...INTERNATIONAL_SOURCES]
export const DE_SOURCES = GERMAN_SOURCES
export const INT_SOURCES = INTERNATIONAL_SOURCES

export function getSourceById(id: string): RSSSource | undefined {
  return ALL_SOURCES.find(s => s.id === id)
}

export function getSourcesByLanguage(lang: 'de' | 'en'): RSSSource[] {
  return ALL_SOURCES.filter(s => s.language === lang)
}
