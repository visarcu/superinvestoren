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
  onTransactionChange?: () => void  // Callback wenn Transaktion geändert wird
}

export default function PortfolioHistory({ portfolioId, holdings, onTransactionChange }: PortfolioHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'dividend' | 'cash'>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  
  // Add Transaction Form - MIT DIVIDEND TYPE
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

  // Gefilterte Transaktionen (erst nach Typ, dann nach Symbol)
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

  // Jahre sortiert (neueste zuerst)
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

  // Monatsnamen
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
      // Lade Transaktionen aus der Datenbank
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading transactions:', error)
        // Keine Transaktionshistorie verfügbar
        setTransactions([])
        return
      }

      if (data && data.length > 0) {
        setTransactions(data)
      } else {
        // Keine Transaktionshistorie verfügbar
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

    // Für Dividenden brauchen wir keine Quantity
    if (transactionType !== 'dividend' && !transactionQuantity) {
      alert('Bitte Anzahl angeben')
      return
    }

    setAdding(true)
    
    try {
      let totalValue: number
      let quantity: number
      
      if (transactionType === 'dividend') {
        // Bei Dividenden ist der Preis der Gesamtbetrag
        totalValue = parseFloat(transactionPrice)
        quantity = 0 // Oder 1, je nachdem wie du es handhaben willst
      } else {
        totalValue = parseFloat(transactionQuantity) * parseFloat(transactionPrice)
        quantity = parseFloat(transactionQuantity)
      }
      
      // Versuche die Transaktion zu speichern
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
        // Füge trotzdem lokal hinzu für Demo
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

      // Reset form
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

  // Edit/Delete Handler Functions
  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setEditQuantity(transaction.quantity?.toString() || '')
    setEditPrice(transaction.price?.toString() || '')
    setEditDate(transaction.date || '')
  }

  // Berechnet den neuen Durchschnittspreis basierend auf allen Transaktionen einer Aktie
  const recalculateAveragePrice = async (symbol: string) => {
    try {
      // Hole alle Kauf-Transaktionen für dieses Symbol
      const { data: txData, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)
        .eq('type', 'buy')
        .order('date', { ascending: true })

      if (error) throw error
      if (!txData || txData.length === 0) {
        // Keine Transaktionen mehr - Position löschen
        const { error: deleteError } = await supabase
          .from('portfolio_holdings')
          .delete()
          .eq('portfolio_id', portfolioId)
          .eq('symbol', symbol)

        if (deleteError) throw deleteError
        console.log(`🗑️ ${symbol}: Position gelöscht (keine Transaktionen mehr)`)
        return
      }

      // Berechne gewichteten Durchschnittspreis
      let totalQuantity = 0
      let totalCost = 0

      txData.forEach(tx => {
        totalQuantity += tx.quantity
        totalCost += tx.quantity * tx.price
      })

      const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0

      // Update die Holdings-Tabelle
      const { error: updateError } = await supabase
        .from('portfolio_holdings')
        .update({
          purchase_price: averagePrice,
          quantity: totalQuantity
        })
        .eq('portfolio_id', portfolioId)
        .eq('symbol', symbol)

      if (updateError) throw updateError

      console.log(`✅ ${symbol}: Neuer Durchschnittspreis = €${averagePrice.toFixed(2)}, Menge = ${totalQuantity}`)

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

      // Bei Kauf-Transaktionen: Durchschnittspreis neu berechnen
      if (transaction.type === 'buy') {
        await recalculateAveragePrice(transaction.symbol)
      }

      // Refresh
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

      // Update Transaktion
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

      // Bei Kauf-Transaktionen: Durchschnittspreis neu berechnen
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

  // symbolFilteredTransactions is now symbolFilteredTransactions (with grouping support)

  const getTotalByType = (type: 'buy' | 'sell' | 'dividend') => {
    return transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.total_value, 0)
  }

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'buy':
        return 'Kauf'
      case 'sell':
        return 'Verkauf'
      case 'dividend':
        return 'Dividende'
      case 'cash_deposit':
        return 'Einzahlung'
      case 'cash_withdrawal':
        return 'Auszahlung'
      default:
        return type
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
          <ArrowPathIcon className="w-6 h-6 text-brand-light animate-spin mx-auto mb-3" />
          <p className="text-theme-secondary">Lade Transaktionshistorie...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-5 h-5 text-theme-secondary" />
            <p className="text-sm text-theme-secondary">Transaktionen</p>
          </div>
          <p className="text-2xl font-bold text-theme-primary">
            {transactions.length}
          </p>
          <p className="text-xs text-theme-muted mt-1">Gesamt</p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownTrayIcon className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-theme-secondary">Käufe</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {formatEuro(getTotalByType('buy'))}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'buy').length} Transaktionen
          </p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpTrayIcon className="w-5 h-5 text-brand-light" />
            <p className="text-sm text-theme-secondary">Verkäufe</p>
          </div>
          <p className="text-2xl font-bold text-brand-light">
            {formatEuro(getTotalByType('sell'))}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'sell').length} Transaktionen
          </p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-purple-400" />
            <p className="text-sm text-theme-secondary">Dividenden</p>
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {formatEuro(getTotalByType('dividend'))}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'dividend').length} Zahlungen
          </p>
        </div>
      </div>

      {/* Add Transaction Modal - ERWEITERT MIT DIVIDENDEN */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-theme-primary mb-4">
              Transaktion hinzufügen
            </h3>

            <div className="space-y-4">
              {/* Transaction Type Selector - MIT DIVIDENDE */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Typ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTransactionType('buy')}
                    className={`py-2 px-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      transactionType === 'buy'
                        ? 'bg-brand/20 border-green-500/50 text-brand-light'
                        : 'border-theme/20 text-theme-secondary hover:border-theme/40'
                    }`}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span className="text-xs">Kauf</span>
                  </button>
                  <button
                    onClick={() => setTransactionType('sell')}
                    className={`py-2 px-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      transactionType === 'sell'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'border-theme/20 text-theme-secondary hover:border-theme/40'
                    }`}
                  >
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    <span className="text-xs">Verkauf</span>
                  </button>
                  <button
                    onClick={() => setTransactionType('dividend')}
                    className={`py-2 px-3 rounded-lg border transition-colors flex flex-col items-center gap-1 ${
                      transactionType === 'dividend'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'border-theme/20 text-theme-secondary hover:border-theme/40'
                    }`}
                  >
                    <CurrencyDollarIcon className="w-4 h-4" />
                    <span className="text-xs">Dividende</span>
                  </button>
                </div>
              </div>

              {/* Symbol Input */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={transactionSymbol}
                  onChange={(e) => setTransactionSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              {/* Conditional Fields based on Type */}
              {transactionType === 'dividend' ? (
                <>
                  {/* For Dividends: Total Amount instead of Quantity & Price */}
                  <div>
                    <label className="block text-sm font-medium text-theme-secondary mb-1">
                      Dividendenbetrag ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transactionPrice}
                      onChange={(e) => setTransactionPrice(e.target.value)}
                      placeholder="45.50"
                      className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                    />
                    <p className="text-xs text-theme-muted mt-1">Gesamter erhaltener Betrag</p>
                  </div>
                </>
              ) : (
                <>
                  {/* For Buy/Sell: Quantity and Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Anzahl *
                      </label>
                      <input
                        type="number"
                        value={transactionQuantity}
                        onChange={(e) => setTransactionQuantity(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Preis ($) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transactionPrice}
                        onChange={(e) => setTransactionPrice(e.target.value)}
                        placeholder="150.00"
                        className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Date Input */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Datum *
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
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
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              {/* Total Value Display */}
              {((transactionType !== 'dividend' && transactionQuantity && transactionPrice) || 
                (transactionType === 'dividend' && transactionPrice)) && (
                <div className="p-3 bg-theme-secondary/30 rounded-lg">
                  <p className="text-sm text-theme-secondary">
                    {transactionType === 'dividend' ? 'Dividende' : 'Gesamtwert'}
                  </p>
                  <p className="text-lg font-bold text-theme-primary">
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
                  className="flex-1 py-2 bg-brand hover:bg-green-400 disabled:bg-theme-secondary disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {adding ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Hinzufügen...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-4 h-4" />
                      {transactionType === 'dividend' ? 'Dividende' : 'Transaktion'} hinzufügen
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddTransaction(false)
                    // Reset form
                    setTransactionSymbol('')
                    setTransactionQuantity('')
                    setTransactionPrice('')
                    setTransactionNotes('')
                    setTransactionDate(new Date().toISOString().split('T')[0])
                  }}
                  className="flex-1 py-2 border border-theme/20 hover:bg-theme-secondary/30 text-theme-primary rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-brand text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('buy')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'buy'
                ? 'bg-brand text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Käufe
          </button>
          <button
            onClick={() => setFilter('sell')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'sell'
                ? 'bg-brand text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Verkäufe
          </button>
          <button
            onClick={() => setFilter('dividend')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'dividend'
                ? 'bg-brand text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Dividenden
          </button>
          <button
            onClick={() => setFilter('cash')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'cash'
                ? 'bg-brand text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Cash
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 bg-theme-card border border-theme/10 rounded-lg hover:bg-theme-secondary/30 transition-colors"
            title="Sortierung umkehren"
          >
            <ArrowPathIcon className="w-5 h-5 text-theme-secondary" />
          </button>
          
          <button
            onClick={exportToCSV}
            className="p-2 bg-theme-card border border-theme/10 rounded-lg hover:bg-theme-secondary/30 transition-colors"
            title="Als CSV exportieren"
          >
            <DocumentArrowDownIcon className="w-5 h-5 text-theme-secondary" />
          </button>

          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-400 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Transaktion
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
        <div className="p-4 border-b border-theme/10">
          <h3 className="text-lg font-semibold text-theme-primary">
            Transaktionshistorie
          </h3>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-theme/10 flex flex-wrap items-center gap-4">
          {/* Holding Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-theme-secondary">Aktie:</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-1.5 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary text-sm focus:ring-2 focus:ring-green-400"
            >
              <option value="all">Alle Holdings</option>
              {uniqueSymbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Statistik */}
          <div className="flex items-center gap-4 ml-auto text-sm text-theme-secondary">
            <span>{symbolFilteredTransactions.length} Transaktionen</span>
            {selectedSymbol !== 'all' && (
              <button
                onClick={() => setSelectedSymbol('all')}
                className="text-brand-light hover:text-green-300"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>

        {/* Gruppierte Transaktionen nach Jahr/Monat */}
        <div className="divide-y divide-theme/10">
          {sortedYears.length === 0 ? (
            <div className="p-12 text-center">
              <ClockIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-secondary mb-2">Keine Transaktionen gefunden</p>
              <p className="text-theme-muted text-sm">
                Fügen Sie Ihre erste Transaktion hinzu
              </p>
            </div>
          ) : (
            sortedYears.map(year => {
              const yearStats = getYearStats(year)
              const isYearExpanded = expandedYears.has(year)
              const months = Object.keys(groupedTransactions[year])
                .map(Number)
                .sort((a, b) => b - a) // Neueste Monate zuerst

              return (
                <div key={year}>
                  {/* Jahr Header */}
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between p-4 hover:bg-theme-secondary/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRightIcon className={`w-5 h-5 text-theme-secondary transition-transform ${isYearExpanded ? 'rotate-90' : ''}`} />
                      <span className="text-lg font-bold text-theme-primary">{year}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-theme-secondary">
                      <span>{yearStats.count} Aktivitäten</span>
                      {yearStats.bought > 0 && (
                        <span className="text-red-400">{formatEuro(yearStats.bought)} gekauft</span>
                      )}
                      {yearStats.sold > 0 && (
                        <span className="text-green-400">{formatEuro(yearStats.sold)} verkauft</span>
                      )}
                      {yearStats.dividends > 0 && (
                        <span className="text-purple-400">{formatEuro(yearStats.dividends)} Dividenden</span>
                      )}
                    </div>
                  </button>

                  {/* Monate (wenn Jahr expanded) */}
                  {isYearExpanded && (
                    <div className="bg-theme-secondary/5">
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
                          <div key={yearMonth}>
                            {/* Monat Header */}
                            <button
                              onClick={() => toggleMonth(yearMonth)}
                              className="w-full flex items-center justify-between px-6 py-3 hover:bg-theme-secondary/10 transition-colors border-t border-theme/5"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRightIcon className={`w-4 h-4 text-theme-muted transition-transform ${isMonthExpanded ? 'rotate-90' : ''}`} />
                                <span className="font-medium text-theme-primary">{monthNames[month]} {year}</span>
                                <span className="text-sm text-theme-muted">{monthTxs.length} Aktivitäten</span>
                              </div>

                              <span className={`text-sm font-medium ${monthTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {monthTotal >= 0 ? '+' : ''}{formatEuro(monthTotal)}
                              </span>
                            </button>

                            {/* Transaktionen (wenn Monat expanded) */}
                            {isMonthExpanded && (
                              <div className="bg-theme-secondary/10">
                                {monthTxs.map(transaction => {
                                  const isNegative = transaction.type === 'buy' || transaction.type === 'cash_withdrawal'
                                  const isCashTransaction = transaction.type === 'cash_deposit' || transaction.type === 'cash_withdrawal'

                                  return (
                                    <div
                                      key={transaction.id}
                                      className="group flex items-center justify-between px-8 py-3 border-t border-theme/5 hover:bg-theme-secondary/20 transition-colors"
                                    >
                                      {/* Linke Seite - Details */}
                                      <div className="flex items-center gap-4">
                                        {/* Logo für Aktien, Icon für Cash/Dividenden */}
                                        {transaction.symbol && transaction.symbol !== 'CASH' && transaction.type !== 'cash_deposit' && transaction.type !== 'cash_withdrawal' && transaction.type !== 'dividend' ? (
                                          <Logo
                                            ticker={transaction.symbol}
                                            alt={transaction.symbol}
                                            className="w-8 h-8"
                                            padding="small"
                                          />
                                        ) : (
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                            transaction.type === 'cash_deposit' ? 'bg-green-500/20' :
                                            transaction.type === 'cash_withdrawal' ? 'bg-red-500/20' :
                                            transaction.type === 'dividend' ? 'bg-purple-500/20' :
                                            'bg-gray-500/20'
                                          }`}>
                                            {transaction.type === 'cash_deposit' && <PlusIcon className="w-4 h-4 text-green-400" />}
                                            {transaction.type === 'cash_withdrawal' && <MinusIcon className="w-4 h-4 text-red-400" />}
                                            {transaction.type === 'dividend' && <BanknotesIcon className="w-4 h-4 text-purple-400" />}
                                          </div>
                                        )}

                                        {/* Symbol und Details */}
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-theme-primary">
                                              {isCashTransaction ? (transaction.type === 'cash_deposit' ? 'Einzahlung' : 'Auszahlung') : transaction.symbol}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                              transaction.type === 'buy' ? 'bg-blue-500/20 text-blue-400' :
                                              transaction.type === 'sell' ? 'bg-green-500/20 text-green-400' :
                                              transaction.type === 'dividend' ? 'bg-purple-500/20 text-purple-400' :
                                              transaction.type === 'cash_deposit' ? 'bg-green-500/20 text-green-400' :
                                              'bg-red-500/20 text-red-400'
                                            }`}>
                                              {getTransactionLabel(transaction.type)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-theme-muted">
                                            {!isCashTransaction && transaction.type !== 'dividend' && transaction.quantity && (
                                              <>{transaction.quantity} Stück @ {formatEuro(transaction.price)} • </>
                                            )}
                                            {formatDate(transaction.date)}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Rechte Seite - Betrag und Aktionen */}
                                      <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className={`font-bold ${
                                            isNegative ? 'text-red-400' : 'text-green-400'
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
                                            className="p-1.5 hover:bg-blue-500/20 rounded transition-colors"
                                            title="Bearbeiten"
                                          >
                                            <PencilIcon className="w-4 h-4 text-blue-400" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteTransaction(transaction)
                                            }}
                                            disabled={saving}
                                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                                            title="Löschen"
                                          >
                                            <XMarkIcon className="w-4 h-4 text-red-400" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-theme-primary">Transaktion bearbeiten</h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1 hover:bg-theme-secondary/30 rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-theme-secondary" />
              </button>
            </div>

            {/* Info Badge */}
            <div className="bg-theme-secondary/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  editingTransaction.type === 'buy'
                    ? 'bg-blue-500/20 text-blue-400'
                    : editingTransaction.type === 'sell'
                    ? 'bg-green-500/20 text-green-400'
                    : editingTransaction.type === 'dividend'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {getTransactionLabel(editingTransaction.type)}
                </span>
                <span className="font-semibold text-theme-primary">{editingTransaction.symbol}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nur für Aktien-Transaktionen: Anzahl */}
              {(editingTransaction.type === 'buy' || editingTransaction.type === 'sell') && (
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">
                    Anzahl
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
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
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Preview für Aktien */}
              {(editingTransaction.type === 'buy' || editingTransaction.type === 'sell') && editQuantity && editPrice && (
                <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg">
                  <p className="text-sm text-theme-secondary">
                    Neuer Gesamtwert:
                    <span className="font-bold text-theme-primary ml-2">
                      {(parseFloat(editQuantity) * parseFloat(editPrice)).toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </span>
                  </p>
                  {editingTransaction.type === 'buy' && (
                    <p className="text-xs text-theme-muted mt-1">
                      Der Durchschnittspreis wird automatisch neu berechnet.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateTransaction}
                  disabled={saving || !editPrice || !editDate}
                  className="flex-1 py-2.5 bg-brand hover:bg-green-400 disabled:bg-theme-secondary disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
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
                  className="flex-1 py-2.5 border border-theme/20 hover:bg-theme-secondary/30 text-theme-primary rounded-lg transition-colors"
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