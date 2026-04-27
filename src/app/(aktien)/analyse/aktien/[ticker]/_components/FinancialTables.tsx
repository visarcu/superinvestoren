'use client'

import React, { useState } from 'react'
import type { Period, BalancePeriod, CashFlowPeriod } from '../_lib/types'
import { fmt, fmtPct } from '../_lib/format'

type Statement = 'income' | 'balance' | 'cashflow'

interface FinancialTablesProps {
  income: Period[]
  balance: BalancePeriod[]
  cashflow: CashFlowPeriod[]
}

interface RowDef {
  label: string
  key: string
  /** "Marge"-Style: kursiv und dezent, in % */
  isMargin?: boolean
  /** Wachstumsrate: in % mit grün/rot */
  isGrowth?: boolean
  /** Dollar-Format (z.B. EPS) */
  isDollar?: boolean
  /** Berechnete Zeile aus row + prev */
  calc?: (row: any, prev: any) => number | null
}

interface SectionDef {
  title: string
  rows: RowDef[]
}

// ─────────────────────────────────────────────────────────────────
// SECTION DEFINITIONS
// ─────────────────────────────────────────────────────────────────

const incomeSections: SectionDef[] = [
  {
    title: 'Umsatz & Wachstum',
    rows: [
      { label: 'Gesamtumsatz', key: 'revenue' },
      {
        label: 'Umsatzwachstum',
        key: '_revGrowth',
        isGrowth: true,
        calc: (r, p) =>
          p?.revenue && r?.revenue ? ((r.revenue - p.revenue) / Math.abs(p.revenue)) * 100 : null,
      },
      { label: 'Herstellungskosten', key: 'costOfRevenue' },
      { label: 'Bruttogewinn', key: 'grossProfit' },
      {
        label: 'Bruttomarge',
        key: '_grossMargin',
        isMargin: true,
        calc: r => (r?.revenue && r?.grossProfit ? (r.grossProfit / r.revenue) * 100 : null),
      },
    ],
  },
  {
    title: 'Betriebskennzahlen',
    rows: [
      { label: 'Vertriebs- & Verwaltung', key: 'sellingGeneralAdmin' },
      { label: 'Forschung & Entwicklung', key: 'researchAndDevelopment' },
      { label: 'Abschreibungen', key: 'depreciation' },
      { label: 'Betriebsgewinn', key: 'operatingIncome' },
      {
        label: 'Betriebsmarge',
        key: '_opMargin',
        isMargin: true,
        calc: r =>
          r?.revenue && r?.operatingIncome ? (r.operatingIncome / r.revenue) * 100 : null,
      },
    ],
  },
  {
    title: 'Ergebnis',
    rows: [
      { label: 'Zinsaufwand', key: 'interestExpense' },
      { label: 'Steueraufwand', key: 'incomeTax' },
      { label: 'Nettogewinn', key: 'netIncome' },
      {
        label: 'Nettomarge',
        key: '_netMargin',
        isMargin: true,
        calc: r => (r?.revenue && r?.netIncome ? (r.netIncome / r.revenue) * 100 : null),
      },
      { label: 'Gewinn/Aktie (verdünnt)', key: 'eps', isDollar: true },
      { label: 'Gewinn/Aktie (Basis)', key: 'epsBasic', isDollar: true },
    ],
  },
]

const balanceSections: SectionDef[] = [
  {
    title: 'Aktiva',
    rows: [
      { label: 'Bilanzsumme', key: 'totalAssets' },
      { label: 'Barmittel & Äquivalente', key: 'cash' },
      { label: 'Forderungen', key: 'accountsReceivable' },
      { label: 'Vorräte', key: 'inventory' },
      { label: 'Sachanlagen', key: 'propertyPlantEquipment' },
      { label: 'Goodwill', key: 'goodwill' },
    ],
  },
  {
    title: 'Passiva',
    rows: [
      { label: 'Verbindlichkeiten gesamt', key: 'totalLiabilities' },
      { label: 'Verbindlichkeiten LuL', key: 'accountsPayable' },
      { label: 'Kurzfristige Schulden', key: 'shortTermDebt' },
      { label: 'Langfristige Schulden', key: 'longTermDebt' },
      { label: 'Schulden gesamt', key: 'totalDebt' },
      {
        label: 'Verschuldungsgrad',
        key: '_debtRatio',
        isMargin: true,
        calc: r =>
          r?.totalDebt && r?.shareholdersEquity
            ? (r.totalDebt / r.shareholdersEquity) * 100
            : null,
      },
    ],
  },
  {
    title: 'Eigenkapital',
    rows: [
      { label: 'Eigenkapital', key: 'shareholdersEquity' },
      { label: 'Ausstehende Aktien', key: 'sharesOutstanding', isDollar: false },
    ],
  },
]

const cashflowSections: SectionDef[] = [
  {
    title: 'Operativer Bereich',
    rows: [
      { label: 'Operativer Cashflow', key: 'operatingCashFlow' },
      { label: 'Abschreibungen', key: 'depreciation' },
    ],
  },
  {
    title: 'Investitionen',
    rows: [{ label: 'Capex (Investitionen)', key: 'capitalExpenditure' }],
  },
  {
    title: 'Free Cashflow',
    rows: [
      { label: 'Free Cashflow', key: 'freeCashFlow' },
      {
        label: 'FCF-Marge',
        key: '_fcfMargin',
        isMargin: true,
        // FCF-Marge braucht revenue → wird im Render aus income-Periode geholt
        calc: () => null,
      },
    ],
  },
  {
    title: 'Finanzierung',
    rows: [
      { label: 'Aktienrückkäufe', key: 'shareRepurchase' },
      { label: 'Dividendenzahlungen', key: 'dividendsPaid' },
      { label: 'Dividende/Aktie', key: 'dividendPerShare', isDollar: true },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────
// CELL FORMATTING
// ─────────────────────────────────────────────────────────────────

function formatCell(value: number | null | undefined, row: RowDef): string {
  if (value === null || value === undefined) return '–'
  if (row.isMargin) {
    return `${value.toFixed(1).replace('.', ',')}%`
  }
  if (row.isGrowth) {
    return fmtPct(value)
  }
  if (row.isDollar) {
    if (Math.abs(value) >= 1e6) return fmt(value)
    return `${value.toFixed(2).replace('.', ',')} $`
  }
  // Default: Mrd./Bio./Mio.
  if (typeof value === 'number' && Math.abs(value) < 1e6 && row.key === 'sharesOutstanding') {
    return value.toLocaleString('de-DE')
  }
  return fmt(value)
}

function cellColorClass(value: number | null | undefined, row: RowDef): string {
  if (value === null || value === undefined) return 'text-white/25'
  if (row.isGrowth) {
    if (value > 0) return 'text-emerald-400/85'
    if (value < 0) return 'text-red-400/85'
  }
  if (row.isMargin) return 'text-white/45 italic'
  return 'text-white/80'
}

// ─────────────────────────────────────────────────────────────────
// TABLE
// ─────────────────────────────────────────────────────────────────

interface TableProps<T> {
  rows: T[]
  sections: SectionDef[]
  /** Für FCF-Marge: optional income für revenue-Lookup */
  incomeRows?: Period[]
}

function FinancialTable<T extends { period: string }>({ rows, sections, incomeRows }: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-white/30 text-[13px]">
        Keine Daten verfügbar.
      </div>
    )
  }

  // Neueste Periode links — daher kopieren und reverse
  const orderedRows = [...rows].reverse()

  return (
    <div className="relative overflow-x-auto rounded-xl border border-white/[0.04]">
      <table className="w-full border-collapse text-[12.5px] tabular-nums">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.01]">
            <th className="sticky left-0 bg-[#0a0a0f] z-10 text-left text-[10.5px] uppercase tracking-widest text-white/30 font-medium px-5 py-3 min-w-[220px]">
              {/* leerer Heading-Slot */}
            </th>
            {orderedRows.map(r => (
              <th
                key={r.period}
                className="text-right text-[11px] uppercase tracking-wider text-white/40 font-medium px-4 py-3 min-w-[88px]"
              >
                {r.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section, si) => (
            <React.Fragment key={section.title}>
              {/* Section header */}
              <tr>
                <td
                  colSpan={orderedRows.length + 1}
                  className={`sticky left-0 bg-[#0a0a0f] text-[10px] uppercase tracking-widest text-white/35 font-semibold pl-5 py-2.5 ${
                    si > 0 ? 'pt-5' : 'pt-4'
                  } border-l-2 border-emerald-400/40`}
                >
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row, ri) => (
                <tr
                  key={`${section.title}-${row.key}`}
                  className={`border-t border-white/[0.03] hover:bg-white/[0.015] transition-colors ${
                    row.isMargin || row.isGrowth ? 'text-white/45' : ''
                  }`}
                >
                  <td
                    className={`sticky left-0 bg-[#0a0a0f] z-10 px-5 py-2 ${
                      row.isMargin || row.isGrowth
                        ? 'text-white/45 italic text-[11.5px]'
                        : 'text-white/65'
                    }`}
                  >
                    {row.label}
                  </td>
                  {orderedRows.map((r, idx) => {
                    let value: number | null | undefined
                    if (row.calc) {
                      // Vorgänger-Periode aus dem ORIGINAL (ungereverstem) Array für korrekte YoY-Berechnung
                      const origIndex = rows.length - 1 - idx
                      const prev = origIndex > 0 ? rows[origIndex - 1] : null
                      value = row.calc(r, prev)
                      // FCF-Marge: braucht revenue aus income der gleichen Periode
                      if (row.key === '_fcfMargin' && incomeRows && (r as any).freeCashFlow) {
                        const inc = incomeRows.find(i => i.period === r.period)
                        if (inc?.revenue && (r as any).freeCashFlow) {
                          value = ((r as any).freeCashFlow / inc.revenue) * 100
                        }
                      }
                    } else {
                      value = (r as any)[row.key]
                    }
                    return (
                      <td
                        key={r.period}
                        className={`text-right px-4 py-2 ${cellColorClass(value, row)}`}
                      >
                        {row.key === 'sharesOutstanding' && typeof value === 'number'
                          ? value.toLocaleString('de-DE')
                          : formatCell(value, row)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function FinancialTables({ income, balance, cashflow }: FinancialTablesProps) {
  const [statement, setStatement] = useState<Statement>('income')

  const tabs: { id: Statement; label: string; icon: string }[] = [
    { id: 'income', label: 'Gewinn- & Verlustrechnung', icon: '◉' },
    { id: 'balance', label: 'Bilanz', icon: '▤' },
    { id: 'cashflow', label: 'Cashflow', icon: '↻' },
  ]

  return (
    <div className="space-y-4">
      {/* Statement Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.05]">
        {tabs.map(t => {
          const active = statement === t.id
          return (
            <button
              key={t.id}
              onClick={() => setStatement(t.id)}
              className={`px-4 py-2.5 text-[12.5px] font-medium transition-colors relative ${
                active ? 'text-white/85' : 'text-white/35 hover:text-white/60'
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-[-1px] left-3 right-3 h-px bg-white/85" />
              )}
            </button>
          )
        })}
      </div>

      {/* Active Statement Table */}
      {statement === 'income' && <FinancialTable rows={income} sections={incomeSections} />}
      {statement === 'balance' && <FinancialTable rows={balance} sections={balanceSections} />}
      {statement === 'cashflow' && (
        <FinancialTable rows={cashflow} sections={cashflowSections} incomeRows={income} />
      )}
    </div>
  )
}
