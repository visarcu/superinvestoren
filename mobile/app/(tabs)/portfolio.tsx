import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Modal, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import StockLogo from '../../components/StockLogo';
import { theme, tabularStyle, perfColor } from '../../lib/theme';

const BASE_URL = 'https://finclue.de';

type Tab = 'positionen' | 'performance' | 'dividenden' | 'superinvestoren';

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(v: number) { return `${fmtDE(v)} $`; }
function fmtPct(v: number, sign = true) {
  return `${sign && v >= 0 ? '+' : sign && v < 0 ? '-' : ''}${fmtDE(Math.abs(v))} %`;
}
function fmtBig(v: number) {
  if (v >= 1e9) return `${fmtDE(v / 1e9, 1)} Mrd. $`;
  if (v >= 1e6) return `${fmtDE(v / 1e6, 1)} Mio. $`;
  return `${fmtDE(v, 0)} $`;
}

interface Holding {
  symbol: string; name: string; quantity: number; purchase_price: number;
  current_price: number; currentPrice: number; currentValue: number;
  cost: number; gain: number; gainPct: number; displayName: string;
  weight?: number;
}

interface DivInfo {
  symbol: string; yield: number; perShareTTM: number;
  annualIncome: number; nextDate: string | null; quarterlyAmount: number;
}

export default function PortfolioScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('positionen');
  const [portfolioList, setPortfolioList] = useState<{ id: string; name: string }[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null); // null = all
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [portfolioName, setPortfolioName] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siCounts, setSiCounts] = useState<Record<string, { count: number; investors: { name: string; slug: string }[] }>>({});
  const [divData, setDivData] = useState<DivInfo[]>([]);
  const [divLoading, setDivLoading] = useState(false);

  // Period selector for summary card
  type Period = 'gesamt' | '1W' | '1M' | '3M' | 'YTD' | '1J';
  const [period, setPeriod] = useState<Period>('gesamt');
  const [periodGain, setPeriodGain] = useState<{ value: number; pct: number } | null>(null);
  const [periodLoading, setPeriodLoading] = useState(false);

  useFocusEffect(useCallback(() => { loadPortfolio(); }, []));

  async function switchPortfolio(id: string | null, name: string) {
    setSelectedPortfolioId(id);
    setPortfolioName(name);
    setShowPortfolioModal(false);
    setHoldings([]);
    setDivData([]);
    setLoading(true);
    if (id === null) {
      // Load all portfolios combined
      await loadAllHoldings();
    } else {
      await loadHoldings(id);
    }
  }

  async function loadPortfolio() {
    try {
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }
      const userId = sessionData.session.user.id;

      const { data: portfolios } = await supabase
        .from('portfolios').select('id, name').eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!portfolios?.length) { setLoading(false); setRefreshing(false); return; }
      setPortfolioList(portfolios);

      // On first load default to first portfolio; keep selection on refresh
      if (selectedPortfolioId === undefined) {
        setSelectedPortfolioId(portfolios[0].id);
        setPortfolioName(portfolios[0].name);
        await loadHoldings(portfolios[0].id);
      } else if (selectedPortfolioId === null) {
        // "Alle Depots" mode
        setPortfolioName('Alle Depots');
        await loadAllHoldings(portfolios.map((p: any) => p.id));
      } else {
        const portfolio = portfolios.find((p: any) => p.id === selectedPortfolioId) || portfolios[0];
        setPortfolioName(portfolio.name);
        await loadHoldings(portfolio.id);
      }
    } catch (e: any) {
      setError(e.message || 'Fehler');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  async function loadHoldings(portfolioId: string) {
    try {
      const { data: rawHoldings, error: hErr } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, purchase_price, current_price')
        .eq('portfolio_id', portfolioId);

      if (hErr) throw hErr;
      if (!rawHoldings?.length) { setHoldings([]); setLoading(false); setRefreshing(false); return; }

      const symbols = rawHoldings.map((h: any) => h.symbol).join(',');
      const [qRes, siRes] = await Promise.all([
        fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`),
        fetch(`${BASE_URL}/api/portfolio/super-investor-overlap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: rawHoldings.map((h: any) => h.symbol) }),
        }),
      ]);

      const quotes: any[] = qRes.ok ? await qRes.json() : [];
      const quoteMap: Record<string, any> = {};
      quotes.forEach((q: any) => { quoteMap[q.symbol] = q; });
      if (siRes.ok) setSiCounts(await siRes.json());

      let tv = 0, tc = 0;
      const enriched: Holding[] = rawHoldings.map((h: any) => {
        const q = quoteMap[h.symbol] || {};
        const currentPrice = q.price || h.current_price || 0;
        const currentValue = currentPrice * (h.quantity || 0);
        const cost = (h.purchase_price || 0) * (h.quantity || 0);
        tv += currentValue; tc += cost;
        return { ...h, currentPrice, currentValue, cost, gain: currentValue - cost,
          gainPct: cost > 0 ? ((currentValue - cost) / cost) * 100 : 0,
          displayName: q.name || h.name || h.symbol };
      });

      enriched.forEach(h => { h.weight = tv > 0 ? (h.currentValue / tv) * 100 : 0; });
      setHoldings(enriched.sort((a, b) => b.currentValue - a.currentValue));
      setTotalValue(tv);
      setTotalCost(tc);
      loadDividends(enriched);
    } catch (e: any) {
      setError(e.message || 'Fehler');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  async function loadAllHoldings(portfolioIds?: string[]) {
    try {
      const ids = portfolioIds || portfolioList.map(p => p.id);
      if (!ids.length) { setHoldings([]); setLoading(false); setRefreshing(false); return; }
      const { data: rawHoldings, error: hErr } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, purchase_price, current_price')
        .in('portfolio_id', ids);
      if (hErr) throw hErr;
      if (!rawHoldings?.length) { setHoldings([]); setLoading(false); setRefreshing(false); return; }
      // Merge duplicate symbols (sum quantities)
      const merged: Record<string, any> = {};
      for (const h of rawHoldings) {
        if (!merged[h.symbol]) merged[h.symbol] = { ...h };
        else {
          merged[h.symbol].quantity = (merged[h.symbol].quantity || 0) + (h.quantity || 0);
          merged[h.symbol].purchase_price = h.purchase_price; // use latest
        }
      }
      const mergedArr = Object.values(merged);
      const symbols = mergedArr.map((h: any) => h.symbol).join(',');
      const [qRes, siRes] = await Promise.all([
        fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`),
        fetch(`${BASE_URL}/api/portfolio/super-investor-overlap`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers: mergedArr.map((h: any) => h.symbol) }),
        }),
      ]);
      const quotes: any[] = qRes.ok ? await qRes.json() : [];
      const quoteMap: Record<string, any> = {};
      quotes.forEach((q: any) => { quoteMap[q.symbol] = q; });
      if (siRes.ok) setSiCounts(await siRes.json());
      let tv = 0, tc = 0;
      const enriched: Holding[] = mergedArr.map((h: any) => {
        const q = quoteMap[h.symbol] || {};
        const currentPrice = q.price || h.current_price || 0;
        const currentValue = currentPrice * (h.quantity || 0);
        const cost = (h.purchase_price || 0) * (h.quantity || 0);
        tv += currentValue; tc += cost;
        return { ...h, currentPrice, currentValue, cost, gain: currentValue - cost,
          gainPct: cost > 0 ? ((currentValue - cost) / cost) * 100 : 0,
          displayName: q.name || h.name || h.symbol };
      });
      enriched.forEach(h => { h.weight = tv > 0 ? (h.currentValue / tv) * 100 : 0; });
      setHoldings(enriched.sort((a, b) => b.currentValue - a.currentValue));
      setTotalValue(tv); setTotalCost(tc);
      loadDividends(enriched);
    } catch (e: any) {
      setError(e.message || 'Fehler');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  async function loadDividends(holdings: Holding[]) {
    setDivLoading(true);
    try {
      const results = await Promise.allSettled(
        holdings.map(h => fetch(`${BASE_URL}/api/dividends/${h.symbol}`).then(r => r.ok ? r.json() : null))
      );
      const divs: DivInfo[] = [];
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const d = r.value;
        const ci = d.currentInfo || {};
        const h = holdings[i];
        const perShareTTM = ci.dividendPerShareTTM || 0;
        if (perShareTTM <= 0) return;
        const annualIncome = perShareTTM * h.quantity;
        const nextEntry = d.quarterlyHistory?.[0];
        divs.push({
          symbol: h.symbol,
          yield: (ci.currentYield || 0) * 100,
          perShareTTM,
          annualIncome,
          nextDate: nextEntry?.exDividendDate || nextEntry?.date || null,
          quarterlyAmount: (nextEntry?.amount || 0) * h.quantity,
        });
      });
      setDivData(divs.sort((a, b) => b.annualIncome - a.annualIncome));
    } catch { /* silent */ }
    finally { setDivLoading(false); }
  }

  async function loadPeriodPerformance(p: Period) {
    if (p === 'gesamt') { setPeriodGain(null); return; }
    setPeriodLoading(true);
    try {
      const daysMap: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, 'YTD': Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000), '1J': 365 };
      const days = daysMap[p] || 30;
      const res = await fetch(`${BASE_URL}/api/portfolio-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: selectedPortfolioId,
          holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, purchase_price: h.purchase_price })),
          days,
        }),
      });
      if (!res.ok) { setPeriodGain(null); return; }
      const { data } = await res.json();
      if (!Array.isArray(data) || data.length < 2) { setPeriodGain(null); return; }
      const startVal = data[0].value;
      const endVal = data[data.length - 1].value;
      const diff = endVal - startVal;
      const pct = startVal > 0 ? (diff / startVal) * 100 : 0;
      setPeriodGain({ value: diff, pct });
    } catch { setPeriodGain(null); }
    finally { setPeriodLoading(false); }
  }

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const displayGain = period === 'gesamt' ? totalGain : (periodGain?.value ?? totalGain);
  const displayGainPct = period === 'gesamt' ? totalGainPct : (periodGain?.pct ?? totalGainPct);
  const totalAnnualDiv = divData.reduce((s, d) => s + d.annualIncome, 0);
  const portfolioYield = totalValue > 0 ? (totalAnnualDiv / totalValue) * 100 : 0;

  // Superinvestoren overlap
  const siOverview: Record<string, { name: string; slug: string; tickers: string[] }> = {};
  Object.entries(siCounts).forEach(([ticker, data]) => {
    data.investors?.forEach((inv) => {
      if (!siOverview[inv.slug]) siOverview[inv.slug] = { name: inv.name, slug: inv.slug, tickers: [] };
      siOverview[inv.slug].tickers.push(ticker);
    });
  });
  const siList = Object.values(siOverview).sort((a, b) => b.tickers.length - a.tickers.length);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'positionen', label: 'Positionen', icon: 'list' },
    { id: 'performance', label: 'Performance', icon: 'trending-up' },
    { id: 'dividenden', label: 'Dividenden', icon: 'cash' },
    { id: 'superinvestoren', label: 'Superin.', icon: 'star' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPortfolio(); }} tintColor={theme.accent.positive} />}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.portfolioSelector} onPress={() => setShowPortfolioModal(true)}>
            <Text style={s.title}>{portfolioName || 'Portfolio'}</Text>
            {portfolioList.length > 1 && (
              <Ionicons name="chevron-down" size={18} color={theme.text.secondary} style={{ marginTop: 2 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-transaction')}>
            <Ionicons name="add" size={22} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Portfolio Modal */}
        <Modal visible={showPortfolioModal} transparent animationType="slide" onRequestClose={() => setShowPortfolioModal(false)}>
          <Pressable style={s.modalOverlay} onPress={() => setShowPortfolioModal(false)}>
            <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Depot auswählen</Text>

              {/* All portfolios option */}
              <TouchableOpacity style={s.modalOption} onPress={() => switchPortfolio(null, 'Alle Depots')}>
                <View style={s.modalOptionLeft}>
                  <Ionicons name="layers-outline" size={20} color={theme.accent.positive} />
                  <View>
                    <Text style={s.modalOptionName}>Alle Depots</Text>
                    <Text style={s.modalOptionSub}>{portfolioList.length} Depots zusammengefasst</Text>
                  </View>
                </View>
                {selectedPortfolioId === null && <Ionicons name="checkmark" size={18} color={theme.accent.positive} />}
              </TouchableOpacity>

              <View style={s.modalDivider} />

              {/* Individual portfolios */}
              {portfolioList.map(p => (
                <TouchableOpacity key={p.id} style={s.modalOption} onPress={() => switchPortfolio(p.id, p.name)}>
                  <View style={s.modalOptionLeft}>
                    <Ionicons name="briefcase-outline" size={20} color={theme.text.tertiary} />
                    <Text style={s.modalOptionName}>{p.name}</Text>
                  </View>
                  {selectedPortfolioId === p.id && <Ionicons name="checkmark" size={18} color={theme.accent.positive} />}
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={s.modalCancel} onPress={() => setShowPortfolioModal(false)}>
                <Text style={s.modalCancelText}>Abbrechen</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Summary Card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryLabel}>Gesamtwert</Text>
          <View style={s.valueRow}>
            <Text style={s.summaryValue}>{fmtCurrency(totalValue)}</Text>
            {!periodLoading && (
              <View style={[s.gainBadge, { backgroundColor: displayGainPct >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Ionicons
                  name={displayGainPct >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={displayGainPct >= 0 ? theme.accent.positive : theme.accent.negative}
                />
                <Text style={[s.gainBadgeText, { color: displayGainPct >= 0 ? theme.accent.positive : theme.accent.negative }]}>
                  {fmtPct(displayGainPct)}
                </Text>
              </View>
            )}
          </View>
          {periodLoading ? (
            <ActivityIndicator color={theme.accent.positive} size="small" style={{ marginTop: 8 }} />
          ) : (
            <Text style={[s.gainAbsolute, { color: displayGain >= 0 ? theme.accent.positive : theme.accent.negative }]}>
              {displayGain >= 0 ? '+' : ''}{fmtCurrency(displayGain)} {period !== 'gesamt' ? `(${period})` : ''}
            </Text>
          )}
          {/* Period selector */}
          <View style={s.periodRow}>
            {(['gesamt', '1W', '1M', '3M', 'YTD', '1J'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[s.periodPill, period === p && s.periodPillActive]}
                onPress={() => { setPeriod(p); loadPeriodPerformance(p); }}
                activeOpacity={0.7}
              >
                <Text style={[s.periodText, period === p && s.periodTextActive]}>
                  {p === 'gesamt' ? 'Gesamt' : p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {totalAnnualDiv > 0 && (
            <View style={s.divSummaryRow}>
              <Ionicons name="cash-outline" size={12} color={theme.text.tertiary} />
              <Text style={s.divSummaryText}>
                Dividende: {fmtBig(totalAnnualDiv)}/Jahr ({fmtDE(portfolioYield)} %)
              </Text>
            </View>
          )}
        </View>

        {/* Scrollable Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }} contentContainerStyle={s.tabBar}>
          {tabs.map(tab => (
            <TouchableOpacity key={tab.id} style={[s.tabItem, activeTab === tab.id && s.tabItemActive]}
              onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? theme.text.primary : theme.text.tertiary} />
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={theme.accent.positive} style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={s.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.accent.negative} />
            <Text style={s.emptyTitle}>Fehler beim Laden</Text>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : holdings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}><Ionicons name="briefcase-outline" size={28} color={theme.text.tertiary} /></View>
            <Text style={s.emptyTitle}>Portfolio ist leer</Text>
            <Text style={s.emptyText}>Füge deine erste Transaktion hinzu</Text>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/add-transaction')}>
              <Ionicons name="add-circle-outline" size={18} color={theme.text.primary} style={{ marginRight: 6 }} />
              <Text style={s.linkBtnText}>Transaktion hinzufügen</Text>
            </TouchableOpacity>
          </View>

        ) : activeTab === 'positionen' ? (
          /* ── POSITIONEN TAB ── */
          <View style={s.list}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.sectionLabel}>Positionen</Text>
              {Object.values(siCounts).some(v => v.count > 0) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                  <Ionicons name="star" size={10} color={theme.accent.warning} />
                  <Text style={{ color: theme.text.tertiary, fontSize: theme.font.captionSm }}>= Superinvestor hält Aktie</Text>
                </View>
              )}
            </View>
            <View style={s.card}>
              {holdings.map((h, idx) => {
                const siCount = siCounts[h.symbol]?.count ?? 0;
                const isLast = idx === holdings.length - 1;
                return (
                  <TouchableOpacity
                    key={h.symbol}
                    style={[s.row, isLast && { borderBottomWidth: 0 }]}
                    onPress={() => router.push(`/stock/${h.symbol}`)}
                    activeOpacity={0.6}
                  >
                    <StockLogo ticker={h.symbol} size={36} borderRadius={10} />
                    <View style={s.rowMid}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.symbol} numberOfLines={1}>{h.displayName || h.name || h.symbol}</Text>
                        {siCount > 0 && (
                          <View style={s.siBadge}>
                            <Ionicons name="star" size={9} color={theme.accent.warning} />
                            <Text style={s.siBadgeText}>{siCount}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.shares} numberOfLines={1}>{h.quantity} × {h.symbol} · ⌀ {fmtCurrency(h.purchase_price || 0)}</Text>
                    </View>
                    <View style={s.rowRight}>
                      <Text style={s.value}>{fmtCurrency(h.currentValue)}</Text>
                      <Text style={[s.gain, { color: perfColor(h.gain) }]}>{fmtPct(h.gainPct)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={s.transactionBtn} onPress={() => router.push('/add-transaction')}>
              <Ionicons name="add" size={16} color={theme.text.primary} />
              <Text style={s.transactionBtnText}>Transaktion hinzufügen</Text>
            </TouchableOpacity>
          </View>

        ) : activeTab === 'performance' ? (
          /* ── PERFORMANCE TAB ── */
          <View style={s.list}>
            <Text style={s.sectionLabel}>PERFORMANCE ÜBERSICHT</Text>

            {/* Summary Stats */}
            <View style={s.statsGrid}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Einstandswert</Text>
                <Text style={s.statValue}>{fmtBig(totalCost)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Aktueller Wert</Text>
                <Text style={s.statValue}>{fmtBig(totalValue)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Gewinn/Verlust</Text>
                <Text style={[s.statValue, { color: totalGain >= 0 ? theme.accent.positive : theme.accent.negative }]}>
                  {totalGain >= 0 ? '+' : ''}{fmtBig(totalGain)}
                </Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Rendite (gesamt)</Text>
                <Text style={[s.statValue, { color: totalGainPct >= 0 ? theme.accent.positive : theme.accent.negative }]}>
                  {fmtPct(totalGainPct)}
                </Text>
              </View>
            </View>

            {/* Allocation */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>GEWICHTUNG</Text>
            <View style={s.card}>
              {holdings.map((h, i) => (
                <View key={h.symbol} style={[s.allocRow, i > 0 && s.allocBorder]}>
                  <StockLogo ticker={h.symbol} size={28} borderRadius={6} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={s.allocTicker} numberOfLines={1}>{h.displayName || h.name || h.symbol}</Text>
                      <Text style={s.allocPct}>{fmtDE(h.weight ?? 0, 1)} %</Text>
                    </View>
                    <View style={s.allocBar}>
                      <View style={[s.allocBarFill, { width: `${Math.min(h.weight ?? 0, 100)}%` as any }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Per-Position P&L */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>GEWINN / VERLUST JE POSITION</Text>
            <View style={s.card}>
              {[...holdings].sort((a, b) => b.gainPct - a.gainPct).map((h, i) => (
                <TouchableOpacity key={h.symbol} style={[s.plRow, i > 0 && s.allocBorder]}
                  onPress={() => router.push(`/stock/${h.symbol}`)}>
                  <Text style={s.plTicker} numberOfLines={1}>{h.displayName || h.name || h.symbol}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.plAbs}>
                    {h.gain >= 0 ? '+' : ''}{fmtCurrency(h.gain)}
                  </Text>
                  <Text style={[s.plPct, { color: h.gainPct >= 0 ? theme.accent.positive : theme.accent.negative }]}>
                    {fmtPct(h.gainPct)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        ) : activeTab === 'dividenden' ? (
          /* ── DIVIDENDEN TAB ── */
          <View style={s.list}>
            {divLoading ? (
              <ActivityIndicator color={theme.accent.positive} style={{ marginVertical: 24 }} />
            ) : divData.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="cash-outline" size={36} color={theme.text.tertiary} />
                <Text style={s.emptyTitle}>Keine Dividenden</Text>
                <Text style={s.emptyText}>Deine Aktien zahlen aktuell keine Dividenden</Text>
              </View>
            ) : (
              <>
                {/* Anstehende Dividenden */}
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const upcoming = divData
                    .filter(d => d.nextDate && d.nextDate >= today)
                    .sort((a, b) => new Date(a.nextDate!).getTime() - new Date(b.nextDate!).getTime())
                    .slice(0, 5);
                  if (upcoming.length === 0) return null;
                  return (
                    <>
                      <Text style={s.sectionLabel}>ANSTEHENDE DIVIDENDEN</Text>
                      <View style={[s.card, { marginBottom: 16 }]}>
                        {upcoming.map((d, i) => {
                          const exDate = new Date(d.nextDate!).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <TouchableOpacity
                              key={d.symbol}
                              style={[s.upcomingDivRow, i > 0 && s.allocBorder]}
                              onPress={() => router.push(`/stock/${d.symbol}`)}
                              activeOpacity={0.7}
                            >
                              <View style={s.upcomingDivAccent} />
                              <StockLogo ticker={d.symbol} size={32} borderRadius={7} />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={s.divTicker}>{d.symbol}</Text>
                                <Text style={s.divNext}>Ex-Datum: {exDate}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={s.divIncome}>{fmtCurrency(d.quarterlyAmount)}</Text>
                                <Text style={s.divIncomeLabel}>nächste Zahlung</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  );
                })()}

                {/* Annual Summary */}
                <View style={s.divSummaryCard}>
                  <View style={s.divSummaryItem}>
                    <Text style={s.divSummaryLabel}>Jährliche Einnahmen</Text>
                    <Text style={s.divSummaryBig}>{fmtBig(totalAnnualDiv)}</Text>
                  </View>
                  <View style={s.divDivider} />
                  <View style={s.divSummaryItem}>
                    <Text style={s.divSummaryLabel}>Portfoliorendite</Text>
                    <Text style={[s.divSummaryBig, { color: theme.accent.positive }]}>{fmtDE(portfolioYield)} %</Text>
                  </View>
                  <View style={s.divDivider} />
                  <View style={s.divSummaryItem}>
                    <Text style={s.divSummaryLabel}>Monatlich (Ø)</Text>
                    <Text style={s.divSummaryBig}>{fmtBig(totalAnnualDiv / 12)}</Text>
                  </View>
                </View>

                {/* Per-Stock Dividends */}
                <Text style={[s.sectionLabel, { marginTop: 16 }]}>DIVIDENDEN JE AKTIE</Text>
                <View style={s.card}>
                  {divData.map((d, i) => (
                    <TouchableOpacity key={d.symbol} style={[s.divRow, i > 0 && s.allocBorder]}
                      onPress={() => router.push(`/stock/${d.symbol}`)}>
                      <StockLogo ticker={d.symbol} size={36} borderRadius={8} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.divTicker}>{d.symbol}</Text>
                        <Text style={s.divSub}>{fmtDE(d.yield, 2)} % Rendite · {fmtCurrency(d.perShareTTM)}/Aktie</Text>
                        {d.nextDate && (
                          <Text style={s.divNext}>
                            Nächste Zahlung: {new Date(d.nextDate).toLocaleDateString('de-DE')}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.divIncome}>{fmtBig(d.annualIncome)}</Text>
                        <Text style={s.divIncomeLabel}>p.a.</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

        ) : (
          /* ── SUPERINVESTOREN TAB ── */
          <View style={s.list}>
            <Text style={s.sectionLabel}>SUPERINVESTOREN MIT DEINEN AKTIEN</Text>
            {siList.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="people-outline" size={36} color={theme.text.tertiary} />
                <Text style={s.emptyTitle}>Keine Überschneidungen</Text>
                <Text style={s.emptyText}>Kein Superinvestor hält aktuell deine Aktien</Text>
              </View>
            ) : siList.map((inv) => (
              <TouchableOpacity key={inv.slug} style={s.siRow}
                onPress={() => router.push(`/investor/${inv.slug}`)} activeOpacity={0.7}>
                <View style={s.siAvatar}>
                  <Text style={s.siAvatarText}>{inv.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.siName}>{inv.name}</Text>
                  <Text style={s.siTickers}>{inv.tickers.join(' · ')}</Text>
                </View>
                <View style={s.siCountBadge}>
                  <Text style={s.siCountText}>{inv.tickers.length} {inv.tickers.length === 1 ? 'Aktie' : 'Aktien'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  // Header
  header: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.md,
    paddingBottom: theme.space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioSelector: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  title: {
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: theme.weight.bold,
    letterSpacing: theme.tracking.tight,
  },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.body },
  addBtn: {
    width: 34, height: 34, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },

  // Bottom-Sheet Modal
  modalOverlay: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.bg.cardElevated,
    borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    paddingBottom: 34, paddingTop: theme.space.md,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.strong,
    alignSelf: 'center', marginBottom: theme.space.lg,
  },
  modalTitle: {
    color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold,
    letterSpacing: theme.tracking.wider, textTransform: 'uppercase',
    paddingHorizontal: theme.space.xl, marginBottom: theme.space.sm,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md + 2,
  },
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  modalOptionName: { color: theme.text.primary, fontSize: 15, fontWeight: theme.weight.medium },
  modalOptionSub: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 1 },
  modalDivider: { height: 1, backgroundColor: theme.border.default, marginVertical: theme.space.xs, marginHorizontal: theme.space.xl },
  modalCancel: {
    marginHorizontal: theme.space.lg, marginTop: theme.space.sm,
    paddingVertical: theme.space.md + 2, borderRadius: theme.radius.md,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  modalCancelText: { color: theme.text.secondary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Summary Card — premium flat
  summaryCard: {
    marginHorizontal: theme.space.lg, marginBottom: theme.space.xl,
    borderRadius: theme.radius.xl, padding: theme.space.xl,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
  },
  summaryLabel: {
    color: theme.text.tertiary, fontSize: theme.font.caption,
    fontWeight: theme.weight.medium, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase', marginBottom: theme.space.sm,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: theme.space.sm + 2, flexWrap: 'wrap' },
  summaryValue: {
    color: theme.text.primary,
    fontSize: theme.font.display1, fontWeight: theme.weight.bold,
    letterSpacing: theme.tracking.tight, ...tabularStyle,
  },
  gainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: theme.space.sm, paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  gainBadgeText: { fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, ...tabularStyle },
  gainAbsolute: { fontSize: theme.font.bodySm, fontWeight: theme.weight.medium, marginTop: theme.space.xs, ...tabularStyle },
  periodRow: { flexDirection: 'row', gap: theme.space.xs + 2, marginTop: theme.space.lg },
  periodPill: {
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.xs + 2,
    borderRadius: theme.radius.sm,
    backgroundColor: 'transparent',
  },
  periodPillActive: { backgroundColor: theme.bg.cardHover },
  periodText: { color: theme.text.muted, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: 0.3 },
  periodTextActive: { color: theme.text.primary },
  divSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.xs + 2,
    marginTop: theme.space.lg, paddingTop: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  divSummaryText: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.medium },

  // Inner Tab Bar — underline style
  tabBar: {
    paddingHorizontal: theme.space.xl, gap: 0, paddingBottom: 0,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
    marginBottom: theme.space.xl,
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.xs + 1,
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.md - 1,
    borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1,
  },
  tabItemActive: { borderBottomColor: theme.text.primary },
  tabLabel: { color: theme.text.tertiary, fontSize: theme.font.body, fontWeight: theme.weight.medium },
  tabLabelActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  // Content
  list: { paddingHorizontal: theme.space.lg, paddingBottom: 40 },
  sectionLabel: {
    color: theme.text.tertiary, fontSize: theme.font.caption,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
    marginBottom: theme.space.md - 2, marginTop: theme.space.xs,
  },
  card: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border.default },

  // Position rows — Listen-Style mit Border-Separators
  row: {
    backgroundColor: theme.bg.card,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  rowMid: { flex: 1, minWidth: 0 },
  symbol: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  shares: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2, ...tabularStyle },
  rowRight: { alignItems: 'flex-end' },
  value: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, ...tabularStyle },
  gain: { fontSize: theme.font.bodySm, marginTop: 2, fontWeight: theme.weight.medium, ...tabularStyle },
  siBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: theme.bg.cardElevated,
    borderRadius: theme.radius.full, paddingHorizontal: 6, paddingVertical: 2,
  },
  siBadgeText: { color: theme.text.tertiary, fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold },
  transactionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.space.sm, marginTop: theme.space.lg, padding: theme.space.lg,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
  },
  transactionBtnText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Performance
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
  },
  statLabel: {
    color: theme.text.tertiary, fontSize: theme.font.caption,
    marginBottom: theme.space.sm,
    fontWeight: theme.weight.medium, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase',
  },
  statValue: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal, ...tabularStyle },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 1 },
  allocBorder: { borderTopWidth: 1, borderTopColor: theme.border.default },
  allocTicker: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold },
  allocPct: { color: theme.text.tertiary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, ...tabularStyle },
  allocBar: { height: 3, backgroundColor: theme.border.default, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  allocBarFill: { height: 3, backgroundColor: theme.text.secondary, borderRadius: 2 },
  plRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 1, gap: theme.space.sm },
  plTicker: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold, width: 60 },
  plAbs: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginRight: theme.space.sm, ...tabularStyle },
  plPct: { fontSize: theme.font.body, fontWeight: theme.weight.semibold, width: 72, textAlign: 'right', ...tabularStyle },

  // Dividenden
  divSummaryCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg + 2,
    flexDirection: 'row', alignItems: 'center', marginBottom: theme.space.sm,
    borderWidth: 1, borderColor: theme.border.default,
  },
  divSummaryItem: { flex: 1, alignItems: 'center' },
  divSummaryLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.medium, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase', marginBottom: theme.space.xs + 2,
  },
  divSummaryBig: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal, ...tabularStyle },
  divDivider: { width: 1, height: 28, backgroundColor: theme.border.default },
  upcomingDivRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 1 },
  upcomingDivAccent: { width: 2, height: 24, backgroundColor: theme.accent.positive, borderRadius: 1, marginRight: theme.space.md },
  divRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 1 },
  divTicker: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  divSub: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  divNext: { color: theme.accent.positive, fontSize: theme.font.captionSm, marginTop: 3, ...tabularStyle },
  divIncome: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal, ...tabularStyle },
  divIncomeLabel: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: 2 },

  // Superinvestoren
  siRow: {
    backgroundColor: theme.bg.card,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  siAvatar: {
    width: 36, height: 36, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.cardElevated,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  siAvatarText: { color: theme.text.secondary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  siName: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  siTickers: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },
  siCountBadge: {
    backgroundColor: theme.bg.cardElevated,
    borderRadius: theme.radius.sm, paddingHorizontal: theme.space.sm + 2, paddingVertical: theme.space.xs + 1,
  },
  siCountText: { color: theme.text.secondary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, ...tabularStyle },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: theme.space.sm + 2 },
  emptyIcon: {
    width: 48, height: 48, borderRadius: theme.radius.lg,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.space.xs,
  },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  linkBtn: {
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md, paddingHorizontal: theme.space.xxl, paddingVertical: theme.space.md + 1,
    marginTop: theme.space.md - 2, flexDirection: 'row', alignItems: 'center',
  },
  linkBtnText: { color: theme.text.inverse, fontWeight: theme.weight.semibold, fontSize: theme.font.title3 },
});
