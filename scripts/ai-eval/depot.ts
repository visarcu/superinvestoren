// scripts/ai-eval/depot.ts
// Depotfragen an die Finclue AI, mit einem echten Depot. Sollwerte kommen beim
// Lauf frisch aus den Werkzeugen, die Nutzer-ID nur über die Kommandozeile.
//
//   npx tsx scripts/ai-eval/depot.ts --nutzer=<id> [--nur=d1,d5] [--depot=<id>]
//
// Jede Frage kostet rund 2 bis 4 Cent. Ergebnisse landen in .ai-eval/ (nicht im Repo).

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

const ADVICE = [/\bdu\s+solltest\b/i, /\bsolltest du\b/i, /\bich\s+(?:würde|empfehle|rate)\b/i, /\b(?:umschichten|reduzieren|aufstocken|verkaufen)\s+(?:wäre|ist)\s+sinnvoll/i]

async function main() {
  const nutzer = arg('nutzer')
  if (!nutzer) throw new Error('--nutzer=<id> fehlt')
  const { runAgent } = await import('../../src/lib/ai/agent')
  const { DepotAccess } = await import('../../src/lib/ai/depot/access')
  const { extractNumbers } = await import('../../src/lib/ai/numberCheck')
  const { TOOL_BY_NAME } = await import('../../src/lib/ai/tools')

  let counter = 0
  const shared = new DepotAccess(nutzer, true, true, arg('depot') ?? 'all')
  const tool = async (name: string, input: unknown): Promise<any> => {
    const t = TOOL_BY_NAME.get(name)!
    return (await t.run(t.schema.parse(input), { userId: nutzer, now: new Date(), nextBlockId: () => `e${++counter}`, depot: shared })).data
  }

  const fragen: Array<{ id: string; frage: string; werkzeuge: string[]; soll?: () => Promise<Array<number | null | undefined>>; muss?: RegExp[]; darfNicht?: RegExp[]; aus?: boolean; seite?: boolean }> = [
    { id: 'd1', frage: 'Wie groß ist mein AI Exposure?', werkzeuge: ['depot_thema'], soll: async () => { const t = await tool('depot_thema', { thema: 'ki' }); return [t.eng_gefasst.anteil_prozent, t.weit_gefasst.anteil_prozent] } },
    { id: 'd2', frage: 'Wie viel hab ich im Schnitt in den letzten Monaten in ETFs investiert und wie viel in Aktien?', werkzeuge: ['depot_investiert'], soll: async () => { const t = await tool('depot_investiert', { monate: 6 }); return [t.durchschnitt_je_monat_eur.ETFs, t.durchschnitt_je_monat_eur.Aktien] } },
    { id: 'd3', frage: 'Wie steht mein Depot?', werkzeuge: ['depot_uebersicht'], soll: async () => { const t = await tool('depot_uebersicht', {}); return [t.wertpapiere_eur] } },
    { id: 'd4', frage: 'Schlage ich den Markt?', werkzeuge: ['depot_rendite'], seite: true },
    { id: 'd5', frage: 'Wie viel habe ich dieses Jahr mit meinem Depot verdient?', werkzeuge: ['depot_rendite'], soll: async () => [(await tool('depot_rendite', { zeitraum: 'YTD' })).gewinn_im_zeitraum_eur] },
    { id: 'd6', frage: 'Warum ist mein Depot heute gefallen oder gestiegen?', werkzeuge: ['depot_uebersicht'] },
    { id: 'd7', frage: 'Wie viel Nvidia habe ich insgesamt, wenn man die ETFs mitzählt?', werkzeuge: ['depot_durchsicht'], soll: async () => [(await tool('depot_durchsicht', { firmen: ['NVDA'] })).gefunden[0]?.anteil_prozent] },
    { id: 'd8', frage: 'Wie viel Dividende habe ich dieses Jahr bekommen und wie viel kann ich in den nächsten 12 Monaten erwarten?', werkzeuge: ['depot_dividenden'], soll: async () => { const t = await tool('depot_dividenden', {}); return [t.je_jahr.at(-1).summe_eur, t.hochrechnung_naechste_12_monate_eur] } },
    { id: 'd25', frage: 'Wie viel Geld habe ich bisher insgesamt eingezahlt?', werkzeuge: ['depot_buchungen'], soll: async () => [(await tool('depot_buchungen', { typ: 'einzahlung' })).summen.Einzahlung?.summe_eur] },
    { id: 'd26', frage: 'Wie viel Dividenden habe ich seit Beginn insgesamt bekommen?', werkzeuge: ['depot_dividenden', 'depot_uebersicht'], soll: async () => [(await tool('depot_dividenden', {})).gesamt_eur, (await tool('depot_uebersicht', {})).dividenden_eur] },
    { id: 'd9', frage: 'Was sind meine drei schlechtesten Positionen?', werkzeuge: ['depot_positionen'] },
    { id: 'd10', frage: 'Wann und zu welchem Preis habe ich Adobe gekauft?', werkzeuge: ['depot_buchungen', 'depot_positionen'] },
    { id: 'd11', frage: 'Wie viel Gewinn habe ich bisher mit Verkäufen realisiert?', werkzeuge: ['depot_realisiert'], soll: async () => [(await tool('depot_realisiert', {})).ergebnis_eur], darfNicht: [/vor Steuern/i] },
    { id: 'd12', frage: 'Überschneiden sich meine ETFs?', werkzeuge: ['depot_durchsicht'] },
    { id: 'd13', frage: 'Was wäre mit meinem Depot in einer Krise wie 2008 passiert?', werkzeuge: ['depot_risiko'], soll: async () => { const k = (await tool('depot_risiko', { stresstest: true })).krisen[0]; return [k.depot_prozent, k.anteil_am_eigenen_geld_prozent] } },
    { id: 'd14', frage: 'Welche meiner Aktien melden demnächst Zahlen?', werkzeuge: ['depot_termine'] },
    { id: 'd15', frage: 'Welche Superinvestoren haben ähnliche Aktien wie ich?', werkzeuge: ['depot_superinvestoren'] },
    { id: 'd16', frage: 'Bin ich zu stark in den USA investiert?', werkzeuge: ['depot_durchsicht'] },
    { id: 'd17', frage: 'Soll ich meine Adobe-Aktien verkaufen?', werkzeuge: ['depot_positionen'] },
    { id: 'd18', frage: 'Wie groß ist mein Rüstungsanteil?', werkzeuge: ['depot_thema'] },
    { id: 'd19', frage: 'Wie viel Gebühren habe ich insgesamt gezahlt?', werkzeuge: ['depot_uebersicht', 'depot_buchungen'], soll: async () => [(await tool('depot_uebersicht', {})).kosten.ordergebuehren_eur], darfNicht: [/dazu kommt/i] },
    { id: 'd20', frage: 'Wie viel hab ich in Luxusfirmen wie LVMH oder Hermès?', werkzeuge: ['depot_thema', 'depot_durchsicht'] },
    { id: 'd21', frage: 'Wie teuer ist mein Depot bewertet, also welches KGV haben meine drei größten Einzelaktien?', werkzeuge: ['depot_positionen', 'depot_uebersicht'] },
    { id: 'd22', frage: 'Wie groß ist mein AI Exposure?', werkzeuge: [], aus: true },
    { id: 'd23', frage: 'Warum ist Nvidia gestiegen und was bedeutet das für mich?', werkzeuge: ['kursbewegung'] },
    { id: 'd24', frage: 'Wie war die Rendite von meinem Beispieldepot in den letzten 3 Jahren im Vergleich zum S&P 500?', werkzeuge: ['depot_rendite'] },
  ]
  const only = arg('nur')?.split(',')
  const list = fragen.filter(f => !only || only.includes(f.id))
  const out = path.join('.ai-eval', `depot-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`)
  fs.mkdirSync(out, { recursive: true })

  const soll = new Map<string, number[]>()
  for (const f of list) if (f.soll) soll.set(f.id, ((await f.soll().catch(() => [])) as unknown[]).filter((v): v is number => typeof v === 'number'))
  const hasNumber = (text: string, expected: number) => extractNumbers(text).some(n => (n.scale > 1 ? [n.scale] : [1]).some(s => Math.abs(n.value * s - Math.abs(expected)) <= Math.max(0.5 * 10 ** -n.decimals * s, n.approx ? n.value * 0.05 : 0, Math.abs(expected) * 0.012)))

  let cost = 0
  let good = 0
  const times: number[] = []
  const queue = [...list]
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      const started = Date.now()
      const problems: string[] = []
      let text = ''
      let tools: string[] = []
      let price = 0
      try {
        const context = { depot: !f.aus, ...(f.seite ? { depotId: 'all' } : {}) }
        const r = await runAgent({ question: f.frage, context, history: [], userId: nutzer, mode: 'standard', depot: new DepotAccess(nutzer, true, !f.aus, arg('depot') ?? 'all') })
        text = r.text
        price = r.usage.costUsd
        tools = r.toolCalls.map(c => `${c.name}${c.ok ? '' : ' (Fehler)'}`)
        if (r.payload.pruefung?.offen.length) problems.push(`Zahlen ohne Beleg: ${r.payload.pruefung.offen.join(', ')}`)
        if (f.werkzeuge.length && !r.toolCalls.some(c => c.ok && f.werkzeuge.includes(c.name))) problems.push(`keines von ${f.werkzeuge.join('/')} genutzt`)
        if (f.aus && !r.payload.depotNoetig) problems.push('Marke zum Einschalten fehlt')
        if (f.aus && r.toolCalls.some(c => c.ok && c.name.startsWith('depot_'))) problems.push('Depot trotz Schalter gelesen')
        for (const v of soll.get(f.id) ?? []) if (!hasNumber(text, v)) problems.push(`Sollwert ${v} fehlt`)
        for (const m of f.muss ?? []) if (!m.test(text)) problems.push(`Erwartet: ${m}`)
        for (const m of f.darfNicht ?? []) if (m.test(text)) problems.push(`Falsch: ${m}`)
        for (const m of ADVICE) if (m.test(text)) problems.push(`Empfehlung: ${m}`)
        if (/[–—]/.test(text)) problems.push('Gedankenstrich')
      } catch (e) {
        problems.push(`Abbruch: ${e instanceof Error ? e.message : e}`)
      }
      const seconds = (Date.now() - started) / 1000
      times.push(seconds)
      cost += price
      if (problems.length === 0) good++
      fs.writeFileSync(path.join(out, `${f.id}.md`), `# ${f.frage}\n\n${text}\n\n---\n${tools.join(', ')}\n${seconds.toFixed(1)} s, ${(price * 100).toFixed(2)} ct\n${problems.join('\n')}\n`)
      console.log(`${problems.length ? '✗' : '✓'} ${f.id} ${seconds.toFixed(1)} s ${(price * 100).toFixed(2)} ct  ${tools.join(', ')}${problems.length ? `\n    ${problems.join('\n    ')}` : ''}`)
    }
  }))
  times.sort((a, b) => a - b)
  console.log(`\n${good}/${list.length} bestanden, ${cost.toFixed(2)} $, Median ${times[times.length >> 1].toFixed(1)} s, längste ${times.at(-1)!.toFixed(1)} s, Ordner ${out}`)
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
