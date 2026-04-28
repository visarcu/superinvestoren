'use client'

import KpisTab from '../_components/tabs/KpisTab'
import { useStockContext } from '../_lib/StockContext'

export default function KpisPage() {
  const { ticker, kpis, isPremium, userLoading } = useStockContext()
  return <KpisTab ticker={ticker} kpis={kpis} isPremium={isPremium} userLoading={userLoading} />
}
