// scripts/ai-eval/run.ts
// Stellt die Testfragen den drei Modellen und vergleicht Güte, Dauer und Kosten.
//
//   npx tsx scripts/ai-eval/run.ts                          alle Fragen, alle Modelle (rund 11 $)
//   npx tsx scripts/ai-eval/run.ts --modelle=sonnet --nur=b1,k1
//   npx tsx scripts/ai-eval/run.ts --jury                   zusätzlich Blindvergleich durch Claude Opus 5.5
//
// Jede Frage kostet Geld. Ergebnisse landen in .ai-eval/ (nicht im Repo).

import fs from 'fs'
import path from 'path'
for (const f of ['.env', '.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const arg = (name: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
const MODELS: Record<string, { model: string; effort: 'low' | 'medium' | 'high' }> = {
  haiku: { model: 'claude-haiku-5-5', effort: 'medium' },
  sonnet: { model: 'claude-sonnet-5-5', effort: 'medium' },
  opus: { model: 'claude-opus-5-5', effort: 'medium' },
  haikuhoch: { model: 'claude-haiku-5-5', effort: 'high' },
  sonnetniedrig: { model: 'claude-sonnet-5-5', effort: 'low' },
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY fehlt in .env.local')
  const { runAgent } = await import('../../src/lib/ai/agent')
  const { extractNumbers } = await import('../../src/lib/ai/numberCheck')
  const { FRAGEN } = await import('./fragen')
  const { default: Anthropic } = await import('@anthropic-ai/sdk')

  const models = (arg('modelle') ?? 'haiku,sonnet,opus').split(',').filter(m => MODELS[m])
  const only = arg('nur')?.split(',')
  const questions = FRAGEN.filter(q => !only || only.includes(q.id))
  const jury = process.argv.includes('--jury') ? new Anthropic() : null
  const out = path.join('.ai-eval', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'))
  fs.mkdirSync(out, { recursive: true })

  console.log('Sollwerte laden …')
  const soll = new Map<string, number[]>()
  for (const q of questions) {
    if (!q.soll) continue
    try {
      soll.set(q.id, (await q.soll()).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)))
    } catch (e) {
      console.log(`  ${q.id}: Sollwert nicht ladbar (${e instanceof Error ? e.message : e})`)
    }
  }

  const hasNumber = (text: string, expected: number) =>
    extractNumbers(text).some(n => {
      for (const s of n.scale > 1 ? [n.scale, n.scale / 1e6, n.scale / 1e9] : [1]) {
        const v = n.value * s
        const tolerance = Math.max(0.5 * 10 ** -n.decimals * s, n.approx ? v * 0.05 : 0, Math.abs(expected) * 0.012)
        if (Math.abs(v - Math.abs(expected)) <= tolerance) return true
      }
      return false
    })

  type Row = { id: string; gruppe: string; frage: string; model: string; ok: boolean; fehler: string[]; sekunden: number; kosten: number; runden: number; werkzeuge: string[]; text: string; note?: number; fehlerJury?: string; beste?: boolean }
  const rows: Row[] = []

  async function one(name: string, q: (typeof questions)[number]): Promise<Row> {
    const started = Date.now()
    const fehler: string[] = []
    let text = ''
    let kosten = 0
    let runden = 0
    let werkzeuge: string[] = []
    try {
      const r = await runAgent({ question: q.frage, context: q.kontext ?? null, history: [], userId: 'eval', mode: 'standard', modelOverride: { ...MODELS[name], charge: 0 } })
      text = r.text
      kosten = r.usage.costUsd
      runden = r.usage.rounds
      werkzeuge = [...r.toolCalls.filter(c => c.ok).map(c => c.name), ...(r.usage.webSearches > 0 ? ['web_search'] : [])]
      if (r.payload.pruefung?.offen.length) fehler.push(`Zahlen ohne Beleg: ${r.payload.pruefung.offen.join(', ')}`)
      if (q.werkzeuge && !q.werkzeuge.some(w => werkzeuge.includes(w))) fehler.push(`erwartetes Werkzeug fehlt (${q.werkzeuge.join('/')})`)
      for (const s of soll.get(q.id) ?? []) if (!hasNumber(text, s)) fehler.push(`Sollwert ${s} fehlt`)
      for (const re of q.muss ?? []) if (!re.test(text)) fehler.push(`Pflichtinhalt fehlt: ${re.source.slice(0, 30)}`)
      for (const re of q.darfNicht ?? []) if (re.test(text)) fehler.push(`Unerlaubt: ${re.source.slice(0, 30)}`)
      const head = text.split('\n')[0]
      if (head.split(/\s+/).length > 34) fehler.push('Kopfsatz zu lang')
      if (/[–—]/.test(text)) fehler.push('Gedankenstrich')
      if (/^#/m.test(text)) fehler.push('Überschrift')
      if (/\p{Extended_Pictographic}/u.test(text.replace(/[©®™]/g, ''))) fehler.push('Emoji')
      if (/kennzahl_verlauf|wertpapier_suchen|kursbewegung\b|finanzzahlen\(/.test(text)) fehler.push('Werkzeugname im Text')
    } catch (e) {
      fehler.push(`Abbruch: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`)
    }
    const row: Row = { id: q.id, gruppe: q.gruppe, frage: q.frage, model: name, ok: fehler.length === 0, fehler, sekunden: (Date.now() - started) / 1000, kosten, runden, werkzeuge, text }
    return row
  }

  for (const name of models) {
    const queue = [...questions]
    await Promise.all(Array.from({ length: 3 }, async () => {
      for (let q = queue.shift(); q; q = queue.shift()) {
        const row = await one(name, q)
        rows.push(row)
        console.log(`${name.padEnd(6)} ${row.ok ? 'ok  ' : 'FEHL'} ${row.id.padEnd(4)} ${row.sekunden.toFixed(1).padStart(5)} s ${(row.kosten * 100).toFixed(2).padStart(6)} ct ${row.fehler.join(' | ')}`)
      }
    }))
  }

  // Blindvergleich: alle Antworten zu einer Frage in zufälliger Reihenfolge, ohne Modellnamen
  if (jury) {
    console.log('Jury …')
    const pending = questions.filter(q => rows.filter(r => r.id === q.id && r.text).length > 1)
    const letters = 'ABCDEF'
    await Promise.all(Array.from({ length: 3 }, async () => {
      for (let q = pending.shift(); q; q = pending.shift()) {
        const answers = rows.filter(r => r.id === q!.id && r.text).map(r => ({ r, key: Math.random() })).sort((a, b) => a.key - b.key).map(x => x.r)
        try {
          const res = await jury.messages.create({
            model: 'claude-opus-5-5',
            max_tokens: 6000,
            output_config: {
              effort: 'low',
              format: { type: 'json_schema', schema: {
                type: 'object',
                properties: {
                  bewertungen: { type: 'array', items: { type: 'object', properties: { kennung: { type: 'string', enum: letters.slice(0, answers.length).split('') }, note: { type: 'integer', enum: [1, 2, 3, 4, 5] }, fehler: { type: 'string' } }, required: ['kennung', 'note', 'fehler'], additionalProperties: false } },
                  beste: { type: 'string', enum: [...letters.slice(0, answers.length).split(''), 'gleich'] },
                },
                required: ['bewertungen', 'beste'], additionalProperties: false,
              } },
            },
            messages: [{ role: 'user', content: `Vergleiche mehrere Antworten eines Aktien-Assistenten für deutsche Privatanleger auf dieselbe Frage. Zahlen und Nachrichten gelten als aus den Daten belegt. Grafikmarken wie [[g1]] zeigen dem Nutzer eine Grafik. Empfehlungen zum Kauf oder Verkauf sind nicht erlaubt. Note 5 = beantwortet die Frage sofort, klar, richtig eingeordnet, nichts Überflüssiges; 3 = brauchbar mit Schwächen; 1 = verfehlt die Frage. Bei fehler: nur echte Denkfehler, Widersprüche, falsche Schlüsse oder Sprachfehler, sonst leer. beste: die beste Antwort oder "gleich".\n\nFrage: ${q.frage}${q.kontext?.symbol ? ` (geöffnete Aktie: ${q.kontext.symbol})` : ''}\n\n${answers.map((a, k) => `### Antwort ${letters[k]}\n${a.text}`).join('\n\n')}` }],
          })
          const block = res.content.find(b => b.type === 'text')
          if (block?.type !== 'text') continue
          const verdict = JSON.parse(block.text) as { bewertungen: Array<{ kennung: string; note: number; fehler: string }>; beste: string }
          for (const b of verdict.bewertungen) {
            const target = answers[letters.indexOf(b.kennung)]
            if (target) Object.assign(target, { note: b.note, fehlerJury: b.fehler, beste: verdict.beste === b.kennung })
          }
        } catch (e) {
          console.log(`  Jury ${q.id}: ${e instanceof Error ? e.message.slice(0, 100) : e}`)
        }
      }
    }))
  }

  const pct = (list: number[], p: number) => [...list].sort((a, b) => a - b)[Math.min(list.length - 1, Math.floor(list.length * p))] ?? 0
  const lines = ['# Finclue AI, Modellvergleich', '', `${questions.length} Fragen, ${new Date().toLocaleString('de-DE')}`, '', '| Modell | bestanden | Note | beste Antwort | Denk-/Sprachfehler | Kosten je Frage | Dauer Median | Dauer 90 % | Gesamtkosten |', '|---|---|---|---|---|---|---|---|---|']
  for (const name of models) {
    const own = rows.filter(r => r.model === name)
    const notes = own.map(r => r.note).filter((n): n is number => n != null)
    const cost = own.reduce((s, r) => s + r.kosten, 0)
    lines.push(`| ${name} | ${own.filter(r => r.ok).length}/${own.length} | ${notes.length ? (notes.reduce((s, n) => s + n, 0) / notes.length).toFixed(2) : '-'} | ${own.filter(r => r.beste).length} | ${own.filter(r => r.fehlerJury?.trim()).length} | ${((cost / own.length) * 100).toFixed(2)} ct | ${pct(own.map(r => r.sekunden), 0.5).toFixed(1)} s | ${pct(own.map(r => r.sekunden), 0.9).toFixed(1)} s | ${cost.toFixed(2)} $ |`)
  }
  lines.push('', '## Auffälligkeiten', '')
  for (const r of rows.filter(r => !r.ok).sort((a, b) => a.id.localeCompare(b.id))) lines.push(`- **${r.id} (${r.model})** ${r.frage}: ${r.fehler.join('; ')}`)
  fs.writeFileSync(path.join(out, 'ergebnis.md'), lines.join('\n'))
  fs.writeFileSync(path.join(out, 'antworten.json'), JSON.stringify(rows, null, 2))
  console.log(`\n${lines.slice(4, 6 + models.length).join('\n')}\n\nGespeichert in ${out}/`)
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
