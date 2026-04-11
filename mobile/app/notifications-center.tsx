import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/auth';

const BASE_URL = 'https://finclue.de';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  href?: string;
  data?: { screen?: string; ticker?: string; slug?: string; tab?: string };
}

const TYPE_ICON: Record<string, { name: any; color: string }> = {
  analyst_rating:  { name: 'trending-up',       color: '#3B82F6' },
  filing_alert:    { name: 'document-text',      color: '#8B5CF6' },
  earnings_alert:  { name: 'bar-chart',          color: '#F59E0B' },
  dividend_alert:  { name: 'cash',               color: '#22C55E' },
  price_alert:     { name: 'flash',              color: '#EF4444' },
  portfolio_mover: { name: 'pulse',              color: '#F97316' },
  default:         { name: 'notifications',      color: '#64748B' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Gestern';
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function NotificationsCenterScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BASE_URL}/api/notifications?limit=50`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAllRead() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  }

  async function handleTap(n: Notification) {
    // Mark as read
    if (!n.read) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${BASE_URL}/api/notifications/${n.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        });
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      }
    }
    // Navigate
    if (n.data?.screen === 'stock' && n.data?.ticker) {
      const tab = n.data.tab ? `?tab=${n.data.tab}` : '';
      router.push(`/stock/${n.data.ticker}${tab}`);
    } else if (n.data?.screen === 'investor' && n.data?.slug) {
      router.push(`/investor/${n.data.slug}`);
    } else if (n.href) {
      // fallback: ignore web-only hrefs
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{
        title: 'Benachrichtigungen',
        headerStyle: { backgroundColor: '#111113' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: '',
        headerRight: () => unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.markAllText}>Alle gelesen</Text>
          </TouchableOpacity>
        ) : null,
      }} />

      {loading ? (
        <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#22C55E" />}
          contentContainerStyle={notifications.length === 0 ? s.emptyContainer : undefined}
        >
          {notifications.length > 0 && unreadCount > 0 && (
            <TouchableOpacity style={s.markAllBar} onPress={markAllRead} activeOpacity={0.7}>
              <Ionicons name="checkmark-done" size={15} color="#22C55E" />
              <Text style={s.markAllBarText}>Alle als gelesen markieren</Text>
            </TouchableOpacity>
          )}
          {notifications.length === 0 ? (
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={32} color="#475569" />
              </View>
              <Text style={s.emptyTitle}>Keine Benachrichtigungen</Text>
              <Text style={s.emptyText}>Hier erscheinen Analyst-Ratings, Earnings, Filings und mehr.</Text>
            </View>
          ) : (
            notifications.map((n, i) => {
              const icon = TYPE_ICON[n.type] || TYPE_ICON.default;
              const isLast = i === notifications.length - 1;
              return (
                <TouchableOpacity
                  key={n.id}
                  style={[s.row, !isLast && s.rowBorder, !n.read && s.rowUnread]}
                  onPress={() => handleTap(n)}
                  activeOpacity={0.7}
                >
                  {/* Unread dot */}
                  {!n.read && <View style={s.unreadDot} />}

                  {/* Icon */}
                  <View style={[s.iconWrap, { backgroundColor: icon.color + '18' }]}>
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>

                  {/* Content */}
                  <View style={s.content}>
                    <Text style={[s.title, !n.read && s.titleUnread]} numberOfLines={1}>{n.title}</Text>
                    <Text style={s.message} numberOfLines={2}>{n.message}</Text>
                    <Text style={s.time}>{timeAgo(n.created_at)}</Text>
                  </View>

                  {(n.data?.screen === 'stock' || n.data?.screen === 'investor') && (
                    <Ionicons name="chevron-forward" size={14} color="#334155" />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  markAllText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0a0a0b', gap: 12, position: 'relative',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#111113' },
  rowUnread: { backgroundColor: '#0d1117' },

  unreadDot: {
    position: 'absolute', left: 4, top: '50%',
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E',
    marginTop: -3,
  },

  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  content: { flex: 1, minWidth: 0 },
  title: { color: '#94A3B8', fontSize: 13, fontWeight: '500', marginBottom: 2 },
  titleUnread: { color: '#F8FAFC', fontWeight: '700' },
  message: { color: '#64748B', fontSize: 12, lineHeight: 17, marginBottom: 4 },
  time: { color: '#334155', fontSize: 11 },

  emptyContainer: { flex: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#111113', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  markAllBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#111113',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  markAllBarText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },
});
