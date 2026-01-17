// src/components/PortfolioHistory.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CurrencyDollarIcon,
  PlusIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  XMarkIcon,
  ChevronRightIcon,
  BanknotesIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  date: string
  created_at: string
  notes?: string
}

interface PortfolioHistoryProps {
  portfolioId: string
  holdings: Array<{
    symbol: string
    name: string
    quantity: number
    purchase_price: number
    purchase_date: string
  }>
  onTransactionChange?: () => void
}

export default function PortfolioHistory({ portfolioId, holdings, onTransactionChange }: PortfolioHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'dividend' | 'cash'>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showAddTransaction, setShowAddTransaction] = useState(false)

  // Add Transaction Form
  const [transactionType, setTransactionType] = useState<'buy' | 'sell' | 'dividend'>('buy')
  const [transactionSymbol, setTransactionSymbol] = useState('')
  const [transactionQuantity, setTransactionQuantity] = useState('')
  const [transactionPrice, setTransactionPrice] = useState('')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionNotes, setTransactionNotes] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit Transaction State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Filter & Grouping State
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all')
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]))
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // Einzigartige Symbole aus Transaktionen extrahieren
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>()
    transactions.forEach(tx => {
      if (tx.symbol && tx.symbol !== 'CASH') {
        symbols.add(tx.symbol)
      }
    })
    return Array.from(symbols).sort()
  }, [transactions])

  // Gefilterte Transaktionen
  const symbolFilteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      if (filter === 'all') return true
      if (filter === 'cash') return t.type === 'cash_deposit' || t.type === 'cash_withdrawal'
      return t.type === filter
    })

    if (selectedSymbol !== 'all') {
      filtered = filtered.filter(tx => tx.symbol === selectedSymbol)
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
  }, [transactions, filter, selectedSymbol, sortOrder])

  // Gruppiere nach Jahr und Monat
  const groupedTransactions = useMemo(() => {
    const groups: Record<number, Record<number, Transaction[]>> = {}

    symbolFilteredTransactions.forEach(tx => {
      const date = new Date(tx.date)
      const year = date.getFullYear()
      const month = date.getMonth()

      if (!groups[year]) groups[year] = {}
      if (!groups[year][month]) groups[year][month] = []
      groups[year][month].push(tx)
    })

    return groups
  }, [symbolFilteredTransactions])

  // Jahre sortiert
  const sortedYears = useMemo(() => {
    return Object.keys(groupedTransactions)
      .map(Number)
      .sort((a, b) => b - a)
  }, [groupedTransactions])

  // Toggle Jahr
  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  // Toggle Monat
  const toggleMonth = (yearMonth: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev)
      if (next.has(yearMonth)) {
        next.delete(yearMonth)
      } else {
        next.add(yearMonth)
      }
      return next
    })
  }

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

  // Berechne Jahres-Statistiken
  const getYearStats = (year: number) => {
    const yearData = groupedTransactions[year]
    if (!yearData) return { count: 0, bought: 0, sold: 0, dividends: 0 }

    let count = 0, bought = 0, sold = 0, dividends = 0

    Object.values(yearData).forEach(monthTxs => {
      monthTxs.forEach(tx => {
        count++
        if (tx.type === 'buy') bought += tx.total_value
        if (tx.type === 'sell') sold += tx.total_value
        if (tx.type === 'dividend') dividends += tx.total_value
      })
    })

    return { count, bought, sold, dividends }
  }

  useEffect(() => {
    loadTransactions()
  }, [portfolioId])

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading transactions:', error)
        setTransactions([])
        return
      }

      if (data && data.length > 0) {
        setTransactions(data)
      } else {
        setTransactions([])
      }
    } catch (error) {
      console.error('Error:', error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async () => {
    if (!transactionSymbol || !transactionPrice) {
      alert('Bitte alle Pflichtfelder ausfüllen')
      return
    }

    if (transactionType !== 'dividend' && !transactionQuantity) {
      alert('Bitte Anzahl angeben')
      return
    }

    setAdding(true)

    try {
      let totalValue: number
      let quantity: number

      if (transactionType === 'dividend') {
        totalValue = parseFloat(transactionPrice)
        quantity = 0
      } else {
        totalValue = parseFloat(transactionQuantity) * parseFloat(transactionPrice)
        quantity = parseFloat(transactionQuantity)
      }

      const { error } = await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolioId,
          type: transactionType,
          symbol: transactionSymbol.toUpperCase(),
          name: transactionSymbol.toUpperCase(),
          quantity: quantity,
          price: transactionType === 'dividend' ? 0 : parseFloat(transactionPrice),
          total_value: totalValue,
          date: transactionDate,
          notes: transactionNotes || (transactionType === 'dividend' ? 'Dividend Payment' : '')
        })

      if (error) {
        console.error('Error adding transaction:', error)
        const newTransaction: Transaction = {
          id: `local-${Date.now()}`,
          type: transactionType,
          symbol: transactionSymbol.toUpperCase(),
          name: transactionSymbol.toUpperCase(),
          quantity: quantity,
          price: transactionType === 'dividend' ? 0 : parseFloat(transactionPrice),
          total_value: totalValue,
          date: transactionDate,
          created_at: new Date().toISOString(),
          notes: transactionNotes || (transactionType === 'dividend' ? 'Dividend Payment' : '')
        }
        setTransactions([newTransaction, ...transactions])
      } else {
        await loadTransactions()
      }

      setTransactionSymbol('')
      setTransactionQuantity('')
      setTransactionPrice('')
      setTransactionNotes('')
      setTransactionDate(new Date().toISOString().split('T')[0])
      setShowAddTransaction(false)

    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Hinzufügen der Transaktion')
    } finally {
      setAdding(false)
    }
  }

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditQuantity(transaction.quantity?.toString() || '')
    setEditPrice(transaction.price?.toString() || '')
    setEditDate(transaction.date || '')
  }

  const recalculateAveragePrice = async (symbol: string) => {
    try {
      const { data: txData, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .eq('type', 'buy')
        .order('date', { ascending: true })

      if (error) throw error
      if (!txData || txData.length === 0) {
        const { error: deleteError } = await supabase
          .from('portfolio_holdings')
          .delete()
          .eq('portfolio_id', portfolioId)
          .eq('symbol', symbol)

        if (deleteError) throw deleteError
        return
      }

      let totalQuantity = 0
      let totalCost = 0

      txData.forEach(tx => {
        totalQuantity += tx.quantity
        totalCost += tx.quantity * tx.price
      })

      const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0

      const { error: updateError } = await supabase
        .from('portfolio_holdings')
        .update({
          purchase_price: averagePrice,
          quantity: totalQuantity
        })
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)

      if (updateError) throw updateError

    } catch (error) {
      console.error('Error recalculating average price:', error)
      throw error
    }
  }

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const confirmMsg = transaction.type === 'buy'
      ? `Kauf von ${transaction.quantity}x ${transaction.symbol} wirklich löschen?\n\nDer Durchschnittspreis wird neu berechnet.`
      : `Transaktion wirklich löschen?`

    if (!confirm(confirmMsg)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('portfolio_transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error

      if (transaction.type === 'buy') {
        await recalculateAveragePrice(transaction.symbol)
      }

      loadTransactions()
      onTransactionChange?.()

    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      alert('Fehler beim Löschen: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return

    setSaving(true)
    try {
      const newQuantity = parseFloat(editQuantity) || editingTransaction.quantity
      const newPrice = parseFloat(editPrice) || editingTransaction.price
      const newTotalValue = editingTransaction.type === 'dividend'
        ? newPrice
        : newQuantity * newPrice

      const { error } = await supabase
        .from('portfolio_transactions')
        .update({
          quantity: newQuantity,
          price: newPrice,
          total_value: newTotalValue,
          date: editDate
        })
        .eq('id', editingTransaction.id)

      if (error) throw error

      if (editingTransaction.type === 'buy') {
        await recalculateAveragePrice(editingTransaction.symbol)
      }

      setEditingTransaction(null)
      loadTransactions()
      onTransactionChange?.()

    } catch (error: any) {
      console.error('Error updating transaction:', error)
      alert('Fehler beim Speichern: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getTotalByType = (type: 'buy' | 'sell' | 'dividend') => {
    return transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.total_value, 0)
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'buy': return 'Kauf'
      case 'sell': return 'Verkauf'
      case 'dividend': return 'Dividende'
      case 'cash_deposit': return 'Einzahlung'
      case 'cash_withdrawal': return 'Auszahlung'
      default: return type
    }
  }

  const formatEuro = (value: number) => {
    return value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const exportToCSV = () => {
    const headers = ['Datum', 'Typ', 'Symbol', 'Anzahl', 'Preis', 'Gesamt', 'Notizen']
    const rows = symbolFilteredTransactions.map(t => [
      formatDate(t.date),
      t.type.toUpperCase(),
      t.symbol,
      t.quantity.toString(),
      t.price.toFixed(2),
      t.total_value.toFixed(2),
      t.notes || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ArrowPathIcon className="w-5 h-5 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-neutral-400 text-sm">Lade Transaktionshistorie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats - Clean Fey Style */}
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 pb-6 border-b border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 mb-1">Transaktionen</p>
          <p className="text-lg font-medium text-white">{transactions.length}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-1">Käufe</p>
          <p className="text-lg font-medium text-white">{formatEuro(getTotalByType('buy'))}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-1">Verkäufe</p>
          <p className="text-lg font-medium text-emerald-400">{formatEuro(getTotalByType('sell'))}</p>
        </div>

        <div>
          <p className="text-xs text-neutral-500 mb-1">Dividenden</p>
          <p className="text-lg font-medium text-emerald-400">{formatEuro(getTotalByType('dividend'))}</p>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-neutral-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              Transaktion hinzufügen
            </h3>

            <div className="space-y-4">
              {/* Transaction Type Selector - Clean Fey Style */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Typ</label>
                <div className="flex bg-neutral-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setTransactionType('buy')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      transactionType === 'buy'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Kauf
                  </button>
                  <button
                    onClick={() => setTransactionType('sell')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      transactionType === 'sell'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Verkauf
                  </button>
                  <button
                    onClick={() => setTransactionType('dividend')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      transactionType === 'dividend'
                        ? 'bg-neutral-700 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Dividende
                  </button>
                </div>
              </div>

              {/* Symbol Input */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={transactionSymbol}
                  onChange={(e) => setTransactionSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Conditional Fields */}
              {transactionType === 'dividend' ? (
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Dividendenbetrag ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionPrice}
                    onChange={(e) => setTransactionPrice(e.target.value)}
                    placeholder="45.50"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Gesamter erhaltener Betrag</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Anzahl *
                    </label>
                    <input
                      type="number"
                      value={transactionQuantity}
                      onChange={(e) => setTransactionQuantity(e.target.value)}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      Preis ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transactionPrice}
                      onChange={(e) => setTransactionPrice(e.target.value)}
                      placeholder="150.00"
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Date Input */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Notizen (optional)
                </label>
                <textarea
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  placeholder={
                    transactionType === 'dividend'
                      ? "z.B. Q3 2024 Dividende"
                      : "Zusätzliche Informationen..."
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Total Value Display */}
              {((transactionType !== 'dividend' && transactionQuantity && transactionPrice) ||
                (transactionType === 'dividend' && transactionPrice)) && (
                <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                  <p className="text-sm text-neutral-400">
                    {transactionType === 'dividend' ? 'Dividende' : 'Gesamtwert'}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    ${transactionType === 'dividend'
                      ? parseFloat(transactionPrice || '0').toFixed(2)
                      : (parseFloat(transactionQuantity || '0') * parseFloat(transactionPrice || '0')).toFixed(2)
                    }
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddTransaction}
                  disabled={adding || !transactionSymbol || !transactionPrice ||
                    (transactionType !== 'dividend' && !transactionQuantity)}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {adding ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Hinzufügen...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4" />
                      Hinzufügen
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddTransaction(false)
                    setTransactionSymbol('')
                    setTransactionQuantity('')
                    setTransactionPrice('')
                    setTransactionNotes('')
                    setTransactionDate(new Date().toISOString().split('T')[0])
                  }}
                  className="flex-1 py-2.5 border border-neutral-700 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls - Neutral pill buttons (Fey style) */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-neutral-800/50 rounded-lg p-1">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'buy', label: 'Käufe' },
            { key: 'sell', label: 'Verkäufe' },
            { key: 'dividend', label: 'Dividenden' },
            { key: 'cash', label: 'Cash' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === key
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            title="Sortierung umkehren"
          >
            <ArrowPathIcon className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={exportToCSV}
            className="p-2 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
            title="Als CSV exportieren"
          >
            <DocumentArrowDownIcon className="w-4 h-4 text-neutral-400" />
          </button>

          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Transaktion
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div>
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500">Aktie:</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">Alle Holdings</option>
              {uniqueSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 ml-auto text-sm text-neutral-500">
            <span>{symbolFilteredTransactions.length} Transaktionen</span>
            {selectedSymbol !== 'all' && (
              <button
                onClick={() => setSelectedSymbol('all')}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Grouped Transactions */}
        <div className="space-y-0">
          {sortedYears.length === 0 ? (
            <div className="py-12 text-center">
              <ClockIcon className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 mb-1">Keine Transaktionen gefunden</p>
              <p className="text-neutral-500 text-sm">
                Fügen Sie Ihre erste Transaktion hinzu
              </p>
            </div>
          ) : (
            sortedYears.map(year => {
              const yearStats = getYearStats(year)
              const isYearExpanded = expandedYears.has(year)
              const months = Object.keys(groupedTransactions[year])
                .map(Number)
                .sort((a, b) => b - a)

              return (
                <div key={year} className="border-b border-neutral-800 last:border-0">
                  {/* Year Header */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between py-4 hover:bg-neutral-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRightIcon className={`w-4 h-4 text-neutral-500 transition-transform ${isYearExpanded ? 'rotate-90' : ''}`} />
                      <span className="text-base font-semibold text-white">{year}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-500">
                      <span>{yearStats.count} Aktivitäten</span>
                      {yearStats.bought > 0 && (
                        <span className="text-red-400">-{formatEuro(yearStats.bought)}</span>
                      )}
                      {yearStats.sold > 0 && (
                        <span className="text-emerald-400">+{formatEuro(yearStats.sold)}</span>
                      )}
                      {yearStats.dividends > 0 && (
                        <span className="text-emerald-400">+{formatEuro(yearStats.dividends)} Div.</span>
                      )}
                    </div>
                  </button>

                  {/* Months */}
                  {isYearExpanded && (
                    <div className="pl-4">
                      {months.map(month => {
                        const yearMonth = `${year}-${month}`
                        const isMonthExpanded = expandedMonths.has(yearMonth)
                        const monthTxs = groupedTransactions[year][month]
                        const monthTotal = monthTxs.reduce((sum, tx) => {
                          if (tx.type === 'buy') return sum - tx.total_value
                          if (tx.type === 'sell' || tx.type === 'dividend') return sum + tx.total_value
                          return sum
                        }, 0)

                        return (
                          <div key={yearMonth} className="border-t border-neutral-800/50">
                            {/* Month Header */}
                            <button
                              onClick={() => toggleMonth(yearMonth)}
                              className="w-full flex items-center justify-between py-3 px-2 hover:bg-neutral-900/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRightIcon className={`w-3 h-3 text-neutral-600 transition-transform ${isMonthExpanded ? 'rotate-90' : ''}`} />
                                <span className="text-sm font-medium text-neutral-300">{monthNames[month]}</span>
                                <span className="text-xs text-neutral-600">{monthTxs.length} Aktivitäten</span>
                              </div>

                              <span className={`text-xs font-medium ${monthTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {monthTotal >= 0 ? '+' : ''}{formatEuro(monthTotal)}
                              </span>
                            </button>

                            {/* Transactions */}
                            {isMonthExpanded && (
                              <div className="pl-6">
                                {monthTxs.map(transaction => {
                                  const isNegative = transaction.type === 'buy' || transaction.type === 'cash_withdrawal'
                                  const isCashTransaction = transaction.type === 'cash_deposit' || transaction.type === 'cash_withdrawal'

                                  return (
                                    <div
                                      key={transaction.id}
                                      className="group flex items-center justify-between py-3 px-2 border-t border-neutral-800/30 hover:bg-neutral-900/30 transition-colors"
                                    >
                                      {/* Left - Details */}
                                      <div className="flex items-center gap-3">
                                        {transaction.symbol && transaction.symbol !== 'CASH' && transaction.type !== 'cash_deposit' && transaction.type !== 'cash_withdrawal' && transaction.type !== 'dividend' ? (
                                          <Logo
                                            ticker={transaction.symbol}
                                            alt={transaction.symbol}
                                            className="w-7 h-7"
                                            padding="small"
                                          />
                                        ) : (
                                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-neutral-800">
                                            {transaction.type === 'cash_deposit' && <PlusIcon className="w-3.5 h-3.5 text-emerald-400" />}
                                            {transaction.type === 'cash_withdrawal' && <MinusIcon className="w-3.5 h-3.5 text-red-400" />}
                                            {transaction.type === 'dividend' && <BanknotesIcon className="w-3.5 h-3.5 text-neutral-400" />}
                                          </div>
                                        )}

                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-white text-sm">
                                              {isCashTransaction ? (transaction.type === 'cash_deposit' ? 'Einzahlung' : 'Auszahlung') : transaction.symbol}
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-700/50 text-neutral-400">
                                              {getTransactionLabel(transaction.type)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-neutral-500">
                                            {!isCashTransaction && transaction.type !== 'dividend' && transaction.quantity && (
                                              <>{transaction.quantity} Stück @ {formatEuro(transaction.price)} · </>
                                            )}
                                            {formatDate(transaction.date)}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Right - Amount and Actions */}
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className={`font-medium text-sm ${
                                            isNegative ? 'text-red-400' : 'text-emerald-400'
                                          }`}>
                                            {isNegative ? '-' : '+'}
                                            {formatEuro(Math.abs(transaction.total_value))}
                                          </p>
                                        </div>

                                        {/* Edit/Delete Buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openEditTransaction(transaction)
                                            }}
                                            className="p-1.5 hover:bg-neutral-700 rounded transition-colors"
                                            title="Bearbeiten"
                                          >
                                            <PencilIcon className="w-3.5 h-3.5 text-neutral-400" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteTransaction(transaction)
                                            }}
                                            disabled={saving}
                                            className="p-1.5 hover:bg-neutral-700 rounded transition-colors disabled:opacity-50"
                                            title="Löschen"
                                          >
                                            <XMarkIcon className="w-3.5 h-3.5 text-neutral-400" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Transaktion bearbeiten</h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1 hover:bg-neutral-800 rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Info Badge */}
            <div className="bg-neutral-800/50 rounded-lg p-3 mb-4 border border-neutral-700/50">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-neutral-700 text-neutral-400">
                  {getTransactionLabel(editingTransaction.type)}
                </span>
                <span className="font-medium text-white">{editingTransaction.symbol}</span>
              </div>
            </div>

            <div className="space-y-4">
              {(editingTransaction.type === 'buy' || editingTransaction.type === 'sell') && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">
                    Anzahl
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  {editingTransaction.type === 'buy' || editingTransaction.type === 'sell'
                    ? 'Preis pro Stück (EUR)'
                    : 'Betrag (EUR)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {(editingTransaction.type === 'buy' || editingTransaction.type === 'sell') && editQuantity && editPrice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-neutral-400">
                    Neuer Gesamtwert:
                    <span className="font-semibold text-white ml-2">
                      {(parseFloat(editQuantity) * parseFloat(editPrice)).toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </span>
                  </p>
                  {editingTransaction.type === 'buy' && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Der Durchschnittspreis wird automatisch neu berechnet.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateTransaction}
                  disabled={saving || !editPrice || !editDate}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    'Änderungen speichern'
                  )}
                </button>
                <button
                  onClick={() => setEditingTransaction(null)}
                  disabled={saving}
                  className="flex-1 py-2.5 border border-neutral-700 hover:bg-neutral-800 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
