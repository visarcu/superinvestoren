// src/components/PortfolioHoldingsV2.tsx - Fey-Style Portfolio Holdings (EUR)
'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getBulkQuotes } from '@/lib/fmp';
import { getExchangeRates } from '@/lib/currencyService';
import {
  PlusIcon,
  ChevronRightIcon,
  BanknotesIcon,
  XMarkIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon,
  PencilIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import Logo from '@/components/Logo';
import SearchTickerInput from '@/components/SearchTickerInput';
import PortfolioPerformanceChart from '@/components/PortfolioPerformanceChart';
import { stocks } from '@/data/stocks';
import { fmtNum, fmtPercent } from '@/utils/formatters';

interface Portfolio {
  id: string;
  name: string;
  currency: string;
  cash_position: number;
  is_default?: boolean;
  broker_type?: string | null;
  broker_name?: string | null;
  broker_color?: string | null;
}

interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;      // EUR (was user paid)
  current_price_usd: number;   // USD from FMP
  current_price_eur: number;   // EUR converted
  purchase_date: string;
  value: number;               // EUR
  gain_loss: number;           // EUR
  gain_loss_percent: number;
}

interface PortfolioHoldingsV2Props {
  user: any;
}

export default function PortfolioHoldingsV2({ user }: PortfolioHoldingsV2Props) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<string>>(new Set());

  // Add Position State
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingPosition, setAddingPosition] = useState(false);
  const [targetPortfolioId, setTargetPortfolioId] = useState<string | null>(null);

  // Edit/Delete Position State
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingHolding, setDeletingHolding] = useState<Holding | null>(null);

  // Portfolio Management State
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [editPortfolioName, setEditPortfolioName] = useState('');
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null);

  // All holdings across all portfolios
  const [allHoldings, setAllHoldings] = useState<Map<string, Holding[]>>(new Map());

  // Exchange rate
  const [usdToEurRate, setUsdToEurRate] = useState<number>(0.92); // Default fallback

  // Computed values - total across all portfolios
  const totalValue = useMemo(() => {
    let total = 0;
    allHoldings.forEach((holdings) => {
      total += holdings.reduce((sum, h) => sum + h.value, 0);
    });
    portfolios.forEach(p => {
      total += p.cash_position || 0;
    });
    return total;
  }, [allHoldings, portfolios]);

  const totalGainLoss = useMemo(() => {
    let total = 0;
    allHoldings.forEach((holdings) => {
      total += holdings.reduce((sum, h) => sum + h.gain_loss, 0);
    });
    return total;
  }, [allHoldings]);

  const totalGainLossPercent = useMemo(() => {
    let totalInvested = 0;
    allHoldings.forEach((holdings) => {
      totalInvested += holdings.reduce((sum, h) => sum + (h.purchase_price * h.quantity), 0);
    });
    if (totalInvested === 0) return 0;
    return (totalGainLoss / totalInvested) * 100;
  }, [allHoldings, totalGainLoss]);

  const totalInvested = useMemo(() => {
    let invested = 0;
    allHoldings.forEach((holdings) => {
      invested += holdings.reduce((sum, h) => sum + (h.purchase_price * h.quantity), 0);
    });
    return invested;
  }, [allHoldings]);

  // Flatten all holdings for chart
  const allHoldingsFlat = useMemo(() => {
    const flat: Array<{
      symbol: string;
      name: string;
      quantity: number;
      purchase_price: number;
      current_price: number;
      value: number;
      purchase_date?: string;
    }> = [];
    allHoldings.forEach((holdings) => {
      holdings.forEach(h => {
        flat.push({
          symbol: h.symbol,
          name: h.name,
          quantity: h.quantity,
          purchase_price: h.purchase_price,
          current_price: h.current_price_eur,
          value: h.value,
          purchase_date: h.purchase_date
        });
      });
    });
    return flat;
  }, [allHoldings]);

  // Load portfolios and all holdings on mount
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [user?.id]);

  async function loadAllData() {
    setLoading(true);
    try {
      const { data: portfoliosData, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (portfoliosData && portfoliosData.length > 0) {
        setPortfolios(portfoliosData);
        // Expand all portfolios by default
        setExpandedPortfolios(new Set(portfoliosData.map(p => p.id)));

        // Load holdings for all portfolios
        await loadAllHoldings(portfoliosData);
      } else {
        // Create default portfolio if none exists
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            name: 'Mein Portfolio',
            currency: 'EUR',
            cash_position: 0,
            is_default: true
          })
          .select()
          .single();

        if (!createError && newPortfolio) {
          setPortfolios([newPortfolio]);
          setExpandedPortfolios(new Set([newPortfolio.id]));
        }
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllHoldings(portfoliosList: Portfolio[]) {
    const holdingsMap = new Map<string, Holding[]>();
    const allSymbols: string[] = [];
    const holdingsBySymbol: { [symbol: string]: any[] } = {};

    // First, collect all holdings from all portfolios
    for (const portfolio of portfoliosList) {
      const { data: holdingsData, error } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolio.id);

      if (!error && holdingsData) {
        holdingsData.forEach(h => {
          if (!holdingsBySymbol[h.symbol]) {
            holdingsBySymbol[h.symbol] = [];
            allSymbols.push(h.symbol);
          }
          holdingsBySymbol[h.symbol].push({ ...h, portfolio_id: portfolio.id });
        });
      }
    }

    // Get current prices (USD) and exchange rate in parallel
    let currentPricesUsd: Record<string, number> = {};
    let exchangeRate = 0.92; // Fallback

    try {
      const [pricesResult, ratesResult] = await Promise.all([
        allSymbols.length > 0 ? getBulkQuotes(allSymbols) : Promise.resolve({}),
        getExchangeRates()
      ]);

      currentPricesUsd = pricesResult;
      exchangeRate = ratesResult.USD_EUR;
      setUsdToEurRate(exchangeRate);
    } catch (e) {
      console.error('Error fetching prices/rates:', e);
    }

    // Now process holdings for each portfolio
    for (const portfolio of portfoliosList) {
      const portfolioHoldings: Holding[] = [];

      const { data: holdingsData } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .eq('portfolio_id', portfolio.id);

      if (holdingsData) {
        holdingsData.forEach(h => {
          // Current price in USD from FMP
          const currentPriceUsd = currentPricesUsd[h.symbol] || 0;
          // Convert to EUR
          const currentPriceEur = currentPriceUsd * exchangeRate;

          // Purchase price is already in EUR (what user paid)
          const purchasePriceEur = h.purchase_price;

          // Calculate value and gain/loss in EUR
          const valueEur = currentPriceEur * h.quantity;
          const costBasisEur = purchasePriceEur * h.quantity;
          const gainLossEur = valueEur - costBasisEur;
          const gainLossPercent = costBasisEur > 0 ? (gainLossEur / costBasisEur) * 100 : 0;

          portfolioHoldings.push({
            id: h.id,
            symbol: h.symbol,
            name: h.name || h.symbol,
            quantity: h.quantity,
            purchase_price: purchasePriceEur,
            current_price_usd: currentPriceUsd,
            current_price_eur: currentPriceEur,
            purchase_date: h.purchase_date,
            value: valueEur,
            gain_loss: gainLossEur,
            gain_loss_percent: gainLossPercent
          });
        });
      }

      // Sort by value descending
      portfolioHoldings.sort((a, b) => b.value - a.value);
      holdingsMap.set(portfolio.id, portfolioHoldings);
    }

    setAllHoldings(holdingsMap);
  }

  async function refreshPrices() {
    setRefreshing(true);
    await loadAllHoldings(portfolios);
    setRefreshing(false);
  }

  async function addPosition() {
    if (!selectedStock || !newQuantity || !newPurchasePrice) return;

    // Use target portfolio or first one
    const targetPortfolio = targetPortfolioId
      ? portfolios.find(p => p.id === targetPortfolioId)
      : portfolios[0];
    if (!targetPortfolio) return;

    setAddingPosition(true);
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .insert({
          portfolio_id: targetPortfolio.id,
          symbol: selectedStock.symbol.toUpperCase(),
          name: selectedStock.name,
          quantity: parseFloat(newQuantity),
          purchase_price: parseFloat(newPurchasePrice),
          purchase_date: newPurchaseDate
        });

      if (error) throw error;

      // Reload all holdings
      await loadAllHoldings(portfolios);

      // Reset form
      setShowAddPosition(false);
      setSelectedStock(null);
      setNewQuantity('');
      setNewPurchasePrice('');
      setNewPurchaseDate(new Date().toISOString().split('T')[0]);
      setTargetPortfolioId(null);
    } catch (error) {
      console.error('Error adding position:', error);
      alert('Fehler beim Hinzufügen der Position');
    } finally {
      setAddingPosition(false);
    }
  }

  function togglePortfolio(portfolioId: string) {
    setExpandedPortfolios(prev => {
      const next = new Set(prev);
      if (next.has(portfolioId)) {
        next.delete(portfolioId);
      } else {
        next.add(portfolioId);
      }
      return next;
    });
  }

  function openEditModal(holding: Holding, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingHolding(holding);
    setEditQuantity(holding.quantity.toString());
    setEditPurchasePrice(holding.purchase_price.toString());
    setEditPurchaseDate(holding.purchase_date || new Date().toISOString().split('T')[0]);
  }

  async function saveHoldingEdit() {
    if (!editingHolding || !editQuantity || !editPurchasePrice) return;

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({
          quantity: parseFloat(editQuantity),
          purchase_price: parseFloat(editPurchasePrice),
          purchase_date: editPurchaseDate
        })
        .eq('id', editingHolding.id);

      if (error) throw error;

      // Reload holdings
      await loadAllHoldings(portfolios);
      setEditingHolding(null);
    } catch (error) {
      console.error('Error updating holding:', error);
      alert('Fehler beim Aktualisieren der Position');
    } finally {
      setSavingEdit(false);
    }
  }

  function openDeleteConfirm(holding: Holding, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingHolding(holding);
  }

  async function deleteHolding() {
    if (!deletingHolding) return;

    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', deletingHolding.id);

      if (error) throw error;

      // Reload holdings
      await loadAllHoldings(portfolios);
      setDeletingHolding(null);
    } catch (error) {
      console.error('Error deleting holding:', error);
      alert('Fehler beim Löschen der Position');
    }
  }

  function openAddPositionForPortfolio(portfolioId: string) {
    setTargetPortfolioId(portfolioId);
    setShowAddPosition(true);
  }

  async function createPortfolio() {
    if (!newPortfolioName.trim()) return;

    setCreatingPortfolio(true);
    try {
      const { data: newPortfolio, error } = await supabase
        .from('portfolios')
        .insert({
          user_id: user.id,
          name: newPortfolioName.trim(),
          currency: 'EUR',
          cash_position: 0,
          is_default: false
        })
        .select()
        .single();

      if (error) throw error;

      if (newPortfolio) {
        setPortfolios(prev => [...prev, newPortfolio]);
        setExpandedPortfolios(prev => new Set([...prev, newPortfolio.id]));
        setAllHoldings(prev => new Map(prev).set(newPortfolio.id, []));
      }

      setShowCreatePortfolio(false);
      setNewPortfolioName('');
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Fehler beim Erstellen des Portfolios');
    } finally {
      setCreatingPortfolio(false);
    }
  }

  function openEditPortfolio(portfolio: Portfolio, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingPortfolio(portfolio);
    setEditPortfolioName(portfolio.name);
  }

  async function savePortfolioEdit() {
    if (!editingPortfolio || !editPortfolioName.trim()) return;

    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ name: editPortfolioName.trim() })
        .eq('id', editingPortfolio.id);

      if (error) throw error;

      setPortfolios(prev =>
        prev.map(p =>
          p.id === editingPortfolio.id ? { ...p, name: editPortfolioName.trim() } : p
        )
      );
      setEditingPortfolio(null);
    } catch (error) {
      console.error('Error updating portfolio:', error);
      alert('Fehler beim Aktualisieren des Portfolios');
    }
  }

  function openDeletePortfolio(portfolio: Portfolio, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingPortfolio(portfolio);
  }

  async function deletePortfolio() {
    if (!deletingPortfolio) return;

    try {
      // First delete all holdings in this portfolio
      await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('portfolio_id', deletingPortfolio.id);

      // Then delete the portfolio itself
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', deletingPortfolio.id);

      if (error) throw error;

      setPortfolios(prev => prev.filter(p => p.id !== deletingPortfolio.id));
      setAllHoldings(prev => {
        const newMap = new Map(prev);
        newMap.delete(deletingPortfolio.id);
        return newMap;
      });
      setDeletingPortfolio(null);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Fehler beim Löschen des Portfolios');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-neutral-500 text-sm">Lade Portfolio...</p>
        </div>
      </div>
    );
  }

  // Check if we have any holdings at all
  const hasAnyHoldings = Array.from(allHoldings.values()).some(h => h.length > 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Card with Performance Chart - Fey Style */}
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={refreshPrices}
            disabled={refreshing}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
            title="Preise aktualisieren"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreatePortfolio(true)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Neues Depot"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAddPosition(true)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Position hinzufügen"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Performance Chart */}
        {hasAnyHoldings ? (
          <PortfolioPerformanceChart
            portfolioId={portfolios[0]?.id || ''}
            holdings={allHoldingsFlat}
            totalValue={totalValue}
            totalCost={totalInvested}
            cashPosition={portfolios.reduce((sum, p) => sum + (p.cash_position || 0), 0)}
          />
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl font-bold text-white mb-2">€0,00</div>
            <p className="text-neutral-500 text-sm">Füge Positionen hinzu, um deinen Kursverlauf zu sehen</p>
          </div>
        )}
      </div>

      {/* Holdings by Portfolio - Fey Style */}
      {portfolios.length > 0 ? (
        <div className="space-y-4">
          {portfolios.map((portfolio) => {
            const isExpanded = expandedPortfolios.has(portfolio.id);
            const portfolioHoldings = allHoldings.get(portfolio.id) || [];
            const portfolioValue = portfolioHoldings.reduce((sum, h) => sum + h.value, 0);
            const portfolioGainLoss = portfolioHoldings.reduce((sum, h) => sum + h.gain_loss, 0);
            const portfolioInvested = portfolioHoldings.reduce((sum, h) => sum + (h.purchase_price * h.quantity), 0);
            const portfolioGainLossPercent = portfolioInvested > 0 ? (portfolioGainLoss / portfolioInvested) * 100 : 0;

            return (
              <div key={portfolio.id} className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
                {/* Portfolio Header */}
                <div className="flex items-center justify-between p-4 hover:bg-neutral-800/30 transition-colors group/header">
                  <button
                    onClick={() => togglePortfolio(portfolio.id)}
                    className="flex items-center gap-3 flex-1"
                  >
                    <ChevronRightIcon
                      className={`w-4 h-4 text-neutral-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <span className="font-medium text-white">
                      {portfolio.name}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {portfolioHoldings.length} {portfolioHoldings.length === 1 ? 'Position' : 'Positionen'}
                    </span>
                  </button>
                  <div className="flex items-center gap-3">
                    {/* Portfolio Actions - show on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEditPortfolio(portfolio, e)}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                        title="Umbenennen"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      {!portfolio.is_default && (
                        <button
                          onClick={(e) => openDeletePortfolio(portfolio, e)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Löschen"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="text-sm text-neutral-400">
                      €{fmtNum(portfolioValue)}
                    </span>
                    {portfolioHoldings.length > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        portfolioGainLossPercent >= 0
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-red-400 bg-red-400/10'
                      }`}>
                        {portfolioGainLossPercent >= 0 ? '+' : ''}{fmtPercent(portfolioGainLossPercent)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Holdings Table */}
                {isExpanded && (
                  <div className="border-t border-neutral-800">
                    {portfolioHoldings.length === 0 ? (
                      <div className="py-8 text-center">
                        <BanknotesIcon className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500 text-sm mb-3">Keine Positionen in diesem Depot</p>
                        <button
                          onClick={() => setShowAddPosition(true)}
                          className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
                        >
                          Position hinzufügen
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-800/50">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-neutral-500">
                          <div className="col-span-3">Aktie</div>
                          <div className="col-span-2 text-right">Wert</div>
                          <div className="col-span-2 text-right">Ø Kaufpreis</div>
                          <div className="col-span-2 text-right">Kurs (EUR)</div>
                          <div className="col-span-2 text-right">Rendite</div>
                          <div className="col-span-1"></div>
                        </div>

                        {/* Holdings Rows */}
                        {portfolioHoldings.map((holding) => (
                          <div
                            key={holding.id}
                            className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-neutral-800/30 transition-colors items-center group"
                          >
                            {/* Stock Info - Clickable Link */}
                            <Link
                              href={`/analyse/stocks/${holding.symbol.toLowerCase()}`}
                              className="col-span-3 flex items-center gap-3"
                            >
                              <Logo ticker={holding.symbol} alt={holding.symbol} className="w-8 h-8 rounded-lg" />
                              <div className="min-w-0">
                                <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                                  {holding.symbol}
                                </div>
                                <div className="text-xs text-neutral-500 truncate">
                                  {holding.name}
                                </div>
                              </div>
                            </Link>

                            {/* Total Value */}
                            <div className="col-span-2 text-right">
                              <div className="font-medium text-white">
                                €{fmtNum(holding.value)}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {holding.quantity} Stk.
                              </div>
                            </div>

                            {/* Avg Cost (EUR) */}
                            <div className="col-span-2 text-right text-neutral-400">
                              €{fmtNum(holding.purchase_price)}
                            </div>

                            {/* Current Price (EUR) */}
                            <div className="col-span-2 text-right font-medium text-white">
                              €{fmtNum(holding.current_price_eur)}
                            </div>

                            {/* Return */}
                            <div className="col-span-2 text-right">
                              <div className={`text-sm font-medium ${
                                holding.gain_loss_percent >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {holding.gain_loss_percent >= 0 ? '+' : ''}{fmtPercent(holding.gain_loss_percent)}
                              </div>
                              <div className={`text-xs ${
                                holding.gain_loss >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                              }`}>
                                {holding.gain_loss >= 0 ? '+' : ''}€{fmtNum(holding.gain_loss)}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => openEditModal(holding, e)}
                                className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-md transition-colors"
                                title="Bearbeiten"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => openDeleteConfirm(holding, e)}
                                className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                title="Löschen"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Cash Position */}
                        {portfolio.cash_position > 0 && (
                          <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                            <div className="col-span-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                <BanknotesIcon className="w-4 h-4 text-neutral-400" />
                              </div>
                              <div>
                                <div className="font-medium text-neutral-400">Cash</div>
                              </div>
                            </div>
                            <div className="col-span-2 text-right font-medium text-white">
                              €{fmtNum(portfolio.cash_position)}
                            </div>
                            <div className="col-span-6"></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#111111] border border-neutral-800 rounded-xl p-12 text-center">
          <BanknotesIcon className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Kein Portfolio vorhanden</h3>
          <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
            Erstelle dein erstes Portfolio und füge Positionen hinzu, um deine Investments zu tracken.
          </p>
          <button
            onClick={() => setShowAddPosition(true)}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors text-sm font-medium"
          >
            Position hinzufügen
          </button>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPosition && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Position hinzufügen</h2>
              <button
                onClick={() => {
                  setShowAddPosition(false);
                  setTargetPortfolioId(null);
                  setSelectedStock(null);
                }}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Portfolio Selection - show when multiple portfolios exist */}
              {portfolios.length > 1 && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Portfolio</label>
                  <div className="relative">
                    <select
                      value={targetPortfolioId || portfolios[0]?.id || ''}
                      onChange={(e) => setTargetPortfolioId(e.target.value)}
                      className="w-full px-4 py-3 pr-10 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                    >
                      {portfolios.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Stock Search */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Aktie</label>
                {selectedStock ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Logo ticker={selectedStock.symbol} alt={selectedStock.symbol} className="w-6 h-6 rounded" />
                      <div>
                        <span className="font-medium text-white">{selectedStock.symbol}</span>
                        <span className="text-neutral-400 text-sm ml-2">{selectedStock.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStock(null)}
                      className="p-1 text-neutral-400 hover:text-white"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <SearchTickerInput
                    onSelect={(ticker: string) => {
                      const stock = stocks.find(s => s.ticker === ticker);
                      setSelectedStock({ symbol: ticker, name: stock?.name || ticker });
                    }}
                    placeholder="Aktie suchen..."
                    inputClassName="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    dropdownClassName="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-neutral-800 rounded-xl shadow-lg border border-neutral-700"
                    itemClassName="px-4 py-3 hover:bg-neutral-700 cursor-pointer text-white"
                  />
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Anzahl</label>
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="z.B. 10"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Kaufpreis (EUR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={newPurchasePrice}
                    onChange={(e) => setNewPurchasePrice(e.target.value)}
                    placeholder="z.B. 150.00"
                    className="w-full pl-8 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500">Dein tatsächlicher Kaufpreis in Euro</p>
              </div>

              {/* Investment Sum Display */}
              {newQuantity && newPurchasePrice && parseFloat(newQuantity) > 0 && parseFloat(newPurchasePrice) > 0 && (
                <div className="px-4 py-3 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Investitionssumme</span>
                    <span className="text-lg font-semibold text-white">
                      €{fmtNum(parseFloat(newQuantity) * parseFloat(newPurchasePrice))}
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Date */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Kaufdatum</label>
                <input
                  type="date"
                  value={newPurchaseDate}
                  onChange={(e) => setNewPurchaseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={addPosition}
                disabled={!selectedStock || !newQuantity || !newPurchasePrice || addingPosition}
                className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingPosition ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {editingHolding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Position bearbeiten</h2>
              <button
                onClick={() => setEditingHolding(null)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Stock Info */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-neutral-800 rounded-xl">
              <Logo ticker={editingHolding.symbol} alt={editingHolding.symbol} className="w-10 h-10 rounded-lg" />
              <div>
                <div className="font-medium text-white">{editingHolding.symbol}</div>
                <div className="text-sm text-neutral-400">{editingHolding.name}</div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Anzahl</label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Purchase Price */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Kaufpreis (EUR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Kaufdatum</label>
                <input
                  type="date"
                  value={editPurchaseDate}
                  onChange={(e) => setEditPurchaseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingHolding(null)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveHoldingEdit}
                  disabled={!editQuantity || !editPurchasePrice || savingEdit}
                  className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingEdit ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHolding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-800">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Position löschen?</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Möchtest du <span className="text-white font-medium">{deletingHolding.symbol}</span> ({deletingHolding.quantity} Stk.) wirklich aus deinem Portfolio entfernen?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingHolding(null)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={deleteHolding}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-400 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showCreatePortfolio && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Neues Depot erstellen</h2>
              <button
                onClick={() => setShowCreatePortfolio(false)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="z.B. Trade Republic"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <button
                onClick={createPortfolio}
                disabled={!newPortfolioName.trim() || creatingPortfolio}
                className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPortfolio ? 'Erstellen...' : 'Depot erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portfolio Modal */}
      {editingPortfolio && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Depot umbenennen</h2>
              <button
                onClick={() => setEditingPortfolio(null)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Name</label>
                <input
                  type="text"
                  value={editPortfolioName}
                  onChange={(e) => setEditPortfolioName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPortfolio(null)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={savePortfolioEdit}
                  disabled={!editPortfolioName.trim()}
                  className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Portfolio Confirmation */}
      {deletingPortfolio && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-800">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <TrashIcon className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Depot löschen?</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Möchtest du <span className="text-white font-medium">{deletingPortfolio.name}</span> und alle enthaltenen Positionen wirklich löschen? Dies kann nicht rückgängig gemacht werden.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingPortfolio(null)}
                  className="flex-1 py-3 bg-neutral-800 text-white font-medium rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={deletePortfolio}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-400 transition-colors"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
