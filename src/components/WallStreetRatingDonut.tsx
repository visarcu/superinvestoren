// src/components/WallStreetRatingDonut.tsx
'use client'

import React from 'react'
import Card from '@/components/Card'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts'

interface Props {
  recs: {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }
}

const COLORS = ['#164E3D', '#247C46', '#B59C1A', '#C0392B', '#78281F']
const TOOLTIP_STYLES = {
  wrapperStyle: { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle: { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle:   { color: '#F3F4F6' },
  itemStyle:    { color: '#FFFFFF' },
}

export default function WallStreetRatingDonut({ recs }: Props) {
  const data = [
    { name: 'Strong Buy',  value: recs.strongBuy  },
    { name: 'Buy',         value: recs.buy        },
    { name: 'Hold',        value: recs.hold       },
    { name: 'Sell',        value: recs.sell       },
    { name: 'Strong Sell', value: recs.strongSell },
  ]

  return (
    <Card className="p-6">
      {/* Überschrift */}
      <h2 className="text-2xl font-semibold mb-4">Wall Street Rating</h2>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut-Chart */}
        <div className="w-[160px] h-[160px] mx-auto md:mx-0">
          <PieChart width={160} height={160}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} />
              ))}
            </Pie>
            <RechartsTooltip {...TOOLTIP_STYLES} />
          </PieChart>
        </div>

        {/* Legende */}
        <ul className="grid grid-cols-5 gap-4 text-center justify-items-center w-full max-w-md mx-auto md:mx-0">
          <li>
            <span className="block text-green-800 font-bold">{recs.strongBuy}</span>
            <small className="text-gray-400">Strong Buy</small>
          </li>
          <li>
            <span className="block text-green-600 font-bold">{recs.buy}</span>
            <small className="text-gray-400">Buy</small>
          </li>
          <li>
            <span className="block text-yellow-500 font-bold">{recs.hold}</span>
            <small className="text-gray-400">Hold</small>
          </li>
          <li>
            <span className="block text-red-600 font-bold">{recs.sell}</span>
            <small className="text-gray-400">Sell</small>
          </li>
          <li>
            <span className="block text-red-800 font-bold">{recs.strongSell}</span>
            <small className="text-gray-400">Strong Sell</small>
          </li>
        </ul>
      </div>
    </Card>
  )
}