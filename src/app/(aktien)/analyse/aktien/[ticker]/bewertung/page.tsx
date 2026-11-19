'use client'

import BewertungTab from '../_components/tabs/BewertungTab'
import { useStockContext } from '../_lib/StockContext'

export default function BewertungPage() {
  const { ticker, income, cashflow, ownerEarnings, quote, financialSource } = useStockContext()
  return (
    <BewertungTab
      ticker={ticker}
      income={income}
      cashflow={cashflow}
      ownerEarnings={ownerEarnings}
      quote={quote}
      financialSource={financialSource}
    />
  )
}
