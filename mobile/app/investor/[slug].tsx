import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://finclue.de';

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

interface Position {
  name: string;
  cusip?: string;
  shares: number;
  value: number;
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

  useEffect(() => {
    loadHoldings();
  }, [slug]);

  async function loadHoldings() {
    try {
      setError(null);

      // Step 1: get available quarters
      const qRes = await fetch(`${BASE_URL}/api/investor/${slug}/quarters`);
      if (!qRes.ok) throw new Error(`HTTP ${qRes.status}`);
      const qData = await qRes.json();
      const quarters: string[] = qData.quarters || [];
      if (!quarters.length) {
        setPositions([]);
        setLoading(false);
        return;
      }

      // Step 2: load latest quarter's holdings
      const latestQ = quarters[quarters.length - 1];
      setQuarter(latestQ);

      const hRes = await fetch(`${BASE_URL}/api/investor/${slug}/holdings?quarter=${latestQ}`);
      if (!hRes.ok) throw new Error(`HTTP ${hRes.status}`);
      const hData = await hRes.json();

      const posArr: Position[] = hData.positions || [];

      // Sort by value descending
      posArr.sort((a, b) => (b.value || 0) - (a.value || 0));

      const tv = posArr.reduce((sum, p) => sum + (p.value || 0), 0);
      setTotalValue(tv);
      setPositions(posArr);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  const displayName = INVESTOR_NAMES[slug || ''] || (slug || '');

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
            <Text style={s.errorTitle}>Fehler beim Laden</Text>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={loadHoldings}>
              <Text style={s.retryText}>Erneut versuchen</Text>
            </TouchableOpacity>
          </View>
        ) : positions.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="briefcase-outline" size={40} color="#475569" />
            <Text style={s.errorTitle}>Keine Daten verfügbar</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list}>
            {/* Summary */}
            <View style={s.summary}>
              <View>
                <Text style={s.summaryLabel}>Portfolio-Wert</Text>
                <Text style={s.summaryValue}>{formatValue(totalValue)}</Text>
              </View>
              <View style={s.summaryRight}>
                <Text style={s.summaryLabel}>Quartal</Text>
                <Text style={s.summaryQuarter}>{quarter}</Text>
              </View>
            </View>

            <Text style={s.countLabel}>{positions.length} POSITIONEN</Text>

            {positions.map((pos, index) => {
              const color = COLORS[index % COLORS.length];
              const weight = totalValue > 0 ? (pos.value / totalValue) * 100 : 0;
              const initials = pos.name.split(' ').map(w => w[0]).slice(0, 2).join('');
              return (
                <View key={pos.cusip || index} style={s.row}>
                  <View style={[s.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.badgeText, { color }]} numberOfLines={1}>{initials}</Text>
                  </View>
                  <View style={s.info}>
                    <Text style={s.name} numberOfLines={2}>{pos.name}</Text>
                    <Text style={s.shares}>{pos.shares.toLocaleString('de-DE')} Aktien</Text>
                  </View>
                  <View style={s.right}>
                    <Text style={s.value}>{formatValue(pos.value)}</Text>
                    <Text style={s.weight}>{weight.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
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
  errorTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  errorText: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  retryText: { color: '#22C55E', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  summary: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  summaryLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  summaryValue: { color: '#F8FAFC', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  summaryRight: { alignItems: 'flex-end' },
  summaryQuarter: { color: '#22C55E', fontSize: 14, fontWeight: '600' },
  countLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  row: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: '#1E293B' },
  badge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  badgeText: { fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { color: '#F8FAFC', fontWeight: '600', fontSize: 13, lineHeight: 18 },
  shares: { color: '#64748B', fontSize: 11, marginTop: 3 },
  right: { alignItems: 'flex-end', minWidth: 60 },
  value: { color: '#F8FAFC', fontWeight: '600', fontSize: 13 },
  weight: { color: '#22C55E', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
