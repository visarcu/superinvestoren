import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import StockRow from '../../components/StockRow';
import { theme, tabularStyle } from '../../lib/theme';

const BASE_URL = 'https://finclue.de';

interface EarningsEvent {
  ticker: string;
  date: string;
  time: string;
  quarter: string;
  estimatedEPS: number | null;
}

function formatEarningsDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

function formatTime(time: string): string {
  if (!time || time === 'TBD') return '';
  if (time === 'bmo') return 'vor Börseneröffnung';
  if (time === 'amc') return 'nach Börsenschluss';
  return time;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function WatchlistScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadWatchlist(); }, []));

  async function loadWatchlist() {
    try {
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }

      const { data, error: dbErr } = await supabase
        .from('watchlists')
        .select('id, ticker, created_at')
        .eq('user_id', sessionData.session.user.id)
        .order('created_at', { ascending: false });

      if (dbErr) throw dbErr;
      const watchlistItems = data || [];
      setItems(watchlistItems);

      if (watchlistItems.length > 0) {
        const symbols = watchlistItems.map((i: any) => i.ticker).join(',');

        // Quotes + Earnings parallel laden.
        // Earnings: /api/v1/calendar/earnings (SEC 8-K + NASDAQ Public Calendar,
        // keine FMP-Dependency). Response-Shape: { dates: [{ date, events: [...] }] }.
        const [qRes, eRes] = await Promise.all([
          fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`),
          fetch(`${BASE_URL}/api/v1/calendar/earnings?tickers=${symbols}&days=90`),
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotes(Array.isArray(qData) ? qData : []);
        }
        if (eRes.ok) {
          const eData = await eRes.json();
          const flat: EarningsEvent[] = [];
          for (const day of eData.dates || []) {
            for (const ev of day.events || []) {
              flat.push({
                ticker: ev.ticker,
                date: day.date,
                time: ev.time || 'TBD',
                quarter: ev.fiscalQuarter && ev.fiscalYear
                  ? `Q${ev.fiscalQuarter} ${ev.fiscalYear}`
                  : '',
                estimatedEPS: ev.epsEstimate ?? null,
              });
            }
          }
          setEarnings(flat.slice(0, 5));
        }
      }
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const listData = quotes.length > 0 ? quotes : items.map((i: any) => ({ symbol: i.ticker }));

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Watchlist</Text>
        <Text style={s.subtitle}>{items.length} Aktien beobachtet</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.text.tertiary} style={{ marginTop: 32 }} />
      ) : error ? (
        <View style={s.emptyState}>
          <Ionicons name="alert-circle-outline" size={36} color={theme.accent.negative} />
          <Text style={s.emptyTitle}>Fehler</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity style={s.actionBtn} onPress={loadWatchlist}>
            <Text style={s.actionBtnText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="bookmark-outline" size={22} color={theme.text.tertiary} />
          </View>
          <Text style={s.emptyTitle}>Watchlist ist leer</Text>
          <Text style={s.emptyText}>Füge Aktien zu deiner Watchlist hinzu um sie hier zu sehen.</Text>
          <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/')}>
            <Text style={s.actionBtnText}>Aktien entdecken</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWatchlist(); }} tintColor={theme.text.tertiary} />
          }
          contentContainerStyle={s.scroll}
        >
          {/* Anstehende Earnings */}
          {earnings.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Anstehende Earnings</Text>
              <View style={s.earningsCard}>
                {earnings.map((ev, i) => {
                  const days = daysUntil(ev.date);
                  const isToday = days === 0;
                  const isSoon = days <= 7;
                  return (
                    <TouchableOpacity
                      key={`${ev.ticker}-${ev.date}`}
                      style={[s.earningsRow, i > 0 && s.earningsRowBorder]}
                      onPress={() => router.push(`/stock/${ev.ticker}`)}
                      activeOpacity={0.6}
                    >
                      <View style={s.earningsLeft}>
                        <View style={[s.earningsDot, { backgroundColor: isToday ? theme.accent.positive : isSoon ? theme.text.primary : theme.text.muted }]} />
                        <View>
                          <Text style={s.earningsTicker}>{ev.ticker}</Text>
                          <Text style={s.earningsQuarter}>{ev.quarter}</Text>
                        </View>
                      </View>
                      <View style={s.earningsRight}>
                        <Text style={[s.earningsDate, isSoon && { color: theme.text.primary }]}>
                          {isToday ? 'Heute' : formatEarningsDate(ev.date)}
                        </Text>
                        {formatTime(ev.time) ? (
                          <Text style={s.earningsTime}>{formatTime(ev.time)}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Aktien-Liste */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Beobachtete Aktien</Text>
            <View style={s.listCard}>
              {listData.map((item: any, idx: number) => (
                <View key={item.symbol || item.ticker} style={[idx < listData.length - 1 && s.itemBorder]}>
                  <StockRow
                    quote={item}
                    onPress={() => router.push(`/stock/${item.symbol || item.ticker}`)}
                  />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.md, paddingBottom: theme.space.md },
  title: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2, ...tabularStyle },
  scroll: { paddingBottom: 32 },
  section: { paddingHorizontal: theme.space.lg, marginBottom: theme.space.lg },
  sectionTitle: {
    color: theme.text.tertiary,
    fontSize: theme.font.caption,
    fontWeight: theme.weight.semibold,
    letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
    marginBottom: theme.space.sm,
  },
  earningsCard: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' },
  earningsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2 },
  earningsRowBorder: { borderTopWidth: 1, borderTopColor: theme.border.default },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  earningsDot: { width: 6, height: 6, borderRadius: 3 },
  earningsTicker: { color: theme.text.primary, fontWeight: theme.weight.semibold, fontSize: theme.font.title3, letterSpacing: theme.tracking.normal },
  earningsQuarter: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  earningsRight: { alignItems: 'flex-end' },
  earningsDate: { color: theme.text.secondary, fontWeight: theme.weight.semibold, fontSize: theme.font.body, ...tabularStyle },
  earningsTime: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  listCard: { backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border.default },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, gap: theme.space.md },
  emptyIcon: {
    width: 48, height: 48, borderRadius: theme.radius.lg,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  actionBtn: {
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md, paddingHorizontal: theme.space.xxl, paddingVertical: theme.space.md,
    marginTop: theme.space.sm,
  },
  actionBtnText: { color: theme.text.inverse, fontWeight: theme.weight.semibold, fontSize: theme.font.title3 },
});
