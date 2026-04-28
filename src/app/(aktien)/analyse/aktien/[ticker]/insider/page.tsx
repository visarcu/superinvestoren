'use client'

import InsiderTab from '../_components/tabs/InsiderTab'
import { useStockContext } from '../_lib/StockContext'

export default function InsiderPage() {
  const { ticker, isPremium, userLoading } = useStockContext()
  return <InsiderTab ticker={ticker} isPremium={isPremium} userLoading={userLoading} />
}
