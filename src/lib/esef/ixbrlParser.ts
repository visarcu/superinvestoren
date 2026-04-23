// src/lib/esef/ixbrlParser.ts
// iXBRL Parser für ESEF Annual Reports.
// Scope (MVP): Primary Statements only (GuV, Bilanz, Cashflow).
// Nicht unterstützt: Segmente (Dimensions), Extension-KPIs, Calculation-Linkbase-Validierung.
//
// Input:  ZIP Buffer eines ESEF-Report-Packages (wie von filings.xbrl.org oder IR-Seite)
// Output: Parsed Facts + Mapping auf unser Schema

// htmlparser2 wird dynamisch geladen — cheerio würde undici transitiv reinziehen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _parseDocument: any
let _AdmZip: any

async function getParser() {
  if (!_parseDocument) {
    const mod = await import('htmlparser2')
    _parseDocument = (mod as any).parseDocument
  }
  return _parseDocument
}
async function getAdmZip() {
  if (!_AdmZip) {
    const mod = await import('adm-zip')
    _AdmZip = (mod as any).default ?? mod
  }
  return _AdmZip
}

import { buildTagLookup, IfrsMapping, FinancialFields } from './ifrsFieldMap'

// ─── DOM-Helper (auf domhandler Node-Typen) ─────────────────────────────────

interface DomNode {
  type: string
  name?: string      // Tag-Name (z.B. "ix:nonFraction")
  attribs?: Record<string, string>
  children?: DomNode[]
  data?: string      // für Text-Nodes
}

function tagMatches(node: DomNode, expected: string): boolean {
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return false
  const tn = (node.name ?? '').toLowerCase()
  const exp = expected.toLowerCase()
  return tn === exp || tn.endsWith(':' + exp)
}

function walkAll(root: DomNode, visit: (node: DomNode) => void) {
  visit(root)
  if (root.children) {
    for (const c of root.children) walkAll(c, visit)
  }
}

function getTextContent(node: DomNode): string {
  let out = ''
  walkAll(node, n => {
    if (n.type === 'text' && n.data) out += n.data
  })
  return out
}

function findChildrenByTag(root: DomNode, tag: string): DomNode[] {
  const matches: DomNode[] = []
  walkAll(root, n => {
    if (tagMatches(n, tag)) matches.push(n)
  })
  return matches
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedFact {
  concept: string              // z.B. "ifrs-full:Revenue"
  contextRef: string           // z.B. "D-2025"
  unit?: string                // z.B. "EUR"
  value: number                // bereits skaliert (EUR, nicht Millionen!)
  rawValue: string             // Original-String aus XBRL
  scale?: number               // Das "scale" Attribut
  decimals?: number            // Das "decimals" Attribut
  format?: string              // z.B. "ixt5:num-comma-decimal"
}

export interface ParsedContext {
  id: string                   // z.B. "D-2025" oder "I-2025"
  type: 'duration' | 'instant'
  startDate?: string           // YYYY-MM-DD (duration)
  endDate?: string             // YYYY-MM-DD (duration)
  instant?: string             // YYYY-MM-DD (instant)
  entityIdentifier?: string    // LEI
  // Wenn ein Context Dimensions hat, ist das Segment-Daten → MVP: ignorieren
  hasDimensions: boolean
}

export interface ParsedPeriod {
  periodEnd: string            // YYYY-MM-DD (ISO)
  fiscalYear: number
  // Gemappte Schema-Felder (noch in Original-Einheit, also EUR nicht Mio)
  fields: Partial<Record<keyof FinancialFields, number>>
  // Für die unit-Conversion im Admin-UI
  currency?: string
}

export interface ParseResult {
  entityLei?: string
  entityName?: string
  periods: ParsedPeriod[]           // Ein Eintrag pro Reporting-Jahr (aktuell + Vorjahr sind oft drin)
  totalFacts: number
  mappedFacts: number
  skippedFactsWithDimensions: number
  rawFacts: Record<string, ParsedFact>  // Key: "concept@contextRef"
  warnings: string[]
}

// ─── ZIP Entry Finder ────────────────────────────────────────────────────────

/**
 * Findet alle iXBRL-Report-Dateien im ZIP (KA, Lagebericht, etc.).
 * ESEF-Packages haben typischerweise mehrere Reports — wir parsen alle,
 * da die Facts auf mehrere Dateien verteilt sein können.
 */
function findReportFiles(zip: any): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = []
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const lower = entry.entryName.toLowerCase()
    if ((lower.endsWith('.xhtml') || lower.endsWith('.html')) && !lower.includes('/meta-inf/')) {
      files.push({ name: entry.entryName, content: entry.getData().toString('utf8') })
    }
  }
  return files
}

// ─── Number Parsing ──────────────────────────────────────────────────────────

/**
 * Parst einen numerischen iXBRL-Wert unter Berücksichtigung des Format-Attributs.
 *
 * Format-Transformationen (ESMA Transformation Registry):
 *  - ixt5:num-comma-decimal  → Komma = Dezimal, Punkt = Tausender
 *  - ixt5:num-dot-decimal    → Punkt = Dezimal, Komma = Tausender
 *  - ixt:numcommadot, ixt:numdotcomma (alte IDs, gleich)
 *
 * Vorzeichen-Varianten:
 *  - ixt:numdash → Spezialwert: ein einzelner Strich "–" = 0
 *  - Klammern "(123)" = negativ
 */
export function parseIxNumber(rawText: string, format?: string): number | null {
  if (rawText == null) return null
  const trimmed = rawText.trim()
  if (!trimmed) return null

  // Dash-Variante
  if (/^[–−-]$/.test(trimmed)) return 0

  // Klammer = negativ
  let negative = false
  let s = trimmed
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }

  // Führendes Minus
  if (s.startsWith('-') || s.startsWith('−') || s.startsWith('–')) {
    negative = !negative
    s = s.slice(1)
  }

  // Dezimal-Separator bestimmen — normalisiere Format-ID (strippe Bindestriche)
  const fmt = (format ?? '').toLowerCase().replace(/-/g, '')
  const dotDecimal =
    fmt.includes('numdotdecimal') ||
    fmt.includes('numdotcomma') ||
    fmt.includes('numcommadot')      // ältere Alias "num-comma-dot" = Komma=Tausender, Punkt=Dezimal
  const commaDecimal =
    !dotDecimal && (
      fmt.includes('numcommadecimal') ||
      fmt.includes('numcomma') ||
      fmt.includes('numdotcomma') === false && /,[0-9]{1,4}$/.test(s) && !/\.[0-9]{3}/.test(s)
    )

  let normalized: string
  if (commaDecimal && !dotDecimal) {
    // Entferne Punkte (Tausender), ersetze Komma → Punkt
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (dotDecimal && !commaDecimal) {
    // Entferne Kommas (Tausender), Punkt bleibt Dezimal
    normalized = s.replace(/,/g, '')
  } else {
    // Heuristik: wenn nur Kommas → commaDecimal, nur Punkte → dotDecimal
    if (s.includes(',') && !s.includes('.')) {
      normalized = s.replace(',', '.')
    } else {
      normalized = s.replace(/,/g, '')
    }
  }

  const n = parseFloat(normalized)
  if (isNaN(n)) return null
  return negative ? -n : n
}

// ─── XBRL Context Parsing ────────────────────────────────────────────────────

function parseContexts(root: DomNode): Map<string, ParsedContext> {
  const contexts = new Map<string, ParsedContext>()

  walkAll(root, el => {
    if (!tagMatches(el, 'context')) return
    const id = el.attribs?.id
    if (!id) return

    const identifierNodes = findChildrenByTag(el, 'identifier')
    const entityId = identifierNodes[0] ? getTextContent(identifierNodes[0]).trim() : undefined

    const dims = [
      ...findChildrenByTag(el, 'explicitMember'),
      ...findChildrenByTag(el, 'typedMember'),
    ]
    const hasDimensions = dims.length > 0

    const instantNodes = findChildrenByTag(el, 'instant')
    const startNodes = findChildrenByTag(el, 'startDate')
    const endNodes = findChildrenByTag(el, 'endDate')

    const instantStr = instantNodes[0] ? getTextContent(instantNodes[0]).trim() : ''
    const startStr = startNodes[0] ? getTextContent(startNodes[0]).trim() : ''
    const endStr = endNodes[0] ? getTextContent(endNodes[0]).trim() : ''

    if (instantStr) {
      contexts.set(id, {
        id, type: 'instant', instant: instantStr,
        entityIdentifier: entityId, hasDimensions,
      })
    } else if (startStr && endStr) {
      contexts.set(id, {
        id, type: 'duration', startDate: startStr, endDate: endStr,
        entityIdentifier: entityId, hasDimensions,
      })
    }
  })

  return contexts
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export async function parseEsefZip(buffer: Buffer | ArrayBuffer): Promise<ParseResult> {
  const warnings: string[] = []
  const nodeBuffer = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer
  const AdmZip = await getAdmZip()
  const zip = new AdmZip(nodeBuffer)
  const reports = findReportFiles(zip)
  if (reports.length === 0) {
    throw new Error('Keine iXBRL Report-Datei im ZIP gefunden (erwartet: *.xhtml)')
  }

  // Alle Reports parsen und Contexts + Facts mergen
  const contexts = new Map<string, ParsedContext>()
  const rawFacts: Record<string, ParsedFact> = {}
  let totalFacts = 0
  let entityLei: string | undefined

  const parseDocument = await getParser()

  for (const report of reports) {
    const dom = parseDocument(report.content, { xmlMode: true, decodeEntities: true }) as DomNode
    const reportContexts = parseContexts(dom)
    for (const [k, v] of reportContexts) contexts.set(k, v)

    walkAll(dom, el => {
      if (!tagMatches(el, 'nonFraction')) return
      const attrs = el.attribs ?? {}
      const concept = attrs.name
      const contextRef = attrs.contextRef ?? attrs.contextref
      const unitRef = attrs.unitRef ?? attrs.unitref
      const scaleAttr = attrs.scale
      const decimalsAttr = attrs.decimals
      const format = attrs.format
      const raw = getTextContent(el)

      if (!concept || !contextRef) return
      totalFacts++

      const parsedNumber = parseIxNumber(raw, format)
      if (parsedNumber === null) {
        warnings.push(`Konnte ${concept} nicht parsen: "${raw}"`)
        return
      }

      const scale = scaleAttr ? parseInt(scaleAttr, 10) : 0
      const decimals = decimalsAttr ? parseInt(decimalsAttr, 10) : undefined
      const scaled = parsedNumber * Math.pow(10, isNaN(scale) ? 0 : scale)
      const sign = attrs.sign
      const finalValue = sign === '-' ? -scaled : scaled

      rawFacts[`${concept}@${contextRef}`] = {
        concept, contextRef, unit: unitRef,
        value: finalValue, rawValue: raw,
        scale: isNaN(scale) ? undefined : scale,
        decimals, format,
      }

      if (!entityLei && contexts.get(contextRef)?.entityIdentifier) {
        entityLei = contexts.get(contextRef)?.entityIdentifier
      }
    })
  }

  // ─── Mapping auf Schema ─────────────────────────────────────────────
  const tagLookup = buildTagLookup()

  // Gruppiere nach Periode (endDate für duration, instant für instant)
  // Ein Annual Report hat typisch 2 Duration-Perioden (current + prior) und 2 Instant-Perioden
  // Wir bauen ein Mapping: periodEnd (YYYY-MM-DD) → { duration: [ctxIds], instant: [ctxIds] }
  const periodGroups = new Map<string, { duration: string[]; instant: string[] }>()

  for (const [id, ctx] of contexts) {
    if (ctx.hasDimensions) continue // Segment-Daten skippen

    let key: string | undefined
    if (ctx.type === 'duration') {
      key = ctx.endDate
    } else if (ctx.type === 'instant') {
      key = ctx.instant
    }
    if (!key) continue

    if (!periodGroups.has(key)) {
      periodGroups.set(key, { duration: [], instant: [] })
    }
    const group = periodGroups.get(key)!
    if (ctx.type === 'duration') group.duration.push(id)
    else group.instant.push(id)
  }

  const periods: ParsedPeriod[] = []
  let mappedFacts = 0
  let skippedWithDimensions = 0

  for (const [periodEnd, group] of periodGroups) {
    const fields: Partial<Record<keyof FinancialFields, number>> = {}
    let currency: string | undefined

    // Duration-Facts verarbeiten (GuV, Cashflow)
    for (const ctxId of group.duration) {
      for (const [factKey, fact] of Object.entries(rawFacts)) {
        if (fact.contextRef !== ctxId) continue
        const mapping = tagLookup.get(fact.concept)
        if (!mapping || mapping.periodType !== 'duration') continue
        // Nur übernehmen wenn Feld noch nicht gesetzt (Priorität = erster Treffer in Map)
        if (fields[mapping.schemaField] === undefined) {
          const val = mapping.negate ? Math.abs(fact.value) : fact.value
          fields[mapping.schemaField] = val
          mappedFacts++
          if (fact.unit) currency = fact.unit
        }
      }
    }

    // Instant-Facts verarbeiten (Bilanz)
    for (const ctxId of group.instant) {
      for (const [factKey, fact] of Object.entries(rawFacts)) {
        if (fact.contextRef !== ctxId) continue
        const mapping = tagLookup.get(fact.concept)
        if (!mapping || mapping.periodType !== 'instant') continue
        if (fields[mapping.schemaField] === undefined) {
          fields[mapping.schemaField] = fact.value
          mappedFacts++
          if (fact.unit) currency = fact.unit
        }
      }
    }

    // Abgeleitete Felder
    if (
      fields.operatingCashFlow !== undefined &&
      fields.capex !== undefined &&
      fields.freeCashFlow === undefined
    ) {
      fields.freeCashFlow = fields.operatingCashFlow - fields.capex
    }

    // Nur Perioden behalten die tatsächlich Daten haben
    if (Object.keys(fields).length === 0) continue

    const year = parseInt(periodEnd.slice(0, 4), 10)
    periods.push({
      periodEnd,
      fiscalYear: year,
      fields,
      currency,
    })
  }

  // Segment-Facts zählen für Statistik
  for (const [id, ctx] of contexts) {
    if (ctx.hasDimensions) {
      for (const f of Object.values(rawFacts)) {
        if (f.contextRef === id) skippedWithDimensions++
      }
    }
  }

  // Sortiere Perioden absteigend (neuestes zuerst)
  periods.sort((a, b) => (a.periodEnd > b.periodEnd ? -1 : 1))

  return {
    entityLei,
    periods,
    totalFacts,
    mappedFacts,
    skippedFactsWithDimensions: skippedWithDimensions,
    rawFacts,
    warnings,
  }
}
