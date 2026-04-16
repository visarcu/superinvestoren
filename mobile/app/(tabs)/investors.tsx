import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';
import { INVESTOR_PHOTOS } from '../../lib/investorPhotos';

const BASE_URL = 'https://finclue.de';

const TOP_INVESTORS = [
  { slug: 'buffett', name: 'Warren Buffett', fund: 'Berkshire Hathaway', aum: '$300B+' },
  { slug: 'ackman', name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10B+' },
  { slug: 'burry', name: 'Michael Burry', fund: 'Scion Asset Mgmt', aum: '$300M+' },
  { slug: 'tepper', name: 'David Tepper', fund: 'Appaloosa Mgmt', aum: '$14B+' },
  { slug: 'dalio', name: 'Ray Dalio', fund: 'Bridgewater', aum: '$150B+' },
  { slug: 'soros', name: 'George Soros', fund: 'Soros Fund Mgmt', aum: '$25B+' },
  { slug: 'icahn', name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$5B+' },
  { slug: 'coleman', name: 'Chase Coleman', fund: 'Tiger Global', aum: '$25B+' },
  { slug: 'druckenmiller', name: 'Stanley Druckenmiller', fund: 'Duquesne Family Office', aum: '$3B+' },
  { slug: 'einhorn', name: 'David Einhorn', fund: 'Greenlight Capital', aum: '$1B+' },
  { slug: 'klarman', name: 'Seth Klarman', fund: 'Baupost Group', aum: '$27B+' },
  { slug: 'marks', name: 'Howard Marks', fund: 'Oaktree Capital', aum: '$170B+' },
  { slug: 'greenblatt', name: 'Joel Greenblatt', fund: 'Gotham Asset Mgmt', aum: '$2B+' },
  { slug: 'pabrai', name: 'Mohnish Pabrai', fund: 'Pabrai Funds', aum: '$500M+' },
];

const INVESTOR_LABELS: Record<string, string> = {
  buffett: 'Buffett', ackman: 'Ackman', burry: 'Burry', tepper: 'Tepper',
  dalio: 'Dalio', soros: 'Soros', icahn: 'Icahn', coleman: 'Coleman',
  druckenmiller: 'Druckenmiller', einhorn: 'Einhorn', klarman: 'Klarman',
  marks: 'Marks', greenblatt: 'Greenblatt', pabrai: 'Pabrai',
  gates: 'Gates', fisher: 'Fisher', gayner: 'Gayner', miller: 'Miller',
  tangen: 'Tangen', peltz: 'Peltz', yacktman: 'Yacktman',
};

const COLORS = ['#34C759', '#16A34A', '#15803D', '#94A3B8', '#64748B', '#475569', '#2c2c2e', '#2C2C2E'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

function fmtDE(val: number, decimals = 1): string {
  return val.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatValue(val: number) {
  if (!val) return '—';
  if (val >= 1e9) return `${fmtDE(val / 1e9, 1)} Mrd. $`;
  if (val >= 1e6) return `${fmtDE(val / 1e6, 0)} Mio. $`;
  return `${fmtDE(val, 0)} $`;
}

const TRADE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ADD:    { label: 'Aufgestockt', color: '#34C759', bg: 'rgba(34,197,94,0.12)' },
  NEW:    { label: 'Neu',         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  REDUCE: { label: 'Reduziert',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  SOLD:   { label: 'Verkauft',   color: '#FF3B30', bg: 'rgba(239,68,68,0.12)' },
};

interface Trade {
  investor: string;
  investorName: string;
  type: 'ADD' | 'NEW' | 'REDUCE' | 'SOLD';
  ticker: string;
  name: string;
  value: number;
  dollarChange: number;
  percentChange: number;
  quarterKey: string;
  dollarChangeFormatted: string;
  valueFormatted: string;
  percentChangeFormatted: string;
}

interface InsightItem { ticker: string; name: string; count?: number; value?: number; investor?: string; }
interface Insights {
  topBuys: InsightItem[];
  topOwned: InsightItem[];
  biggestInvestments: InsightItem[];
  quartersAnalyzed: string[];
}

export default function InvestorsScreen() {
  const [search, setSearch] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState<'buys' | 'owned' | 'biggest'>('buys');

  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [activeTradeFilter, setActiveTradeFilter] = useState<'all' | 'buy' | 'sell'>('all');

  useFocusEffect(useCallback(() => {
    if (!insights) loadInsights();
    if (trades.length === 0) loadTrades();
  }, []));

  async function loadInsights() {
    try {
      const res = await fetch(`${BASE_URL}/api/insights`);
      if (res.ok) setInsights(await res.json());
    } catch { /* silent */ }
    finally { setInsightsLoading(false); }
  }

  async function loadTrades() {
    setTradesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/guru-trades`);
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades || []);
      }
    } catch { /* silent */ }
    finally { setTradesLoading(false); }
  }

  const filtered = TOP_INVESTORS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fund.toLowerCase().includes(search.toLowerCase())
  );

  const insightItems: InsightItem[] = insights
    ? activeInsightTab === 'buys' ? insights.topBuys.slice(0, 6)
    : activeInsightTab === 'owned' ? insights.topOwned.slice(0, 6)
    : insights.biggestInvestments.slice(0, 6)
    : [];

  const quarter = insights?.quartersAnalyzed?.[0] || '';

  const filteredTrades = trades.filter(t => {
    if (activeTradeFilter === 'buy') return t.type === 'ADD' || t.type === 'NEW';
    if (activeTradeFilter === 'sell') return t.type === 'REDUCE' || t.type === 'SOLD';
    return true;
  }).slice(0, 20);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Superinvestoren</Text>
          <Text style={s.subtitle}>13F Portfolio-Tracker</Text>
        </View>

        {/* ── AKTIVITÄT SEKTION ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>AKTIVITÄT</Text>
            {quarter ? <Text style={s.quarterBadge}>{quarter}</Text> : null}
          </View>

          {/* Filter Tabs */}
          <View style={s.tabs}>
            {([
              { id: 'all', label: 'Alle' },
              { id: 'buy', label: '↑ Käufe' },
              { id: 'sell', label: '↓ Verkäufe' },
            ] as const).map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tab, activeTradeFilter === tab.id && s.tabActive]}
                onPress={() => setActiveTradeFilter(tab.id)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, activeTradeFilter === tab.id && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tradesLoading ? (
            <ActivityIndicator color="#34C759" style={{ marginVertical: 24 }} />
          ) : (
            <View style={s.tradesList}>
              {filteredTrades.map((trade, i) => {
                const cfg = TRADE_TYPE_CONFIG[trade.type] || TRADE_TYPE_CONFIG.ADD;
                const investorLabel = INVESTOR_LABELS[trade.investor] || trade.investorName;
                const photo = INVESTOR_PHOTOS[trade.investor];
                return (
                  <TouchableOpacity
                    key={`${trade.investor}-${trade.ticker}-${i}`}
                    style={[s.tradeRow, i > 0 && s.tradeRowBorder]}
                    onPress={() => router.push(`/stock/${trade.ticker}`)}
                    activeOpacity={0.7}
                  >
                    {/* Investor Avatar */}
                    <View style={s.tradeAvatar}>
                      {photo
                        ? <Image source={{ uri: photo }} style={s.tradeAvatarImg} />
                        : <Text style={s.tradeAvatarText}>{getInitials(investorLabel)}</Text>}
                    </View>

                    {/* Info */}
                    <View style={s.tradeInfo}>
                      <View style={s.tradeTop}>
                        <Text style={s.tradeTicker}>{trade.ticker}</Text>
                        <View style={[s.typeBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[s.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                      <Text style={s.tradeInvestor}>{investorLabel}</Text>
                      <Text style={s.tradeName} numberOfLines={1}>
                        {trade.name?.replace(/\b(INC\.?|CORP\.?|CO\.?|LTD\.?)$/i, '').trim()}
                      </Text>
                    </View>

                    {/* Value */}
                    <View style={s.tradeRight}>
                      <Text style={s.tradeValue}>{trade.valueFormatted}</Text>
                      <Text style={[s.tradeChange, { color: cfg.color }]}>
                        {(trade.type === 'ADD' || trade.type === 'NEW') ? '+' : '-'}
                        {fmtDE(Math.abs(trade.percentChange), 0)} %
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── INSIGHTS SEKTION ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>INSIGHTS</Text>
          </View>

          {/* Tab-Switcher */}
          <View style={s.tabs}>
            {([
              { id: 'buys', label: 'Top Käufe', icon: 'trending-up' },
              { id: 'owned', label: 'Beliebteste', icon: 'star' },
              { id: 'biggest', label: 'Größte Bets', icon: 'cash' },
            ] as const).map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[s.tab, activeInsightTab === tab.id && s.tabActive]}
                onPress={() => setActiveInsightTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={12}
                  color={activeInsightTab === tab.id ? '#34C759' : '#475569'}
                />
                <Text style={[s.tabText, activeInsightTab === tab.id && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {insightsLoading ? (
            <ActivityIndicator color="#34C759" style={{ marginVertical: 24 }} />
          ) : (
            <View style={s.insightsList}>
              {insightItems.map((item, i) => (
                <TouchableOpacity
                  key={`${item.ticker}-${i}`}
                  style={[s.insightRow, i > 0 && s.insightRowBorder]}
                  onPress={() => router.push(`/stock/${item.ticker}`)}
                  activeOpacity={0.7}
                >
                  <Text style={s.insightRank}>#{i + 1}</Text>
                  <View style={s.insightLogo}>
                    <StockLogo ticker={item.ticker} size={36} borderRadius={8} />
                  </View>
                  <View style={s.insightInfo}>
                    <Text style={s.insightTicker}>{item.ticker}</Text>
                    <Text style={s.insightName} numberOfLines={1}>
                      {item.name?.replace(/\b(INC\.?|CORP\.?|CO\.?|LTD\.?)$/i, '').trim()}
                    </Text>
                  </View>
                  <View style={s.insightRight}>
                    {activeInsightTab === 'buys' && item.count != null && (
                      <View style={s.countBadge}>
                        <Text style={s.countText}>{item.count}×</Text>
                      </View>
                    )}
                    {activeInsightTab === 'owned' && item.count != null && (
                      <View style={s.countBadge}>
                        <Text style={s.countText}>{item.count} Inv.</Text>
                      </View>
                    )}
                    {activeInsightTab === 'biggest' && item.value != null && (
                      <View>
                        <Text style={s.insightValue}>{formatValue(item.value)}</Text>
                        {item.investor && (
                          <Text style={s.insightInvestor}>{INVESTOR_LABELS[item.investor] || item.investor}</Text>
                        )}
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={12} color="#475569" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── INVESTOREN LISTE ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>INVESTOREN</Text>

          <View style={s.searchBox}>
            <Ionicons name="search" size={16} color="#475569" />
            <TextInput
              style={s.searchInput}
              placeholder="Investor suchen..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
              keyboardAppearance="dark"
            />
          </View>

          <View style={s.investorList}>
            {filtered.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              return (
                <TouchableOpacity
                  key={item.slug}
                  style={s.card}
                  onPress={() => router.push(`/investor/${item.slug}`)}
                  activeOpacity={0.7}
                >
                  <View style={s.avatar}>
                    {INVESTOR_PHOTOS[item.slug]
                      ? <Image source={{ uri: INVESTOR_PHOTOS[item.slug] }} style={s.avatarImg} />
                      : <Text style={[s.avatarText, { color }]}>{getInitials(item.name)}</Text>}
                  </View>
                  <View style={s.cardContent}>
                    <Text style={s.investorName}>{item.name}</Text>
                    <Text style={s.investorFund}>{item.fund}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.aum}>{item.aum}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#475569" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  quarterBadge: { color: '#34C759', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E' },
  tabActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  tabText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#34C759' },

  // Trades
  tradesList: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  tradeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  tradeRowBorder: { borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  tradeAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  tradeAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  tradeAvatarText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tradeInfo: { flex: 1, minWidth: 0 },
  tradeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  tradeTicker: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  typeBadge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  tradeInvestor: { color: '#64748B', fontSize: 11, marginBottom: 1 },
  tradeName: { color: '#475569', fontSize: 11 },
  tradeRight: { alignItems: 'flex-end', flexShrink: 0 },
  tradeValue: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  tradeChange: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Insights
  insightsList: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  insightRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  insightRowBorder: { borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  insightRank: { color: '#2c2c2e', fontSize: 12, fontWeight: '700', width: 22 },
  insightLogo: { marginRight: 10 },
  insightInfo: { flex: 1 },
  insightTicker: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  insightName: { color: '#64748B', fontSize: 11, marginTop: 1 },
  insightRight: { flexDirection: 'row', alignItems: 'center' },
  countBadge: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  countText: { color: '#34C759', fontSize: 11, fontWeight: '700' },
  insightValue: { color: '#F8FAFC', fontWeight: '600', fontSize: 12, textAlign: 'right' },
  insightInvestor: { color: '#475569', fontSize: 10, textAlign: 'right', marginTop: 1 },

  // Investors list
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#2C2C2E', marginBottom: 10 },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  investorList: { gap: 6 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#2C2C2E' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2E', backgroundColor: '#1C1C1E', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  cardContent: { flex: 1 },
  investorName: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  investorFund: { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  aum: { color: '#475569', fontSize: 12 },
});
