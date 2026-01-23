// src/app/analyse/etfs/[symbol]/metadata.ts
import { Metadata } from 'next'

interface Props {
  params: { symbol: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const symbol = params.symbol.toUpperCase()
  
  return {
    title: `${symbol} ETF Analyse | Finclue`,
    description: `Detaillierte Analyse des ${symbol} ETFs mit Live-Kursen, Top Holdings, Sektor-Allokation und Performance-Kennzahlen`
  }
}