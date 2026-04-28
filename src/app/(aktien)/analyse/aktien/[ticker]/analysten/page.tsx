'use client'

import EstimatesTab from '../_components/tabs/EstimatesTab'
import { useStockContext } from '../_lib/StockContext'

export default function AnalystenPage() {
  const { ticker, estimates, isPremium, userLoading } = useStockContext()
  return <EstimatesTab ticker={ticker} estimates={estimates} isPremium={isPremium} userLoading={userLoading} />
}
