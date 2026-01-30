'use client'

import React, { useEffect, useState } from 'react'
import PortfolioJudge from '@/components/PortfolioJudge'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes } from '@/lib/fmp'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function PortfolioCheckPage() {
    const [holdings, setHoldings] = useState<any[]>([])
    const [totalValue, setTotalValue] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadPortfolio() {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session?.user) return

                // 1. Get Default Portfolio ID
                const { data: portfolios } = await supabase
                    .from('portfolios')
                    .select('id, cash_position')
                    .eq('user_id', session.user.id)
                    .eq('is_default', true)
                    .single()

                if (!portfolios) {
                    setLoading(false)
                    return
                }

                // 2. Get Holdings
                const { data: rawHoldings } = await supabase
                    .from('portfolio_holdings')
                    .select('symbol, quantity, purchase_price')
                    .eq('portfolio_id', portfolios.id)

                if (rawHoldings && rawHoldings.length > 0) {
                    // 3. Get Live Prices for accurate weighting
                    const symbols = rawHoldings.map(h => h.symbol)
                    const prices = await getBulkQuotes(symbols)

                    let total = 0
                    const enrichedHoldings = rawHoldings.map(h => {
                        const price = prices[h.symbol] || h.purchase_price
                        const value = price * h.quantity
                        total += value
                        return {
                            symbol: h.symbol,
                            quantity: h.quantity,
                            value: value,
                            price: price
                        }
                    })

                    setHoldings(enrichedHoldings)
                    setTotalValue(total)
                }

            } catch (error) {
                console.error('Error loading portfolio:', error)
            } finally {
                setLoading(false)
            }
        }

        loadPortfolio()
    }, [])

    return (
        <div className="min-h-screen bg-theme-primary px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/analyse"
                    className="inline-flex items-center gap-2 text-theme-secondary hover:text-white transition-colors mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Zurück zum Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-theme-primary">AI Portfolio Audit</h1>
                <p className="text-theme-secondary mt-2">
                    Vergleiche deine Strategie mit den Besten der Welt.
                </p>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-64 bg-theme-card rounded-2xl"></div>
                </div>
            ) : holdings.length > 0 ? (
                <PortfolioJudge holdings={holdings} totalValue={totalValue} />
            ) : (
                <div className="text-center py-12 bg-theme-card rounded-2xl border border-white/[0.04]">
                    <p className="text-theme-secondary mb-4">Du hast noch keine Aktien in deinem Portfolio.</p>
                    <Link
                        href="/analyse/portfolio/dashboard"
                        className="px-6 py-2 bg-brand text-black font-medium rounded-lg hover:bg-green-400 transition-colors"
                    >
                        Portfolio anlegen
                    </Link>
                </div>
            )}
        </div>
    )
}
