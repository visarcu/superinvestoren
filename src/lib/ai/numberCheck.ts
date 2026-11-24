// src/lib/ai/numberCheck.ts
// Prüft, ob jede Zahl einer Antwort aus einem Werkzeugergebnis stammt.
//
// Bekannte Zahlen: alles, was die Werkzeuge geliefert haben, plus Zahlen aus der
// Frage und aus früheren (bereits geprüften) Antworten. Verglichen wird auf die
// im Text gezeigten Nachkommastellen, Einheiten wie Mio. und Mrd. inbegriffen.
// Nicht geprüft werden Jahreszahlen, Daten, Uhrzeiten, kleine Anzahlen ("3 Jahre")
// und Namen mit Zahlen ("S&P 500", "Q3").

import type { AiCheck } from './types'

export class KnownNumbers {
  private values: number[] = []
  private seen = new Set<number>()

  addNumber(n: number): void {
    const v = Math.abs(n)
    if (!Number.isFinite(v) || this.seen.has(v)) return
    this.seen.add(v)
    this.values.push(v)
  }

  /** Zahlen aus beliebigen Werkzeugdaten einsammeln */
  addData(value: unknown, depth = 0): void {
    if (depth > 12 || value == null) return
    if (typeof value === 'number') this.addNumber(value)
    else if (typeof value === 'string') this.addText(value)
    else if (Array.isArray(value)) for (const v of value) this.addData(v, depth + 1)
    else if (typeof value === 'object') for (const [k, v] of Object.entries(value)) {
      if (/\d/.test(k)) this.addText(k)
      this.addData(v, depth + 1)
    }
  }

  /** Freitext: Schreibweise (1.234,5 oder 1,234.5) ist unklar, deshalb beide Lesarten */
  addText(text: string): void {
    for (const m of text.matchAll(/\d[\d.,]*\d|\d/g)) {
      const raw = m[0]
      const german = Number(raw.replace(/\./g, '').replace(',', '.'))
      const english = Number(raw.replace(/,/g, ''))
      if (Number.isFinite(german)) this.addNumber(german)
      if (Number.isFinite(english)) this.addNumber(english)
    }
  }

  has(target: number, tolerance: number): boolean {
    return this.values.some(v => Math.abs(v - target) <= tolerance)
  }
}

const UNIT_SCALE: Array<[RegExp, number]> = [
  [/^(?:Tsd\.?|Tausend)/i, 1e3],
  [/^(?:Mio\.?|Millionen?)/i, 1e6],
  [/^(?:Mrd\.?|Milliarden?)/i, 1e9],
  [/^(?:Bio\.?|Billionen?)/i, 1e12],
]
const MONTHS = /^\s?(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|Jan|Feb|Mär|Apr|Jun|Jul|Aug|Sep|Okt|Nov|Dez)/
const TIME_WORDS = /^\s?-?(?:Jahre?n?|jährig|Monate?n?|monatig|Wochen?|Tage?n?|tägig|Handelstage?n?|Quartale?n?|Stunden?|Minuten?|Punkte?n?\b)/i
const NAME_BEFORE = /(?:^|[^\p{L}])(?:S&P|Nasdaq|DAX|MDAX|SDAX|TecDAX|Stoxx|Russell|CAC|FTSE|Nikkei|Dow|Top|Platz|Rang|Q|H|Form|Phase|Schritt|§|Artikel|GPT|Windows|iPhone|MSCI)[\s-]?$/iu
const APPROX = /(?:rund|etwa|gut|knapp|fast|über|unter|mehr als|weniger als|ca\.|circa|nahezu|ungefähr|annähernd|gerundet|bis zu)\s*$/i

const NUMBER = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+|\d+\.\d{1,2}(?![\d.])|\d+/g

interface FoundNumber {
  text: string
  value: number
  decimals: number
  scale: number
  percent: boolean
  approx: boolean
}

export function extractNumbers(text: string): FoundNumber[] {
  const clean = text.replace(/\[\[[^\]]*\]\]/g, ' ').replace(/\]\([^)]*\)/g, '] ').replace(/https?:\/\/\S+/g, ' ')
  const found: FoundNumber[] = []
  for (const m of clean.matchAll(NUMBER)) {
    const raw = m[0]
    const index = m.index ?? 0
    const before = clean.slice(Math.max(0, index - 22), index)
    const after = clean.slice(index + raw.length, index + raw.length + 24)

    // Teil eines Worts, Symbols oder einer Uhrzeit: 2330.TW, 13F, A100, 22:10
    if (/[\p{L}_]$/u.test(before) || /^[\p{L}_]/u.test(after) || /\d:$/.test(before) || /^:\d/.test(after) || /^\.[A-Z]/.test(after)) continue
    // Datum: 23.11.2026, 23. November, 2026-11-23
    if (/^\.\d{1,2}\./.test(after) || /\d\.$/.test(before) || (/^\./.test(after) && MONTHS.test(after.slice(1)))) continue
    if (/^-\d{2}/.test(after) || /\d-$/.test(before)) continue
    if (NAME_BEFORE.test(before)) continue
    // Rechenbeispiel in einer Erklärung ("Beispiel: Kostet eine Aktie 100 € …")
    const sentenceStart = Math.max(clean.lastIndexOf('\n', index), clean.lastIndexOf('. ', index), 0)
    if (/\b(?:Beispiel|Beispielsweise|Angenommen|Nehmen wir an)\b/i.test(clean.slice(sentenceStart, index + 80).split(/\n|\.\s/)[sentenceStart === 0 ? 0 : 1] ?? '')) continue

    const grouped = /^\d{1,3}(?:\.\d{3})+/.test(raw)
    const decimals = raw.includes(',') ? raw.split(',')[1].length : !grouped && raw.includes('.') ? raw.split('.')[1].length : 0
    const value = grouped || raw.includes(',') ? Number(raw.replace(/\./g, '').replace(',', '.')) : Number(raw)
    const unit = after.replace(/^[\s  ]+/, '')
    const scale = UNIT_SCALE.find(([re]) => re.test(unit))?.[1] ?? 1
    const percent = /^(?:%|Prozent)/.test(unit)
    const money = /^(?:€|\$|Euro|Dollar|USD|EUR)/.test(unit) || /[€$]\s?$/.test(before)

    if (Number.isInteger(value) && !percent && !money && scale === 1) {
      if (value >= 1900 && value <= 2100 && !grouped) continue
      if (value <= 12) continue
      if (TIME_WORDS.test(after)) continue
    }
    found.push({ text: raw + (percent ? ' %' : ''), value, decimals, scale, percent, approx: APPROX.test(before) })
  }
  return found
}

function isKnown(n: FoundNumber, known: KnownNumbers): boolean {
  // Werkzeuge liefern Beträge teils voll, teils in Tausend, Millionen oder Milliarden
  const scales = n.scale > 1 ? [n.scale, n.scale / 1e3, n.scale / 1e6, n.scale / 1e9].filter(s => s >= 1) : n.percent ? [1, 0.01] : [1]
  for (const s of scales) {
    const target = n.value * s
    const tolerance = Math.max(0.5 * 10 ** -n.decimals * s * 1.02, n.approx ? target * 0.06 : 0)
    if (known.has(target, tolerance)) return true
  }
  return false
}

export function checkNumbers(text: string, known: KnownNumbers): AiCheck {
  const numbers = extractNumbers(text)
  const open = new Set<string>()
  let ok = 0
  for (const n of numbers) {
    if (isKnown(n, known)) ok++
    else open.add(n.text)
  }
  return { gesamt: numbers.length, belegt: ok, offen: [...open] }
}

/**
 * Gibt Text absatz- und satzweise frei. Enthält ein Satz eine Zahl ohne Beleg,
 * bleibt ab dort alles zurück, bis die Antwort nachgebessert ist.
 */
export class TextGate {
  private full = ''
  private released = 0
  held = false

  get releasedAny(): boolean {
    return this.released > 0
  }

  constructor(private known: KnownNumbers, private strict: boolean) {}

  push(delta: string): string {
    this.full += delta
    if (this.held) return ''
    return this.release(this.safeEnd())
  }

  /** Rest freigeben, wenn nichts offen ist */
  flush(): string {
    if (this.held) return ''
    return this.release(this.full.length)
  }

  private release(end: number): string {
    if (end <= this.released) return ''
    const part = this.full.slice(this.released, end)
    if (this.strict && checkNumbers(part, this.known).offen.length > 0) {
      this.held = true
      return ''
    }
    this.released = end
    return part
  }

  /** Ende des letzten vollständigen Satzes bzw. der letzten Zeile */
  private safeEnd(): number {
    let end = this.released
    const re = /\n|[.!?:](?=\s)/g
    re.lastIndex = this.released
    for (let m = re.exec(this.full); m; m = re.exec(this.full)) {
      // "23. November", "ca. 5", "Mio. Euro" sind kein Satzende
      if (m[0] === '.' && /(?:\d|\b(?:ca|Mio|Mrd|Bio|Tsd|bzw|z|B|d|h|u|a|Nr|Dr))$/.test(this.full.slice(Math.max(0, m.index - 4), m.index))) continue
      end = m.index + 1
    }
    return end
  }
}
