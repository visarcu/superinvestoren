// src/components/portfolio/TransactionsList.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Transaction, type RealizedGainInfo } from '@/hooks/usePortfolio'
import { perfColor } from '@/utils/formatters'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  BanknotesIcon,
  MinusIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface TransactionsListProps {
  portfolioId: string
  transactions: Transaction[]
  realizedGainByTxId: Map<string, RealizedGainInfo>
  onTransactionChange?: () => void
  formatCurrency: (amount: number) => string
  isAllDepotsView?: boolean
}

const TYPE_CONFIG = {
  buy: { label: 'Kauf', icon: ArrowDownTrayIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  sell: { label: 'Verkauf', icon: ArrowUpTrayIcon, color: 'text-red-400', bg: 'bg-red-500/10' },
  dividend: { label: 'Dividende', icon: BanknotesIcon, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  cash_deposit: { label: 'Einzahlung', icon: PlusIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  cash_withdrawal: { label: 'Auszahlung', icon: MinusIcon, color: 'text-red-400', bg: 'bg-red-500/10' }
}

export default function TransactionsList({
  portfolioId,
  transactions,
  realizedGainByTxId,
  onTransactionChange,
  formatCurrency,
  isAllDepotsView = false
}: TransactionsListProps) {
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'dividend' | 'cash'>('all')
  const [symbolFilter, setSymbolFilter] = useState<string>('all')
  const [depotFilter, setDepotFilter] = useState<string>('all')

  // Eindeutige Symbole aus Transaktionen (ohne CASH)
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>()
    transactions.forEach(t => {
      if (t.symbol && t.symbol !== 'CASH') symbols.add(t.symbol)
    })
    return Array.from(symbols).sort()
  }, [transactions])

  // Eindeutige Depots aus Transaktionen (nur in Alle-Depots-Ansicht)
  const uniqueDepots = useMemo(() => {
    if (!isAllDepotsView) return []
    const depots = new Map<string, { id: string; name: string; broker_type?: string | null; broker_name?: string | null; broker_color?: string | null }>()
    transactions.forEach(t => {
      if (t.portfolio_id && !depots.has(t.portfolio_id)) {
        depots.set(t.portfolio_id, {
          id: t.portfolio_id,
          name: t.portfolio_name || 'Depot',
          broker_type: t.broker_type,
          broker_name: t.broker_name,
          broker_color: t.broker_color,
        })
      }
    })
    return Array.from(depots.values())
  }, [transactions, isAllDepotsView])

  // Edit Transaction State
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Typ-Filter
      if (filter !== 'all') {
        if (filter === 'cash') {
          if (t.type !== 'cash_deposit' && t.type !== 'cash_withdrawal') return false
        } else if (t.type !== filter) {
          return false
        }
      }
      // Symbol-Filter
      if (symbolFilter !== 'all' && t.symbol !== symbolFilter) return false
      // Depot-Filter
      if (depotFilter !== 'all' && t.portfolio_id !== depotFilter) return false
      return true
    })
  }, [transactions, filter, symbolFilter, depotFilter])

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

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return

    const { error } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('id', id)

    if (!error) {
      onTransactionChange?.()
    }
  }

  const startEditTransaction = (tx: Transaction) => {
    setEditingTxId(tx.id)
    setEditDate(tx.date)
    setEditQuantity(tx.quantity.toString())
    setEditPrice(tx.price.toString())
    setEditNotes(tx.notes || '')
  }

  const cancelEdit = () => {
    setEditingTxId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingTxId) return
    setEditSaving(true)

    try {
      const qty = parseFloat(editQuantity) || 0
      const price = parseFloat(editPrice) || 0

      const { error } = await supabase
        .from('portfolio_transactions')
        .update({
          date: editDate,
          quantity: qty,
          price: price,
          total_value: qty * price,
          notes: editNotes || null
        })
        .eq('id', editingTxId)

      if (error) throw error

      setEditingTxId(null)
      onTransactionChange?.()
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setEditSaving(false)
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

  const getDepotLabel = (tx: Transaction) => {
    if (!isAllDepotsView || !tx.portfolio_id) return null
    const name = getBrokerDisplayName(tx.broker_type, tx.broker_name)
    return name
  }

  const getDepotColor = (tx: Transaction) => {
    if (!tx.broker_type) return '#6B7280'
    return getBrokerColor(tx.broker_type, tx.broker_color)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-neutral-400">Transaktionen</h2>
      </div>

      {/* Typ-Filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'buy', label: 'Käufe' },
          { key: 'sell', label: 'Verkäufe' },
          { key: 'dividend', label: 'Dividenden' },
          { key: 'cash', label: 'Cash' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === f.key
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Depot-Filter (nur in Alle-Depots-Ansicht) */}
      {isAllDepotsView && uniqueDepots.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setDepotFilter('all')}
            className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors border ${
              depotFilter === 'all'
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                : 'border-neutral-200 dark:border-neutral-700/50 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            Alle Depots
          </button>
          {uniqueDepots.map(depot => {
            const name = getBrokerDisplayName(depot.broker_type, depot.broker_name)
            const color = getBrokerColor(depot.broker_type, depot.broker_color)
            return (
              <button
                key={depot.id}
                onClick={() => setDepotFilter(depot.id === depotFilter ? 'all' : depot.id)}
                className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors border flex items-center gap-1.5 ${
                  depotFilter === depot.id
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : 'border-neutral-200 dark:border-neutral-700/50 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                {name}
              </button>
            )
          })}
        </div>
      )}

      {/* Aktien-Filter */}
      {uniqueSymbols.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setSymbolFilter('all')}
            className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors border ${
              symbolFilter === 'all'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                : 'border-neutral-200 dark:border-neutral-700/50 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            Alle Aktien
          </button>
          {uniqueSymbols.map(symbol => (
            <button
              key={symbol}
              onClick={() => setSymbolFilter(symbol === symbolFilter ? 'all' : symbol)}
              className={`px-2.5 py-0.5 text-[11px] rounded-full transition-colors border ${
                symbolFilter === symbol
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : 'border-neutral-200 dark:border-neutral-700/50 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}

      {/* Transactions grouped by month */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <ClockIcon className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Keine Transaktionen</h3>
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
                  const isEditing = editingTxId === tx.id
                  const rgInfo = tx.type === 'sell' ? realizedGainByTxId.get(tx.id) : undefined
                  const depotLabel = getDepotLabel(tx)

                  if (isEditing) {
                    return (
                      <div key={tx.id} className="py-3 border-b border-neutral-200 dark:border-neutral-800/50 -mx-2 px-2 bg-neutral-100 dark:bg-neutral-800/30 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <span className="font-medium text-neutral-900 dark:text-white text-sm">{config.label}</span>
                          {tx.symbol !== 'CASH' && (
                            <span className="text-xs text-neutral-500">{tx.symbol}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-1">Datum</label>
                            <input
                              type="date" value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              max={new Date().toISOString().split('T')[0]}
                              className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm"
                            />
                          </div>
                          {tx.symbol !== 'CASH' && (
                            <>
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1">Anzahl</label>
                                <input
                                  type="number" value={editQuantity}
                                  onChange={(e) => setEditQuantity(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1">Preis (EUR)</label>
                                <input
                                  type="number" value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm"
                                />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-1">Notiz</label>
                            <input
                              type="text" value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="optional"
                              className="w-full px-2 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white text-sm"
                            />
                          </div>
                        </div>
                        {tx.symbol !== 'CASH' && editQuantity && editPrice && (
                          <div className="text-xs text-neutral-500 mb-3">
                            Gesamt: {formatCurrency(parseFloat(editQuantity) * parseFloat(editPrice))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={editSaving}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            {editSaving ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : null}
                            Speichern
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={editSaving}
                            className="px-3 py-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs transition-colors"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center justify-between py-3 border-b border-neutral-200 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900 dark:text-white text-sm">{config.label}</span>
                            {tx.symbol !== 'CASH' && (
                              <span className="text-xs text-neutral-500">{tx.symbol}</span>
                            )}
                            {/* Depot-Badge in Alle-Depots-Ansicht */}
                            {depotLabel && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-neutral-500 bg-neutral-100 dark:bg-neutral-800/50">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getDepotColor(tx) }} />
                                {depotLabel}
                              </span>
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
                            tx.type === 'sell' || tx.type === 'cash_withdrawal' ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {tx.type === 'sell' || tx.type === 'cash_withdrawal' ? '-' : '+'}{formatCurrency(tx.total_value)}
                          </p>
                          {/* Realisierter Gewinn/Verlust bei Sell-Transaktionen */}
                          {rgInfo && (
                            <p className={`text-[10px] ${perfColor(rgInfo.realizedGain)}`}>
                              G/V: {rgInfo.realizedGain >= 0 ? '+' : ''}{formatCurrency(rgInfo.realizedGain)}
                              {' '}({rgInfo.realizedGainPercent >= 0 ? '+' : ''}{rgInfo.realizedGainPercent.toFixed(1)}%)
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => startEditTransaction(tx)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-all"
                          title="Bearbeiten"
                        >
                          <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-emerald-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-all"
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
