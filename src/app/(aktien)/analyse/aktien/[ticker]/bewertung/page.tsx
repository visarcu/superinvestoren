'use client'

import BewertungTab from '../_components/tabs/BewertungTab'
import { useStockContext } from '../_lib/StockContext'

export default function BewertungPage() {
  const { ticker } = useStockContext()
  return <BewertungTab ticker={ticker} />
}
