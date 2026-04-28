'use client'

import NewsTab from '../_components/tabs/NewsTab'
import { useStockContext } from '../_lib/StockContext'

export default function NewsPage() {
  const { news, ticker } = useStockContext()
  return <NewsTab news={news} ticker={ticker} />
}
