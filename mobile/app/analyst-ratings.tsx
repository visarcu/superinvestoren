import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BASE_URL = 'https://finclue.de';

interface Grading {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  newsPublisher: string;
  newGrade: string;
  previousGrade: string;
  gradingCompany: string;
  action: string;
  priceWhenPosted: number;
}

type FilterAction = 'all' | 'upgrade' | 'downgrade' | 'initiated' | 'reiterated';

const ACTION_COLORS: Record<string, string> = {
  upgrade: '#34C759',
  downgrade: '#FF3B30',
  initiated: '#3B82F6',
  reiterated: '#F59E0B',
  maintained: '#64748B',
};

const FILTERS: { key: FilterAction; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'upgrade', label: 'Upgrades' },
  { key: 'downgrade', label: 'Downgrades' },
  { key: 'initiated', label: 'Initiated' },
  { key: 'reiterated', label: 'Reiterated' },
];

function getColor(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] || '#64748B';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Gerade eben';
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Gestern';
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function AnalystRatingsScreen() {
  const [gradings, setGradings] = useState<Grading[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterAction>('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/analyst-gradings/recent?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setGradings(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = gradings.filter(g => {
    if (filter === 'all') return true;
    return g.action?.toLowerCase() === filter;
  });

  const stats = {
    upgrade: gradings.filter(g => g.action?.toLowerCase() === 'upgrade').length,
    downgrade: gradings.filter(g => g.action?.toLowerCase() === 'downgrade').length,
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{
        title: 'Analyst Ratings',
        headerStyle: { backgroundColor: '#1C1C1E' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: '',
      }} />

      {loading ? (
        <ActivityIndicator color="#34C759" size="large" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#34C759" />
          }
        >
          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Upgrades</Text>
              <Text style={[s.statValue, { color: '#34C759' }]}>{stats.upgrade}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Downgrades</Text>
              <Text style={[s.statValue, { color: '#FF3B30' }]}>{stats.downgrade}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statLabel}>Gesamt</Text>
              <Text style={s.statValue}>{gradings.length}</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[s.filterPill, filter === f.key && s.filterPillActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Ratings List */}
          {filtered.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="analytics-outline" size={32} color="#475569" />
              <Text style={s.emptyText}>Keine Ratings gefunden</Text>
            </View>
          ) : (
            filtered.map((g, i) => {
              const color = getColor(g.action);
              const hasGradeChange = g.previousGrade && g.newGrade && g.previousGrade !== g.newGrade;
              const hasNews = !!g.newsURL;

              return (
                <TouchableOpacity
                  key={`${g.symbol}-${g.publishedDate}-${i}`}
                  style={[s.row, i > 0 && s.rowBorder]}
                  onPress={() => {
                    if (hasNews) {
                      router.push(`/news-article?url=${encodeURIComponent(g.newsURL)}&title=${encodeURIComponent(g.newsTitle || g.gradingCompany)}`);
                    } else {
                      router.push(`/stock/${g.symbol}?tab=estimates`);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {/* Action Badge */}
                  <View style={[s.actionBadge, { backgroundColor: color + '20' }]}>
                    <Ionicons
                      name={g.action?.toLowerCase() === 'upgrade' ? 'trending-up' :
                            g.action?.toLowerCase() === 'downgrade' ? 'trending-down' :
                            g.action?.toLowerCase() === 'initiated' ? 'add-circle' : 'refresh'}
                      size={16}
                      color={color}
                    />
                  </View>

                  {/* Content */}
                  <View style={s.content}>
                    <View style={s.topRow}>
                      <Text style={s.symbol}>{g.symbol}</Text>
                      <Text style={[s.actionLabel, { color }]}>{g.action}</Text>
                      <Text style={s.time}>{timeAgo(g.publishedDate)}</Text>
                    </View>

                    <Text style={s.company}>{g.gradingCompany}</Text>

                    {hasGradeChange && (
                      <View style={s.gradeRow}>
                        <Text style={s.gradePrev}>{g.previousGrade}</Text>
                        <Ionicons name="arrow-forward" size={10} color="#475569" />
                        <Text style={s.gradeNew}>{g.newGrade}</Text>
                      </View>
                    )}

                    {g.newsTitle ? (
                      <View style={s.newsRow}>
                        <Ionicons name="newspaper-outline" size={12} color="#3B82F6" />
                        <Text style={s.newsTitle} numberOfLines={2}>{g.newsTitle}</Text>
                      </View>
                    ) : null}

                    {g.priceWhenPosted ? (
                      <Text style={s.price}>Kurs: ${g.priceWhenPosted.toFixed(2)}</Text>
                    ) : null}
                  </View>

                  <Ionicons name="chevron-forward" size={14} color="#334155" />
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#1C1C1E', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  statLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },

  filterScroll: { marginTop: 16 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E',
  },
  filterPillActive: { backgroundColor: '#34C75920', borderColor: '#34C759' },
  filterText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#34C759' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#1C1C1E' },

  actionBadge: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  content: { flex: 1, minWidth: 0 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  symbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  time: { color: '#475569', fontSize: 11, marginLeft: 'auto' },

  company: { color: '#94A3B8', fontSize: 13, marginTop: 2 },

  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  gradePrev: { color: '#64748B', fontSize: 12, textDecorationLine: 'line-through' },
  gradeNew: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },

  newsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  newsTitle: { color: '#3B82F6', fontSize: 12, lineHeight: 16, flex: 1 },

  price: { color: '#475569', fontSize: 11, marginTop: 4 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: '#475569', fontSize: 14 },
});
