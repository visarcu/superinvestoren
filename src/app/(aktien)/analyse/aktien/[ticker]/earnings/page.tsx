'use client'

import EarningsTab from '../_components/tabs/EarningsTab'
import { useStockContext } from '../_lib/StockContext'

export default function EarningsPage() {
  const { ticker, earnings, isPremium, userLoading } = useStockContext()
  return <EarningsTab ticker={ticker} earnings={earnings} isPremium={isPremium} userLoading={userLoading} />
}
