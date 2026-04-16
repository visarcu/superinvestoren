import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';
import { INVESTOR_PHOTOS } from '../../lib/investorPhotos';

const BASE_URL = 'https://finclue.de';

interface Investor {
  slug: string;
  name: string;
  subtitle: string;
  totalValue: number;
  positionsCount: number;
  lastUpdate: string;
}

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

  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investorsLoading, setInvestorsLoading] = useState(true);

  // Smart Money: top-level sub-tabs
  const [smartMoneyTab, setSmartMoneyTab] = useState<'superinvestors' | 'kongress'>('superinvestors');
  const [politicianTopBuys, setPoliticianTopBuys] = useState<any[]>([]);
  const [politicianTrades, setPoliticianTrades] = useState<any[]>([]);
  const [politicianLoading, setPoliticianLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!insights) loadInsights();
    if (trades.length === 0) loadTrades();
    if (investors.length === 0) loadInvestors();
    if (politicianTopBuys.length === 0) loadPoliticians();
  }, []));

  async function loadPoliticians() {
    try {
      const [topRes, tradesRes] = await Promise.all([
        fetch(`${BASE_URL}/api/politicians/top-buys?limit=10`),
        fetch(`${BASE_URL}/api/politicians?limit=20`),
      ]);
      if (topRes.ok) {
        const d = await topRes.json();
        setPoliticianTopBuys(d.topBuys || []);
      }
      if (tradesRes.ok) {
        const d = await tradesRes.json();
        setPoliticianTrades(d.trades || []);
      }
    } catch { /* silent */ }
    finally { setPoliticianLoading(false); }
  }

  async function loadInvestors() {
    try {
      const res = await fetch(`${BASE_URL}/api/investors`);
      if (res.ok) {
        const data = await res.json();
        setInvestors(data.investors || []);
      }
    } catch { /* silent */ }
    finally { setInvestorsLoading(false); }
  }

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

  const filtered = investors
    .filter(i => {
      if (!search) return true;
      const q = search.toLowerCase();
      return i.name.toLowerCase().includes(q)
        || i.subtitle.toLowerCase().includes(q)
        || i.slug.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));

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
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Smart Money</Text>
          <Text style={s.subtitle}>Wem die Profis folgen</Text>
        </View>

        {/* Sub-Tabs */}
        <View style={s.smartTabsWrap}>
          <View style={s.smartTabs}>
            <TouchableOpacity
              style={[s.smartTab, smartMoneyTab === 'superinvestors' && s.smartTabActive]}
              onPress={() => setSmartMoneyTab('superinvestors')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trending-up"
                size={15}
                color={smartMoneyTab === 'superinvestors' ? '#FFFFFF' : '#48484A'}
              />
              <Text style={[s.smartTabText, smartMoneyTab === 'superinvestors' && s.smartTabTextActive]}>
                Superinvestoren
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.smartTab, smartMoneyTab === 'kongress' && s.smartTabActive]}
              onPress={() => setSmartMoneyTab('kongress')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="flag"
                size={15}
                color={smartMoneyTab === 'kongress' ? '#FFFFFF' : '#48484A'}
              />
              <Text style={[s.smartTabText, smartMoneyTab === 'kongress' && s.smartTabTextActive]}>
                Kongress
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Kongress Content */}
        {smartMoneyTab === 'kongress' && (
          <>
            <View style={s.section}>
              <Text style={s.sectionLabel}>MEISTGEKAUFTE AKTIEN</Text>
              {politicianLoading ? (
                <ActivityIndicator color="#34C759" style={{ marginVertical: 24 }} />
              ) : politicianTopBuys.length === 0 ? (
                <Text style={s.emptyText}>Keine Daten verfügbar</Text>
              ) : (
                <View style={s.listCard}>
                  {politicianTopBuys.map((t: any, i: number) => (
                    <TouchableOpacity
                      key={t.ticker}
                      style={[s.polRow, i > 0 && s.polRowBorder]}
                      onPress={() => router.push(`/stock/${t.ticker}`)}
                      activeOpacity={0.7}
                    >
                      <View style={s.polIcon}>
                        <Ionicons name="flag" size={16} color="#8E8E93" />
                      </View>
                      <View style={s.polInfo}>
                        <Text style={s.polTicker}>{t.ticker}</Text>
                        <Text style={s.polSub} numberOfLines={1}>
                          {t.politicianCount} Politiker · {t.transactionCount} Käufe
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.polValue}>
                          {t.totalValueMax >= 1_000_000
                            ? `${(t.totalValueMax / 1_000_000).toFixed(1)} Mio.`
                            : `${(t.totalValueMax / 1_000).toFixed(0)} K`}
                        </Text>
                        <Text style={s.polValueLabel}>max. Vol.</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={s.section}>
              <Text style={s.sectionLabel}>LETZTE TRANSAKTIONEN</Text>
              {politicianTrades.length > 0 && (
                <View style={s.listCard}>
                  {politicianTrades.slice(0, 15).map((t: any, i: number) => {
                    const isBuy = (t.type || '').toLowerCase() === 'purchase';
                    const color = isBuy ? '#34C759' : '#FF3B30';
                    return (
                      <TouchableOpacity
                        key={`${t.representative}-${t.ticker}-${i}`}
                        style={[s.polRow, i > 0 && s.polRowBorder]}
                        onPress={() => t.ticker && router.push(`/stock/${t.ticker}`)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.polBadge, { backgroundColor: color + '20' }]}>
                          <Text style={[s.polBadgeText, { color }]}>
                            {isBuy ? 'KAUF' : 'VERK'}
                          </Text>
                        </View>
                        <View style={s.polInfo}>
                          <Text style={s.polTicker}>{t.ticker || '—'}</Text>
                          <Text style={s.polSub} numberOfLines={1}>
                            {t.representative} · {t.state}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.polValueSmall}>{t.amount?.replace('$', '').replace(' - $', '–') || ''}</Text>
                          <Text style={s.polValueLabel}>{t.transactionDate}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* Superinvestors Content (original) */}
        {smartMoneyTab === 'superinvestors' && (
        <>
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
            <ActivityIndicator color={theme.text.tertiary} style={{ marginVertical: 24 }} />
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
                  color={activeInsightTab === tab.id ? theme.text.primary : theme.text.tertiary}
                />
                <Text style={[s.tabText, activeInsightTab === tab.id && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {insightsLoading ? (
            <ActivityIndicator color={theme.text.tertiary} style={{ marginVertical: 24 }} />
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
                    <Ionicons name="chevron-forward" size={12} color={theme.text.tertiary} style={{ marginLeft: 4 }} />
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
            <Ionicons name="search" size={16} color={theme.text.tertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Investor suchen..."
              placeholderTextColor={theme.text.muted}
              value={search}
              onChangeText={setSearch}
              keyboardAppearance="dark"
            />
          </View>

          <View style={s.investorList}>
            {investorsLoading ? (
              <ActivityIndicator color="#34C759" style={{ marginVertical: 24 }} />
            ) : filtered.length === 0 ? (
              <Text style={s.emptyText}>Keine Investoren gefunden</Text>
            ) : filtered.map((item, index) => {
              const color = COLORS[index % COLORS.length];
              const aumDisplay = item.totalValue >= 1e9
                ? `$${fmtDE(item.totalValue / 1e9, 1)}B`
                : item.totalValue >= 1e6
                ? `$${fmtDE(item.totalValue / 1e6, 0)}M`
                : '—';
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
                    <Text style={s.investorFund} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <View style={s.cardRight}>
                    <Text style={s.aum}>{aumDisplay}</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.text.tertiary} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

import { theme, tabularStyle } from '../../lib/theme';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  header: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, paddingBottom: theme.space.md },
  title: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2 },
  section: { paddingHorizontal: theme.space.lg, marginBottom: theme.space.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.space.sm + 2 },
  sectionLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider, textTransform: 'uppercase' },
  quarterBadge: { color: theme.text.secondary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, backgroundColor: theme.bg.cardElevated, paddingHorizontal: theme.space.sm, paddingVertical: 2, borderRadius: theme.radius.sm, ...tabularStyle },
  tabs: { flexDirection: 'row', gap: theme.space.xs + 2, marginBottom: theme.space.sm + 2 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.xs,
    paddingVertical: theme.space.sm, borderRadius: theme.radius.md,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
  },
  tabActive: { borderColor: theme.border.strong, backgroundColor: theme.bg.cardElevated },
  tabText: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.medium },
  tabTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  // Trades
  tradesList: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' },
  tradeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md, gap: theme.space.sm + 2 },
  tradeRowBorder: { borderTopWidth: 1, borderTopColor: theme.border.default },
  tradeAvatar: { width: 36, height: 36, borderRadius: theme.radius.full, backgroundColor: theme.bg.cardElevated, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  tradeAvatarImg: { width: 36, height: 36, borderRadius: theme.radius.full },
  tradeAvatarText: { fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, color: theme.text.tertiary },
  tradeInfo: { flex: 1, minWidth: 0 },
  tradeTop: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs + 2, marginBottom: 2 },
  tradeTicker: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  typeBadge: { borderRadius: theme.radius.sm - 1, paddingHorizontal: theme.space.xs + 2, paddingVertical: 2 },
  typeBadgeText: { fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold },
  tradeInvestor: { color: theme.text.tertiary, fontSize: theme.font.caption, marginBottom: 1 },
  tradeName: { color: theme.text.muted, fontSize: theme.font.caption },
  tradeRight: { alignItems: 'flex-end', flexShrink: 0 },
  tradeValue: { color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, ...tabularStyle },
  tradeChange: { fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, marginTop: 2, ...tabularStyle },

  // Insights
  insightsList: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' },
  insightRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  insightRowBorder: { borderTopWidth: 1, borderTopColor: theme.border.default },
  insightRank: { color: theme.text.muted, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, width: 22, ...tabularStyle },
  insightLogo: { marginRight: theme.space.sm + 2 },
  insightInfo: { flex: 1 },
  insightTicker: { color: theme.text.primary, fontWeight: theme.weight.semibold, fontSize: theme.font.body },
  insightName: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 1 },
  insightRight: { flexDirection: 'row', alignItems: 'center' },
  countBadge: { backgroundColor: theme.bg.cardElevated, borderRadius: theme.radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  countText: { color: theme.text.primary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, ...tabularStyle },
  insightValue: { color: theme.text.primary, fontWeight: theme.weight.semibold, fontSize: theme.font.bodySm, textAlign: 'right', ...tabularStyle },
  insightInvestor: { color: theme.text.tertiary, fontSize: theme.font.captionSm, textAlign: 'right', marginTop: 1 },

  // Investors list
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.bg.card, borderRadius: theme.radius.md, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 2, gap: theme.space.sm, borderWidth: 1, borderColor: theme.border.default, marginBottom: theme.space.sm + 2 },
  searchInput: { flex: 1, color: theme.text.primary, fontSize: theme.font.title3 },
  investorList: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' },
  card: {
    backgroundColor: theme.bg.card,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  avatar: {
    width: 40, height: 40, borderRadius: theme.radius.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border.default,
    backgroundColor: theme.bg.cardElevated, overflow: 'hidden',
  },
  avatarImg: { width: 40, height: 40, borderRadius: theme.radius.full },
  avatarText: { fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  cardContent: { flex: 1 },
  investorName: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  investorFund: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  aum: { color: theme.text.tertiary, fontSize: theme.font.bodySm, ...tabularStyle },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.bodySm, textAlign: 'center', paddingVertical: 24 },

  // Smart Money sub-tabs
  smartTabsWrap: { paddingHorizontal: 16, marginBottom: 12 },
  smartTabs: {
    flexDirection: 'row', backgroundColor: theme.bg.card,
    borderRadius: 10, padding: 3,
  },
  smartTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 8,
  },
  smartTabActive: { backgroundColor: theme.bg.cardHover },
  smartTabText: { color: theme.text.muted, fontSize: theme.font.body, fontWeight: theme.weight.semibold },
  smartTabTextActive: { color: theme.text.primary },

  // Kongress content
  listCard: { backgroundColor: theme.bg.card, borderRadius: 12, overflow: 'hidden' },
  polRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  polRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.default },
  polIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg.cardHover, alignItems: 'center', justifyContent: 'center' },
  polBadge: { width: 44, paddingVertical: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  polBadgeText: { fontSize: theme.font.caption, fontWeight: theme.weight.bold },
  polInfo: { flex: 1 },
  polTicker: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.bold },
  polSub: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },
  polValue: { color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  polValueSmall: { color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  polValueLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 1 },
});
