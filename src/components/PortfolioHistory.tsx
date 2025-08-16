// src/components/PortfolioHistory.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  ClockIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend'
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
}

export default function PortfolioHistory({ portfolioId, holdings }: PortfolioHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'dividend'>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  
  // Add Transaction Form
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy')
  const [transactionSymbol, setTransactionSymbol] = useState('')
  const [transactionQuantity, setTransactionQuantity] = useState('')
  const [transactionPrice, setTransactionPrice] = useState('')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [transactionNotes, setTransactionNotes] = useState('')
  const [adding, setAdding] = useState(false)

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
        // Wenn die Tabelle nicht existiert, erstelle Mock-Daten aus holdings
        createMockTransactions()
        return
      }

      if (data && data.length > 0) {
        setTransactions(data)
      } else {
        // Erstelle initiale Transaktionen aus holdings
        createMockTransactions()
      }
    } catch (error) {
      console.error('Error:', error)
      createMockTransactions()
    } finally {
      setLoading(false)
    }
  }

  const createMockTransactions = () => {
    // Erstelle Buy-Transaktionen aus aktuellen Holdings
    const mockTransactions: Transaction[] = holdings.map(holding => ({
      id: `mock-${holding.symbol}`,
      type: 'buy' as const,
      symbol: holding.symbol,
      name: holding.name,
      quantity: holding.quantity,
      price: holding.purchase_price,
      total_value: holding.quantity * holding.purchase_price,
      date: holding.purchase_date,
      created_at: holding.purchase_date,
      notes: 'Initial position'
    }))
    
    setTransactions(mockTransactions)
  }

  const handleAddTransaction = async () => {
    if (!transactionSymbol || !transactionQuantity || !transactionPrice) {
      alert('Bitte alle Pflichtfelder ausfüllen')
      return
    }

    setAdding(true)
    
    try {
      const totalValue = parseFloat(transactionQuantity) * parseFloat(transactionPrice)
      
      // Versuche die Transaktion zu speichern
      const { error } = await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolioId,
          type: transactionType,
          symbol: transactionSymbol.toUpperCase(),
          name: transactionSymbol.toUpperCase(), // Vereinfacht
          quantity: parseFloat(transactionQuantity),
          price: parseFloat(transactionPrice),
          total_value: totalValue,
          date: transactionDate,
          notes: transactionNotes
        })

      if (error) {
        console.error('Error adding transaction:', error)
        // Füge trotzdem lokal hinzu für Demo
        const newTransaction: Transaction = {
          id: `local-${Date.now()}`,
          type: transactionType,
          symbol: transactionSymbol.toUpperCase(),
          name: transactionSymbol.toUpperCase(),
          quantity: parseFloat(transactionQuantity),
          price: parseFloat(transactionPrice),
          total_value: totalValue,
          date: transactionDate,
          created_at: new Date().toISOString(),
          notes: transactionNotes
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
      setShowAddTransaction(false)
      
    } catch (error) {
      console.error('Error:', error)
      alert('Fehler beim Hinzufügen der Transaktion')
    } finally {
      setAdding(false)
    }
  }

  const filteredTransactions = transactions.filter(t => 
    filter === 'all' || t.type === filter
  ).sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
  })

  const getTotalByType = (type: 'buy' | 'sell' | 'dividend') => {
    return transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.total_value, 0)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <ArrowDownTrayIcon className="w-4 h-4 text-green-400" />
      case 'sell':
        return <ArrowUpTrayIcon className="w-4 h-4 text-red-400" />
      case 'dividend':
        return <CurrencyDollarIcon className="w-4 h-4 text-blue-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-theme-secondary" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'sell':
        return 'bg-red-500/10 border-red-500/30 text-red-400'
      case 'dividend':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      default:
        return 'bg-theme-secondary/30 border-theme/30 text-theme-secondary'
    }
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
    const rows = filteredTransactions.map(t => [
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
          <ArrowPathIcon className="w-6 h-6 text-green-400 animate-spin mx-auto mb-3" />
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
            <ArrowDownTrayIcon className="w-5 h-5 text-green-400" />
            <p className="text-sm text-theme-secondary">Käufe</p>
          </div>
          <p className="text-2xl font-bold text-green-400">
            ${getTotalByType('buy').toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'buy').length} Transaktionen
          </p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpTrayIcon className="w-5 h-5 text-red-400" />
            <p className="text-sm text-theme-secondary">Verkäufe</p>
          </div>
          <p className="text-2xl font-bold text-red-400">
            ${getTotalByType('sell').toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'sell').length} Transaktionen
          </p>
        </div>

        <div className="bg-theme-card rounded-xl p-4 border border-theme/10">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-theme-secondary">Dividenden</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            ${getTotalByType('dividend').toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-theme-muted mt-1">
            {transactions.filter(t => t.type === 'dividend').length} Zahlungen
          </p>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-theme-primary mb-4">
              Transaktion hinzufügen
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Typ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTransactionType('buy')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      transactionType === 'buy'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'border-theme/20 text-theme-secondary hover:border-theme/40'
                    }`}
                  >
                    Kauf
                  </button>
                  <button
                    onClick={() => setTransactionType('sell')}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      transactionType === 'sell'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'border-theme/20 text-theme-secondary hover:border-theme/40'
                    }`}
                  >
                    Verkauf
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={transactionSymbol}
                  onChange={(e) => setTransactionSymbol(e.target.value)}
                  placeholder="AAPL"
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-1">
                    Anzahl
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
                    Preis ($)
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

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Notizen (optional)
                </label>
                <textarea
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  placeholder="Zusätzliche Informationen..."
                  rows={2}
                  className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary"
                />
              </div>

              {transactionQuantity && transactionPrice && (
                <div className="p-3 bg-theme-secondary/30 rounded-lg">
                  <p className="text-sm text-theme-secondary">Gesamtwert</p>
                  <p className="text-lg font-bold text-theme-primary">
                    ${(parseFloat(transactionQuantity || '0') * parseFloat(transactionPrice || '0')).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddTransaction}
                  disabled={adding}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-400 disabled:bg-theme-secondary text-white rounded-lg transition-colors"
                >
                  {adding ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
                <button
                  onClick={() => setShowAddTransaction(false)}
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
                ? 'bg-green-500 text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('buy')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Käufe
          </button>
          <button
            onClick={() => setFilter('sell')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'sell'
                ? 'bg-green-500 text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Verkäufe
          </button>
          <button
            onClick={() => setFilter('dividend')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'dividend'
                ? 'bg-green-500 text-white'
                : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-secondary/30'
            }`}
          >
            Dividenden
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
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
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

        <div className="divide-y divide-theme/10">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="p-4 hover:bg-theme-secondary/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg border ${getTransactionColor(transaction.type)}`}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-theme-primary">
                        {transaction.symbol}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'buy' ? 'Kauf' : transaction.type === 'sell' ? 'Verkauf' : 'Dividende'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-theme-secondary">
                      <span>{transaction.quantity} Stück</span>
                      <span>@ ${transaction.price.toFixed(2)}</span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {formatDate(transaction.date)}
                      </span>
                    </div>
                    
                    {transaction.notes && (
                      <p className="text-xs text-theme-muted mt-2">
                        {transaction.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold text-lg ${
                    transaction.type === 'buy' ? 'text-red-400' :
                    transaction.type === 'sell' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    {transaction.type === 'buy' ? '-' : '+'}
                    ${transaction.total_value.toFixed(2)}
                  </p>
                  <p className="text-xs text-theme-muted">
                    Total
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center">
            <ClockIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
            <p className="text-theme-secondary mb-2">Keine Transaktionen gefunden</p>
            <p className="text-theme-muted text-sm">
              Fügen Sie Ihre erste Transaktion hinzu
            </p>
          </div>
        )}
      </div>
    </div>
  )
}