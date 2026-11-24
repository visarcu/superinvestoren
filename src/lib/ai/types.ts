// src/lib/ai/types.ts
// Gemeinsame Typen der Finclue AI (Server und Client, ohne Server-Abhängigkeiten).

/** Grafik, die ein Werkzeug liefert. Die KI setzt nur die ID in den Text. */
export type AiBlock =
  | {
      id: string
      type: 'linie'
      titel: string
      einheit: string
      serien: Array<{ name: string; punkte: Array<[string, number]> }>
      /** waagerechte Vergleichslinie, z. B. der Durchschnitt */
      referenz?: { label: string; wert: number }
      nachkommastellen?: number
      /** x-Werte sind Uhrzeiten (HH:MM) statt Datumsangaben */
      uhrzeit?: boolean
      ohneNull?: boolean
    }
  | {
      id: string
      type: 'balken'
      titel: string
      einheit: string
      werte: Array<{ name: string; wert: number; hervor?: boolean }>
      nachkommastellen?: number
    }
  | {
      id: string
      type: 'saeulen'
      titel: string
      einheit: string
      kategorien: string[]
      serien: Array<{ name: string; werte: Array<number | null> }>
      nachkommastellen?: number
    }
  | {
      id: string
      type: 'zeitleiste'
      titel: string
      eintraege: Array<{ zeit: string; text: string; quelle: string; url?: string | null }>
    }
  | {
      id: string
      type: 'tabelle'
      titel: string
      spalten: string[]
      zeilen: string[][]
    }

export interface AiSource {
  label: string
  url?: string | null
  /** Stand der Daten, fertig formatiert */
  stand?: string | null
}

export interface AiStep {
  id: string
  label: string
  status: 'laeuft' | 'fertig' | 'fehler'
}

export interface AiCheck {
  /** Zahlen im Text, die geprüft wurden */
  gesamt: number
  belegt: number
  /** Zahlen ohne Beleg, so wie sie im Text stehen */
  offen: string[]
}

export interface AiQuota {
  used: number
  limit: number
  /** monatlich (Premium) oder einmalig (kostenlos) */
  period: 'monat' | 'gesamt'
}

/** Woher die Frage kommt, z. B. die geöffnete Aktie oder das geöffnete Depot */
export interface AiContext {
  symbol?: string | null
  name?: string | null
  /** Depotzugriff eingeschaltet (Schalter an der Frageleiste) */
  depot?: boolean
  /** geöffnetes Depot: 'all' oder ID, nur auf der Depotseite */
  depotId?: string | null
}

export interface AiMessagePayload {
  blocks: AiBlock[]
  quellen: AiSource[]
  pruefung: AiCheck | null
  schritte: string[]
  fragen: string[]
  abgeschlossen?: boolean
  /** Frage braucht das Depot, der Zugriff war aber aus */
  depotNoetig?: boolean
  /** Antwort enthält Daten aus dem eigenen Depot */
  mitDepot?: boolean
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  payload: AiMessagePayload | null
  createdAt: string
}

export interface AiThreadSummary {
  id: string
  title: string
  updatedAt: string
}

/** Ereignisse des Antwort-Streams (SSE) */
export type AiEvent =
  | { type: 'start'; quota: AiQuota }
  | { type: 'schritt'; schritt: AiStep }
  | { type: 'block'; block: AiBlock }
  | { type: 'text'; delta: string }
  | { type: 'ersetzen'; text: string }
  | { type: 'fertig'; threadId: string; payload: AiMessagePayload; text: string; quota: AiQuota | null }
  | { type: 'fehler'; code: string; message: string; quota: AiQuota | null }
