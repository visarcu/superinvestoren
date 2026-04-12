// /api-docs – Finclue Data API Documentation
'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  title: string
  description: string
  params?: { name: string; type: string; required: boolean; description: string }[]
  queryParams?: { name: string; type: string; default: string; description: string }[]
  response: string
  exampleUrl: string
  status: 'live' | 'beta' | 'coming-soon'
}

interface EndpointGroup {
  title: string
  icon: string
  description: string
  endpoints: Endpoint[]
}

// ─── API Endpoints Config ────────────────────────────────────────────────────

const API_BASE = 'https://api.finclue.de'

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    title: 'Financials',
    icon: '📊',
    description: 'Standardisierte Finanzdaten direkt von SEC XBRL. Getrennte Endpoints für Income Statement, Balance Sheet und Cash Flow.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/financials/income-statement/{ticker}',
        title: 'Income Statement',
        description: 'Revenue, Net Income, Gross Profit, Operating Income, EPS, R&D, SG&A und mehr. Annual und Quarterly verfügbar. Bis zu 30 Jahre Historie.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol (z.B. AAPL, MSFT, NVDA)' },
        ],
        queryParams: [
          { name: 'years', type: 'integer', default: '10', description: 'Anzahl Jahre Historie (1-30)' },
          { name: 'period', type: 'string', default: 'annual', description: '"annual" oder "quarterly"' },
        ],
        response: `{
  "ticker": "AAPL",
  "entityName": "Apple Inc.",
  "statement": "income-statement",
  "data": [
    {
      "period": "2025",
      "filed": "2025-10-31",
      "revenue": 416200000000,
      "costOfRevenue": 221000000000,
      "grossProfit": 195200000000,
      "operatingIncome": 133100000000,
      "netIncome": 112000000000,
      "eps": 7.46,
      "epsBasic": 7.49,
      "researchAndDevelopment": 34500000000,
      "sellingGeneralAdmin": 27600000000,
      "incomeTax": 20700000000,
      "depreciation": 11700000000
    }
  ],
  "source": "sec-xbrl"
}`,
        exampleUrl: '/api/v1/financials/income-statement/AAPL?years=5',
        status: 'live',
      },
      {
        method: 'GET',
        path: '/v1/financials/balance-sheet/{ticker}',
        title: 'Balance Sheet',
        description: 'Total Assets, Liabilities, Equity, Cash, Debt, Inventory, Receivables, Goodwill, PP&E, Shares Outstanding.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol' },
        ],
        queryParams: [
          { name: 'years', type: 'integer', default: '10', description: 'Anzahl Jahre Historie (1-30)' },
          { name: 'period', type: 'string', default: 'annual', description: '"annual" oder "quarterly"' },
        ],
        response: `{
  "ticker": "AAPL",
  "statement": "balance-sheet",
  "data": [
    {
      "period": "2025",
      "totalAssets": 359200000000,
      "totalLiabilities": 285500000000,
      "shareholdersEquity": 73700000000,
      "cash": 35900000000,
      "longTermDebt": 78300000000,
      "totalDebt": 91300000000,
      "inventory": 5700000000,
      "accountsReceivable": 39800000000,
      "goodwill": null,
      "propertyPlantEquipment": 49800000000,
      "sharesOutstanding": 15000000000
    }
  ],
  "source": "sec-xbrl"
}`,
        exampleUrl: '/api/v1/financials/balance-sheet/AAPL?years=5',
        status: 'live',
      },
      {
        method: 'GET',
        path: '/v1/financials/cash-flow/{ticker}',
        title: 'Cash Flow Statement',
        description: 'Operating Cash Flow, CapEx, Free Cash Flow, Dividenden, Aktienrückkäufe, Abschreibungen.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol' },
        ],
        queryParams: [
          { name: 'years', type: 'integer', default: '10', description: 'Anzahl Jahre Historie (1-30)' },
          { name: 'period', type: 'string', default: 'annual', description: '"annual" oder "quarterly"' },
        ],
        response: `{
  "ticker": "AAPL",
  "statement": "cash-flow",
  "data": [
    {
      "period": "2025",
      "operatingCashFlow": 111500000000,
      "capitalExpenditure": 12700000000,
      "freeCashFlow": 98800000000,
      "dividendsPaid": 15400000000,
      "dividendPerShare": 1.02,
      "shareRepurchase": 90700000000,
      "depreciation": 11700000000
    }
  ],
  "source": "sec-xbrl"
}`,
        exampleUrl: '/api/v1/financials/cash-flow/AAPL?years=5',
        status: 'live',
      },
    ],
  },
  {
    title: 'Dividends',
    icon: '💰',
    description: 'Dividendenhistorie, CAGR-Analyse und Payout Ratios direkt aus SEC Filings.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/dividends/{ticker}',
        title: 'Get Dividend Analysis',
        description: 'Quarterly und Annual Dividenden, CAGR (3/5/10/15 Jahre), Payout Ratios, und Wachstumsstreak. Berechnet Q4 automatisch wenn nur Q1-Q3 in den Filings vorhanden.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol (z.B. MSFT, KO, JNJ)' },
        ],
        response: `{
  "ticker": "MSFT",
  "entityName": "MICROSOFT CORPORATION",
  "currentAnnualDividend": 3.32,
  "consecutiveYearsGrowth": 10,
  "annualDividends": [
    {
      "year": 2025,
      "totalDividend": 3.32,
      "growthPercent": 10.0,
      "quarters": [...]
    }
  ],
  "quarterlyDividends": [
    {
      "endDate": "2025-06-30",
      "amount": 0.83,
      "fiscalQuarter": "Q2",
      "calendarYear": 2025
    }
  ],
  "cagr": [
    { "period": "5 Jahre", "years": 5, "cagr": 10.2 },
    { "period": "10 Jahre", "years": 10, "cagr": 10.1 }
  ],
  "payoutHistory": [
    { "year": 2025, "dividendPerShare": 3.32, "eps": 13.64, "payoutRatio": 24.3 }
  ],
  "source": "sec-xbrl"
}`,
        exampleUrl: '/api/v1/dividends/MSFT',
        status: 'live',
      },
    ],
  },
  {
    title: 'Operating KPIs',
    icon: '🔑',
    description: 'Unternehmensspezifische KPIs aus SEC 8-K Earnings Press Releases. Subscriber-Zahlen, Deliveries, Segment-Revenue.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/kpis/{ticker}',
        title: 'Get Operating KPIs',
        description: 'Extrahiert KPIs aus 8-K Filings via AI: Netflix Subscribers, Tesla Deliveries, AWS Revenue, Meta DAP, etc. Quarterly Zeitreihen mit SEC Filing-Links als Quelle.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol (NFLX, TSLA, META, AMZN, etc.)' },
        ],
        response: `{
  "ticker": "NFLX",
  "metrics": {
    "paid_subscribers": {
      "label": "Paid Subscribers",
      "unit": "millions",
      "data": [
        {
          "period": "Q4 2025",
          "value": 325,
          "filingUrl": "https://sec.gov/..."
        }
      ]
    },
    "streaming_revenue": { ... },
    "arm": { ... }
  }
}`,
        exampleUrl: '/api/v1/kpis/NFLX',
        status: 'live',
      },
    ],
  },
  {
    title: 'Company',
    icon: '🏢',
    description: 'Firmenprofil und Unternehmensliste. Name, Ticker, Börse, Sektor, Adresse, Fiscal Year End. ~10.000 US-Unternehmen.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/company/{ticker}',
        title: 'Get Company Profile',
        description: 'Detailliertes Firmenprofil: Name, Ticker, Börse, SIC-Code, Sektor, Industrie, Firmengröße, Geschäftsjahresende, Adresse, Telefon, ehemalige Namen.',
        params: [
          { name: 'ticker', type: 'string', required: true, description: 'Ticker-Symbol (z.B. AAPL, MSFT, TSLA)' },
        ],
        response: `{
  "name": "Apple Inc.",
  "ticker": "AAPL",
  "cik": "320193",
  "exchangeName": "Nasdaq",
  "exchangeSymbol": "Nasdaq",
  "sic": "3571",
  "sicDescription": "Electronic Computers",
  "sector": "Technology",
  "industry": "Computer Hardware",
  "countryCode": "US",
  "state": "CA",
  "category": "Large accelerated filer",
  "fiscalYearEnd": "0926",
  "fiscalYearEndFormatted": "September 26",
  "phone": "(408) 996-1010",
  "address": {
    "street": "ONE APPLE PARK WAY",
    "city": "CUPERTINO",
    "state": "CA",
    "zip": "95014"
  },
  "formerNames": [
    { "name": "APPLE COMPUTER INC", "from": "1994-01-26", "to": "2007-01-04" }
  ],
  "source": "sec-edgar"
}`,
        exampleUrl: '/api/v1/company/AAPL',
        status: 'live',
      },
      {
        method: 'GET',
        path: '/v1/companies',
        title: 'List Companies',
        description: 'Paginierte Liste aller verfügbaren Unternehmen. Suchbar nach Name oder Ticker. Filterbar nach Börse.',
        params: [],
        queryParams: [
          { name: 'page', type: 'integer', default: '1', description: 'Seitennummer' },
          { name: 'pageSize', type: 'integer', default: '100', description: 'Einträge pro Seite (max 1000)' },
          { name: 'search', type: 'string', default: '', description: 'Suche nach Ticker oder Name' },
          { name: 'exchange', type: 'string', default: '', description: 'Filter nach Börse (Nasdaq, NYSE)' },
        ],
        response: `{
  "pagination": {
    "page": 1,
    "pageSize": 100,
    "totalCount": 10408,
    "totalPages": 105,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "data": [
    {
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "cik": "320193",
      "exchange": "Nasdaq"
    }
  ],
  "source": "sec-edgar"
}`,
        exampleUrl: '/api/v1/companies?search=APPLE&pageSize=5',
        status: 'live',
      },
    ],
  },
  {
    title: 'Earnings Calendar',
    icon: '📅',
    description: 'Earnings-Termine direkt aus SEC 8-K Filing-Dates.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/calendar/earnings',
        title: 'Get Earnings Calendar',
        description: 'Anstehende und vergangene Earnings-Termine, abgeleitet aus SEC 8-K Filing-Dates.',
        params: [],
        queryParams: [
          { name: 'from', type: 'date', default: 'today', description: 'Startdatum (ISO 8601)' },
          { name: 'to', type: 'date', default: '+30d', description: 'Enddatum (ISO 8601)' },
        ],
        response: `{ "events": [...] }`,
        exampleUrl: '#',
        status: 'coming-soon',
      },
    ],
  },
]

const COVERAGE = {
  stocks: '~10.000',
  source: 'SEC EDGAR XBRL',
  history: 'Bis zu 20 Jahre',
  update: 'Innerhalb von Stunden nach SEC Filing',
  formats: 'JSON REST API',
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles = {
    'live': 'bg-green-500/10 text-green-400 border-green-500/20',
    'beta': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'coming-soon': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }
  const labels = { 'live': 'Live', 'beta': 'Beta', 'coming-soon': 'Bald verfügbar' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status as keyof typeof styles] || ''}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  )
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-green-500/15 text-green-400 font-mono">
      {method}
    </span>
  )
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      {label && <p className="text-[10px] text-theme-muted mb-1 uppercase tracking-wider">{label}</p>}
      <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 text-sm font-mono text-[#e6edf3] overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="absolute top-2 right-2 px-2 py-1 text-[10px] rounded bg-[#30363d] text-[#8b949e] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? 'Kopiert!' : 'Kopieren'}
      </button>
    </div>
  )
}

function EndpointDoc({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-theme-light rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-theme-hover transition-colors text-left"
      >
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-theme-primary flex-1">{endpoint.path}</code>
        <StatusBadge status={endpoint.status} />
        <svg className={`w-4 h-4 text-theme-muted transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-theme-light p-5 space-y-5 bg-theme-bg/50">
          <div>
            <h4 className="text-sm font-semibold text-theme-primary mb-1">{endpoint.title}</h4>
            <p className="text-sm text-theme-secondary">{endpoint.description}</p>
          </div>

          {/* Path Parameters */}
          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">Path Parameters</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-2 text-theme-muted font-medium">Name</th>
                    <th className="text-left py-2 text-theme-muted font-medium">Type</th>
                    <th className="text-left py-2 text-theme-muted font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params.map(p => (
                    <tr key={p.name} className="border-b border-theme-light/30">
                      <td className="py-2"><code className="text-xs bg-theme-tertiary px-1.5 py-0.5 rounded text-blue-400">{p.name}</code></td>
                      <td className="py-2 text-theme-secondary">{p.type}</td>
                      <td className="py-2 text-theme-secondary">{p.description} {p.required && <span className="text-red-400 text-xs">required</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Query Parameters */}
          {endpoint.queryParams && endpoint.queryParams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">Query Parameters</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-2 text-theme-muted font-medium">Name</th>
                    <th className="text-left py-2 text-theme-muted font-medium">Type</th>
                    <th className="text-left py-2 text-theme-muted font-medium">Default</th>
                    <th className="text-left py-2 text-theme-muted font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.queryParams.map(p => (
                    <tr key={p.name} className="border-b border-theme-light/30">
                      <td className="py-2"><code className="text-xs bg-theme-tertiary px-1.5 py-0.5 rounded text-blue-400">{p.name}</code></td>
                      <td className="py-2 text-theme-secondary">{p.type}</td>
                      <td className="py-2"><code className="text-xs text-theme-muted">{p.default}</code></td>
                      <td className="py-2 text-theme-secondary">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Example Request */}
          {endpoint.exampleUrl !== '#' && (
            <CodeBlock
              label="Example Request"
              code={`curl -X GET "${endpoint.exampleUrl}"`}
            />
          )}

          {/* Response */}
          <CodeBlock label="Response" code={endpoint.response} />
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <div className="border-b border-[#1a1a2e] bg-gradient-to-b from-[#0a0a0a] to-[#0d1117]">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-400 font-bold text-sm">F</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Finclue Data API</h1>
            <StatusBadge status="beta" />
          </div>
          <p className="text-lg text-[#8b949e] max-w-2xl mb-8">
            Finanzdaten direkt von der SEC. Revenue, EPS, Dividenden, Operating KPIs
            und mehr – für ~10.000 US-Aktien. Kostenlos, unabhaengig, direkt von der Quelle.
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'US-Aktien', value: COVERAGE.stocks },
              { label: 'Datenquelle', value: 'SEC EDGAR' },
              { label: 'Historie', value: COVERAGE.history },
              { label: 'Update', value: 'Same-Day' },
              { label: 'Format', value: 'JSON REST' },
            ].map(s => (
              <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
                <p className="text-xs text-[#8b949e]">{s.label}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 flex gap-8">
        {/* Sidebar */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-8 space-y-1">
            <p className="text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider mb-3">Endpoints</p>
            {ENDPOINT_GROUPS.map(group => (
              <a
                key={group.title}
                href={`#${group.title.toLowerCase()}`}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[#161b22] transition-colors text-[#c9d1d9] hover:text-white"
              >
                <span>{group.icon}</span>
                <span>{group.title}</span>
                {group.endpoints.some(e => e.status === 'coming-soon') && (
                  <span className="text-[9px] text-yellow-500 ml-auto">soon</span>
                )}
              </a>
            ))}
            <div className="border-t border-[#21262d] my-3" />
            <a href="#coverage" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[#161b22] transition-colors text-[#c9d1d9]">
              <span>🌍</span> Coverage
            </a>
            <a href="#authentication" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-[#161b22] transition-colors text-[#c9d1d9]">
              <span>🔑</span> Authentication
            </a>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 space-y-12">
          {/* Quick Start */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Schnellstart</h2>
            <p className="text-sm text-[#8b949e] mb-4">Ein einziger Request – alle Finanzdaten.</p>
            <CodeBlock code={`# Income Statement
curl "https://api.finclue.de/v1/financials/income-statement/AAPL?years=5"

# Balance Sheet
curl "https://api.finclue.de/v1/financials/balance-sheet/AAPL?years=5"

# Cash Flow Statement
curl "https://api.finclue.de/v1/financials/cash-flow/AAPL?years=5"

# Dividends
curl "https://api.finclue.de/v1/dividends/MSFT"

# Operating KPIs
curl "https://api.finclue.de/v1/kpis/NFLX"`} />
          </section>

          {/* Endpoint Groups */}
          {ENDPOINT_GROUPS.map(group => (
            <section key={group.title} id={group.title.toLowerCase()}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{group.icon}</span>
                <h2 className="text-xl font-bold text-white">{group.title}</h2>
              </div>
              <p className="text-sm text-[#8b949e] mb-4">{group.description}</p>
              <div className="space-y-3">
                {group.endpoints.map(endpoint => (
                  <EndpointDoc key={endpoint.path} endpoint={endpoint} />
                ))}
              </div>
            </section>
          ))}

          {/* Coverage */}
          <section id="coverage">
            <h2 className="text-xl font-bold text-white mb-4">🌍 Coverage</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#8b949e] mb-2 font-medium">Unterstützt</p>
                  <ul className="space-y-1.5 text-[#c9d1d9]">
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> ~10.000 US-Aktien (NYSE, NASDAQ, AMEX)</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Foreign Private Issuers mit US-GAAP (ASML, ARM, SHOP)</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> 30+ Finanzkennzahlen pro Unternehmen</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Bis zu 20 Jahre Historie</li>
                    <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Quarterly und Annual</li>
                  </ul>
                </div>
                <div>
                  <p className="text-[#8b949e] mb-2 font-medium">In Arbeit</p>
                  <ul className="space-y-1.5 text-[#c9d1d9]">
                    <li className="flex items-center gap-2"><span className="text-yellow-400">◐</span> IFRS-Unternehmen (SAP, Unilever, NVO)</li>
                    <li className="flex items-center gap-2"><span className="text-yellow-400">◐</span> Company Profiles (Name, Börse, SIC, Adresse)</li>
                    <li className="flex items-center gap-2"><span className="text-yellow-400">◐</span> Earnings Calendar aus SEC Filing-Dates</li>
                    <li className="flex items-center gap-2"><span className="text-yellow-400">◐</span> Dividend Calendar mit Ex-Dates</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Data Source */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">📡 Datenquelle</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 text-sm text-[#c9d1d9] space-y-3">
              <p>
                Alle Finanzdaten stammen direkt aus <strong className="text-white">SEC EDGAR XBRL Filings</strong> –
                der gleichen Quelle die Bloomberg, Refinitiv und FMP nutzen. Keine Zwischenhändler, keine Verzögerung.
              </p>
              <p>
                Operating KPIs werden aus <strong className="text-white">8-K Earnings Press Releases</strong> extrahiert
                und mit SEC Filing-URLs als Quellennachweis verlinkt.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#8b949e] mt-4 pt-3 border-t border-[#21262d]">
                <span>Primärquelle:</span>
                <a href="https://data.sec.gov" target="_blank" rel="noopener" className="text-blue-400 hover:underline">data.sec.gov</a>
                <span>·</span>
                <span>Format: XBRL (US-GAAP)</span>
                <span>·</span>
                <span>Update: Same-Day Filing</span>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <h2 className="text-xl font-bold text-white mb-4">🔑 Authentication</h2>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5 text-sm text-[#c9d1d9] space-y-3">
              <p>
                Während der <strong className="text-blue-400">Beta-Phase</strong> ist die API ohne API-Key zugänglich.
                Im Launch wird die Authentifizierung via API-Key im Query-Parameter oder Header erfolgen:
              </p>
              <CodeBlock code={`# Query Parameter
curl "https://api.finclue.de/v1/financials/AAPL?apiKey=YOUR_API_KEY"

# Oder Header
curl -H "Authorization: Bearer YOUR_API_KEY" "https://api.finclue.de/v1/financials/AAPL"`} />
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1a1a2e] mt-16">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-[#8b949e]">
          <p>Finclue Data API · Powered by SEC EDGAR XBRL</p>
          <div className="flex gap-4">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/" className="hover:text-white transition-colors">finclue.de</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
