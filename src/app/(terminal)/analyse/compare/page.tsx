// src/app/analyse/compare/page.tsx
import StockComparisonPage from '@/components/StockComparisonPage'

export const metadata = {
  title: 'Aktien-Vergleich | FinClue',
  description: 'Vergleiche mehrere Aktien mit verschiedenen Kennzahlen',
}

export default function ComparePage() {
  return <StockComparisonPage />
}