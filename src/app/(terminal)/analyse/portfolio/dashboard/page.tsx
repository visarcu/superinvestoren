// src/app/analyse/portfolio/dashboard/page.tsx - NEUAUFBAU
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePortfolio, type Holding } from '@/hooks/usePortfolio'
import QuickStats from '@/components/portfolio/QuickStats'
import PositionsTable from '@/components/portfolio/PositionsTable'
import AddActivityFAB from '@/components/portfolio/AddActivityFAB'
import TransactionsList from '@/components/portfolio/TransactionsList'
import PortfolioValueChart from '@/components/portfolio/PortfolioValueChart'
import PortfolioEarningsPreview from '@/components/PortfolioEarningsPreview'
import SoldPositions from '@/components/portfolio/SoldPositions'
import { getETFBySymbol } from '@/lib/etfUtils'
import AIAnalyseTab from '@/components/portfolio/AIAnalyseTab'
import AnalysisTab from '@/components/portfolio/AnalysisTab'
import DividendsTab from '@/components/portfolio/DividendsTab'
import CSVImportModal from '@/components/portfolio/CSVImportModal'
import PortfolioAllocation from '@/components/portfolio/PortfolioAllocation'
import Logo from '@/components/Logo'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'
import { brokerTypeToLogoId } from '@/lib/brokerConfig'
import { perfColor } from '@/utils/formatters'
import {
  BriefcaseIcon,
  PlusIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

// Skeleton for loading
const SkeletonRow = () => (
  <div className="flex items-center justify-between py-3 border-b border-neutral-800/50 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-neutral-800 rounded-full" />
      <div>
        <div className="h-4 bg-neutral-800 rounded w-12 mb-1" />
        <div className="h-3 bg-neutral-800 rounded w-20" />
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-4 bg-neutral-800 rounded w-16" />
      <div className="h-4 bg-neutral-800 rounded w-12" />
    </div>
  </div>
)

// Premium Upgrade Modal
const PremiumUpgradeModal = ({ isOpen, onClose, feature }: { isOpen: boolean; onClose: () => void; feature: string }) => {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <LockClosedIcon className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Premium Feature</h2>
          <p className="text-neutral-400 text-sm">{feature}</p>
        </div>
        <div className="space-y-3 mb-6">
          {['Dividenden-Tracking & Prognosen', 'KI-Portfolio-Analyse', 'Performance-Insights & Analysen', 'Superinvestor-Overlap'].map(t => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckIcon className="w-3 h-3 text-emerald-400" />
              </div>
              <span className="text-neutral-300">{t}</span>
            </div>
          ))}
        </div>
        <div className="text-center mb-6 p-4 bg-neutral-800/50 rounded-xl">
          <div className="text-2xl font-bold text-white">9€<span className="text-base font-normal text-neutral-400">/Monat</span></div>
          <p className="text-xs text-neutral-500 mt-1">Jederzeit kündbar</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-sm font-medium bg-neutral-800 text-neutral-400 rounded-xl hover:bg-neutral-700 transition-colors">
            Später
          </button>
          <Link href="/pricing" className="flex-1 px-4 py-3 text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-colors text-center">
            Jetzt upgraden
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioDashboard() {
  const router = useRouter()
  const p = usePortfolio()

  // Superinvestor Overlap
  const [superInvestorCounts, setSuperInvestorCounts] = useState<Record<string, { count: number; investors: { name: string; slug: string }[] }>>({})

  const fetchSuperInvestorOverlap = useCallback(async (holdings: { symbol: string }[]) => {
    if (holdings.length === 0) return
    try {
      const tickers = holdings.map(h => h.symbol)
      const res = await fetch('/api/portfolio/super-investor-overlap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers })
      })
      if (res.ok) {
        const data = await res.json()
        setSuperInvestorCounts(data)
      }
    } catch (error) {
      console.error('Error fetching super investor overlap:', error)
    }
  }, [])

  useEffect(() => {
    if (p.holdings.length > 0) {
      fetchSuperInvestorOverlap(p.holdings)
    }
  }, [p.holdings, fetchSuperInvestorOverlap])

  // Wert pro Depot berechnen (für den Switcher-Überblick)
  // Im "Alle Depots"-Modus reichen p.holdings (haben portfolio_id).
  // Im Single-Depot-Modus müssen wir Holdings der ANDEREN Depots separat laden.
  const [allDepotHoldings, setAllDepotHoldings] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function loadAllDepotValues() {
      // Wenn nur ein Depot existiert, oder bereits "Alle Depots" → nichts zu tun
      if (p.allPortfolios.length <= 1 || p.isAllDepotsView) {
        setAllDepotHoldings(new Map())
        return
      }
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const otherIds = p.allPortfolios
          .filter(dp => dp.id !== p.portfolio?.id)
          .map(dp => dp.id)
        if (otherIds.length === 0) return

        const { data } = await supabase
          .from('portfolio_holdings')
          .select('portfolio_id, symbol, current_price, purchase_price, quantity')
          .in('portfolio_id', otherIds)

        if (cancelled || !data) return

        // Symbole sammeln deren current_price NULL/0 ist → Live-Kurse holen
        const symbolsToFetch = new Set<string>()
        for (const h of data) {
          const cp = Number(h.current_price)
          if (!cp || cp <= 0) symbolsToFetch.add(h.symbol)
        }

        // Live-Kurse holen (Batch)
        const liveQuotes = new Map<string, number>()
        if (symbolsToFetch.size > 0) {
          try {
            const symbols = [...symbolsToFetch].join(',')
            const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`)
            if (res.ok) {
              const quotes = await res.json()
              if (Array.isArray(quotes)) {
                for (const q of quotes) {
                  if (q.symbol && q.price > 0) liveQuotes.set(q.symbol, q.price)
                }
              }
            }
          } catch { /* Fallback: purchase_price */ }
        }

        if (cancelled) return

        // Werte aggregieren: current_price > Live-Quote > purchase_price (Fallback)
        const map = new Map<string, number>()
        for (const h of data) {
          const cp = Number(h.current_price)
          const live = liveQuotes.get(h.symbol)
          const pp = Number(h.purchase_price)
          const price = (cp && cp > 0) ? cp : (live && live > 0) ? live : pp
          const value = (price || 0) * (Number(h.quantity) || 0)
          map.set(h.portfolio_id, (map.get(h.portfolio_id) || 0) + value)
        }
        setAllDepotHoldings(map)
      } catch (err) {
        console.error('Error loading depot values:', err)
      }
    }
    loadAllDepotValues()
    return () => { cancelled = true }
  }, [p.allPortfolios, p.portfolio?.id, p.isAllDepotsView])

  const depotValues = useMemo(() => {
    const values = new Map<string, number>()
    // Aktuell geladenes Portfolio
    p.holdings.forEach(h => {
      if (h.portfolio_id) {
        values.set(h.portfolio_id, (values.get(h.portfolio_id) || 0) + h.value)
      } else if (p.portfolio?.id) {
        // Single-Depot-Modus: holdings haben kein portfolio_id Feld → dem aktuellen Depot zuordnen
        values.set(p.portfolio.id, (values.get(p.portfolio.id) || 0) + h.value)
      }
    })
    // Andere Depots (separat geladen)
    allDepotHoldings.forEach((value, portfolioId) => {
      if (!values.has(portfolioId)) {
        values.set(portfolioId, value)
      }
    })
    // Cash dazu
    p.allPortfolios.forEach(dp => {
      const stockValue = values.get(dp.id) || 0
      values.set(dp.id, stockValue + (dp.cash_position || 0))
    })
    return values
  }, [p.holdings, p.allPortfolios, p.portfolio?.id, allDepotHoldings])

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'analysis' | 'transactions' | 'ai-analyse' | 'dividends'>('overview')
  const [showDepotSwitcher, setShowDepotSwitcher] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [premiumFeatureMessage, setPremiumFeatureMessage] = useState('')

  // Edit Position State
  const [editingPosition, setEditingPosition] = useState<Holding | null>(null)
  const [editQuantity, setEditQuantity] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Top Up State
  const [topUpTarget, setTopUpTarget] = useState<Holding | null>(null)
  const [topUpQuantity, setTopUpQuantity] = useState('')
  const [topUpPrice, setTopUpPrice] = useState('')
  const [topUpDate, setTopUpDate] = useState(new Date().toISOString().split('T')[0])
  const [topUpFees, setTopUpFees] = useState('')
  const [topUpSaving, setTopUpSaving] = useState(false)

  // Cash Modal State
  const [showCashModal, setShowCashModal] = useState(false)
  const [newCashAmount, setNewCashAmount] = useState('')

  // Broker Credit Modal State
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [newCreditAmount, setNewCreditAmount] = useState('')

  // Name Modal State
  const [showNameModal, setShowNameModal] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')

  // CSV Import State
  const [showCSVImport, setShowCSVImport] = useState(false)

  // Cash-Toggle State (mit/ohne Cash im Gesamtwert)
  const [includeCashInTotal, setIncludeCashInTotal] = useState(true)

  // Handlers
  const handlePremiumRequired = () => {
    setPremiumFeatureMessage('Mit Premium kannst du unbegrenzt Positionen zu deinem Portfolio hinzufügen.')
    setShowPremiumModal(true)
  }

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === 'transactions' && !p.isPremium) {
      setPremiumFeatureMessage('Portfolio-Historie ist ein Premium-Feature. Verfolge alle deine Transaktionen.')
      setShowPremiumModal(true)
      return
    }
    if (tab === 'ai-analyse' && !p.isPremium) {
      setPremiumFeatureMessage('KI-Portfolio-Analyse ist ein Premium-Feature. Lass dein Portfolio von unserer KI analysieren.')
      setShowPremiumModal(true)
      return
    }
    if (tab === 'dividends' && !p.isPremium) {
      setPremiumFeatureMessage('Dividenden-Übersicht ist ein Premium-Feature. Behalte alle Dividendenzahlungen im Blick.')
      setShowPremiumModal(true)
      return
    }
    setActiveTab(tab)
  }

  const openEditModal = (holding: Holding) => {
    setEditingPosition(holding)
    setEditQuantity(holding.quantity.toString())
    setEditPrice((holding.purchase_price_display || holding.purchase_price).toString())
    setEditDate(holding.purchase_date)
  }

  const handleUpdatePosition = async () => {
    if (!editingPosition) return
    setSaving(true)
    try {
      await p.updatePosition(editingPosition.id, {
        quantity: parseFloat(editQuantity) || editingPosition.quantity,
        purchase_price: parseFloat(editPrice) || editingPosition.purchase_price,
        purchase_date: editDate || editingPosition.purchase_date
      })
      setEditingPosition(null)
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePosition = async (holdingId: string) => {
    if (!confirm('Position wirklich löschen?')) return
    try {
      await p.deletePosition(holdingId)
    } catch {
      alert('Fehler beim Löschen')
    }
  }

  const handleTopUp = async () => {
    if (!topUpTarget || !topUpQuantity || !topUpPrice) return
    setTopUpSaving(true)
    try {
      await p.topUpPosition(topUpTarget, {
        quantity: parseFloat(topUpQuantity),
        price: parseFloat(topUpPrice),
        date: topUpDate,
        fees: parseFloat(topUpFees) || 0
      })
      setTopUpTarget(null)
      setTopUpQuantity('')
      setTopUpPrice('')
      setTopUpFees('')
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    } finally {
      setTopUpSaving(false)
    }
  }

  const handleUpdateCash = async () => {
    if (newCashAmount === '') return
    try {
      await p.updateCashPosition(parseFloat(newCashAmount) || 0)
      setShowCashModal(false)
      setNewCashAmount('')
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    }
  }

  const handleUpdateName = async () => {
    if (!newPortfolioName.trim()) return
    try {
      await p.updatePortfolioName(newPortfolioName)
      setShowNameModal(false)
      setNewPortfolioName('')
    } catch (error: any) {
      alert(`Fehler: ${error.message}`)
    }
  }

  // Loading
  if (p.loading) {
    return (
      <div className="min-h-screen bg-dark">
        <div className="w-full px-6 py-6">
          <div className="animate-pulse">
            <div className="h-6 bg-neutral-800 rounded w-40 mb-2" />
            <div className="h-10 bg-neutral-800 rounded w-48 mb-8" />
            <div className="space-y-0">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
          </div>
        </div>
      </div>
    )
  }

  // Error
  if (p.error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <ExclamationTriangleIcon className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Fehler beim Laden</h2>
          <p className="text-neutral-400 text-sm mb-4">{p.error}</p>
          <button onClick={() => p.loadPortfolio(p.depotIdParam)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-lg transition-colors">
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Error Banners */}
      {(p.exchangeRateError || p.priceLoadError) && (
        <div className="w-full px-6 pt-4 space-y-2">
          {p.exchangeRateError && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200 flex-1">{p.exchangeRateError}</p>
              <button onClick={p.loadExchangeRate} className="text-xs text-amber-400 hover:text-amber-300 underline">Erneut versuchen</button>
            </div>
          )}
          {p.priceLoadError && (
            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200 flex-1">{p.priceLoadError}</p>
              <button onClick={() => p.loadPortfolio(p.depotIdParam)} className="text-xs text-red-400 hover:text-red-300 underline">Erneut versuchen</button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-medium text-white">{p.portfolio?.name || 'Mein Portfolio'}</h1>

              {/* Depot Switcher */}
              {p.allPortfolios.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowDepotSwitcher(!showDepotSwitcher)} className="p-1 hover:bg-neutral-800 rounded transition-colors">
                    <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform ${showDepotSwitcher ? 'rotate-180' : ''}`} />
                  </button>

                  {showDepotSwitcher && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDepotSwitcher(false)} />
                      <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-20 py-2 max-h-80 overflow-y-auto">
                        {p.allPortfolios.length > 1 && (
                          <>
                            <Link href="/analyse/portfolio/dashboard?depot=all" onClick={() => setShowDepotSwitcher(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors ${p.portfolio?.id === 'all' ? 'bg-emerald-500/10' : ''}`}>
                              <Squares2X2Icon className="w-4 h-4 text-emerald-400" />
                              <span className="text-sm text-white">Alle Depots</span>
                              {p.portfolio?.id === 'all' && <CheckIcon className="w-4 h-4 text-emerald-400 ml-auto" />}
                            </Link>
                            <hr className="my-1 border-neutral-800" />
                          </>
                        )}
                        {p.allPortfolios.map(dp => {
                          const logoId = brokerTypeToLogoId(dp.broker_type)
                          const depotTotal = depotValues.get(dp.id)
                          return (
                            <Link key={dp.id} href={`/analyse/portfolio/dashboard?depot=${dp.id}`} onClick={() => setShowDepotSwitcher(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors ${p.portfolio?.id === dp.id ? 'bg-emerald-500/10' : ''}`}>
                              {logoId ? (
                                <BrokerLogo brokerId={logoId} size={20} />
                              ) : (
                                <BriefcaseIcon className="w-4 h-4 text-neutral-400" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-white truncate block">{dp.name}</span>
                                {depotTotal !== undefined && (
                                  <span className="text-[11px] text-neutral-500 tabular-nums">
                                    {p.formatCurrency(depotTotal)}
                                  </span>
                                )}
                              </div>
                              {p.portfolio?.id === dp.id && <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                            </Link>
                          )
                        })}
                        <hr className="my-1 border-neutral-800" />
                        <Link href="/analyse/portfolio/depots/neu" onClick={() => setShowDepotSwitcher(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 transition-colors text-emerald-400">
                          <PlusIcon className="w-4 h-4" />
                          <span className="text-sm">Neues Depot</span>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}

              {p.portfolio?.id !== 'all' && (
                <button
                  onClick={() => { setNewPortfolioName(p.portfolio?.name || ''); setShowNameModal(true) }}
                  className="p-1 hover:bg-neutral-800 rounded transition-colors opacity-0 hover:opacity-100"
                  title="Umbenennen"
                >
                  <PencilIcon className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={p.refresh} disabled={p.refreshing} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50" title="Aktualisieren">
                <ArrowPathIcon className={`w-4 h-4 text-neutral-400 ${p.refreshing ? 'animate-spin' : ''}`} />
              </button>
              {!p.isAllDepotsView && (
                <button onClick={() => setShowCSVImport(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800/60 hover:bg-neutral-700/60 border border-neutral-700/50 hover:border-neutral-600/50 rounded-lg transition-colors" title="Import">
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                  Import
                </button>
              )}
              <button onClick={p.exportToCSV} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors" title="Export">
                <ArrowDownTrayIcon className="w-4 h-4 text-neutral-400" />
              </button>
              <Link href="/analyse/portfolio/depots" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors" title="Depots">
                <Squares2X2Icon className="w-4 h-4 text-neutral-400" />
              </Link>
            </div>
          </div>

          {/* Quick Value Display + Cash-Toggle */}
          <div className="flex items-end justify-between gap-8 flex-wrap">
            <div>
              <p className="text-3xl font-bold text-white tracking-tight tabular-nums">
                {p.formatCurrency(includeCashInTotal ? p.totalValue : p.stockValue)}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-medium tabular-nums ${perfColor(p.totalReturn)}`}>
                  {p.totalReturn >= 0 ? '+' : ''}{p.formatCurrency(p.totalReturn)}
                </span>
                <span className={`text-sm tabular-nums ${perfColor(p.totalReturnPercent)}`}>
                  {p.formatPercentage(p.totalReturnPercent)}
                </span>
                {p.xirrPercent !== null && (
                  <span className={`text-xs px-1.5 py-0.5 rounded tabular-nums ${perfColor(p.xirrPercent, 'bg')}`}>
                    XIRR: {p.xirrPercent >= 0 ? '+' : ''}{p.xirrPercent.toFixed(1)}% p.a.
                  </span>
                )}
              </div>
            </div>

            {/* Cash-Toggle: nur sichtbar wenn Cash != 0 */}
            {p.cashPosition !== 0 && (
              <div className="inline-flex items-center bg-neutral-900/50 border border-neutral-800 rounded-lg p-0.5 text-[11px] font-medium">
                <button
                  onClick={() => setIncludeCashInTotal(true)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    includeCashInTotal
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Mit Cash
                </button>
                <button
                  onClick={() => setIncludeCashInTotal(false)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    !includeCashInTotal
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Nur Wertpapiere
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 px-6 border-b border-neutral-800">
        {[
          { key: 'overview' as const, label: 'Übersicht', premium: false },
          { key: 'positions' as const, label: 'Positionen', premium: false },
          { key: 'analysis' as const, label: 'Analyse', premium: false },
          { key: 'dividends' as const, label: 'Dividenden', premium: true },
          { key: 'ai-analyse' as const, label: 'KI-Analyse', premium: true },
          { key: 'transactions' as const, label: 'Transaktionen', premium: true },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-white border-white'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            {tab.label}
            {!p.isPremium && tab.premium && <LockClosedIcon className="w-3 h-3 text-amber-500" />}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="w-full px-6 py-6 pb-24">
        {/* Exchange Rate Info */}
        {p.exchangeRate && (
          <div className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
            <span>USD/EUR: {p.exchangeRate.toFixed(4)}</span>
            <button onClick={p.loadExchangeRate} className="text-emerald-400 hover:text-emerald-300">↻</button>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <QuickStats
              totalValue={p.totalValue}
              cashPosition={p.cashPosition}
              brokerCredit={p.portfolio?.broker_credit || 0}
              totalGainLoss={p.totalGainLoss}
              totalGainLossPercent={p.totalGainLossPercent}
              totalRealizedGain={p.totalRealizedGain}
              totalDividends={p.totalDividends}
              totalReturn={p.totalReturn}
              totalReturnPercent={p.totalReturnPercent}
              xirrPercent={p.xirrPercent}
              activeInvestments={p.activeInvestments}
              totalFees={p.totalFees}
              formatCurrency={p.formatCurrency}
              formatPercentage={p.formatPercentage}
              onCashClick={() => { setNewCashAmount(p.cashPosition.toString()); setShowCashModal(true) }}
              onCreditClick={() => { setNewCreditAmount((p.portfolio?.broker_credit || 0).toString()); setShowCreditModal(true) }}
            />

            {/* Empty State - wenn noch keine Positionen */}
            {p.holdings.length === 0 && (
              <div className="mt-6 bg-neutral-900/50 rounded-xl border border-neutral-800/50 border-dashed p-10 text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <BriefcaseIcon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Depot ist noch leer</h3>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                  Nutze den <span className="text-emerald-400 font-medium">+</span> Button unten rechts, um deine erste Aktivität hinzuzufügen.
                </p>
              </div>
            )}

            {/* Chart + Anstehende Earnings nebeneinander */}
            {p.holdings.length > 0 && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr,1.6fr] gap-5">
                {/* Earnings links — kompakt, clean */}
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 overflow-hidden">
                  <PortfolioEarningsPreview symbols={p.holdings.map(h => h.symbol)} />
                </div>

                {/* Chart rechts — bekommt mehr Platz */}
                <div className="bg-neutral-900/50 rounded-xl p-6 border border-neutral-800/50">
                  <PortfolioValueChart
                    portfolioId={p.portfolio?.id || ''}
                    // Bei Alle-Depots: alle echten UUIDs übergeben, damit die API
                    // Transaktionen aus sämtlichen Depots aggregiert statt 'all'
                    // als (ungültige) UUID zu behandeln und auf Holdings-Fallback
                    // zu fallen (führte zu halbierten Chart-Werten).
                    portfolioIds={p.isAllDepotsView ? p.allPortfolios.map(ap => ap.id) : undefined}
                    holdings={p.holdings.map(h => ({
                      symbol: h.symbol,
                      quantity: h.quantity,
                      purchase_price: h.purchase_price,
                      purchase_date: h.purchase_date
                    }))}
                    cashPosition={p.cashPosition}
                    formatCurrency={p.formatCurrency}
                  />
                </div>
              </div>
            )}

            {/* Allokations-Donut */}
            {p.holdings.length > 0 && (
              <div className="mt-5 bg-neutral-900/50 rounded-xl p-6 border border-neutral-800/50">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-white tracking-tight">Allokation</h3>
                  <span className="text-[11px] text-neutral-500">
                    {includeCashInTotal ? 'Inkl. Cash' : 'Nur Wertpapiere'}
                  </span>
                </div>
                <PortfolioAllocation
                  holdings={p.holdings}
                  cashPosition={p.cashPosition}
                  totalValue={p.totalValue}
                  formatCurrency={p.formatCurrency}
                  includeCash={includeCashInTotal && p.cashPosition > 0}
                />
              </div>
            )}

            {/* Top Positions Quick View */}
            {p.holdings.length > 0 && (() => {
              // In Alle-Depots: gleiche Aktien gruppieren
              const topPositions = (() => {
                if (!p.isAllDepotsView) {
                  return [...p.holdings].sort((a, b) => b.value - a.value).slice(0, 5).map(h => ({
                    symbol: h.symbol,
                    name: h.name || h.symbol,
                    quantity: h.quantity,
                    value: h.value,
                    gainLossPercent: h.gain_loss_percent,
                  }))
                }
                const grouped = new Map<string, { symbol: string; name: string; quantity: number; value: number; totalCost: number }>()
                p.holdings.forEach(h => {
                  const existing = grouped.get(h.symbol)
                  if (existing) {
                    existing.quantity += h.quantity
                    existing.value += h.value
                    existing.totalCost += h.purchase_price_display * h.quantity
                  } else {
                    grouped.set(h.symbol, { symbol: h.symbol, name: h.name || h.symbol, quantity: h.quantity, value: h.value, totalCost: h.purchase_price_display * h.quantity })
                  }
                })
                return Array.from(grouped.values())
                  .map(g => ({ symbol: g.symbol, name: g.name, quantity: g.quantity, value: g.value, gainLossPercent: g.totalCost > 0 ? ((g.value - g.totalCost) / g.totalCost) * 100 : 0 }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 5)
              })()

              return (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-neutral-400">Top Positionen</h3>
                    <button onClick={() => setActiveTab('positions')} className="text-xs text-emerald-400 hover:text-emerald-300">
                      Alle anzeigen →
                    </button>
                  </div>
                  <div className="space-y-0">
                    {topPositions.map((pos) => (
                      <div key={pos.symbol}
                        className="flex items-center justify-between py-2.5 border-b border-neutral-800/30 cursor-pointer hover:bg-neutral-900/50 -mx-2 px-2 rounded transition-colors"
                        onClick={() => {
                          const base = p.portfolio?.id
                            ? `/analyse/portfolio/stocks/${pos.symbol.toLowerCase()}?portfolioId=${p.portfolio.id}&totalValue=${p.totalValue}`
                            : `/analyse/stocks/${pos.symbol.toLowerCase()}`
                          router.push(base)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Logo ticker={pos.symbol} alt={pos.symbol} className="w-7 h-7" padding="none" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const etfInfo = getETFBySymbol(pos.symbol)
                                const displayName = etfInfo?.name || (pos.name && pos.name !== pos.symbol ? pos.name : pos.symbol)
                                return <span className="font-medium text-white text-sm truncate">{displayName}</span>
                              })()}
                              {superInvestorCounts[pos.symbol]?.count > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full flex-shrink-0">
                                  <UserGroupIcon className="w-2.5 h-2.5" />
                                  {superInvestorCounts[pos.symbol].count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 truncate">{pos.symbol} · {pos.quantity.toLocaleString('de-DE')} St.</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{p.formatCurrency(pos.value)}</p>
                          <span className={`text-xs ${perfColor(pos.gainLossPercent)}`}>
                            {pos.gainLossPercent >= 0 ? '+' : ''}{pos.gainLossPercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Verkaufte Wertpapiere */}
            <SoldPositions
              transactions={p.transactions}
              formatCurrency={p.formatCurrency}
              portfolioId={p.portfolio?.id}
              totalValue={p.totalValue}
            />
          </>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <PositionsTable
            holdings={p.holdings}
            cashPosition={p.cashPosition}
            totalValue={p.totalValue}
            formatCurrency={p.formatCurrency}
            formatStockPrice={p.formatStockPrice}
            formatPercentage={p.formatPercentage}
            onEditPosition={openEditModal}
            onDeletePosition={handleDeletePosition}
            onTopUpPosition={(h) => { setTopUpTarget(h); setTopUpPrice('') }}
            onEditCash={() => { setNewCashAmount(p.cashPosition.toString()); setShowCashModal(true) }}
            isAllDepotsView={p.isAllDepotsView}
            portfolioId={p.portfolio?.id}
            superInvestorCounts={superInvestorCounts}
            historicalPerfByDepot={p.historicalPerfByDepot}
          />
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <AnalysisTab
            holdings={p.holdings}
            cashPosition={p.cashPosition}
            totalValue={p.totalValue}
            formatCurrency={p.formatCurrency}
            formatPercentage={p.formatPercentage}
            portfolioId={p.portfolio?.id}
          />
        )}

        {/* AI Analyse Tab */}
        {activeTab === 'ai-analyse' && (
          <AIAnalyseTab
            holdings={p.holdings}
            portfolioId={p.portfolio?.id}
          />
        )}

        {/* Dividends Tab */}
        {activeTab === 'dividends' && (
          <DividendsTab
            transactions={p.transactions}
            holdings={p.holdings}
            totalPortfolioValue={p.totalValue}
            formatCurrency={p.formatCurrency}
            isAllDepotsView={p.isAllDepotsView}
          />
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <TransactionsList
            portfolioId={p.portfolio?.id || ''}
            transactions={p.transactions}
            realizedGainByTxId={p.realizedGainByTxId}
            onTransactionChange={() => p.loadPortfolio(p.depotIdParam)}
            formatCurrency={p.formatCurrency}
            isAllDepotsView={p.isAllDepotsView}
          />
        )}

        {/* ===== MODALS ===== */}

        {/* Edit Position Modal — Premium-Design (Apple-inspired dark) */}
        {editingPosition && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto"
            onClick={() => !saving && setEditingPosition(null)}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-neutral-950 rounded-2xl max-w-md w-full border border-neutral-800/80 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/80">
                  <div>
                    <h2 className="text-[17px] font-semibold text-white tracking-tight">Position bearbeiten</h2>
                    <p className="text-[12px] text-neutral-500 mt-0.5">Menge, Einstandskurs oder Kaufdatum anpassen</p>
                  </div>
                  <button
                    onClick={() => setEditingPosition(null)}
                    disabled={saving}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors disabled:opacity-40"
                    aria-label="Schließen"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Position */}
                  <div className="flex items-center gap-3 rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3">
                    <Logo ticker={editingPosition.symbol} alt={editingPosition.symbol} className="w-10 h-10 rounded-lg" padding="none" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-white truncate">{editingPosition.symbol}</div>
                      <div className="text-[12px] text-neutral-500 truncate">{editingPosition.name}</div>
                    </div>
                  </div>

                  {/* Anzahl */}
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-400 mb-2">Anzahl</label>
                    <input
                      type="number"
                      step="0.00000001"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-[15px] tabular-nums placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                    />
                  </div>

                  {/* Einstandskurs */}
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-400 mb-2">Einstandskurs (EUR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-[15px] tabular-nums placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                      Bei Depotüberträgen nutzen wir automatisch den Schlusskurs am Übertragsdatum. Falls du den echten Original-Kaufkurs kennst (z.B. aus einem alten Kontoauszug), trag ihn hier ein — dann werden Rendite und Kursgewinn korrekt berechnet.
                    </p>
                  </div>

                  {/* Kaufdatum */}
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-400 mb-2">Kaufdatum</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-[15px] tabular-nums placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-800/80 flex gap-2">
                  <button
                    onClick={() => setEditingPosition(null)}
                    disabled={saving}
                    className="flex-1 py-2.5 text-[13px] font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdatePosition}
                    disabled={saving}
                    className="flex-1 py-2.5 text-[13px] font-medium bg-white text-neutral-950 hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        Speichert…
                      </>
                    ) : (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        Speichern
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Up Modal */}
        {topUpTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Position aufstocken</h2>
                <button onClick={() => setTopUpTarget(null)} className="p-1 hover:bg-neutral-800/30 rounded transition-colors">
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              <div className="bg-neutral-800/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Logo ticker={topUpTarget.symbol} alt={topUpTarget.symbol} className="w-10 h-10" padding="none" />
                  <div>
                    <div className="font-semibold text-white">{topUpTarget.symbol}</div>
                    <div className="text-sm text-neutral-500">{topUpTarget.name}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Aktuelle Menge</p>
                    <p className="font-semibold text-white">{topUpTarget.quantity} Stück</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Ø Kaufpreis</p>
                    <p className="font-semibold text-white">{p.formatStockPrice(topUpTarget.purchase_price_display)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Zusätzliche Anzahl</label>
                  <input type="number" min="0" step="1" value={topUpQuantity} onChange={(e) => setTopUpQuantity(e.target.value)} placeholder="z.B. 5"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Kaufpreis pro Aktie (EUR)</label>
                  <input type="number" min="0" step="0.01" value={topUpPrice} onChange={(e) => setTopUpPrice(e.target.value)} placeholder="z.B. 495.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Gebühren (optional, EUR)</label>
                  <input type="number" min="0" step="0.01" value={topUpFees} onChange={(e) => setTopUpFees(e.target.value)} placeholder="0.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">Kaufdatum</label>
                  <input type="date" value={topUpDate} onChange={(e) => setTopUpDate(e.target.value)} max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                </div>
                {topUpQuantity && topUpPrice && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-sm text-emerald-400 font-medium mb-2">Nach Aufstockung:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-neutral-500">Neue Menge</p>
                        <p className="font-semibold text-white">{(topUpTarget.quantity + parseFloat(topUpQuantity || '0')).toFixed(0)} Stück</p>
                      </div>
                      <div>
                        <p className="text-neutral-500">Neuer Ø Preis</p>
                        <p className="font-semibold text-white">
                          {p.formatStockPrice(
                            ((topUpTarget.quantity * topUpTarget.purchase_price_display) +
                             (parseFloat(topUpQuantity || '0') * parseFloat(topUpPrice || '0'))) /
                            (topUpTarget.quantity + parseFloat(topUpQuantity || '0'))
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={handleTopUp} disabled={topUpSaving || !topUpQuantity || !topUpPrice}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                    {topUpSaving ? <><ArrowPathIcon className="w-4 h-4 animate-spin" />Aufstocken...</> : <><PlusIcon className="w-4 h-4" />Aufstocken</>}
                  </button>
                  <button onClick={() => setTopUpTarget(null)} disabled={topUpSaving}
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 disabled:opacity-50 text-white rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Modal — Premium-Design (Apple-inspired dark) */}
        {showCashModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 overflow-y-auto"
            onClick={() => setShowCashModal(false)}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-neutral-950 rounded-2xl max-w-md w-full border border-neutral-800/80 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/80">
                  <div>
                    <h2 className="text-[17px] font-semibold text-white tracking-tight">Cash-Position</h2>
                    <p className="text-[12px] text-neutral-500 mt-0.5">Bestand anpassen</p>
                  </div>
                  <button
                    onClick={() => setShowCashModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                    aria-label="Schließen"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                  {/* Aktueller Stand */}
                  <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3.5">
                    <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">Aktuell</div>
                    <div className="text-[22px] font-semibold text-white tabular-nums mt-1">
                      {p.formatCurrency(p.cashPosition)}
                    </div>
                  </div>

                  {/* Neuer Betrag */}
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-400 mb-2">
                      Neuer Cash-Betrag (EUR)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={newCashAmount}
                        onChange={(e) => setNewCashAmount(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-[15px] tabular-nums placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                        autoFocus
                      />
                      {p.cashPosition !== 0 && (
                        <button
                          onClick={() => setNewCashAmount('0')}
                          className="px-3 py-3 text-[12px] font-medium text-neutral-400 border border-neutral-800 hover:border-neutral-700 hover:text-white rounded-xl transition-colors whitespace-nowrap"
                        >
                          Auf 0
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Änderungs-Preview */}
                  {newCashAmount && parseFloat(newCashAmount) !== p.cashPosition && (
                    <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/40 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-neutral-500">Änderung</span>
                        <span
                          className={`text-[14px] font-medium tabular-nums ${
                            parseFloat(newCashAmount) > p.cashPosition ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {parseFloat(newCashAmount) > p.cashPosition ? '+' : ''}
                          {p.formatCurrency(parseFloat(newCashAmount) - p.cashPosition)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer — Apple-Stil: Primary = weiß, Secondary = ghost */}
                <div className="px-6 py-4 border-t border-neutral-800/80 flex gap-2">
                  <button
                    onClick={() => setShowCashModal(false)}
                    className="flex-1 py-2.5 text-[13px] font-medium text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-xl transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdateCash}
                    disabled={newCashAmount === '' || parseFloat(newCashAmount) === p.cashPosition}
                    className="flex-1 py-2.5 text-[13px] font-medium bg-white text-neutral-950 hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded-xl transition-colors"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wertpapierkredit Modal */}
        {showCreditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Wertpapierkredit</h2>
                <button onClick={() => setShowCreditModal(false)} className="p-1 hover:bg-neutral-800/30 rounded transition-colors">
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400/90">
                    Trage hier deinen aktuellen Wertpapierkredit (WPK) von Scalable ein — als negativen Betrag, z.B. <span className="font-mono">-12502</span>. Dieser Wert erscheint separat und beeinflusst nicht die Cash-Position.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Aktueller Kredit</label>
                  <div className="p-3 bg-neutral-800/20 rounded-lg">
                    <span className="text-lg font-bold text-red-400">{p.formatCurrency(p.portfolio?.broker_credit || 0)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Kreditbetrag (EUR, negativ)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCreditAmount}
                    onChange={(e) => setNewCreditAmount(e.target.value)}
                    placeholder="-12502.00"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-red-400/50 focus:border-transparent"
                  />
                  <p className="text-xs text-neutral-600 mt-1.5">0 eingeben um den Kredit zu entfernen</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      const val = parseFloat(newCreditAmount) || 0
                      await p.updateBrokerCredit(val)
                      setShowCreditModal(false)
                    }}
                    disabled={newCreditAmount === '' || parseFloat(newCreditAmount) === (p.portfolio?.broker_credit || 0)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Speichern
                  </button>
                  <button onClick={() => setShowCreditModal(false)} className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 text-white rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Name Modal */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Portfolio umbenennen</h2>
                <button onClick={() => setShowNameModal(false)} className="p-1 hover:bg-neutral-800/30 rounded transition-colors">
                  <XMarkIcon className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Portfolio-Name</label>
                  <input type="text" value={newPortfolioName} onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="z.B. Hauptdepot, Sparplan, etc." maxLength={50} autoFocus
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-green-400 focus:border-transparent" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleUpdateName} disabled={!newPortfolioName.trim() || newPortfolioName.trim() === p.portfolio?.name}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-green-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                    Speichern
                  </button>
                  <button onClick={() => setShowNameModal(false)}
                    className="flex-1 py-2 border border-neutral-700 hover:bg-neutral-800/30 text-white rounded-lg transition-colors">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {p.portfolio?.id && p.portfolio.id !== 'all' && (
          <CSVImportModal
            isOpen={showCSVImport}
            onClose={() => setShowCSVImport(false)}
            portfolioId={p.portfolio.id}
            portfolioName={p.portfolio.name}
            onImportComplete={() => p.loadPortfolio(p.depotIdParam)}
          />
        )}

        {/* Premium Modal */}
        <PremiumUpgradeModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} feature={premiumFeatureMessage} />
      </main>

      {/* FAB - Aktivität hinzufügen */}
      <AddActivityFAB
        portfolioId={p.portfolio?.id || ''}
        holdings={p.holdings}
        isPremium={p.isPremium}
        holdingsCount={p.holdings.length}
        cashPosition={p.cashPosition}
        formatCurrency={p.formatCurrency}
        formatStockPrice={p.formatStockPrice}
        isAllDepotsView={p.isAllDepotsView}
        allPortfolios={p.allPortfolios}
        onAddPosition={p.addPosition}
        onTopUpPosition={p.topUpPosition}
        onSellPosition={p.sellPosition}
        onAddDividend={p.addDividend}
        onAddCash={p.addCash}
        onAddTransfer={p.addTransfer}
        onComplete={() => p.loadPortfolio(p.depotIdParam)}
        onPremiumRequired={handlePremiumRequired}
      />
    </div>
  )
}
