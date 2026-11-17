// src/lib/spinoffAdjustment.ts — Spin-off-Kostenaufteilung: Marker-Notes und Erkennung
//
// Bei einem Spin-off überträgt der Import einen Teil der Kostenbasis von der
// Mutter auf die Tochter und schreibt dafür gespeicherte Transaktionen um:
//   Mutter-Käufe:       price und total_value × (1 − Anteil)
//   Tochter-Einbuchung: price und total_value = anteilige Kostenbasis statt Marktwert
//
// Danach stehen beide Zeilen mit einem anderen Betrag in der DB als in der
// Broker-Datei. Wer sie später mit der Datei vergleicht (Duplikat-Check) oder
// daraus Geldflüsse summiert (Cash-Bestand), braucht den ursprünglichen Wert —
// den liefert die Marker-Note. Format und Auswertung stehen deshalb hier
// beieinander: Wer das eine ändert, muss das andere mitziehen.
//
// Der zweite Teil der Datei (ab "Spin-offs ohne Kostenaufteilung") holt die
// Aufteilung zur Laufzeit nach, wenn der Import die Mutter nicht kannte.

// Das Minus ist U+2212, so steht es in allen bisher geschriebenen Notes.
const GIVEN_RE = /Kostenbasis anteilig \(−(\d+(?:\.\d+)?) %\) abgegeben/g
const TAKEN_RE = /Kostenbasis anteilig \(\d+(?:\.\d+)? %\) von (\S+) übernommen/

function append(notes: string | null | undefined, marker: string): string {
  return notes && notes.trim().length > 0 ? `${notes} · ${marker}` : marker
}

/** Note für einen Kauf der Mutter, der einen Teil seiner Kostenbasis abgegeben hat. */
export function appendSpinoffGivenNote(
  notes: string | null | undefined,
  childSymbol: string,
  spinoffDate: string,
  pct: string
): string {
  return append(notes, `Spin-off ${childSymbol} vom ${spinoffDate}: Kostenbasis anteilig (−${pct} %) abgegeben`)
}

/** Note für die Tochter-Einbuchung, die ihre Kostenbasis von der Mutter übernommen hat. */
export function appendSpinoffTakenNote(
  notes: string | null | undefined,
  parentSymbol: string,
  pct: string
): string {
  return append(notes, `Kostenbasis anteilig (${pct} %) von ${parentSymbol} übernommen`)
}

/**
 * Notes ohne die Abgabe-Marker der Mutter. Der Marker hängt an gewöhnlichen
 * Käufen und Einbuchungen — wer an den Notes eine Corporate Action erkennen
 * will, darf ihn nicht mitlesen.
 */
export function stripSpinoffGivenMarkers(notes: string | null | undefined): string {
  return (notes || '').replace(
    /Spin-off \S+ vom \d{4}-\d{2}-\d{2}: Kostenbasis anteilig \(\u2212\d+(?:\.\d+)? %\) abgegeben/g,
    ''
  )
}

/** Spin-off-Termine, zu denen dieser Mutter-Kauf Kostenbasis abgegeben hat (aufsteigend). */
export function spinoffGivenDates(notes: string | null | undefined): string[] {
  if (!notes) return []
  const dates: string[] = []
  const re = /Spin-off \S+ vom (\d{4}-\d{2}-\d{2}): Kostenbasis anteilig \(\u2212\d+(?:\.\d+)? %\) abgegeben/g
  let match: RegExpExecArray | null
  while ((match = re.exec(notes)) !== null) dates.push(match[1])
  return dates.sort()
}

/** Hat dieser Kauf der Mutter seinen Anteil an genau diesen Spin-off schon abgegeben? */
export function hasSpinoffGiven(
  notes: string | null | undefined,
  childSymbol: string,
  spinoffDate: string
): boolean {
  return Boolean(notes?.includes(`Spin-off ${childSymbol} vom ${spinoffDate}`))
}

/**
 * Trägt die Tochter-Einbuchung schon die übernommene Kostenbasis? Ihr Preis ist
 * dann nicht mehr der Marktwert aus der Datei — und lässt sich auch nicht
 * zurückrechnen, weil nur der Anteil, nicht die Basis der Mutter vermerkt ist.
 */
export function hasSpinoffBasisTaken(notes: string | null | undefined): boolean {
  return Boolean(notes && TAKEN_RE.test(notes))
}

/**
 * Betrag eines Mutter-Kaufs vor allen Spin-off-Abgaben — so stand er in der
 * Broker-Datei und so floss er vom Konto ab. Zeilen ohne Marker kommen
 * unverändert zurück.
 *
 * Der Anteil ist in der Note auf 0,1 %-Punkte gerundet; der Fehler liegt
 * damit im Promille-Bereich — weit unter der Toleranz des Duplikat-Checks.
 */
export function valueBeforeSpinoff(value: number, notes: string | null | undefined): number {
  if (!notes) return value
  let retained = 1
  GIVEN_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = GIVEN_RE.exec(notes)) !== null) {
    retained *= 1 - Number(match[1]) / 100
  }
  return retained > 0 && retained < 1 ? value / retained : value
}

// === Spin-offs ohne Kostenaufteilung ===
//
// Nicht jeder Import kennt die Mutter: Die Trading-212-CSV bucht "Spin off"
// ohne Verweis, Trade Republic "Abspaltung / Unbundling" ebenso. Die
// Mutter-Käufe behalten dann ihren vollen Betrag, die Tochter steht mit ihrem
// Marktwert in der DB. Die TWR rechnet aber mit dem Modell der Aufteilung
// (SPIN-OFF-HINWEIS in portfolioTwr.ts) — ohne sie zählte die Tochter als
// frisches Geld, während die bereinigte Mutter-Historie ihren Anteil schon
// vorher abgezogen hat. Beim T212-Depot mit SPGI/MBGL fehlten so gut 2 Pp TWR.
//
// Die Helfer hier erkennen solche Spin-offs an den Buchungen, prüfen die
// Kurshistorie der Mutter gegen die Spin-off-Bereinigung des Kursanbieters
// und holen die Aufteilung im Speicher nach. Die DB bleibt unverändert.

/** Die Felder, die Erkennung und Aufteilung brauchen (Route-Transaktionen passen). */
export interface SpinoffTransaction {
  portfolio_id?: string
  date: string
  symbol: string
  type: string
  quantity: number
  price: number
  total_value?: number
  fee?: number
  notes?: string | null
}

export interface SpinoffEvent<T extends SpinoffTransaction = SpinoffTransaction> {
  portfolioId: string
  parentSymbol: string
  childSymbol: string
  /** Buchungstag der Tochter */
  date: string
  /** Kostenbasis beim Import schon aufgeteilt (Marker an Tochter oder Mutter) */
  costSplit: boolean
  /** Einbuchungen der Tochter zu diesem Spin-off */
  childTxs: T[]
}

/** Spin-off-Bereinigung der Mutter-Kurse beim Kursanbieter. */
export interface SpinoffPriceAdjustment {
  /** Ex-Tag: ab hier notiert die Mutter ohne Tochter-Anteil */
  exDate: string
  /** Kurse vor exDate sind beim Anbieter durch diesen Faktor geteilt (z.B. 1,057) */
  factor: number
}

export interface SplitEvent {
  date: string
  numerator: number
  denominator: number
}

// "Trading 212 · Spin-off · …", "Freedom24 Spin-off aus HON.US (…)",
// "Abspaltung / Unbundling · CSV-Import (Trade Republic)"
const SPINOFF_CHILD_NOTE = /spin-?off|abspaltung|unbundling/i
// Freedom24 nennt die Mutter mit Börsenkürzel: "Spin-off aus HON.US (US…)"
const NOTES_PARENT_RE = /aus\s+([A-Z0-9][A-Z0-9-]*)\.[A-Z]{2}\s*\(/

// Übliche Zuteilungsverhältnisse (Tochter je Mutter-Aktie und umgekehrt). Eine
// offene Liste (jedes n bis 20) träfe in großen Depots fast immer eine zweite
// Position: Im TR-Depot passt KLG 0,636 zu K 2,5439 (1:4), aber auch zu
// O 10,177 (1:16) und WBA 12,088 (1:19).
const SPINOFF_RATIOS = [1, 2, 3, 4, 5, 10, 20].flatMap(n => (n === 1 ? [1] : [n, 1 / n]))
// Broker runden die Tochter-Stücke: T212 auf acht, TR auf drei Nachkommastellen.
const SPINOFF_QTY_TOLERANCE = 0.0005

// Der Anbieter vermerkt die Bereinigung um den Ex-Tag, der Broker bucht die
// Tochter einige Tage davor oder danach (SPGI: Ex-Tag 01.07., T212 am 02.07.).
const ADJUSTMENT_DAYS_BEFORE_BOOKING = 21
const ADJUSTMENT_DAYS_AFTER_BOOKING = 7

// Kursabweichung zwischen zwei Quellen, die noch als "gleich bereinigt" gilt.
// FMP und Yahoo liegen im bereinigten Bereich 0,02 % auseinander.
const REFERENCE_TOLERANCE = 0.005

/** Einbuchung einer abgespaltenen Tochter? */
export function isSpinoffChildTransfer(tx: Pick<SpinoffTransaction, 'type' | 'notes'>): boolean {
  return tx.type === 'transfer_in' && SPINOFF_CHILD_NOTE.test(stripSpinoffGivenMarkers(tx.notes))
}

function matchesSpinoffRatio(childQty: number, parentQty: number): boolean {
  if (!(childQty > 0) || !(parentQty > 0)) return false
  return SPINOFF_RATIOS.some(ratio => Math.abs(childQty - parentQty * ratio) <= SPINOFF_QTY_TOLERANCE)
}

function sharesHeldBefore(transactions: SpinoffTransaction[], date: string): Map<string, number> {
  const held = new Map<string, number>()
  for (const tx of transactions) {
    if (!tx.symbol || tx.date >= date) continue
    const qty = Number(tx.quantity) || 0
    if (tx.type === 'buy' || tx.type === 'transfer_in') held.set(tx.symbol, (held.get(tx.symbol) || 0) + qty)
    else if (tx.type === 'sell' || tx.type === 'transfer_out') held.set(tx.symbol, (held.get(tx.symbol) || 0) - qty)
  }
  return held
}

/**
 * Spin-offs in den Buchungen finden — je Depot, Tochter und Buchungstag eins.
 *
 * Die Mutter kommt aus dem Übernahme-Marker der Tochter, aus den Notes
 * (Freedom24) oder — wenn der Broker sie nicht nennt — aus dem
 * Zuteilungsverhältnis: genau eine Position des Depots, deren Bestand am
 * Vortag glatt zur Tochter-Stückzahl passt (SPGI 2,235 → MBGL 2,235). Ohne
 * eindeutige Mutter fehlt der Spin-off in der Liste.
 */
export function detectSpinoffEvents<T extends SpinoffTransaction>(transactions: T[]): SpinoffEvent<T>[] {
  const childrenByKey = new Map<string, T[]>()
  for (const tx of transactions) {
    if (!tx.symbol || !tx.date || !isSpinoffChildTransfer(tx)) continue
    const key = `${tx.portfolio_id || ''}|${tx.symbol}|${tx.date}`
    const list = childrenByKey.get(key)
    if (list) list.push(tx)
    else childrenByKey.set(key, [tx])
  }

  const events: SpinoffEvent<T>[] = []
  childrenByKey.forEach(childTxs => {
    const portfolioId = childTxs[0].portfolio_id || ''
    const childSymbol = childTxs[0].symbol
    const date = childTxs[0].date
    const depotTxs = transactions.filter(tx => (tx.portfolio_id || '') === portfolioId)

    // Eine aufgeteilte Zeile genügt: Doppelt gebuchte Tochter-Zeilen (Re-Import)
    // ohne Marker gehören zum selben, schon aufgeteilten Spin-off.
    const costSplit =
      childTxs.some(tx => hasSpinoffBasisTaken(tx.notes)) ||
      depotTxs.some(tx => hasSpinoffGiven(tx.notes, childSymbol, date))

    const held = sharesHeldBefore(depotTxs, date)
    held.delete(childSymbol)

    let parentSymbol: string | null = null
    for (const tx of childTxs) {
      const taken = tx.notes?.match(TAKEN_RE)?.[1]
      if (taken) {
        parentSymbol = taken
        break
      }
      const named = stripSpinoffGivenMarkers(tx.notes).match(NOTES_PARENT_RE)?.[1]
      if (named && (held.get(named) || 0) > 0) {
        parentSymbol = named
        break
      }
    }
    if (!parentSymbol) {
      const childQty = childTxs.reduce((sum, tx) => sum + (Number(tx.quantity) || 0), 0)
      const candidates = [...held].filter(([, qty]) => matchesSpinoffRatio(childQty, qty))
      if (candidates.length === 1) parentSymbol = candidates[0][0]
    }
    if (!parentSymbol || parentSymbol === childSymbol) return

    events.push({ portfolioId, parentSymbol, childSymbol, date, costSplit, childTxs })
  })
  return events
}

/**
 * Die Spin-off-Bereinigung des Anbieters zu diesem Buchungstag. Yahoo führt
 * Spin-offs als Split mit krummem Verhältnis (SPGI 1057:1000); echte Splits
 * (ganzzahlig) und Verhältnisse unter 1 (HON 1907:2000) sind keine
 * Spin-off-Bereinigung im Sinne der Aufteilung.
 */
export function findSpinoffPriceAdjustment(
  splits: SplitEvent[],
  bookingDate: string
): SpinoffPriceAdjustment | null {
  const booking = Date.parse(bookingDate)
  let best: SpinoffPriceAdjustment | null = null
  let bestDistance = Infinity
  for (const split of splits) {
    const factor = split.numerator / split.denominator
    if (!(factor >= 1.01 && factor <= 10)) continue
    if (Math.abs(factor - Math.round(factor)) < 1e-6) continue
    const days = (Date.parse(split.date) - booking) / 86400000
    if (days < -ADJUSTMENT_DAYS_BEFORE_BOOKING || days > ADJUSTMENT_DAYS_AFTER_BOOKING) continue
    if (Math.abs(days) < bestDistance) {
      best = { exDate: split.date, factor }
      bestDistance = Math.abs(days)
    }
  }
  return best
}

/**
 * Bringt die Kurshistorie der Mutter vor dem Ex-Tag vollständig auf den
 * bereinigten Stand. Gibt die Zahl der korrigierten Tage zurück.
 *
 * FMP bereinigt nicht immer die ganze Historie: SPGI ist nur vom 02.06. bis
 * 30.06.2026 durch 1,057 geteilt, davor unbereinigt. Im Chart entsteht daraus
 * am 02.06. ein Kurssturz von −7,9 % (echt: −2,6 %), und die Aufteilung der
 * Käufe passt nur zu einem Teil der Kurse. Erkannt wird das am Abstand zur
 * Referenzreihe (Yahoo, durchgehend bereinigt): Liegt FMP um genau den
 * Bereinigungsfaktor darüber, ist der Tag unbereinigt — das ist der Sprung,
 * der sonst als Kursbewegung durchginge. Tage ohne Referenzkurs übernehmen
 * den Befund des Vortags; Tage, die zu keinem der beiden Stände passen,
 * bleiben unangetastet.
 */
export function completeSpinoffAdjustment(
  prices: Map<string, number>,
  reference: Map<string, number>,
  adjustment: SpinoffPriceAdjustment
): number {
  const dates = [...prices.keys()].filter(date => date < adjustment.exDate).sort()
  let unadjusted = false
  let repaired = 0
  for (const date of dates) {
    const price = prices.get(date) || 0
    const ref = reference.get(date) || 0
    if (price > 0 && ref > 0) {
      const ratio = price / ref
      if (Math.abs(ratio / adjustment.factor - 1) < REFERENCE_TOLERANCE) unadjusted = true
      else if (Math.abs(ratio - 1) < REFERENCE_TOLERANCE) unadjusted = false
      else continue
    }
    if (unadjusted && price > 0) {
      prices.set(date, price / adjustment.factor)
      repaired++
    }
  }
  return repaired
}

const phase = (tx: SpinoffTransaction) => (tx.type === 'buy' || tx.type === 'transfer_in' ? 0 : 1)

/**
 * Bestand und Kostenbasis (Durchschnittskosten, Käufe inkl. Gebühr) einer
 * Position aus Buchungen vor dem Stichtag. Am selben Tag zählen Zugänge vor
 * Abgängen.
 */
export function positionBefore(
  txs: SpinoffTransaction[],
  date: string
): { shares: number; basis: number } {
  const before = txs
    .filter(tx => tx.date < date)
    .sort((a, b) => a.date.localeCompare(b.date) || phase(a) - phase(b))
  let shares = 0
  let basis = 0
  for (const tx of before) {
    const qty = Number(tx.quantity) || 0
    const value = Number(tx.total_value) || Math.abs(qty * (Number(tx.price) || 0))
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      shares += qty
      basis += value + (tx.type === 'buy' ? Math.abs(Number(tx.fee) || 0) : 0)
    } else if (tx.type === 'sell' || tx.type === 'transfer_out') {
      const avg = shares > 0 ? basis / shares : 0
      shares -= qty
      basis -= qty * avg
    }
  }
  return { shares, basis }
}

/**
 * Anteil der Tochter am Wert nach dem Spin-off: Tochter-Stücke × Kurs gegen
 * Tochter + Mutter-Bestand am Vortag × Kurs, beide Schlusskurse vom
 * Buchungstag und in derselben Währung. Null, wenn ein Kurs fehlt oder der
 * Anteil unplausibel ist (≥ 95 % hieße: Mutter praktisch wertlos).
 */
export function spinoffMarketValueFraction<T extends SpinoffTransaction>({
  event,
  parentTxs,
  parentPrice,
  childPrice,
}: {
  event: SpinoffEvent<T>
  /** Buchungen der Mutter im selben Depot */
  parentTxs: T[]
  parentPrice: number
  childPrice: number
}): number | null {
  const childQty = event.childTxs.reduce((sum, tx) => sum + (Number(tx.quantity) || 0), 0)
  const { shares } = positionBefore(parentTxs, event.date)
  if (!(childQty > 0) || !(shares > 0) || !(parentPrice > 0) || !(childPrice > 0)) return null
  const childValue = childQty * childPrice
  const fraction = childValue / (shares * parentPrice + childValue)
  return fraction > 0 && fraction < 0.95 ? fraction : null
}

export interface SpinoffRowUpdate {
  id: string
  price: number
  total_value: number
  notes: string
}

/**
 * Kostenaufteilung für den Import (CSVImportModal): Anteil aus den Marktwerten
 * am Buchungstag (spinoffMarketValueFraction), Zeilen wie applySpinoffCostSplit.
 * Rechnet auf Kopien und liefert nur die geänderten Zeilen, auf die
 * DB-Genauigkeit gerundet — die Mutter zuerst, die Tochter zuletzt: Erst deren
 * Übernahme-Marker schließt die Aufteilung ab. Null, wenn Kurse, Bestand oder
 * Kostenbasis fehlen.
 */
export function planSpinoffCostSplit<T extends SpinoffTransaction & { id: string }>({
  event,
  parentTxs,
  parentPrice,
  childPrice,
}: {
  event: SpinoffEvent<T>
  /** Buchungen der Mutter im selben Depot */
  parentTxs: T[]
  /** Schlusskurse am Buchungstag, beide in EUR */
  parentPrice: number
  childPrice: number
}): { fraction: number; updates: SpinoffRowUpdate[] } | null {
  const fraction = spinoffMarketValueFraction({ event, parentTxs, parentPrice, childPrice })
  if (fraction === null) return null

  const originals = [...parentTxs, ...event.childTxs]
  const copies = new Map(originals.map(tx => [tx.id, { ...tx }]))
  applySpinoffCostSplit({
    event: { ...event, childTxs: event.childTxs.map(tx => copies.get(tx.id)!) },
    parentTxs: parentTxs.map(tx => copies.get(tx.id)!),
    fraction,
    exDate: event.date,
  })
  const updates = originals
    .filter(tx => copies.get(tx.id)!.notes !== tx.notes)
    .map(tx => {
      const next = copies.get(tx.id)!
      return {
        id: tx.id,
        price: Number((Number(next.price) || 0).toFixed(4)),
        total_value: Number((Number(next.total_value) || 0).toFixed(2)),
        notes: next.notes || '',
      }
    })
  return updates.length > 0 ? { fraction, updates } : null
}

/**
 * Holt die Kostenaufteilung des Imports (CSVImportModal) im Speicher nach,
 * für einen Spin-off, dessen Mutter der Import nicht kannte. Ändert die
 * übergebenen Objekte.
 *
 * fraction > 0 — die Mutter-Historie ist um den Spin-off bereinigt (Faktor f,
 *   fraction = 1 − 1/f): Mutter-Käufe vor dem Ex-Tag geben den Anteil ab, die
 *   Tochter übernimmt ihn als Kostenbasis. Beide tragen dieselben Marker wie
 *   nach dem Import, flowAmount() liefert also weiter den vollen Kaufpreis.
 * fraction = 0 — keine Bereinigung bekannt, die Mutter-Kurse fallen am Ex-Tag
 *   um den Tochter-Anteil: Die Tochter ist dann der abgespaltene Teil der
 *   Mutter und bringt keine eigene Kostenbasis mit. So zählt sie auch in der
 *   TWR nicht als frisches Geld.
 */
export function applySpinoffCostSplit<T extends SpinoffTransaction>({
  event,
  parentTxs,
  fraction,
  exDate,
}: {
  event: SpinoffEvent<T>
  /** Buchungen der Mutter im selben Depot */
  parentTxs: T[]
  fraction: number
  exDate: string
}): void {
  const childQty = event.childTxs.reduce((sum, tx) => sum + (Number(tx.quantity) || 0), 0)
  if (!(childQty > 0)) return

  if (!(fraction > 0 && fraction < 0.95)) {
    for (const child of event.childTxs) {
      child.price = 0
      child.total_value = 0
    }
    return
  }

  // Auf die Marker-Genauigkeit runden: valueBeforeSpinoff rechnet mit genau
  // diesem Wert zurück, die Kaufpreise im Cash-Konto stimmen dann exakt.
  const pct = (fraction * 100).toFixed(1)
  const share = Number(pct) / 100

  // Kostenbasis der Mutter am Ex-Tag (Durchschnittskosten)
  const { basis: parentBasis } = positionBefore(parentTxs, exDate)
  if (!(parentBasis > 0)) return

  for (const tx of parentTxs) {
    if (tx.date >= exDate) continue
    if (tx.type !== 'buy' && tx.type !== 'transfer_in') continue
    if (hasSpinoffGiven(tx.notes, event.childSymbol, event.date)) continue
    const value = Number(tx.total_value) || 0
    const price = Number(tx.price) || 0
    tx.price = price * (1 - share)
    tx.total_value = value * (1 - share)
    tx.notes = appendSpinoffGivenNote(tx.notes, event.childSymbol, event.date, pct)
  }

  const childBasis = parentBasis * share
  for (const child of event.childTxs) {
    const qty = Number(child.quantity) || 0
    child.total_value = childBasis * (qty / childQty)
    child.price = qty > 0 ? child.total_value / qty : 0
    child.notes = appendSpinoffTakenNote(child.notes, event.parentSymbol, pct)
  }
}
