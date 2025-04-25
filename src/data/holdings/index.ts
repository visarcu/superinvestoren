// src/data/holdings/index.ts

// (1) Importiere deine JSONs
import buffett              from './buffett.json'
import buffettPrevious      from './buffett-previous.json'
import einhorn              from './einhorn.json'
import einhornPrevious      from './einhorn-previous.json'
import pabrai               from './pabrai.json'
import pabraiPrevious       from './pabrai-previous.json'
// … weitere …

// (2) Typ für den Inhalt
export interface HoldingsFile {
  date: string
  positions: Array<{
    cusip: string
    name:  string
    shares: number
    value:  number
  }>
}

// (3) Zusammenführen in ein typisiertes Record
const holdingsData: Record<string, HoldingsFile> = {
  buffett:          buffett,
  'buffett-previous': buffettPrevious,
  einhorn:          einhorn,
  'einhorn-previous': einhornPrevious,
  pabrai:           pabrai,
  'pabrai-previous': pabraiPrevious,
  // … immer paarweise slug / slug-previous …
}

export default holdingsData