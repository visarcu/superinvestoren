'use client'

import React, { useState } from 'react'
import { 
  TrashIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline'
import { Transaction } from '../types/portfolio'

interface TransactionTableProps {
  transactions: Transaction[]
  onDeleteTransaction: (id: string) => void
}

export default function TransactionTable({ transactions, onDeleteTransaction }: TransactionTableProps) {
  const [filter, setFilter] = useState<'ALL' | Transaction['type']>('ALL')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'BUY': return '📈'
      case 'SELL': return '📉'
      case 'DIVIDEND': return '💎'
      case 'INCOME': return '💰'
      case 'EXPENSE': return '💸'
      default: return '📄'
    }
  }

  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'BUY': return 'text-green-400'
      case 'SELL': return 'text-red-400'
      case 'DIVIDEND': return 'text-blue-400'
      case 'INCOME': return 'text-green-400'
      case 'EXPENSE': return 'text-red-400'
      default: return 'text-theme-secondary'
    }
  }

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(tx => filter === 'ALL' || tx.type === filter)
    .sort((a, b) => {
      let aVal, bVal
      
      if (sortBy === 'date') {
        aVal = new Date(a.date).getTime()
        bVal = new Date(b.date).getTime()
      } else {
        aVal = a.quantity * a.price
        bVal = b.quantity * b.price
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

  const handleSort = (newSortBy: 'date' | 'amount') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-theme-card rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-theme-primary mb-2">
          Keine Transaktionen
        </h3>
        <p className="text-theme-muted">
          Füge deine erste Transaktion hinzu, um dein Portfolio zu verfolgen.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-xl overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-theme-hover">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-theme-primary">
            Transaktionen ({transactions.length})
          </h3>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-theme-muted" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 bg-theme-tertiary border border-theme-hover rounded-lg text-theme-primary text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="ALL">Alle</option>
                <option value="BUY">Käufe</option>
                <option value="SELL">Verkäufe</option>
                <option value="DIVIDEND">Dividenden</option>
                <option value="INCOME">Einnahmen</option>
                <option value="EXPENSE">Ausgaben</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleSort('date')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  sortBy === 'date' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                }`}
              >
                Datum
              </button>
              <button
                onClick={() => handleSort('amount')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  sortBy === 'amount' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-theme-tertiary text-theme-secondary hover:bg-theme-hover'
                }`}
              >
                Betrag
              </button>
              <ArrowsUpDownIcon className="w-4 h-4 text-theme-muted ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme-secondary">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Typ
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Asset
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                Anzahl
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                Preis
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                Gesamtwert
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-hover">
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-theme-tertiary transition">
                
                {/* Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(transaction.type)}</span>
                    <span className={`text-sm font-medium ${getTypeColor(transaction.type)}`}>
                      {transaction.type}
                    </span>
                  </div>
                </td>

                {/* Asset */}
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-theme-primary">
                      {transaction.symbol}
                    </div>
                    <div className="text-xs text-theme-muted truncate max-w-32">
                      {transaction.name}
                    </div>
                  </div>
                </td>

                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-theme-secondary">
                    {formatDate(transaction.date)}
                  </div>
                  {transaction.broker && (
                    <div className="text-xs text-theme-muted">
                      {transaction.broker}
                    </div>
                  )}
                </td>

                {/* Quantity */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-theme-primary numeric">
                    {transaction.quantity.toFixed(3)}
                  </span>
                </td>

                {/* Price */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm text-theme-primary numeric">
                    {formatCurrency(transaction.price)}
                  </span>
                </td>

                {/* Total */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-theme-primary numeric">
                    {formatCurrency(transaction.quantity * transaction.price)}
                  </div>
                  {transaction.fees > 0 && (
                    <div className="text-xs text-theme-muted">
                      +{formatCurrency(transaction.fees)} Gebühren
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => {
                      if (confirm('Transaktion wirklich löschen?')) {
                        onDeleteTransaction(transaction.id)
                      }
                    }}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}