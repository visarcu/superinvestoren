import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import StockRow from '../../components/StockRow';

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

        // Quotes + Earnings parallel laden
        const [qRes, eRes] = await Promise.all([
          fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`),
          fetch(`${BASE_URL}/api/earnings-calendar?tickers=${symbols}`),
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotes(Array.isArray(qData) ? qData : []);
        }
        if (eRes.ok) {
          const eData = await eRes.json();
          setEarnings(Array.isArray(eData) ? eData.slice(0, 5) : []);
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
        <ActivityIndicator color="#34C759" style={{ marginTop: 32 }} />
      ) : error ? (
        <View style={s.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color="#FF3B30" />
          <Text style={s.emptyTitle}>Fehler</Text>
          <Text style={s.emptyText}>{error}</Text>
          <TouchableOpacity style={s.actionBtn} onPress={loadWatchlist}>
            <Text style={s.actionBtnText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Ionicons name="bookmark-outline" size={28} color="#475569" />
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
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWatchlist(); }} tintColor="#34C759" />
          }
          contentContainerStyle={s.scroll}
        >
          {/* Anstehende Earnings */}
          {earnings.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>ANSTEHENDE EARNINGS</Text>
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
                      activeOpacity={0.7}
                    >
                      <View style={s.earningsLeft}>
                        <View style={[s.earningsDot, { backgroundColor: isToday ? '#34C759' : isSoon ? '#F8FAFC' : '#475569' }]} />
                        <View>
                          <Text style={s.earningsTicker}>{ev.ticker}</Text>
                          <Text style={s.earningsQuarter}>{ev.quarter}</Text>
                        </View>
                      </View>
                      <View style={s.earningsRight}>
                        <Text style={[s.earningsDate, isSoon && { color: '#F8FAFC' }]}>
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
            <Text style={s.sectionTitle}>BEOBACHTETE AKTIEN</Text>
            {listData.map((item: any) => (
              <StockRow
                key={item.symbol || item.ticker}
                quote={item}
                onPress={() => router.push(`/stock/${item.symbol || item.ticker}`)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 2 },
  scroll: { paddingBottom: 24 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  earningsCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  earningsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  earningsRowBorder: { borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  earningsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  earningsDot: { width: 8, height: 8, borderRadius: 4 },
  earningsTicker: { color: '#F8FAFC', fontWeight: '700', fontSize: 14 },
  earningsQuarter: { color: '#64748B', fontSize: 11, marginTop: 2 },
  earningsRight: { alignItems: 'flex-end' },
  earningsDate: { color: '#F8FAFC', fontWeight: '600', fontSize: 13 },
  earningsTime: { color: '#64748B', fontSize: 11, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  actionBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  actionBtnText: { color: '#34C759', fontWeight: '600' },
});
