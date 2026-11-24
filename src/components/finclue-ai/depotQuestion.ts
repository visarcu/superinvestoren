// Klingt eine Frage nach dem eigenen Depot? Dann fragt die Oberfläche vor dem
// Absenden, ob Finclue AI das Depot lesen darf. Trifft sie daneben, entscheidet
// am Ende die KI (Marke [[depot-einschalten]]).

const THING = '(?:depots?|portfolios?|positionen|position|aktien|etfs?|exposure|anteil\\w*|\\w+anteil|dividenden?|rendite|gewinne?|verluste?|käufe|verkäufe|sparpl(?:an|äne)|gebühren|vermögen|bestand|wertpapiere?|klumpen\\w*)'
const PATTERNS = [
  new RegExp(`\\b(?:mein|meine|meinem|meinen|meiner|meines|eigene[mnrs]?)\\b[^.?!]{0,40}\\b${THING}\\b`, 'i'),
  /\b(?:hab|habe|halte|besitze|hatte|investiere|verdiene)\b[^.?!]{0,50}\bich\b/i,
  /\bich\b[^.?!]{0,70}\b(?:investiert|investiere|gekauft|verkauft|eingezahlt|verdient|halte|besitze|diversifiziert|gezahlt|bekommen|im depot)\b/i,
  /\bschlage ich\b|\bbin ich\b[^.?!]{0,50}\b(?:investiert|diversifiziert|im plus|im minus|aufgestellt)\b/i,
]

export function looksLikeDepotQuestion(text: string): boolean {
  return PATTERNS.some(p => p.test(text))
}
