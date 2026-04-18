import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet, Modal, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import StockLogo from '../../components/StockLogo';
// Currency conversion now happens server-side in /api/portfolio/summary

const BASE_URL = 'https://finclue.de';

type Tab = 'positionen' | 'performance' | 'dividenden' | 'superinvestoren';

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(v: number) { return `${fmtDE(v)} €`; }
function fmtPct(v: number, sign = true) {
  return `${sign && v >= 0 ? '+' : sign && v < 0 ? '-' : ''}${fmtDE(Math.abs(v))} %`;
}
function fmtBig(v: number) {
  if (v >= 1e9) return `${fmtDE(v / 1e9, 1)} Mrd. €`;
  if (v >= 1e6) return `${fmtDE(v / 1e6, 1)} Mio. €`;
  return `${fmtDE(v, 0)} €`;
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

  // Single function: uses server-side /api/portfolio/summary for identical results as web
  async function loadHoldings(portfolioId: string) {
    await loadFromServer(portfolioId);
  }

  async function loadAllHoldings(portfolioIds?: string[]) {
    await loadFromServer(null); // null = all portfolios
  }

  async function loadFromServer(portfolioId: string | null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = portfolioId
        ? `${BASE_URL}/api/portfolio/summary?portfolioId=${portfolioId}`
        : `${BASE_URL}/api/portfolio/summary`;

      const [summaryRes, siRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        // SI overlap needs the tickers — we'll fetch after we have holdings
        null,
      ]);

      if (!summaryRes.ok) throw new Error('Portfolio-Daten konnten nicht geladen werden');
      const data = await summaryRes.json();

      if (!data.holdings?.length) {
        setHoldings([]); setTotalValue(data.totalValue || 0); setTotalCost(0);
        setLoading(false); setRefreshing(false); return;
      }

      // Fetch SI overlap
      const tickers = data.holdings.map((h: any) => h.symbol);
      const overlapRes = await fetch(`${BASE_URL}/api/portfolio/super-investor-overlap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      if (overlapRes.ok) setSiCounts(await overlapRes.json());

      // Map server holdings to local Holding type
      const enriched: Holding[] = data.holdings.map((h: any) => ({
        symbol: h.symbol,
        name: h.name || h.symbol,
        quantity: h.quantity,
        purchase_price: h.purchasePrice,
        current_price: h.currentPrice,
        currentPrice: h.currentPrice,
        currentValue: h.value,
        cost: h.cost,
        gain: h.gainLoss,
        gainPct: h.gainLossPercent,
        displayName: h.name || h.symbol,
        weight: h.weight,
      }));

      setHoldings(enriched);
      setTotalValue(data.totalValue);
      setTotalCost(data.totalCost);
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
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPortfolio(); }} tintColor="#34C759" />}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.portfolioSelector} onPress={() => setShowPortfolioModal(true)}>
            <Text style={s.title}>{portfolioName || 'Portfolio'}</Text>
            {portfolioList.length > 1 && (
              <Ionicons name="chevron-down" size={18} color="#94A3B8" style={{ marginTop: 2 }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-transaction')}>
            <Ionicons name="add" size={22} color="#F8FAFC" />
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
                  <Ionicons name="layers-outline" size={20} color="#34C759" />
                  <View>
                    <Text style={s.modalOptionName}>Alle Depots</Text>
                    <Text style={s.modalOptionSub}>{portfolioList.length} Depots zusammengefasst</Text>
                  </View>
                </View>
                {selectedPortfolioId === null && <Ionicons name="checkmark" size={18} color="#34C759" />}
              </TouchableOpacity>

              <View style={s.modalDivider} />

              {/* Individual portfolios */}
              {portfolioList.map(p => (
                <TouchableOpacity key={p.id} style={s.modalOption} onPress={() => switchPortfolio(p.id, p.name)}>
                  <View style={s.modalOptionLeft}>
                    <Ionicons name="briefcase-outline" size={20} color="#64748B" />
                    <Text style={s.modalOptionName}>{p.name}</Text>
                  </View>
                  {selectedPortfolioId === p.id && <Ionicons name="checkmark" size={18} color="#34C759" />}
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
                  color={displayGainPct >= 0 ? '#34C759' : '#FF3B30'}
                />
                <Text style={[s.gainBadgeText, { color: displayGainPct >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {fmtPct(displayGainPct)}
                </Text>
              </View>
            )}
          </View>
          {periodLoading ? (
            <ActivityIndicator color="#34C759" size="small" style={{ marginTop: 8 }} />
          ) : (
            <Text style={[s.gainAbsolute, { color: displayGain >= 0 ? '#34C759' : '#FF3B30' }]}>
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
              <Ionicons name="cash-outline" size={12} color="#475569" />
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
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? '#34C759' : '#475569'} />
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#34C759" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={s.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
            <Text style={s.emptyTitle}>Fehler beim Laden</Text>
            <Text style={s.emptyText}>{error}</Text>
          </View>
        ) : holdings.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}><Ionicons name="briefcase-outline" size={28} color="#475569" /></View>
            <Text style={s.emptyTitle}>Portfolio ist leer</Text>
            <Text style={s.emptyText}>Füge deine erste Transaktion hinzu</Text>
            <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/add-transaction')}>
              <Ionicons name="add-circle-outline" size={18} color="#F8FAFC" style={{ marginRight: 6 }} />
              <Text style={s.linkBtnText}>Transaktion hinzufügen</Text>
            </TouchableOpacity>
          </View>

        ) : activeTab === 'positionen' ? (
          /* ── POSITIONEN TAB ── */
          <View style={s.list}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={s.sectionLabel}>POSITIONEN</Text>
              {Object.values(siCounts).some(v => v.count > 0) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={{ color: '#475569', fontSize: 11 }}>= Superinvestor hält Aktie</Text>
                </View>
              )}
            </View>
            {holdings.map((h) => {
              const siCount = siCounts[h.symbol]?.count ?? 0;
              return (
                <TouchableOpacity key={h.symbol} style={s.row} onPress={() => router.push(`/stock/${h.symbol}`)} activeOpacity={0.7}>
                  <StockLogo ticker={h.symbol} size={42} borderRadius={10} />
                  <View style={s.rowMid}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.symbol} numberOfLines={1}>{h.displayName || h.name || h.symbol}</Text>
                      {siCount > 0 && (
                        <View style={s.siBadge}>
                          <Ionicons name="star" size={9} color="#F59E0B" />
                          <Text style={s.siBadgeText}>{siCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.shares}>{h.quantity} Aktien · {h.symbol} · ⌀ {fmtCurrency(h.purchase_price || 0)}</Text>
                  </View>
                  <View style={s.rowRight}>
                    <Text style={s.value}>{fmtCurrency(h.currentValue)}</Text>
                    <Text style={[s.gain, { color: h.gain >= 0 ? '#34C759' : '#FF3B30' }]}>{fmtPct(h.gainPct)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.transactionBtn} onPress={() => router.push('/add-transaction')}>
              <Ionicons name="add-circle-outline" size={18} color="#34C759" />
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
                <Text style={[s.statValue, { color: totalGain >= 0 ? '#34C759' : '#FF3B30' }]}>
                  {totalGain >= 0 ? '+' : ''}{fmtBig(totalGain)}
                </Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Rendite (gesamt)</Text>
                <Text style={[s.statValue, { color: totalGainPct >= 0 ? '#34C759' : '#FF3B30' }]}>
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
                  <Text style={[s.plPct, { color: h.gainPct >= 0 ? '#34C759' : '#FF3B30' }]}>
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
              <ActivityIndicator color="#34C759" style={{ marginVertical: 24 }} />
            ) : divData.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="cash-outline" size={36} color="#475569" />
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
                    <Text style={[s.divSummaryBig, { color: '#34C759' }]}>{fmtDE(portfolioYield)} %</Text>
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
                <Ionicons name="people-outline" size={36} color="#475569" />
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
  container: { flex: 1, backgroundColor: '#000000' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  portfolioSelector: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111113', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 34, paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    color: '#64748B', fontSize: 12, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalOptionName: { color: '#F8FAFC', fontSize: 16, fontWeight: '600' },
  modalOptionSub: { color: '#64748B', fontSize: 13, marginTop: 1 },
  modalDivider: { height: 1, backgroundColor: '#1e1e20', marginVertical: 4, marginHorizontal: 20 },
  modalCancel: {
    marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#1e293b', alignItems: 'center',
  },
  modalCancelText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  title: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: '#8E8E93', fontSize: 13, marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },

  // Summary Card — flat, no gradient
  summaryCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 18, padding: 22, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E' },
  summaryLabel: { color: '#8E8E93', fontSize: 12, fontWeight: '500', letterSpacing: 0.2, marginBottom: 6 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '700', letterSpacing: -1.2 },
  gainBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gainBadgeText: { fontSize: 13, fontWeight: '700' },
  gainAbsolute: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  periodRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  periodPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#1E1E20' },
  periodPillActive: { backgroundColor: '#2C2C2E' },
  periodText: { color: '#48484A', fontSize: 12, fontWeight: '600' },
  periodTextActive: { color: '#FFFFFF' },
  divSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1E1E20' },
  divSummaryText: { color: '#64748B', fontSize: 12, fontWeight: '500' },

  // Inner Tab Bar — underline style
  tabBar: { paddingHorizontal: 20, gap: 0, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#1C1C1E', marginBottom: 20 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabItemActive: { borderBottomColor: '#FFFFFF' },
  tabLabel: { color: '#8E8E93', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: '#FFFFFF' },

  // Content
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: { color: '#48484A', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 16,  overflow: 'hidden' },

  // Position rows
  row: { backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 12 },
  rowMid: { flex: 1 },
  symbol: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  shares: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  value: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  gain: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  siBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  siBadgeText: { color: '#8E8E93', fontSize: 10, fontWeight: '600' },
  transactionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E' },
  transactionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Performance
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#1C1C1E', borderRadius: 14,  padding: 16 },
  statLabel: { color: '#8E8E93', fontSize: 11, marginBottom: 8, fontWeight: '500' },
  statValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  allocBorder: { borderTopWidth: 1, borderTopColor: '#1C1C1E' },
  allocTicker: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  allocPct: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },
  allocBar: { height: 3, backgroundColor: '#2C2C2E', borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  allocBarFill: { height: 3, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 },
  plRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 8 },
  plTicker: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', width: 60 },
  plAbs: { color: '#8E8E93', fontSize: 12, marginRight: 8 },
  plPct: { fontSize: 13, fontWeight: '700', width: 72, textAlign: 'right' },

  // Dividenden
  divSummaryCard: { backgroundColor: '#1C1C1E', borderRadius: 16,  padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  divSummaryItem: { flex: 1, alignItems: 'center' },
  divSummaryLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '500', marginBottom: 6 },
  divSummaryBig: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
  divDivider: { width: 1, height: 32, backgroundColor: '#2C2C2E' },
  upcomingDivRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  upcomingDivAccent: { width: 3, height: 28, backgroundColor: '#34C759', borderRadius: 2, marginRight: 12 },
  divRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  divTicker: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  divSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
  divNext: { color: '#34C759', fontSize: 10, marginTop: 3 },
  divIncome: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  divIncomeLabel: { color: '#8E8E93', fontSize: 10, marginTop: 2 },

  // Superinvestoren
  siRow: { backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 2, gap: 12 },
  siAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  siAvatarText: { color: '#8E8E93', fontSize: 16, fontWeight: '700' },
  siName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  siTickers: { color: '#8E8E93', fontSize: 12, marginTop: 2 },
  siCountBadge: { backgroundColor: '#1C1C1E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  siCountText: { color: '#8E8E93', fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  linkBtn: { backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  linkBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
