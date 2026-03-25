import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';
import { tickerFromCusip } from '../../lib/cusipMap';

const BASE_URL = 'https://finclue.de';
const PAGE_SIZE = 10;

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

interface Position {
  name: string;
  cusip?: string;
  ticker?: string | null;
  shares: number;
  value: number;
  deltaShares?: number;
  pctDelta?: number;
}

interface Transaction {
  ticker: string | null;
  name: string;
  cusip?: string;
  deltaShares: number;
  value: number;
  type: 'Kauf' | 'Verkauf' | 'Neu' | 'Verkauft';
  pctChange: number;
}

const INVESTOR_NAMES: Record<string, string> = {
  buffett: 'Warren Buffett', ackman: 'Bill Ackman', burry: 'Michael Burry',
  tepper: 'David Tepper', dalio: 'Ray Dalio', soros: 'George Soros',
  icahn: 'Carl Icahn', coleman: 'Chase Coleman', druckenmiller: 'Stanley Druckenmiller',
  einhorn: 'David Einhorn', klarman: 'Seth Klarman', marks: 'Howard Marks',
  greenblatt: 'Joel Greenblatt', pabrai: 'Mohnish Pabrai',
};

function resolveTicker(pos: { ticker?: string | null; cusip?: string }): string | null {
  if (pos.ticker) return pos.ticker;
  if (pos.cusip) return tickerFromCusip(pos.cusip) || null;
  return null;
}

function dedup(positions: any[]): Position[] {
  const merged = new Map<string, Position>();
  for (const pos of positions) {
    const key = pos.cusip || pos.name;
    const ticker = resolveTicker(pos);
    if (merged.has(key)) {
      const ex = merged.get(key)!;
      ex.shares += pos.shares || 0;
      ex.value += pos.value || 0;
    } else {
      merged.set(key, { name: pos.name, cusip: pos.cusip, ticker, shares: pos.shares || 0, value: pos.value || 0 });
    }
  }
  return Array.from(merged.values()).sort((a, b) => b.value - a.value);
}

export default function InvestorDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [quarter, setQuarter] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeTab, setActiveTab] = useState<'holdings' | 'activity'>('holdings');

  useEffect(() => { loadData(); }, [slug]);

  async function loadData() {
    try {
      setError(null);
      setVisibleCount(PAGE_SIZE);

      const qRes = await fetch(`${BASE_URL}/api/investor/${slug}/quarters`);
      if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
      const qData = await qRes.json();
      const qs: string[] = qData.quarters || [];
      if (!qs.length) { setLoading(false); return; }
      setQuarters(qs);

      const latestQ = qs[qs.length - 1];
      setQuarter(latestQ);

      // Fetch latest + previous quarter in parallel
      const fetchQ = (q: string) =>
        fetch(`${BASE_URL}/api/investor/${slug}/holdings?quarter=${q}`).then(r => r.ok ? r.json() : null);

      const [latestData, prevData] = await Promise.all([
        fetchQ(latestQ),
        qs.length >= 2 ? fetchQ(qs[qs.length - 2]) : Promise.resolve(null),
      ]);

      const latest = dedup(latestData?.positions || []);
      const tv = latest.reduce((s, p) => s + p.value, 0);
      setTotalValue(tv);
      setPositions(latest);

      // Compute transactions vs previous quarter
      if (prevData) {
        const prev = dedup(prevData.positions || []);
        const prevMap = new Map(prev.map(p => [p.cusip || p.name, p]));
        const latestMap = new Map(latest.map(p => [p.cusip || p.name, p]));
        const txns: Transaction[] = [];

        // New or increased positions
        for (const pos of latest) {
          const key = pos.cusip || pos.name;
          const prevPos = prevMap.get(key);
          const delta = pos.shares - (prevPos?.shares || 0);
          if (delta === 0) continue;
          const isNew = !prevPos;
          const pctChange = prevPos ? Math.abs(delta / prevPos.shares * 100) : 100;
          txns.push({
            ticker: pos.ticker,
            name: pos.name,
            cusip: pos.cusip,
            deltaShares: delta,
            value: Math.abs(delta * (pos.value / pos.shares)),
            type: isNew ? 'Neu' : delta > 0 ? 'Kauf' : 'Verkauf',
            pctChange,
          });
        }
        // Fully sold positions
        for (const pos of prev) {
          const key = pos.cusip || pos.name;
          if (!latestMap.has(key)) {
            txns.push({
              ticker: pos.ticker,
              name: pos.name,
              cusip: pos.cusip,
              deltaShares: -pos.shares,
              value: pos.value,
              type: 'Verkauft',
              pctChange: 100,
            });
          }
        }
        txns.sort((a, b) => b.value - a.value);
        setTransactions(txns);
      }
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  const displayName = INVESTOR_NAMES[slug || ''] || (slug || '');
  const visible = positions.slice(0, visibleCount);
  const hasMore = visibleCount < positions.length;
  const top3Pct = positions.slice(0, 3).reduce((s, p) => s + (totalValue > 0 ? p.value / totalValue * 100 : 0), 0);

  return (
    <>
      <Stack.Screen options={{
        title: displayName,
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: 'Investoren',
      }} />

      <SafeAreaView style={s.container} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={s.centerTitle}>Fehler beim Laden</Text>
            <Text style={s.centerText}>{error}</Text>
            <TouchableOpacity style={s.actionBtn} onPress={loadData}>
              <Text style={s.actionBtnText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list}>
            {/* Summary */}
            <View style={s.summary}>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Portfolio-Wert</Text>
                <Text style={s.summaryValue}>{formatValue(totalValue)}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Positionen</Text>
                <Text style={s.summaryNum}>{positions.length}</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={s.summaryLabel}>Top 3 Anteil</Text>
                <Text style={s.summaryNum}>{top3Pct.toFixed(1)}%</Text>
              </View>
            </View>

            {/* Quartal Badge */}
            <View style={s.quarterRow}>
              <View style={s.quarterBadge}>
                <Text style={s.quarterText}>{quarter}</Text>
              </View>
              {transactions.length > 0 && (
                <Text style={s.txnHint}>{transactions.length} Transaktionen</Text>
              )}
            </View>

            {/* Tab Switcher */}
            {transactions.length > 0 && (
              <View style={s.tabs}>
                <TouchableOpacity
                  style={[s.tab, activeTab === 'holdings' && s.tabActive]}
                  onPress={() => setActiveTab('holdings')}
                >
                  <Ionicons name="briefcase-outline" size={13} color={activeTab === 'holdings' ? '#22C55E' : '#475569'} />
                  <Text style={[s.tabText, activeTab === 'holdings' && s.tabTextActive]}>Portfolio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tab, activeTab === 'activity' && s.tabActive]}
                  onPress={() => setActiveTab('activity')}
                >
                  <Ionicons name="swap-horizontal-outline" size={13} color={activeTab === 'activity' ? '#22C55E' : '#475569'} />
                  <Text style={[s.tabText, activeTab === 'activity' && s.tabTextActive]}>
                    Aktivität {transactions.length > 0 ? `(${transactions.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* HOLDINGS TAB */}
            {activeTab === 'holdings' && (
              <>
                <Text style={s.sectionLabel}>TOP HOLDINGS</Text>
                {visible.map((pos, index) => {
                  const color = COLORS[index % COLORS.length];
                  const weight = totalValue > 0 ? (pos.value / totalValue) * 100 : 0;
                  const ticker = pos.ticker;
                  return (
                    <TouchableOpacity
                      key={`${pos.cusip || pos.name}-${index}`}
                      style={s.row}
                      onPress={() => ticker ? router.push(`/stock/${ticker}`) : undefined}
                      activeOpacity={ticker ? 0.7 : 1}
                    >
                      {ticker ? (
                        <View style={s.logoWrap}>
                          <StockLogo ticker={ticker} size={44} borderRadius={10} />
                        </View>
                      ) : (
                        <View style={[s.badge, { backgroundColor: color + '20' }]}>
                          <Text style={[s.badgeText, { color }]} numberOfLines={1}>
                            {pos.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                          </Text>
                        </View>
                      )}
                      <View style={s.info}>
                        <View style={s.nameRow}>
                          {ticker && <Text style={s.ticker}>{ticker} </Text>}
                          <Text style={s.posName} numberOfLines={1}>{cleanName(pos.name)}</Text>
                        </View>
                        <Text style={s.shares}>{pos.shares.toLocaleString('de-DE')} Aktien</Text>
                      </View>
                      <View style={s.right}>
                        <Text style={s.value}>{formatValue(pos.value)}</Text>
                        <Text style={s.weight}>{weight.toFixed(1)}%</Text>
                        {ticker && <Ionicons name="chevron-forward" size={12} color="#334155" style={{ marginTop: 2 }} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {hasMore && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => setVisibleCount(c => c + PAGE_SIZE)} activeOpacity={0.7}>
                    <Text style={s.actionBtnText}>{positions.length - visibleCount} weitere Positionen</Text>
                    <Ionicons name="chevron-down" size={14} color="#22C55E" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ACTIVITY TAB */}
            {activeTab === 'activity' && (
              <>
                <Text style={s.sectionLabel}>TRANSAKTIONEN · {quarter}</Text>
                {transactions.map((txn, i) => {
                  const ticker = txn.ticker || (txn.cusip ? tickerFromCusip(txn.cusip) : null);
                  const isBuy = txn.type === 'Kauf' || txn.type === 'Neu';
                  const isNew = txn.type === 'Neu';
                  const isSold = txn.type === 'Verkauft';
                  const typeColor = isBuy ? '#22C55E' : '#EF4444';
                  return (
                    <TouchableOpacity
                      key={`${txn.cusip || txn.name}-${i}`}
                      style={s.row}
                      onPress={() => ticker ? router.push(`/stock/${ticker}`) : undefined}
                      activeOpacity={ticker ? 0.7 : 1}
                    >
                      {ticker ? (
                        <View style={s.logoWrap}>
                          <StockLogo ticker={ticker} size={44} borderRadius={10} />
                        </View>
                      ) : (
                        <View style={[s.badge, { backgroundColor: typeColor + '20' }]}>
                          <Text style={[s.badgeText, { color: typeColor }]} numberOfLines={1}>
                            {txn.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                          </Text>
                        </View>
                      )}
                      <View style={s.info}>
                        <View style={s.nameRow}>
                          {ticker && <Text style={s.ticker}>{ticker} </Text>}
                          <Text style={s.posName} numberOfLines={1}>{cleanName(txn.name)}</Text>
                        </View>
                        <Text style={[s.deltaShares, { color: isBuy ? '#22C55E' : '#EF4444' }]}>
                          {txn.deltaShares > 0 ? '+' : ''}{txn.deltaShares.toLocaleString('de-DE')} Aktien
                        </Text>
                      </View>
                      <View style={s.right}>
                        <Text style={s.value}>{formatValue(txn.value)}</Text>
                        <View style={[s.typeBadge, { backgroundColor: typeColor + '18' }]}>
                          <Text style={[s.typeText, { color: typeColor }]}>{txn.type}</Text>
                        </View>
                        {!isNew && !isSold && (
                          <Text style={[s.pctChange, { color: isBuy ? '#22C55E' : '#EF4444' }]}>
                            {txn.pctChange.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

function cleanName(name: string): string {
  return name.replace(/\b(INC\.?|CORP\.?|CO\.?|LTD\.?|LLC\.?|PLC\.?)$/i, '').trim();
}

function formatValue(val: number) {
  if (!val) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centerTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  centerText: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  summary: { flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B', gap: 8 },
  summaryItem: { flex: 1 },
  summaryLabel: { color: '#64748B', fontSize: 10, marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 },
  summaryValue: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', letterSpacing: -0.5 },
  summaryNum: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  quarterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  quarterBadge: { backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)' },
  quarterText: { color: '#22C55E', fontSize: 12, fontWeight: '700' },
  txnHint: { color: '#475569', fontSize: 11 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
  tabActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  tabText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#22C55E' },
  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  row: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: '#1E293B' },
  logoWrap: { marginRight: 12, flexShrink: 0 },
  badge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  badgeText: { fontWeight: '700', fontSize: 13 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  ticker: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
  posName: { color: '#94A3B8', fontSize: 12, flex: 1 },
  shares: { color: '#64748B', fontSize: 11, marginTop: 3 },
  deltaShares: { fontSize: 11, fontWeight: '600', marginTop: 3 },
  right: { alignItems: 'flex-end', minWidth: 64 },
  value: { color: '#F8FAFC', fontWeight: '600', fontSize: 13 },
  weight: { color: '#22C55E', fontSize: 11, fontWeight: '600', marginTop: 2 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  typeText: { fontSize: 11, fontWeight: '700' },
  pctChange: { fontSize: 10, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  actionBtnText: { color: '#22C55E', fontWeight: '600', fontSize: 14 },
});
