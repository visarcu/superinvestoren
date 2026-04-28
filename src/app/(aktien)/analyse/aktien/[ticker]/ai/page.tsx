'use client'

import AiTab from '../_components/tabs/AiTab'
import { useStockContext } from '../_lib/StockContext'

export default function AiPage() {
  const { ticker, aiAnalysis, aiLoading, startAiAnalysis, isPremium, userLoading } = useStockContext()
  return (
    <AiTab
      ticker={ticker}
      aiAnalysis={aiAnalysis}
      aiLoading={aiLoading}
      startAnalysis={startAiAnalysis}
      isPremium={isPremium}
      userLoading={userLoading}
    />
  )
}
