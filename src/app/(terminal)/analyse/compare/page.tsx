// src/app/analyse/compare/page.tsx
import StockComparisonPage from '@/components/StockComparisonPage'

export const metadata = {
  title: 'Aktien-Vergleich | Finclue',
  description: 'Vergleiche mehrere Aktien mit verschiedenen Kennzahlen',
}

export default function ComparePage() {
  return <StockComparisonPage />
}