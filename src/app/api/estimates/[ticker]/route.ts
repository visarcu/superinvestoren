// src/app/api/estimates/[ticker]/route.ts
//
// Alias für /api/analyst-estimates/[ticker]: Schätzungen in der Kurswährung,
// jede Zeile mit `currency`. Früher reichte diese Route FMP roh durch, also
// in der Berichtswährung. Folge: TSM zeigte ein "KGV Erw." von 0,7x statt
// rund 21x und Umsätze in TWD mit Dollarzeichen. Der Pfad bleibt bestehen,
// weil /api/stock-analysis ihn serverseitig aufruft.
export { GET } from '../../analyst-estimates/[ticker]/route'
