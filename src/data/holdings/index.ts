// src/data/holdings/index.ts

// 1) Alle JSONs, die fetch13f.js erzeugt hat:
import buffett        from './buffett.json'
import buffettPrev    from './buffett-previous.json'

import ackman         from './ackman.json'
import ackmanPrev     from './ackman-previous.json'

import burry          from './burry.json'
import burryPrev      from './burry-previous.json'

import marks          from './marks.json'
import marksPrev      from './marks-previous.json'

import spier          from './spier.json'
import spierPrev      from './spier-previous.json'

import pabrai         from './pabrai.json'
import pabraiPrev     from './pabrai-previous.json'

import einhorn        from './einhorn.json'
import einhornPrev    from './einhorn-previous.json'

import klarman        from './klarman.json'
import klarmanPrev    from './klarman-previous.json'

import druckenmiller  from './druckenmiller.json'
import druckenmillerPrev from './druckenmiller-previous.json'

import lilu  from './lilu.json'
import liluPrev from './lilu-previous.json'

import altarockpartners from './altarockpartners.json'
import altarockpartnersPrev from './altarockpartners-previous.json'

import dogecox from './dogecox.json'
import dogecoxPrev from './dogecox.json'

import gates  from './gates.json'
import gatesPrev from './gates-previous.json'

import coleman  from './coleman.json'
import colemanPrev from './coleman-previous.json'

import akre  from './akre.json'
import akrePrev from './akre-previous.json'

import greenberg  from './greenberg.json'
import greenbergPrev from './greenberg-previous.json'

import greenhaven  from './greenhaven.json'
import greenhavenPrev from './greenhaven-previous.json'

//import terry-smith  from './terry-smith.json'
//import terry-smithPrev from './terry-smith-previous.json'

//import smith      from './smith.json'
//import smithPrev  from './smith-previous.json'




// … nur echte Dateien importieren …

// 2) Typ für den Inhalt
export interface HoldingsFile {
  date: string | null
  positions: Array<{
    cusip: string
    name:  string
    shares: number
    value: number
  }>
}

// 3) Zusammensetzen in ein Record
const holdingsData: Record<string, HoldingsFile> = {
  buffett:             buffett,
  'buffett-previous':  buffettPrev,

  ackman:              ackman,
 'ackman-previous':   ackmanPrev,

  burry:               burry,
  'burry-previous':    burryPrev,

  marks:               marks,
  'marks-previous':    marksPrev,

  spier:               spier,
  'spier-previous':    spierPrev,

  pabrai:              pabrai,
  'pabrai-previous':   pabraiPrev,

  einhorn:             einhorn,
  'einhorn-previous':  einhornPrev,

  klarman:             klarman,
  'klarman-previous':  klarmanPrev,

  druckenmiller:       druckenmiller,
  'druckenmiller-previous': druckenmillerPrev,


  lilu:       lilu,
  'lilu-previous': liluPrev,

  altarockpartners:       altarockpartners,
  'altarockpartners-previous': altarockpartnersPrev,

  gates:       gates,
  'gates-previous': gatesPrev,

  coleman:       coleman,
  'coleman-previous': colemanPrev,


  akre:       akre,
  'akre-previous': akrePrev,

  greenberg:       greenberg,
  'greenberg-previous': greenbergPrev,

  greenhaven:       greenhaven,
  'greenhaven-previous': greenhavenPrev,


  //dogecox:       dogecox,
  //'dogecox-previous': dogecoxPrev,





 // smith:            smith,
  //'smith-previous': smithPrev,







  // … bei Bedarf hier weitere Paare ergänzen …
}

export default holdingsData