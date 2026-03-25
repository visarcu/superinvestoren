import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';

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
  optionType?: string;
}

const INVESTOR_NAMES: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  burry: 'Michael Burry',
  tepper: 'David Tepper',
  dalio: 'Ray Dalio',
  soros: 'George Soros',
  icahn: 'Carl Icahn',
  coleman: 'Chase Coleman',
  druckenmiller: 'Stanley Druckenmiller',
  einhorn: 'David Einhorn',
  klarman: 'Seth Klarman',
  marks: 'Howard Marks',
  greenblatt: 'Joel Greenblatt',
  pabrai: 'Mohnish Pabrai',
};

export default function InvestorDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [positions, setPositions] = useState<Position[]>([]);
  const [quarter, setQuarter] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => { loadHoldings(); }, [slug]);

  async function loadHoldings() {
    try {
      setError(null);
      setVisibleCount(PAGE_SIZE);

      const qRes = await fetch(`${BASE_URL}/api/investor/${slug}/quarters`);
      if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
      const qData = await qRes.json();
      const quarters: string[] = qData.quarters || [];
      if (!quarters.length) { setPositions([]); setLoading(false); return; }

      const latestQ = quarters[quarters.length - 1];
      setQuarter(latestQ);

      const hRes = await fetch(`${BASE_URL}/api/investor/${slug}/holdings?quarter=${latestQ}`);
      if (!hRes.ok) throw new Error(`HTTP ${hRes.status}`);
      const hData = await hRes.json();

      // Deduplizieren nach CUSIP (gleiche Aktie, verschiedene optionTypes summieren)
      const merged = new Map<string, Position>();
      for (const pos of (hData.positions || [])) {
        const key = pos.cusip || pos.name;
        if (merged.has(key)) {
          const ex = merged.get(key)!;
          ex.shares += pos.shares || 0;
          ex.value += pos.value || 0;
        } else {
          merged.set(key, {
            name: pos.name,
            cusip: pos.cusip,
            ticker: pos.ticker || null,
            shares: pos.shares || 0,
            value: pos.value || 0,
            deltaShares: pos.deltaShares,
            pctDelta: pos.pctDelta,
            optionType: pos.optionType,
          });
        }
      }

      const deduped = Array.from(merged.values()).sort((a, b) => b.value - a.value);
      setTotalValue(deduped.reduce((sum, p) => sum + p.value, 0));
      setPositions(deduped);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  const displayName = INVESTOR_NAMES[slug || ''] || (slug || '');
  const visible = positions.slice(0, visibleCount);
  const hasMore = visibleCount < positions.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerBackTitle: 'Investoren',
        }}
      />

      <SafeAreaView style={s.container} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={s.centerTitle}>Fehler beim Laden</Text>
            <Text style={s.centerText}>{error}</Text>
            <TouchableOpacity style={s.actionBtn} onPress={loadHoldings}>
              <Text style={s.actionBtnText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        ) : positions.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="briefcase-outline" size={40} color="#475569" />
            <Text style={s.centerTitle}>Keine Daten verfügbar</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list}>
            {/* Summary Card */}
            <View style={s.summary}>
              <View>
                <Text style={s.summaryLabel}>Portfolio-Wert</Text>
                <Text style={s.summaryValue}>{formatValue(totalValue)}</Text>
              </View>
              <View style={s.summaryRight}>
                <Text style={s.summaryLabel}>Quartal</Text>
                <Text style={s.summaryQuarter}>{quarter}</Text>
                <Text style={s.summaryCount}>{positions.length} Positionen</Text>
              </View>
            </View>

            <Text style={s.sectionLabel}>TOP HOLDINGS</Text>

            {visible.map((pos, index) => {
              const color = COLORS[index % COLORS.length];
              const weight = totalValue > 0 ? (pos.value / totalValue) * 100 : 0;
              const hasTicker = !!pos.ticker;
              const deltaShares = pos.deltaShares ?? 0;
              const isNew = pos.pctDelta === null || pos.pctDelta === undefined ? false : pos.pctDelta >= 999;
              const isSold = pos.value === 0;

              return (
                <TouchableOpacity
                  key={`${pos.cusip || pos.name}-${index}`}
                  style={s.row}
                  onPress={() => hasTicker ? router.push(`/stock/${pos.ticker}`) : undefined}
                  activeOpacity={hasTicker ? 0.7 : 1}
                >
                  {/* Logo oder Initialen */}
                  {hasTicker ? (
                    <View style={s.logoWrap}>
                      <StockLogo ticker={pos.ticker!} size={44} borderRadius={10} />
                    </View>
                  ) : (
                    <View style={[s.badge, { backgroundColor: color + '20' }]}>
                      <Text style={[s.badgeText, { color }]} numberOfLines={1}>
                        {pos.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                      </Text>
                    </View>
                  )}

                  {/* Name + Ticker + Shares */}
                  <View style={s.info}>
                    <View style={s.nameRow}>
                      {hasTicker && (
                        <Text style={s.ticker}>{pos.ticker} </Text>
                      )}
                      <Text style={s.posName} numberOfLines={1}>
                        {cleanName(pos.name, pos.ticker)}
                      </Text>
                    </View>
                    <Text style={s.shares}>{pos.shares.toLocaleString('de-DE')} Aktien</Text>
                    {/* Veränderung zur Vorperiode */}
                    {deltaShares !== 0 && (
                      <View style={s.deltaRow}>
                        <Ionicons
                          name={deltaShares > 0 ? 'trending-up' : 'trending-down'}
                          size={11}
                          color={deltaShares > 0 ? '#22C55E' : '#EF4444'}
                        />
                        <Text style={[s.deltaText, { color: deltaShares > 0 ? '#22C55E' : '#EF4444' }]}>
                          {deltaShares > 0 ? '+' : ''}{deltaShares.toLocaleString('de-DE')}
                          {isNew ? ' NEU' : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Wert + Gewichtung */}
                  <View style={s.right}>
                    <Text style={s.value}>{formatValue(pos.value)}</Text>
                    <Text style={s.weight}>{weight.toFixed(1)}%</Text>
                    {hasTicker && (
                      <Ionicons name="chevron-forward" size={12} color="#475569" style={{ marginTop: 2 }} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasMore && (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => setVisibleCount(c => c + PAGE_SIZE)}
                activeOpacity={0.7}
              >
                <Text style={s.actionBtnText}>
                  {positions.length - visibleCount} weitere Positionen
                </Text>
                <Ionicons name="chevron-down" size={14} color="#22C55E" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

function cleanName(name: string, ticker?: string | null): string {
  if (!name) return '';
  // Entferne "INC", "CORP", "CO", "LTD" am Ende für kompaktere Anzeige
  return name
    .replace(/\b(INC\.?|CORP\.?|CO\.?|LTD\.?|LLC\.?|PLC\.?)$/i, '')
    .trim();
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
  summary: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  summaryLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  summaryValue: { color: '#F8FAFC', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  summaryRight: { alignItems: 'flex-end' },
  summaryQuarter: { color: '#22C55E', fontSize: 14, fontWeight: '600' },
  summaryCount: { color: '#475569', fontSize: 11, marginTop: 2 },
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
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  deltaText: { fontSize: 10, fontWeight: '600' },
  right: { alignItems: 'flex-end', minWidth: 58 },
  value: { color: '#F8FAFC', fontWeight: '600', fontSize: 13 },
  weight: { color: '#22C55E', fontSize: 11, fontWeight: '600', marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  actionBtnText: { color: '#22C55E', fontWeight: '600', fontSize: 14 },
});
