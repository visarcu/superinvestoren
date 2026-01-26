// src/components/ai/AIChart.tsx
import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { ChartData } from './types'

export default function AIChart({ chart }: { chart: ChartData }) {
    const formatValue = (value: any) => {
        if (typeof value === 'number') {
            return value.toFixed(2)
        }
        return value
    }

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })
        } catch {
            return dateStr
        }
    }

    if (chart.type === 'line') {
        return (
            <div className="bg-theme-secondary border border-theme rounded-lg p-4 mb-4">
                <h3 className="text-theme-primary font-semibold mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-brand-light" />
                    {chart.title}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chart.data}>
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={formatDate}
                        />
                        <YAxis
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={formatValue}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--theme-secondary)',
                                border: '1px solid var(--theme-border)',
                                borderRadius: '8px',
                                color: 'var(--theme-primary)'
                            }}
                            labelFormatter={(value) => formatDate(value as string)}
                            formatter={(value) => [formatValue(value), 'Kurs']}
                        />
                        <Line
                            type="monotone"
                            dataKey="close"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#10b981' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        )
    }

    if (chart.type === 'volume') {
        return (
            <div className="bg-theme-secondary border border-theme rounded-lg p-4 mb-4">
                <h3 className="text-theme-primary font-semibold mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-blue-400" />
                    {chart.title}
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chart.data}>
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={formatDate}
                        />
                        <YAxis
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--theme-secondary)',
                                border: '1px solid var(--theme-border)',
                                borderRadius: '8px',
                                color: 'var(--theme-primary)'
                            }}
                            formatter={(value) => [`${(Number(value) / 1000000).toFixed(1)}M`, 'Volumen']}
                        />
                        <Bar dataKey="volume" fill="#3b82f6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        )
    }

    return (
        <div className="bg-theme-secondary border border-theme rounded-lg p-4 mb-4">
            <h3 className="text-theme-primary font-semibold mb-4">{chart.title}</h3>
            <p className="text-theme-secondary">Chart type: {chart.type} (Coming soon)</p>
        </div>
    )
}
