'use client'

import FinancialsTab from '../_components/tabs/FinancialsTab'
import { useStockContext } from '../_lib/StockContext'

export default function FinancialsPage() {
  const {
    ticker,
    income,
    balance,
    cashflow,
    kpis,
    estimates,
    financialPeriod,
    setFinancialPeriod,
    setExpandedChart,
    isPremium,
    userLoading,
    financialSource,
    financialNotice,
  } = useStockContext()

  return (
    <FinancialsTab
      ticker={ticker}
      income={income}
      balance={balance}
      cashflow={cashflow}
      kpis={kpis}
      estimates={estimates}
      financialPeriod={financialPeriod}
      setFinancialPeriod={setFinancialPeriod}
      setExpandedChart={setExpandedChart}
      isPremium={isPremium}
      userLoading={userLoading}
      dataSource={financialSource}
      dataNotice={financialNotice}
    />
  )
}
