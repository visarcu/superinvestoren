import { useEffect, useState, useMemo } from 'react';
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
  analyst_rating:  { name: 'trending-up',       color: '#34C759' },
  filing_alert:    { name: 'document-text',      color: '#8E8E93' },
  earnings_alert:  { name: 'bar-chart',          color: '#8E8E93' },
  dividend_alert:  { name: 'cash',               color: '#34C759' },
  price_alert:     { name: 'flash',              color: '#FF3B30' },
  portfolio_mover: { name: 'pulse',              color: '#8E8E93' },
  economic_event:  { name: 'globe',              color: '#8E8E93' },
  default:         { name: 'notifications',      color: '#8E8E93' },
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
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        {/* Custom Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.headerBtn}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>Benachrichtigungen</Text>
            {unreadCount > 0 && (
              <Text style={s.headerSubtitle}>{unreadCount} ungelesen</Text>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={markAllRead}
              disabled={markingAll}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={s.headerBtn}
            >
              <Ionicons name="checkmark-done" size={22} color={markingAll ? '#48484A' : '#34C759'} />
            </TouchableOpacity>
          ) : (
            <View style={s.headerBtn} />
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#34C759" size="large" style={{ marginTop: 48 }} />
        ) : notifications.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={32} color="#48484A" />
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
                tintColor="#34C759"
              />
            }
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{section.title}</Text>
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
                  <View style={[s.iconWrap, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={18} color={icon.color} />
                  </View>

                  <View style={s.content}>
                    <View style={s.titleRow}>
                      <Text
                        style={[s.title, !n.read && s.titleUnread]}
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                      {!n.read && <View style={s.unreadDot} />}
                    </View>
                    <Text style={[s.message, !n.read && s.messageUnread]} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={s.time}>{timeAgo(n.created_at)}</Text>
                  </View>

                  {hasNav && (
                    <Ionicons name="chevron-forward" size={16} color="#3A3A3C" />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  // Custom Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1C1C1E',
  },
  headerBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: '#8E8E93', fontSize: 12, marginTop: 1 },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6,
  },
  sectionTitle: {
    color: '#8E8E93', fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1C1C1E' },
  rowUnread: { backgroundColor: '#0A0A0A' },

  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  content: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { color: '#8E8E93', fontSize: 15, fontWeight: '500', flex: 1 },
  titleUnread: { color: '#FFFFFF', fontWeight: '600' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759',
  },
  message: { color: '#48484A', fontSize: 14, lineHeight: 19 },
  messageUnread: { color: '#8E8E93' },
  time: { color: '#48484A', fontSize: 12, marginTop: 6 },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#8E8E93', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
