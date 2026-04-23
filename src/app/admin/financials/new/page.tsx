// src/app/admin/financials/new/page.tsx
// Form zum Anlegen/Updaten eines Financial Statements
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

interface Company {
  ticker: string
  nameShort: string | null
  name: string
  currency: string
  fiscalYearEnd: string
  reportsUrl: string | null
}

// Gruppierte Felder für das Formular
const INCOME_FIELDS = [
  ['revenue', 'Umsatz'],
  ['costOfRevenue', 'Kosten der Umsatzerlöse'],
  ['grossProfit', 'Bruttoergebnis'],
  ['rAndD', 'F&E-Aufwand'],
  ['sgA', 'Vertrieb & Verwaltung'],
  ['operatingIncome', 'Operatives Ergebnis (EBIT)'],
  ['ebitda', 'EBITDA'],
  ['interestExpense', 'Zinsaufwand'],
  ['incomeTax', 'Ertragsteuern'],
  ['netIncome', 'Periodenergebnis'],
  ['eps', 'EPS (basic)'],
  ['epsDiluted', 'EPS (verwässert)'],
  ['sharesOutstanding', 'Aktien im Umlauf (Mio.)'],
] as const

const BALANCE_FIELDS = [
  ['cashAndEquivalents', 'Zahlungsmittel & Äquivalente'],
  ['shortTermInvest', 'Kurzfristige Investments'],
  ['inventory', 'Vorräte'],
  ['receivables', 'Forderungen'],
  ['totalCurrentAssets', 'Umlaufvermögen gesamt'],
  ['ppE', 'Sachanlagen (PP&E)'],
  ['goodwill', 'Goodwill'],
  ['totalAssets', 'Bilanzsumme'],
  ['shortTermDebt', 'Kurzfristige Finanzschulden'],
  ['longTermDebt', 'Langfristige Finanzschulden'],
  ['totalDebt', 'Gesamte Finanzschulden'],
  ['totalLiabilities', 'Verbindlichkeiten gesamt'],
  ['shareholdersEquity', 'Eigenkapital'],
] as const

const CASHFLOW_FIELDS = [
  ['operatingCashFlow', 'Operativer Cashflow'],
  ['capex', 'Investitionen (Capex)'],
  ['freeCashFlow', 'Free Cashflow'],
  ['dividendsPaid', 'Dividenden gezahlt'],
  ['shareRepurchases', 'Aktienrückkäufe'],
] as const

function FormContent() {
  const router = useRouter()
  const params = useSearchParams()
  const presetTicker = params.get('ticker') ?? ''

  const [companies, setCompanies] = useState<Company[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [ticker, setTicker] = useState(presetTicker)
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear())
  const [fiscalPeriod, setFiscalPeriod] = useState('Q1')
  const [periodEnd, setPeriodEnd] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})

  useEffect(() => {
    bootstrap()
  }, [])

  async function bootstrap() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setToken(session.access_token)

    const res = await fetch('/api/admin/dax-companies', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setCompanies(data.companies)
    }
  }

  const selectedCompany = companies.find(c => c.ticker === ticker)

  // Auto-fill Period End basierend auf fiscalPeriod + FY
  useEffect(() => {
    if (!selectedCompany || !fiscalPeriod) return
    const [m, d] = selectedCompany.fiscalYearEnd.split('-').map(Number)
    let month = m, day = d, year = fiscalYear
    if (fiscalPeriod === 'FY' || fiscalPeriod === 'Q4') {
      month = m; day = d; year = fiscalYear
    } else if (fiscalPeriod === 'Q1') {
      // 3 Monate nach FY-Start
      const fyStart = new Date(fiscalYear - (m < 12 ? 0 : 1), m === 12 ? 0 : m, 1)
      const end = new Date(fyStart.getFullYear(), fyStart.getMonth() + 2, 31)
      month = end.getMonth() + 1; day = end.getDate(); year = end.getFullYear()
    }
    // Simple fallback: for FY use the FY end directly
    if (fiscalPeriod === 'FY' || fiscalPeriod === 'Q4') {
      setPeriodEnd(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
    }
  }, [selectedCompany, fiscalPeriod, fiscalYear])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    setSaving(true)
    try {
      // Number-Felder parsen
      const numericFields: Record<string, number | null> = {}
      for (const [key] of [...INCOME_FIELDS, ...BALANCE_FIELDS, ...CASHFLOW_FIELDS]) {
        const v = fields[key]
        if (v !== undefined && v !== '') {
          const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
          if (!isNaN(n)) numericFields[key] = n
        }
      }

      const body = {
        ticker,
        fiscalYear,
        fiscalPeriod,
        periodEnd,
        reportDate: reportDate || null,
        sourceUrl: sourceUrl || null,
        notes: notes || null,
        ...numericFields,
      }

      const res = await fetch('/api/admin/financials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      alert('✅ Gespeichert!')
      router.push('/admin/financials')
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  function updateField(key: string, v: string) {
    setFields(f => ({ ...f, [key]: v }))
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
        <div>
          <p>Admin Login erforderlich.</p>
          <Link href="/auth/signin?redirect=/admin/financials/new" className="underline">Einloggen</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <Link href="/admin/financials" className="text-sm text-white/50 hover:text-white/80">← Zurück</Link>
          <h1 className="text-3xl font-semibold mt-2">Neuer Finanzbericht</h1>
          {selectedCompany && (
            <div className="mt-2 flex items-center gap-3 text-sm text-white/60">
              <span>{selectedCompany.name}</span>
              {selectedCompany.reportsUrl && (
                <a href={selectedCompany.reportsUrl} target="_blank" rel="noopener" className="underline">IR ↗</a>
              )}
              <span className="text-white/40">Währung: {selectedCompany.currency}</span>
            </div>
          )}
        </header>

        <form onSubmit={submit} className="space-y-8">
          {/* Metadaten */}
          <Section title="Bericht">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Ticker" required>
                <select
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">— wählen —</option>
                  {companies.map(c => (
                    <option key={c.ticker} value={c.ticker}>{c.ticker} ({c.nameShort})</option>
                  ))}
                </select>
              </Field>
              <Field label="Geschäftsjahr" required>
                <input
                  type="number"
                  value={fiscalYear}
                  onChange={e => setFiscalYear(parseInt(e.target.value))}
                  className="input"
                  min={2015}
                  max={2030}
                  required
                />
              </Field>
              <Field label="Periode" required>
                <select value={fiscalPeriod} onChange={e => setFiscalPeriod(e.target.value)} className="input" required>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="H1">H1 (Halbjahr)</option>
                  <option value="Q3">Q3</option>
                  <option value="9M">9M</option>
                  <option value="Q4">Q4</option>
                  <option value="FY">FY (Geschäftsjahr)</option>
                </select>
              </Field>
              <Field label="Period End (YYYY-MM-DD)" required>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="input" required />
              </Field>
              <Field label="Veröffentlicht am">
                <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="input" />
              </Field>
              <Field label="Quelle (URL zum PDF)" className="col-span-3">
                <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="input" placeholder="https://..." />
              </Field>
            </div>
          </Section>

          <Section title="Gewinn- und Verlustrechnung (in Mio.)">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INCOME_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input type="text" inputMode="decimal" value={fields[key] ?? ''} onChange={e => updateField(key, e.target.value)} className="input" />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Bilanz (in Mio.)">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {BALANCE_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input type="text" inputMode="decimal" value={fields[key] ?? ''} onChange={e => updateField(key, e.target.value)} className="input" />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Cashflow (in Mio.)">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CASHFLOW_FIELDS.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input type="text" inputMode="decimal" value={fields[key] ?? ''} onChange={e => updateField(key, e.target.value)} className="input" />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Anmerkungen">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input w-full" rows={3} placeholder="Optional: Hinweise, Besonderheiten, Sondereffekte..." />
          </Section>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-white text-black rounded-md font-medium hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
            <Link href="/admin/financials" className="px-6 py-3 border border-white/20 rounded-md">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.375rem;
          color: white;
          font-size: 0.875rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/10 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children, required, className = '' }: {
  label: string
  children: React.ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs text-white/60 block mb-1">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

export default function NewFinancialPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-8">Laden...</div>}>
      <FormContent />
    </Suspense>
  )
}
