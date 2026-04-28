// /analyse/vergleich — Fey-Style Aktien-Vergleich (ChartBuilder im (aktien)-Layout)
// Wiederverwendet die existing ChartBuilder-Komponente aus prod, jetzt unter dem
// neuen Fey-Layout mit FeyTopBar und FeyBottomNav.
import ChartBuilder from '@/components/chart-builder/ChartBuilder'

export const metadata = {
  title: 'Vergleich | Finclue',
  description: 'Mehrere Aktien gegenüberstellen mit Chart Builder',
}

export default function VergleichPage() {
  return <ChartBuilder />
}
