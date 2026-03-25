import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';

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

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

function formatValue(val: number) {
  if (!val) return '—';
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val}`;
}

const INVESTOR_LABELS: Record<string, string> = {
  buffett: 'Buffett', ackman: 'Ackman', burry: 'Burry', tepper: 'Tepper',
  dalio: 'Dalio', soros: 'Soros', icahn: 'Icahn', coleman: 'Coleman',
  druckenmiller: 'Druckenmiller', einhorn: 'Einhorn', klarman: 'Klarman',
  marks: 'Marks', greenblatt: 'Greenblatt', pabrai: 'Pabrai',
};

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
  const [activeTab, setActiveTab] = useState<'buys' | 'owned' | 'biggest'>('buys');

  useFocusEffect(useCallback(() => {
    if (!insights) loadInsights();
  }, []));

  async function loadInsights() {
    try {
      const res = await fetch(`${BASE_URL}/api/insights`);
      if (res.ok) setInsights(await res.json());
    } catch { /* silent */ }
    finally { setInsightsLoading(false); }
  }

  const filtered = TOP_INVESTORS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fund.toLowerCase().includes(search.toLowerCase())
  );

  const insightItems: InsightItem[] = insights
    ? activeTab === 'buys' ? insights.topBuys.slice(0, 6)
    : activeTab === 'owned' ? insights.topOwned.slice(0, 6)
    : insights.biggestInvestments.slice(0, 6)
    : [];

  const quarter = insights?.quartersAnalyzed?.[0] || '';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Superinvestoren</Text>
          <Text style={s.subtitle}>13F Portfolio-Tracker</Text>
        </View>

        {/* ── INSIGHTS SEKTION ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>INSIGHTS</Text>
            {quarter ? <Text style={s.quarterBadge}>{quarter}</Text> : null}
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
                style={[s.tab, activeTab === tab.id && s.tabActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={12}
                  color={activeTab === tab.id ? '#22C55E' : '#475569'}
                />
                <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Insights Liste */}
          {insightsLoading ? (
            <ActivityIndicator color="#22C55E" style={{ marginVertical: 24 }} />
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
                    {activeTab === 'buys' && item.count != null && (
                      <View style={s.countBadge}>
                        <Text style={s.countText}>{item.count}×</Text>
                      </View>
                    )}
                    {activeTab === 'owned' && item.count != null && (
                      <View style={s.countBadge}>
                        <Text style={s.countText}>{item.count} Inv.</Text>
                      </View>
                    )}
                    {activeTab === 'biggest' && item.value != null && (
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

          {/* Suche */}
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
                  <View style={[s.avatar, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    <Text style={[s.avatarText, { color }]}>{getInitials(item.name)}</Text>
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
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  quarterBadge: { color: '#22C55E', fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
  tabActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  tabText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#22C55E' },
  insightsList: { backgroundColor: '#0F172A', borderRadius: 14, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
  insightRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  insightRowBorder: { borderTopWidth: 1, borderTopColor: '#1E293B' },
  insightRank: { color: '#334155', fontSize: 12, fontWeight: '700', width: 22 },
  insightLogo: { marginRight: 10 },
  insightInfo: { flex: 1 },
  insightTicker: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  insightName: { color: '#64748B', fontSize: 11, marginTop: 1 },
  insightRight: { flexDirection: 'row', alignItems: 'center' },
  countBadge: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  countText: { color: '#22C55E', fontSize: 11, fontWeight: '700' },
  insightValue: { color: '#F8FAFC', fontWeight: '600', fontSize: 12, textAlign: 'right' },
  insightInvestor: { color: '#475569', fontSize: 10, textAlign: 'right', marginTop: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#1E293B', marginBottom: 10 },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  investorList: { gap: 6 },
  card: { backgroundColor: '#0F172A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E293B' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  cardContent: { flex: 1 },
  investorName: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  investorFund: { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  aum: { color: '#475569', fontSize: 12 },
});
