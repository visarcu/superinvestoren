'use client'

import React from 'react'
import ChartCard from '../ChartCard'
import { timeAgo } from '../../_lib/format'
import type { Period, BalancePeriod, CashFlowPeriod, NewsArticle, UnternehmenProfile } from '../../_lib/types'

interface OverviewTabProps {
  income: Period[]
  balance: BalancePeriod[]
  cashflow: CashFlowPeriod[]
  news: NewsArticle[]
  profile: UnternehmenProfile | null
}

export default function OverviewTab({ income, balance, cashflow, news, profile }: OverviewTabProps) {
  return (
    <div className="w-full max-w-6xl space-y-4">
      {/* Row 1: Net Income + EPS + Gross Profit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard data={income} dataKey="netIncome" label="Nettogewinn" color="#4ade80" />
        <ChartCard data={income} dataKey="eps" label="Gewinn je Aktie" color="#fbbf24" format="dollar" />
        <ChartCard data={income} dataKey="grossProfit" label="Bruttogewinn" color="#60a5fa" />
      </div>

      {/* Row 2: Cash Flow + Balance Sheet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operativer Cashflow" color="#22d3ee" />
        <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cashflow" color="#f97316" />
        <ChartCard data={balance} dataKey="cash" label="Barmittel" color="#34d399" />
      </div>

      {/* Row 3: News + Unternehmen Info */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Aktuelle News</p>
          {news.length > 0 ? (
            <div className="space-y-1.5">
              {news.slice(0, 5).map(a => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.08] transition-all group"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-[13px] text-white/65 group-hover:text-white/90 transition-colors truncate">
                      {a.title}
                    </p>
                    <p className="text-[11px] text-white/15 mt-0.5">
                      {a.sourceName} · {timeAgo(a.publishedAt)}
                    </p>
                  </div>
                  {a.category !== 'general' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/15">
                      {a.category}
                    </span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-xl bg-[#0c0c16] border border-white/[0.03] text-center">
              <p className="text-[13px] text-white/15">Keine aktuellen News</p>
            </div>
          )}
        </div>
        {profile && (
          <div className="lg:col-span-2">
            <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Unternehmen</p>
            <div className="bg-[#0c0c16] border border-white/[0.03] rounded-xl p-5 space-y-3.5">
              {(
                [
                  ['Name', profile.name],
                  ['Börse', profile.exchangeName],
                  ['Sektor', profile.sector],
                  ['Branche', profile.industry],
                  ['GJ Ende', profile.fiscalYearEndFormatted],
                  ['CIK', profile.cik],
                  ...(profile.phone ? [['Telefon', profile.phone]] : []),
                  ...(profile.address ? [['Sitz', `${profile.address.city}, ${profile.address.state}`]] : []),
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[12px] text-white/15">{k}</span>
                  <span className="text-[12px] text-white/50 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
