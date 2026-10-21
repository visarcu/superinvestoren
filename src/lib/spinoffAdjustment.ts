// src/lib/spinoffAdjustment.ts — Marker-Notes der Spin-off-Kostenaufteilung
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

// Das Minus ist U+2212, so steht es in allen bisher geschriebenen Notes.
const GIVEN_RE = /Kostenbasis anteilig \(\u2212(\d+(?:\.\d+)?) %\) abgegeben/g
const TAKEN_RE = /Kostenbasis anteilig \(\d+(?:\.\d+)? %\) von \S+ übernommen/

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
  return append(notes, `Spin-off ${childSymbol} vom ${spinoffDate}: Kostenbasis anteilig (\u2212${pct} %) abgegeben`)
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
