// src/lib/ai/calc.ts
// Kleiner Rechner für das Werkzeug „rechne“. Bewusst ohne eval: nur Zahlen,
// Grundrechenarten, Klammern und eine Handvoll Funktionen.

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  sum: a => a.reduce((s, x) => s + x, 0),
  avg: a => a.reduce((s, x) => s + x, 0) / a.length,
  min: a => Math.min(...a),
  max: a => Math.max(...a),
  median: a => {
    const s = [...a].sort((x, y) => x - y)
    const m = s.length >> 1
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  },
  abs: a => Math.abs(a[0]),
  sqrt: a => Math.sqrt(a[0]),
  round: a => Math.round(a[0] * 10 ** (a[1] ?? 0)) / 10 ** (a[1] ?? 0),
}

type Token = { kind: 'num'; value: number } | { kind: 'op' | 'name'; value: string }

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([a-z]+)|([-+*/^(),]))/giy
  let pos = 0
  while (pos < text.length) {
    if (/^\s+$/.test(text.slice(pos))) break
    re.lastIndex = pos
    const m = re.exec(text)
    if (!m) throw new Error(`Unerwartetes Zeichen bei "${text.slice(pos, pos + 8)}"`)
    pos = re.lastIndex
    if (m[1] != null) tokens.push({ kind: 'num', value: Number(m[1]) })
    else if (m[2] != null) tokens.push({ kind: 'name', value: m[2].toLowerCase() })
    else tokens.push({ kind: 'op', value: m[3] })
  }
  return tokens
}

export function evaluateExpression(text: string): number {
  const tokens = tokenize(text)
  let i = 0
  let depth = 0
  const peek = () => tokens[i]
  const isOp = (v: string) => peek()?.kind === 'op' && peek()!.value === v
  const eat = (v: string) => {
    if (!isOp(v)) throw new Error(`"${v}" erwartet`)
    i++
  }

  function primary(): number {
    const t = peek()
    if (!t) throw new Error('Ausdruck unvollständig')
    if (t.kind === 'num') {
      i++
      return t.value
    }
    if (t.kind === 'name') {
      const fn = FUNCTIONS[t.value]
      if (!fn) throw new Error(`Unbekannte Funktion ${t.value}`)
      i++
      eat('(')
      const args = [expr()]
      while (isOp(',')) {
        i++
        args.push(expr())
      }
      eat(')')
      return fn(args)
    }
    if (t.value === '(') {
      if (++depth > 50) throw new Error('Zu tief verschachtelt')
      i++
      const v = expr()
      eat(')')
      depth--
      return v
    }
    throw new Error(`Unerwartetes "${t.value}"`)
  }
  function unary(): number {
    if (isOp('-')) {
      i++
      return -unary()
    }
    if (isOp('+')) {
      i++
      return unary()
    }
    const base = primary()
    if (isOp('^')) {
      i++
      return base ** unary()
    }
    return base
  }
  function term(): number {
    let v = unary()
    while (isOp('*') || isOp('/')) {
      const op = tokens[i++].value
      const r = unary()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  function expr(): number {
    let v = term()
    while (isOp('+') || isOp('-')) {
      const op = tokens[i++].value
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  const result = expr()
  if (i < tokens.length) throw new Error('Ausdruck nicht lesbar')
  if (!Number.isFinite(result)) throw new Error('Ergebnis ist keine Zahl')
  return result
}
