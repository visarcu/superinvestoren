// src/components/portfolio/TransactionsList.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  BanknotesIcon,
  MinusIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  date: string
  created_at: string
  notes?: string
}

interface TransactionsListProps {
  portfolioId: string
  onTransactionChange?: () => void
  formatCurrency: (amount: number) => string
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  buy: { label: 'Kauf', icon: ArrowDownTrayIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  sell: { label: 'Verkauf', icon: ArrowUpTrayIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
  dividend: { label: 'Dividende', icon: BanknotesIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  cash_deposit: { label: 'Einzahlung', icon: PlusIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  cash_withdrawal: { label: 'Auszahlung', icon: MinusIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
  transfer_in: { label: 'Einbuchung', icon: ArrowsRightLeftIcon, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  transfer_out: { label: 'Ausbuchung', icon: ArrowsRightLeftIcon, color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

export default function TransactionsList({
  portfolioId,
  onTransactionChange,
  formatCurrency
}: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'dividend' | 'cash' | 'transfer'>('all')

  // Add Transaction Form
  const [showAdd, setShowAdd] = useState(false)
  const [txType, setTxType] = useState<'buy' | 'sell' | 'dividend'>('buy')
  const [txSymbol, setTxSymbol] = useState('')
  const [txQuantity, setTxQuantity] = useState('')
  const [txPrice, setTxPrice] = useState('')
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0])
  const [txNotes, setTxNotes] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadTransactions()
  }, [portfolioId])

  const loadTransactions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })

    if (!error && data) setTransactions(data)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filter === 'all') return true
      if (filter === 'cash') return t.type === 'cash_deposit' || t.type === 'cash_withdrawal'
      if (filter === 'transfer') return t.type === 'transfer_in' || t.type === 'transfer_out'
      return t.type === filter
    })
  }, [transactions, filter])

  // Group by month
  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    filtered.forEach(tx => {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    })
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const handleAddTransaction = async () => {
    if (!txSymbol || !txQuantity || !txPrice) return
    setAdding(true)

    try {
      const qty = parseFloat(txQuantity)
      const price = parseFloat(txPrice)
      const { error } = await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolioId,
          type: txType,
          symbol: txSymbol.toUpperCase(),
          name: txSymbol.toUpperCase(),
          quantity: qty,
          price: price,
          total_value: qty * price,
          date: txDate,
          notes: txNotes || null
        })

      if (error) throw error

      setShowAdd(false)
      setTxSymbol('')
      setTxQuantity('')
      setTxPrice('')
      setTxDate(new Date().toISOString().split('T')[0])
      setTxNotes('')
      await loadTransactions()
      onTransactionChange?.()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return

    const { error } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      await loadTransactions()
      onTransactionChange?.()
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    return `${months[parseInt(month) - 1]} ${year}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-400">Transaktionen</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Transaktion</span>
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'buy', label: 'Käufe' },
          { key: 'sell', label: 'Verkäufe' },
          { key: 'dividend', label: 'Dividenden' },
          { key: 'cash', label: 'Cash' },
          { key: 'transfer', label: 'Umbuchungen' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === f.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Add Transaction Form */}
      {showAdd && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value as any)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            >
              <option value="buy">Kauf</option>
              <option value="sell">Verkauf</option>
              <option value="dividend">Dividende</option>
            </select>
            <input
              type="text" value={txSymbol}
              onChange={(e) => setTxSymbol(e.target.value)}
              placeholder="Symbol"
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            />
            <input
              type="number" value={txQuantity}
              onChange={(e) => setTxQuantity(e.target.value)}
              placeholder="Anzahl"
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            />
            <input
              type="number" value={txPrice}
              onChange={(e) => setTxPrice(e.target.value)}
              placeholder="Preis (EUR)"
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="date" value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            />
            <input
              type="text" value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              placeholder="Notiz (optional)"
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddTransaction}
              disabled={adding || !txSymbol || !txQuantity || !txPrice}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              {adding ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
              Hinzufügen
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Transactions grouped by month */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <ClockIcon className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-white mb-1">Keine Transaktionen</h3>
          <p className="text-neutral-500 text-sm">
            Transaktionen werden automatisch beim Hinzufügen von Positionen erstellt.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([monthKey, txs]) => (
            <div key={monthKey}>
              <h3 className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
                {formatMonthLabel(monthKey)}
              </h3>
              <div className="space-y-0">
                {txs.map(tx => {
                  const config = TYPE_CONFIG[tx.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center justify-between py-3 border-b border-neutral-800/50 hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{config.label}</span>
                            {tx.symbol !== 'CASH' && (
                              <span className="text-xs text-neutral-500">{tx.symbol}</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500">
                            {formatDate(tx.date)}
                            {tx.symbol !== 'CASH' && ` · ${tx.quantity} × ${formatCurrency(tx.price)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            tx.type === 'sell' || tx.type === 'cash_withdrawal' || tx.type === 'transfer_out'
                              ? 'text-red-400'
                              : tx.type === 'transfer_in' ? 'text-violet-400' : 'text-emerald-400'
                          }`}>
                            {tx.type === 'sell' || tx.type === 'cash_withdrawal' || tx.type === 'transfer_out' ? '-' : '+'}{formatCurrency(tx.total_value)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-800 rounded transition-all"
                          title="Löschen"
                        >
                          <XMarkIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
