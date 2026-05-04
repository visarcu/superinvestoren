// Re-Export — die echte Implementierung liegt jetzt unter
// src/components/portfolio/TickerSearch.tsx (shared zwischen v1 und v2).
// Dieser Re-Export bleibt für Backward-Kompatibilität, falls noch andere
// Module über den alten Pfad importieren.

export { default } from '@/components/portfolio/TickerSearch'
export type { SearchedStock } from '@/components/portfolio/TickerSearch'
