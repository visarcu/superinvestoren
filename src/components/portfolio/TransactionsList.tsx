// src/components/portfolio/TransactionsList.tsx
// Premium-Redesign: Dropdown-Symbol-Filter statt 26+ Chips, Monats-Summary,
// Logo statt Typ-Icon, saubereres Apple-inspired Layout.
'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Transaction, type RealizedGainInfo } from '@/hooks/usePortfolio'
import { perfColor } from '@/utils/formatters'
import { getBrokerDisplayName, getBrokerColor } from '@/lib/brokerConfig'
import Logo from '@/components/Logo'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  BanknotesIcon,
  MinusIcon,
  ClockIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface TransactionsListProps {
  portfolioId: string
  transactions: Transaction[]
  realizedGainByTxId: Map<string, RealizedGainInfo>
  onTransactionChange?: () => void
  formatCurrency: (amount: number) => string
  isAllDepotsView?: boolean
}

type TypeFilter = 'all' | 'buy' | 'sell' | 'dividend' | 'cash' | 'transfer'

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'buy', label: 'Käufe' },
  { key: 'sell', label: 'Verkäufe' },
  { key: 'dividend', label: 'Dividenden' },
  { key: 'cash', label: 'Cash' },
  { key: 'transfer', label: 'Transfers' },
]

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; shortLabel: string }> = {
  buy: { label: 'Kauf', icon: ArrowDownTrayIcon, color: 'text-emerald-400', shortLabel: 'Kauf' },
  sell: { label: 'Verkauf', icon: ArrowUpTrayIcon, color: 'text-red-400', shortLabel: 'Verkauf' },
  dividend: { label: 'Dividende', icon: BanknotesIcon, color: 'text-blue-400', shortLabel: 'Div.' },
  cash_deposit: { label: 'Einzahlung', icon: PlusIcon, color: 'text-emerald-400', shortLabel: 'Einz.' },
  cash_withdrawal: { label: 'Auszahlung', icon: MinusIcon, color: 'text-red-400', shortLabel: 'Ausz.' },
  transfer_in: { label: 'Einbuchung', icon: ArrowsRightLeftIcon, color: 'text-violet-400', shortLabel: 'Einb.' },
  transfer_out: { label: 'Ausbuchung', icon: ArrowsRightLeftIcon, color: 'text-orange-400', shortLabel: 'Ausb.' },
}

// ============================================================
// Dropdown-Komponente für Symbol-Filter
// ============================================================
function SymbolDropdown({
  symbols,
  selected,
  onChange,
}: {
  symbols: string[]
  selected: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return symbols
    const q = search.toLowerCase()
    return symbols.filter(s => s.toLowerCase().includes(q))
  }, [symbols, search])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium border border-neutral-800 bg-neutral-950 hover:border-neutral-700 rounded-lg transition-colors text-neutral-300"
      >
        {selected === 'all' ? `Alle Wertpapiere (${symbols.length})` : selected}
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-neutral-800">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-[12px] text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              onClick={() => { onChange('all'); setOpen(false); setSearch('') }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-neutral-900 transition-colors ${selected === 'all' ? 'text-white' : 'text-neutral-400'}`}
            >
              {selected === 'all' && <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />}
              <span className={selected === 'all' ? '' : 'ml-5'}>Alle Wertpapiere</span>
              <span className="ml-auto text-neutral-600">{symbols.length}</span>
            </button>
            {filtered.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); setSearch('') }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-neutral-900 transition-colors ${selected === s ? 'text-white' : 'text-neutral-400'}`}
              >
                {selected === s && <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />}
                <span className={selected === s ? '' : 'ml-5'}>{s}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Haupt-Komponente
// ============================================================
export default function TransactionsList({
  portfolioId,
  transactions,
  realizedGainByTxId,
  onTransactionChange,
  formatCurrency,
  isAllDepotsView = false,
}: TransactionsListProps) {
  const [filter, setFilter] = useState<TypeFilter>('all')
  const [symbolFilter, setSymbolFilter] = useState<string>('all')
  const [depotFilter, setDepotFilter] = useState<string>('all')

  // Edit State
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set<string>()
    transactions.forEach(t => { if (t.symbol && t.symbol !== 'CASH') symbols.add(t.symbol) })
    return Array.from(symbols).sort()
  }, [transactions])

  const uniqueDepots = useMemo(() => {
    if (!isAllDepotsView) return []
    const depots = new Map<string, { id: string; name: string; broker_type?: string | null; broker_color?: string | null }>()
    transactions.forEach(t => {
      if (t.portfolio_id && !depots.has(t.portfolio_id)) {
        depots.set(t.portfolio_id, { id: t.portfolio_id, name: t.portfolio_name || 'Depot', broker_type: t.broker_type, broker_color: t.broker_color })
      }
    })
    return Array.from(depots.values())
  }, [transactions, isAllDepotsView])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filter !== 'all') {
        if (filter === 'cash') {
          if (t.type !== 'cash_deposit' && t.type !== 'cash_withdrawal') return false
        } else if (filter === 'transfer') {
          if (t.type !== 'transfer_in' && t.type !== 'transfer_out') return false
        } else if (t.type !== filter) return false
      }
      if (symbolFilter !== 'all' && t.symbol !== symbolFilter) return false
      if (depotFilter !== 'all' && t.portfolio_id !== depotFilter) return false
      return true
    })
  }, [transactions, filter, symbolFilter, depotFilter])

  // Gruppiert nach Monat mit Summary
  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    filtered.forEach(tx => {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    })
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, txs]) => {
        // Monthly summary
        let buys = 0, sells = 0, divs = 0, cashIn = 0, cashOut = 0, transferIn = 0, transferOut = 0
        let buyCount = 0, sellCount = 0, divCount = 0
        txs.forEach(tx => {
          if (tx.type === 'buy') { buys += tx.total_value; buyCount++ }
          else if (tx.type === 'sell') { sells += tx.total_value; sellCount++ }
          else if (tx.type === 'dividend') { divs += tx.total_value; divCount++ }
          else if (tx.type === 'cash_deposit') cashIn += tx.total_value
          else if (tx.type === 'cash_withdrawal') cashOut += tx.total_value
          else if (tx.type === 'transfer_in') transferIn += tx.total_value
          else if (tx.type === 'transfer_out') transferOut += tx.total_value
        })
        return {
          key,
          txs,
          summary: { buys, sells, divs, cashIn, cashOut, transferIn, transferOut, buyCount, sellCount, divCount, total: txs.length },
        }
      })
  }, [filtered])

  // Edit handlers
  const handleDelete = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return
    const { error } = await supabase.from('portfolio_transactions').delete().eq('id', id)
    if (!error) onTransactionChange?.()
  }

  const startEdit = (tx: Transaction) => {
    setEditingTxId(tx.id)
    setEditDate(tx.date)
    setEditQuantity(tx.quantity.toString())
    setEditPrice(tx.price.toString())
    setEditNotes(tx.notes || '')
  }

  const saveEdit = async () => {
    if (!editingTxId) return
    setEditSaving(true)
    try {
      const qty = parseFloat(editQuantity) || 0
      const price = parseFloat(editPrice) || 0
      const { error } = await supabase
        .from('portfolio_transactions')
        .update({ date: editDate, quantity: qty, price, total_value: qty * price, notes: editNotes || null })
        .eq('id', editingTxId)
      if (error) throw error
      setEditingTxId(null)
      onTransactionChange?.()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setEditSaving(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const formatMonthLabel = (key: string) => {
    const [year, month] = key.split('-')
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    return `${months[parseInt(month) - 1]} ${year}`
  }

  return (
    <div>
      {/* ================================================================
          FILTER-BAR: Typ-Toggle + Symbol-Dropdown + Depot-Dropdown
      ================================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {/* Typ-Toggle (wie Dividenden-Zeitraum-Picker) */}
        <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                filter === f.key
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol-Dropdown */}
          {uniqueSymbols.length > 1 && (
            <SymbolDropdown symbols={uniqueSymbols} selected={symbolFilter} onChange={setSymbolFilter} />
          )}

          {/* Depot-Dropdown (Alle-Depots) */}
          {isAllDepotsView && uniqueDepots.length > 1 && (
            <select
              value={depotFilter}
              onChange={e => setDepotFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] font-medium border border-neutral-800 bg-neutral-950 hover:border-neutral-700 rounded-lg text-neutral-300 focus:outline-none"
            >
              <option value="all">Alle Depots</option>
              {uniqueDepots.map(d => (
                <option key={d.id} value={d.id}>
                  {getBrokerDisplayName(d.broker_type, null) || d.name}
                </option>
              ))}
            </select>
          )}

          {/* Count */}
          <span className="text-[11px] text-neutral-500 tabular-nums">
            {filtered.length} Einträge
          </span>
        </div>
      </div>

      {/* ================================================================
          TRANSACTION LIST (gruppiert nach Monat)
      ================================================================ */}
      {grouped.length === 0 ? (
        <div className="py-12 text-center">
          <ClockIcon className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">Keine Transaktionen</h3>
          <p className="text-[12px] text-neutral-500">
            Transaktionen erscheinen nach dem Import oder manuellem Hinzufügen.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ key, txs, summary }) => (
            <div key={key}>
              {/* Monats-Header mit Summary */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[13px] font-semibold text-white tracking-tight">
                  {formatMonthLabel(key)}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-neutral-500 tabular-nums">
                  {summary.buyCount > 0 && (
                    <span>{summary.buyCount} Kauf{summary.buyCount !== 1 ? 'e' : ''}</span>
                  )}
                  {summary.sellCount > 0 && (
                    <span>{summary.sellCount} Verkauf{summary.sellCount !== 1 ? '.' : ''}</span>
                  )}
                  {summary.divCount > 0 && (
                    <span className="text-blue-400/70">{summary.divCount} Div.</span>
                  )}
                  <span className="text-neutral-600">·</span>
                  <span className="font-medium text-neutral-400">
                    {summary.total} gesamt
                  </span>
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/80 overflow-hidden divide-y divide-neutral-800/60">
                {txs.map(tx => {
                  const config = TYPE_CONFIG[tx.type]
                  const Icon = config?.icon || ClockIcon
                  const isEditing = editingTxId === tx.id
                  const rgInfo = tx.type === 'sell' ? realizedGainByTxId.get(tx.id) : undefined
                  const isCash = tx.symbol === 'CASH' || tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
                  const isNegative = tx.type === 'sell' || tx.type === 'cash_withdrawal' || tx.type === 'transfer_out'

                  if (isEditing) {
                    return (
                      <div key={tx.id} className="p-4 bg-neutral-900/80">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                            <Icon className={`w-4 h-4 ${config?.color || 'text-neutral-400'}`} />
                          </div>
                          <span className="text-[13px] font-medium text-white">{config?.label}</span>
                          {!isCash && <span className="text-[12px] text-neutral-500">{tx.symbol}</span>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-1">Datum</label>
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-[13px] focus:outline-none focus:border-neutral-600" />
                          </div>
                          {!isCash && (
                            <>
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1">Anzahl</label>
                                <input type="number" value={editQuantity} onChange={e => setEditQuantity(e.target.value)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-[13px] tabular-nums focus:outline-none focus:border-neutral-600" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-neutral-500 mb-1">Preis (EUR)</label>
                                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)}
                                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-[13px] tabular-nums focus:outline-none focus:border-neutral-600" />
                              </div>
                            </>
                          )}
                          <div>
                            <label className="block text-[10px] text-neutral-500 mb-1">Notiz</label>
                            <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="optional"
                              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-[13px] placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={editSaving}
                            className="px-4 py-2 bg-white text-neutral-950 hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1.5">
                            {editSaving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckIcon className="w-3.5 h-3.5" />}
                            Speichern
                          </button>
                          <button onClick={() => setEditingTxId(null)} disabled={editSaving}
                            className="px-4 py-2 text-[12px] text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center gap-3 px-4 py-3 hover:bg-neutral-900/50 transition-colors"
                    >
                      {/* Logo oder Typ-Icon */}
                      {isCash ? (
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                          <Icon className={`w-4 h-4 ${config?.color || 'text-neutral-400'}`} />
                        </div>
                      ) : (
                        <Logo ticker={tx.symbol} alt={tx.symbol} className="w-8 h-8 flex-shrink-0 rounded-lg" padding="none" />
                      )}

                      {/* Mitte: Titel + Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {!isCash && (
                            <span className="text-[13px] font-medium text-white truncate">{tx.symbol}</span>
                          )}
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                            isNegative ? 'bg-red-500/10 text-red-400'
                              : tx.type === 'dividend' ? 'bg-blue-500/10 text-blue-400'
                                : tx.type === 'transfer_in' ? 'bg-violet-500/10 text-violet-400'
                                  : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {config?.shortLabel || config?.label}
                          </span>
                          {/* Depot-Badge (Alle-Depots) */}
                          {isAllDepotsView && tx.portfolio_name && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getBrokerColor(tx.broker_type, tx.broker_color) }} />
                              {getBrokerDisplayName(tx.broker_type, tx.broker_name) || tx.portfolio_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 tabular-nums truncate">
                          {formatDate(tx.date)}
                          {!isCash && tx.quantity > 0 && ` · ${tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 6 })} × ${formatCurrency(tx.price)}`}
                          {isCash && tx.name && tx.name !== 'CASH' && ` · ${tx.name}`}
                        </p>
                      </div>

                      {/* Rechts: Betrag + G/V */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[13px] font-semibold tabular-nums ${
                          isNegative ? 'text-red-400' : tx.type === 'dividend' ? 'text-blue-400' : tx.type === 'transfer_in' ? 'text-violet-400' : 'text-emerald-400'
                        }`}>
                          {isNegative ? '-' : '+'}{formatCurrency(tx.total_value)}
                        </p>
                        {rgInfo && (
                          <p className={`text-[10px] tabular-nums ${perfColor(rgInfo.realizedGain)}`}>
                            G/V: {rgInfo.realizedGain >= 0 ? '+' : ''}{formatCurrency(rgInfo.realizedGain)}
                            {' '}({rgInfo.realizedGainPercent >= 0 ? '+' : ''}{rgInfo.realizedGainPercent.toFixed(1)}%)
                          </p>
                        )}
                      </div>

                      {/* Actions (hover-visible) */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => startEdit(tx)} className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors" title="Bearbeiten">
                          <PencilIcon className="w-3.5 h-3.5 text-neutral-500 hover:text-white" />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors" title="Löschen">
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
