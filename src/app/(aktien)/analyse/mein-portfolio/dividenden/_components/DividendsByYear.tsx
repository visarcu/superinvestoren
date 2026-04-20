'use client'

import React, { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

interface YearDatum {
  year: string
  total: number
  count: number
}

interface DividendsByYearProps {
  data: YearDatum[]
  formatCurrency: (v: number) => string
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

export default function DividendsByYear({ data, formatCurrency }: DividendsByYearProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.total, 0), [data])
  const avgPerYear = data.length > 0 ? total / data.length : 0

  if (data.length === 0) return null

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-[13px] font-semibold text-white/80">Verlauf nach Jahr</h2>
          <p className="text-[11px] text-white/25 mt-0.5">
            Ø {formatCurrency(avgPerYear)} / Jahr · {data.length} {data.length === 1 ? 'Jahr' : 'Jahre'}
          </p>
        </div>
        <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatCurrency(total)}</p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as YearDatum
                return (
                  <div style={TT}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{p.year}</p>
                    <p style={{ color: '#4ade80', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
                      {formatCurrency(p.total)}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                      {p.count} {p.count === 1 ? 'Zahlung' : 'Zahlungen'}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill="#4ade80" opacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
