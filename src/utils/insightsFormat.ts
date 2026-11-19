// src/utils/insightsFormat.ts
// Reine Anzeige-Helfer der Superinvestor-Insights (ohne Holdings-Import),
// damit Client-Komponenten sie nutzen können, ohne das 38-MB-Datenpaket zu laden.

// ========== INVESTOR NAMES MAPPING ==========
export const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  einhorn: 'David Einhorn',
  ackman: 'Bill Ackman',
  thiel: 'Peter Thiel',
  gates: 'Bill & Melinda Gates Foundation Trust',
  torray: 'Torray Investment Partners LLC',
  davis: 'Christoper Davis',
  altarockpartners: 'Mark Massey',
  greenhaven: 'Edgar Wachenheim III',
  vinall: 'Robert Vinall',
  meridiancontrarian: 'Meridian Contrarian Fund',
  hawkins: ' Mason Hawkins',
  olstein: 'Robert Olstein',
  peltz: 'Nelson Peltz',
  gregalexander: 'Greg Alexander',
  miller: 'Bill Miller',
  tangen: 'Nicolai Tangen',
  burry: 'Michael Burry',
  pabrai: 'Mohnish Pabrai',
  kantesaria: 'Dev Kantesaria',
  greenblatt: 'Joel Greenblatt',
  fisher: 'Ken Fisher',
  soros: 'George Soros',
  haley: 'Connor Haley',
  vandenberg: 'Arnold Van Den Berg',
  dodgecox: 'Dodge & Cox',
  pzena: 'Richard Pzena',
  mairspower: 'Mairs & Power Inc',
  weitz: 'Wallace Weitz',
  yacktman: 'Yacktman Asset Management LP',
  gayner: 'Thomas Gayner',
  armitage: 'John Armitage',
  burn: 'Harry Burn - Sound Shore',
  cantillon: 'William von Mueffling - Cantillon Capital Management',
  jensen: 'Eric Schoenstein - Jensen Investment Management',
  abrams: 'David Abrams - Abrams Capital Management',
  firsteagle: 'First Eagle Investment Management',
  polen: 'Polen Capital Management',
  tarasoff: 'Josh Tarasoff',
  rochon: 'Francois Rochon',
  russo: 'Thomas Russo',
  akre: 'Chuck Akre',
  triplefrond: 'Triple Frond Partners',
  whitman: 'Marty Whitman',
  patientcapital: 'Samantha McLemore',
  klarman: 'Seth Klarman',
  makaira: 'Tom Bancroft',
  ketterer: 'Sarah Ketterer',
  train: 'Lindsell Train',
  smith: 'Terry Smith',
  watsa: 'Prem Watsa',
  lawrence: 'Bryan Lawrence',
  dorsey: 'Pat Dorsey',
  hohn: 'Chris Hohn',
  hong: 'Dennis Hong',
  kahn: 'Kahn Brothers Group',
  chou: 'Francis Chou',
  coleman: 'Chase Coleman',
  dalio: 'Ray Dalio',
  loeb: 'Daniel Loeb',
  tepper: 'David Tepper',
  icahn: 'Carl Icahn',
  lilu: 'Li Lu',
  ainslie: 'Lee Ainslie',
  greenberg: 'Glenn Greenberg',
  mandel: 'Stephen Mandel',
  marks: 'Howard Marks',
  rogers: 'John Rogers',
  ariel_appreciation: 'Ariel Appreciation Fund',
  ariel_focus: 'Ariel Focus Fund',
  cunniff: 'Ruane, Cunniff & Goldfarb L.P.',
  spier: 'Guy Spier',
  druckenmiller: 'druckenmiller',
}

// ========== HELPER FUNCTIONS ==========

export function getPeriodFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

export function formatCurrencyGerman(amount: number, showCurrency = true): string {
  const suffix = showCurrency ? ' $' : ''
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (absAmount >= 1_000_000_000) {
    return `${sign}${(absAmount / 1_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd.${suffix}`
  } else if (absAmount >= 1_000_000) {
    return `${sign}${(absAmount / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio.${suffix}`
  } else if (absAmount >= 1_000) {
    return `${sign}${(absAmount / 1_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tsd.${suffix}`
  }
  return `${sign}${absAmount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`
}

export function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}
