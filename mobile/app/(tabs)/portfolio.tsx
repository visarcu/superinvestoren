import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/auth';
import StockLogo from '../../components/StockLogo';

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

  useFocusEffect(useCallback(() => { loadPortfolio(); }, []));

  async function loadPortfolio() {
    try {
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }
      const userId = sessionData.session.user.id;

      const { data: portfolios } = await supabase
        .from('portfolios').select('id, name').eq('user_id', userId)
        .order('created_at', { ascending: true }).limit(1);

      if (!portfolios?.length) { setLoading(false); setRefreshing(false); return; }
      const portfolio = portfolios[0];
      setPortfolioName(portfolio.name);

      const { data: rawHoldings, error: hErr } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, purchase_price, current_price')
        .eq('portfolio_id', portfolio.id);

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

      // Add weights
      enriched.forEach(h => { h.weight = tv > 0 ? (h.currentValue / tv) * 100 : 0; });
      setHoldings(enriched.sort((a, b) => b.currentValue - a.currentValue));
      setTotalValue(tv);
      setTotalCost(tc);

      // Load dividends in background
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

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPortfolio(); }} tintColor="#22C55E" />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Portfolio</Text>
            {portfolioName ? <Text style={s.subtitle}>{portfolioName}</Text> : null}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => router.push('/add-transaction')}>
            <Ionicons name="add" size={22} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <LinearGradient colors={['#111113', '#1a2744']} style={s.summaryCard}>
          <Text style={s.summaryLabel}>Gesamtwert</Text>
          <Text style={s.summaryValue}>{fmtCurrency(totalValue)}</Text>
          <View style={s.gainRow}>
            <Text style={[s.gainText, { color: totalGain >= 0 ? '#22C55E' : '#EF4444' }]}>
              {totalGain >= 0 ? '+' : ''}{fmtCurrency(totalGain)}
            </Text>
            <Text style={[s.gainPct, { color: totalGain >= 0 ? '#22C55E' : '#EF4444' }]}>
              {fmtPct(totalGainPct)}
            </Text>
          </View>
          {totalAnnualDiv > 0 && (
            <View style={s.divSummaryRow}>
              <Ionicons name="cash-outline" size={13} color="#22C55E" />
              <Text style={s.divSummaryText}>
                {fmtBig(totalAnnualDiv)}/Jahr · {fmtDE(portfolioYield)} % Rendite
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Scrollable Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }} contentContainerStyle={s.tabBar}>
          {tabs.map(tab => (
            <TouchableOpacity key={tab.id} style={[s.tabItem, activeTab === tab.id && s.tabItemActive]}
              onPress={() => setActiveTab(tab.id)}>
              <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.id ? '#22C55E' : '#475569'} />
              <Text style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color="#22C55E" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={s.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
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
            <Text style={s.sectionLabel}>POSITIONEN</Text>
            {holdings.map((h) => {
              const siCount = siCounts[h.symbol]?.count ?? 0;
              return (
                <TouchableOpacity key={h.symbol} style={s.row} onPress={() => router.push(`/stock/${h.symbol}`)} activeOpacity={0.7}>
                  <StockLogo ticker={h.symbol} size={42} borderRadius={10} />
                  <View style={s.rowMid}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.symbol}>{h.symbol}</Text>
                      {siCount > 0 && (
                        <View style={s.siBadge}>
                          <Ionicons name="star" size={9} color="#F59E0B" />
                          <Text style={s.siBadgeText}>{siCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.shares}>{h.quantity} Aktien · ⌀ {fmtCurrency(h.purchase_price || 0)}</Text>
                  </View>
                  <View style={s.rowRight}>
                    <Text style={s.value}>{fmtCurrency(h.currentValue)}</Text>
                    <Text style={[s.gain, { color: h.gain >= 0 ? '#22C55E' : '#EF4444' }]}>{fmtPct(h.gainPct)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.transactionBtn} onPress={() => router.push('/add-transaction')}>
              <Ionicons name="add-circle-outline" size={18} color="#22C55E" />
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
                <Text style={[s.statValue, { color: totalGain >= 0 ? '#22C55E' : '#EF4444' }]}>
                  {totalGain >= 0 ? '+' : ''}{fmtBig(totalGain)}
                </Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Rendite (gesamt)</Text>
                <Text style={[s.statValue, { color: totalGainPct >= 0 ? '#22C55E' : '#EF4444' }]}>
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
                      <Text style={s.allocTicker}>{h.symbol}</Text>
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
                  <Text style={s.plTicker}>{h.symbol}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.plAbs}>
                    {h.gain >= 0 ? '+' : ''}{fmtCurrency(h.gain)}
                  </Text>
                  <Text style={[s.plPct, { color: h.gainPct >= 0 ? '#22C55E' : '#EF4444' }]}>
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
              <ActivityIndicator color="#22C55E" style={{ marginVertical: 24 }} />
            ) : divData.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="cash-outline" size={36} color="#475569" />
                <Text style={s.emptyTitle}>Keine Dividenden</Text>
                <Text style={s.emptyText}>Deine Aktien zahlen aktuell keine Dividenden</Text>
              </View>
            ) : (
              <>
                {/* Annual Summary */}
                <View style={s.divSummaryCard}>
                  <View style={s.divSummaryItem}>
                    <Text style={s.divSummaryLabel}>Jährliche Einnahmen</Text>
                    <Text style={s.divSummaryBig}>{fmtBig(totalAnnualDiv)}</Text>
                  </View>
                  <View style={s.divDivider} />
                  <View style={s.divSummaryItem}>
                    <Text style={s.divSummaryLabel}>Portfoliorendite</Text>
                    <Text style={[s.divSummaryBig, { color: '#22C55E' }]}>{fmtDE(portfolioYield)} %</Text>
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
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1e1e20', borderWidth: 1, borderColor: '#2c2c2e', alignItems: 'center', justifyContent: 'center' },

  summaryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  summaryLabel: { color: '#64748B', fontSize: 13, marginBottom: 4 },
  summaryValue: { color: '#F8FAFC', fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  gainText: { fontSize: 15, fontWeight: '600' },
  gainPct: { fontSize: 14, fontWeight: '500' },
  divSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  divSummaryText: { color: '#22C55E', fontSize: 12, fontWeight: '500' },

  tabBar: { paddingHorizontal: 16, gap: 6, paddingBottom: 4 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20' },
  tabItemActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  tabLabel: { color: '#475569', fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#22C55E' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: { backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#1e1e20', overflow: 'hidden' },

  row: { backgroundColor: '#111113', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 12 },
  rowMid: { flex: 1 },
  symbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  shares: { color: '#64748B', fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  value: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  gain: { fontSize: 13, marginTop: 2 },
  siBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  siBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  transactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 14, backgroundColor: '#111113', borderRadius: 12, borderWidth: 1, borderColor: '#1e1e20' },
  transactionBtnText: { color: '#22C55E', fontSize: 14, fontWeight: '600' },

  // Performance
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#111113', borderRadius: 12, borderWidth: 1, borderColor: '#1e1e20', padding: 14 },
  statLabel: { color: '#64748B', fontSize: 11, marginBottom: 6 },
  statValue: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  allocRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  allocBorder: { borderTopWidth: 1, borderTopColor: '#1e1e20' },
  allocTicker: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  allocPct: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  allocBar: { height: 4, backgroundColor: '#1e1e20', borderRadius: 2, overflow: 'hidden' },
  allocBarFill: { height: 4, backgroundColor: '#22C55E', borderRadius: 2 },
  plRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  plTicker: { color: '#F8FAFC', fontSize: 13, fontWeight: '700', width: 56 },
  plAbs: { color: '#94A3B8', fontSize: 12, marginRight: 8 },
  plPct: { fontSize: 13, fontWeight: '700', width: 72, textAlign: 'right' },

  // Dividenden
  divSummaryCard: { backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#22C55E30', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  divSummaryItem: { flex: 1, alignItems: 'center' },
  divSummaryLabel: { color: '#64748B', fontSize: 10, marginBottom: 4 },
  divSummaryBig: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  divDivider: { width: 1, height: 36, backgroundColor: '#1e1e20' },
  divRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  divTicker: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  divSub: { color: '#64748B', fontSize: 11, marginTop: 2 },
  divNext: { color: '#22C55E', fontSize: 10, marginTop: 3 },
  divIncome: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  divIncomeLabel: { color: '#64748B', fontSize: 10, marginTop: 1 },

  // Superinvestoren
  siRow: { backgroundColor: '#111113', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 12 },
  siAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e1e20', alignItems: 'center', justifyContent: 'center' },
  siAvatarText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
  siName: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  siTickers: { color: '#64748B', fontSize: 12, marginTop: 2 },
  siCountBadge: { backgroundColor: '#1e1e20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  siCountText: { color: '#22C55E', fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#111113', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  linkBtn: { backgroundColor: '#1e1e20', borderWidth: 1, borderColor: '#2c2c2e', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  linkBtnText: { color: '#F8FAFC', fontWeight: '600' },
});
