// /analyse/aktien/[ticker] – Default-Route = Overview-Tab
// Layout (siehe layout.tsx) lädt alle Daten und stellt sie via Context bereit.
'use client'

import OverviewTab from './_components/tabs/OverviewTab'
import { useStockContext } from './_lib/StockContext'

export default function OverviewPage() {
  const { income, balance, cashflow, news, profile } = useStockContext()
  return <OverviewTab income={income} balance={balance} cashflow={cashflow} news={news} profile={profile} />
}
