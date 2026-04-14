import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
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
  economic_event:  { name: 'globe',              color: '#06B6D4' },
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

function getSectionTitle(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 86400000);

  if (date >= startOfToday) return 'Heute';
  if (date >= startOfYesterday) return 'Gestern';
  if (date >= startOfWeek) return 'Diese Woche';
  return 'Älter';
}

export default function NotificationsCenterScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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
    if (markingAll) return;
    setMarkingAll(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ } finally {
      setMarkingAll(false);
    }
  }

  async function handleTap(n: Notification) {
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
    if (n.data?.screen === 'stock' && n.data?.ticker) {
      const tab = n.data.tab ? `?tab=${n.data.tab}` : '';
      router.push(`/stock/${n.data.ticker}${tab}`);
    } else if (n.data?.screen === 'investor' && n.data?.slug) {
      router.push(`/investor/${n.data.slug}`);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const sections = useMemo(() => {
    if (notifications.length === 0) return [];
    const grouped: Record<string, Notification[]> = {};
    const order = ['Heute', 'Gestern', 'Diese Woche', 'Älter'];
    for (const n of notifications) {
      const section = getSectionTitle(n.created_at);
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(n);
    }
    return order
      .filter(title => grouped[title]?.length)
      .map(title => ({ title, data: grouped[title] }));
  }, [notifications]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{
        title: 'Benachrichtigungen',
        headerStyle: { backgroundColor: '#0a0a0b' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: '',
        headerTitleStyle: { fontSize: 17, fontWeight: '700' },
        headerShadowVisible: false,
        headerRight: () => unreadCount > 0 ? (
          <TouchableOpacity
            onPress={markAllRead}
            disabled={markingAll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={s.headerAction}
          >
            <Ionicons name="checkmark-done" size={18} color={markingAll ? '#1E293B' : '#22C55E'} />
          </TouchableOpacity>
        ) : null,
      }} />

      {loading ? (
        <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 48 }} />
      ) : notifications.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={32} color="#475569" />
          </View>
          <Text style={s.emptyTitle}>Keine Benachrichtigungen</Text>
          <Text style={s.emptyText}>Hier erscheinen Analyst-Ratings, Earnings, Filings und mehr.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={n => n.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#22C55E"
            />
          }
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              {section.title === 'Heute' && unreadCount > 0 && (
                <View style={s.unreadBadge}>
                  <Text style={s.unreadBadgeText}>{unreadCount} neu</Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item: n, index, section }) => {
            const icon = TYPE_ICON[n.type] || TYPE_ICON.default;
            const isLast = index === section.data.length - 1;
            const hasNav = n.data?.screen === 'stock' || n.data?.screen === 'investor';
            return (
              <TouchableOpacity
                style={[s.row, !isLast && s.rowBorder, !n.read && s.rowUnread]}
                onPress={() => handleTap(n)}
                activeOpacity={0.6}
              >
                <View style={[s.iconWrap, { backgroundColor: icon.color + '15' }]}>
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                  {!n.read && <View style={s.unreadDot} />}
                </View>

                <View style={s.content}>
                  <View style={s.titleRow}>
                    <Text style={[s.title, !n.read && s.titleUnread]} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={s.time}>{timeAgo(n.created_at)}</Text>
                  </View>
                  <Text style={[s.message, !n.read && s.messageUnread]} numberOfLines={2}>
                    {n.message}
                  </Text>
                </View>

                {hasNav && (
                  <View style={s.chevronWrap}>
                    <Ionicons name="chevron-forward" size={16} color="#334155" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },

  headerAction: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  sectionTitle: {
    color: '#64748B', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  unreadBadge: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  unreadBadgeText: { color: '#22C55E', fontSize: 11, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0a0a0b', gap: 12,
    marginHorizontal: 0,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1E293B' },
  rowUnread: { backgroundColor: '#0c1018' },

  iconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute', top: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 2, borderColor: '#0a0a0b',
  },

  content: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  title: { color: '#94A3B8', fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },
  titleUnread: { color: '#F8FAFC', fontWeight: '700' },
  message: { color: '#475569', fontSize: 13, lineHeight: 18 },
  messageUnread: { color: '#64748B' },
  time: { color: '#475569', fontSize: 12, flexShrink: 0 },

  chevronWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#111113',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#111113', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
