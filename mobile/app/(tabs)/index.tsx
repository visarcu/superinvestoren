import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, ActivityIndicator, StyleSheet, Image,
  Modal, Animated, Pressable, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchStocks } from '../../lib/api';
import { supabase } from '../../lib/auth';
import StockRow from '../../components/StockRow';
import StockLogo from '../../components/StockLogo';
import { INVESTOR_PHOTOS } from '../../lib/investorPhotos';

const BASE = 'https://finclue.de';
const MARKET_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM'];
const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META'];
const MARKET_NAMES: Record<string, string> = {
  SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000',
};

interface Sector { sector: string; sectorDE: string; change: number; changeFormatted: string; }
interface GuruTrade {
  investor: string; investorName: string;
  type: 'NEW' | 'ADD' | 'REDUCE' | 'SOLD';
  ticker: string; name: string;
  dollarChangeFormatted: string;
  percentChangeFormatted: string | null;
  quarterKey: string;
}

const TRADE_LABEL: Record<string, string> = { NEW: 'Neu', ADD: 'Aufgestockt', REDUCE: 'Reduziert', SOLD: 'Verkauft' };

const TRADE_COLOR: Record<string, string> = { NEW: '#34C759', ADD: '#34C759', REDUCE: '#FF3B30', SOLD: '#FF3B30' };

const INVESTOR_NAMES: Record<string, string> = {
  buffett: 'Warren Buffett', ackman: 'Bill Ackman', gates: 'Bill Gates Foundation',
  burry: 'Michael Burry', klarman: 'Seth Klarman', akre: 'Chuck Akre',
  greenblatt: 'Joel Greenblatt', fisher: 'Ken Fisher', soros: 'George Soros',
  gayner: 'Thomas Gayner', tangen: 'Nicolai Tangen', pabrai: 'Mohnish Pabrai',
  peltz: 'Nelson Peltz', miller: 'Bill Miller', davis: 'Christopher Davis',
  marks: 'Howard Marks', chou: 'Francis Chou', duan: 'Li Lu',
  viking: 'Viking Global', dalio: 'Ray Dalio', icahn: 'Carl Icahn',
  druckenmiller: 'Stanley Druckenmiller', tepper: 'David Tepper',
  einhorn: 'David Einhorn', loeb: 'Daniel Loeb', dodgecox: 'Dodge & Cox',
  russo: 'Thomas Russo', rochon: 'Francois Rochon', coleman: 'Chase Coleman',
};

function formatBigValue(v: number): string {
  if (!v) return '–';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd. $`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio. $`;
  return `${(v / 1000).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K $`;
}

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

const MEHR_ITEMS = [
  { label: 'Watchlist', icon: 'bookmark-outline' as const, route: '/(tabs)/watchlist' },
  { label: 'Screener', icon: 'funnel-outline' as const, route: '/(tabs)/screener' },
  { label: 'Finclue AI', icon: 'sparkles-outline' as const, route: '/(tabs)/ai' },
  { label: 'Dividenden-Kalender', icon: 'calendar-outline' as const, route: '/(tabs)/calendar' },
  { label: 'Profil & Einstellungen', icon: 'person-outline' as const, route: '/(tabs)/profile' },
];

function SideDrawer({ visible, onClose, userName }: { visible: boolean; onClose: () => void; userName: string }) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -DRAWER_W,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, [visible]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => router.push(route as any), 180);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={d.backdrop} onPress={onClose} />
      <Animated.View style={[d.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* User Header — manual top padding for status bar */}
        <View style={d.userRow}>
          <View style={d.avatar}>
            <Text style={d.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={d.userName}>{userName}</Text>
            <Text style={d.userSub}>Finclue</Text>
          </View>
        </View>

        <View style={d.divider} />

        {/* Nav Items */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {MEHR_ITEMS.map((item) => (
            <TouchableOpacity key={item.route} style={d.item} onPress={() => navigate(item.route)} activeOpacity={0.7}>
              <View style={d.iconBox}>
                <Ionicons name={item.icon} size={20} color={theme.text.tertiary} />
              </View>
              <Text style={d.itemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.text.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [popularQuotes, setPopularQuotes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [guruTrades, setGuruTrades] = useState<GuruTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [marketSummary, setMarketSummary] = useState<{ summary: string; isBullish: boolean } | null>(null);
  const [politicianTrades, setPoliticianTrades] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split('@')[0] || 'Investor');
    });
    loadAll();
    loadUnreadCount();
  }, []);

  async function loadUnreadCount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${BASE}/api/notifications?unread=true&limit=50`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setUnreadCount((json.notifications || []).length);
    } catch { /* ignore */ }
  }

  async function loadAll() {
    try {
      const [quotesRes, popularRes, sectorRes, guruRes, polRes] = await Promise.allSettled([
        fetch(`${BASE}/api/quotes?symbols=${MARKET_SYMBOLS.join(',')}`),
        fetch(`${BASE}/api/quotes?symbols=${POPULAR_SYMBOLS.join(',')}`),
        fetch(`${BASE}/api/sector-performance`),
        fetch(`${BASE}/api/guru-trades`),
        fetch(`${BASE}/api/politicians/top-buys?limit=5`),
      ]);

      if (quotesRes.status === 'fulfilled' && quotesRes.value.ok) {
        const d = await quotesRes.value.json();
        setQuotes(Array.isArray(d) ? d : []);
      }
      if (popularRes.status === 'fulfilled' && popularRes.value.ok) {
        const d = await popularRes.value.json();
        setPopularQuotes(Array.isArray(d) ? d : []);
      }
      if (sectorRes.status === 'fulfilled' && sectorRes.value.ok) {
        const d = await sectorRes.value.json();
        setSectors(d.sectors || []);
      }
      if (guruRes.status === 'fulfilled' && guruRes.value.ok) {
        const d = await guruRes.value.json();
        if (d.trades?.length) {
          setGuruTrades(d.trades.slice(0, 5));
        }
      }
      if (polRes.status === 'fulfilled' && polRes.value.ok) {
        const d = await polRes.value.json();
        if (d.topBuys?.length) {
          setPoliticianTrades(d.topBuys.slice(0, 5));
        }
      }
      // Load market summary after we have quotes + sectors
      loadMarketSummary(quotesRes, sectorRes);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function loadMarketSummary(quotesRes: PromiseSettledResult<Response>, sectorRes: PromiseSettledResult<Response>) {
    try {
      if (quotesRes.status !== 'fulfilled' || sectorRes.status !== 'fulfilled') return;
      const qData = await quotesRes.value.clone().json();
      const sData = await sectorRes.value.clone().json();
      if (!Array.isArray(qData) || !sData.sectors) return;

      const findQ = (sym: string) => qData.find((q: any) => q.symbol === sym);
      const spy = findQ('SPY');
      const qqq = findQ('QQQ');
      const dia = findQ('DIA');

      const markets = {
        spx: { price: spy?.price || 0, changePct: spy?.changesPercentage || 0, positive: (spy?.changesPercentage || 0) >= 0 },
        ixic: { price: qqq?.price || 0, changePct: qqq?.changesPercentage || 0, positive: (qqq?.changesPercentage || 0) >= 0 },
        dji: { price: dia?.price || 0, changePct: dia?.changesPercentage || 0, positive: (dia?.changesPercentage || 0) >= 0 },
        dax: { price: 0, changePct: 0, positive: true },
      };

      const res = await fetch(`${BASE}/api/market-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markets, sectors: sData.sectors }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.summary) setMarketSummary(data);
    } catch { /* silent */ }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await searchStocks(q);
      setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch { setSearchResults([]); }
  }

  const maxSectorAbs = sectors.length > 0 ? Math.max(...sectors.map(s => Math.abs(s.change))) : 1;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <SideDrawer visible={showDrawer} onClose={() => setShowDrawer(false)} userName={userName} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor={theme.text.tertiary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity style={s.avatarBtn} onPress={() => setShowDrawer(true)} activeOpacity={0.8}>
            <Text style={s.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
            <Text style={s.name}>{userName}</Text>
          </View>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => { setUnreadCount(0); router.push('/notifications-center'); }}
            activeOpacity={0.7}
          >
            <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={22} color={theme.text.primary} />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search ──────────────────────────────────── */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={theme.text.tertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Aktie suchen z.B. AAPL..."
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={handleSearch}
              keyboardAppearance="dark"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          {searchResults.length > 0 && (
            <View style={s.searchDropdown}>
              {searchResults.map((item, i) => (
                <TouchableOpacity
                  key={item.symbol}
                  style={[s.searchItem, i > 0 && s.searchItemBorder]}
                  onPress={() => { setSearchQuery(''); setSearchResults([]); router.push(`/stock/${item.symbol}`); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.searchSymbol}>{item.symbol}</Text>
                  <Text style={s.searchName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.searchEx}>{item.exchangeShortName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.text.tertiary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── Sektor Performance ───────────────── */}
            {sectors.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>SEKTOR PERFORMANCE</Text>
                <View style={s.sectorCard}>
                  {sectors.map((sec, i) => {
                    const isPos = sec.change >= 0;
                    const barWidth = maxSectorAbs > 0 ? (Math.abs(sec.change) / maxSectorAbs) * 100 : 0;
                    return (
                      <View key={sec.sector} style={[s.sectorRow, i > 0 && s.sectorRowBorder]}>
                        <Text style={s.sectorName} numberOfLines={1}>{sec.sectorDE}</Text>
                        <View style={s.sectorBarWrap}>
                          <View style={[
                            s.sectorBar,
                            { width: `${barWidth}%` as any, backgroundColor: isPos ? '#34C759' : '#475569' },
                          ]} />
                        </View>
                        <Text style={[s.sectorChange, { color: isPos ? '#34C759' : '#94A3B8' }]}>
                          {sec.changeFormatted}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Markt-Zusammenfassung ─────────────── */}
            {marketSummary && (
              <View style={s.section}>
                <View style={s.summaryCard}>
                  <View style={s.summaryBadge}>
                    <Ionicons
                      name={marketSummary.isBullish ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={marketSummary.isBullish ? '#34C759' : '#FF3B30'}
                    />
                    <Text style={[s.summaryBadgeText, { color: marketSummary.isBullish ? '#34C759' : '#FF3B30' }]}>
                      {marketSummary.isBullish ? 'Bullish' : 'Bearish'}
                    </Text>
                  </View>
                  <Text style={s.summaryText}>{marketSummary.summary}</Text>
                  <Text style={s.summarySource}>Finclue Marktanalyse</Text>
                </View>
              </View>
            )}

            {/* ── Märkte ───────────────────────────── */}
            {quotes.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>MÄRKTE</Text>
                  {(() => {
                    const ts = quotes[0]?.timestamp;
                    if (!ts) return null;
                    const d = new Date(ts * 1000);
                    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
                    if (diffMin < 5) return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759' }} />
                        <Text style={[s.timestampLabel, { color: '#34C759' }]}>Live</Text>
                      </View>
                    );
                    const day = d.toLocaleDateString('de-DE', { weekday: 'short' });
                    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                    return <Text style={s.timestampLabel}>Stand: {day}, {time}</Text>;
                  })()}
                </View>
                <View style={s.listCard}>
                  {quotes.map((q, i) => (
                    <View key={q.symbol} style={i > 0 ? s.rowBorder : undefined}>
                      <StockRow
                        quote={{ ...q, name: MARKET_NAMES[q.symbol] || q.name }}
                        onPress={() => router.push(`/stock/${q.symbol}`)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Beliebte Aktien ───────────────────── */}
            {popularQuotes.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>BELIEBTE AKTIEN</Text>
                <View style={s.listCard}>
                  {popularQuotes.map((q, i) => (
                    <View key={q.symbol} style={i > 0 ? s.rowBorder : undefined}>
                      <StockRow quote={q} onPress={() => router.push(`/stock/${q.symbol}`)} />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Guru-Trades ──────────────────────── */}
            {guruTrades.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>SUPER-INVESTOR TRADES</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/investors')}>
                    <Text style={s.sectionLink}>Alle →</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.listCard}>
                  {guruTrades.map((trade, i) => {
                    const color = TRADE_COLOR[trade.type];
                    const label = TRADE_LABEL[trade.type];
                    const initials = trade.investorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2);
                    const photoUrl = INVESTOR_PHOTOS[trade.investor];
                    return (
                      <TouchableOpacity
                        key={`${trade.investor}-${trade.ticker}`}
                        style={[s.guruRow, i > 0 && s.rowBorder]}
                        onPress={() => router.push(`/stock/${trade.ticker}`)}
                        activeOpacity={0.7}
                      >
                        {/* Investor avatar */}
                        <View style={s.guruAvatar}>
                          {photoUrl
                            ? <Image source={{ uri: photoUrl }} style={s.guruAvatarImg} />
                            : <Text style={s.guruAvatarText}>{initials}</Text>}
                        </View>
                        {/* Investor + stock info */}
                        <View style={s.guruInfo}>
                          <View style={s.guruTopRow}>
                            <Text style={s.guruInvestorName} numberOfLines={1}>{INVESTOR_NAMES[trade.investor] || trade.investorName}</Text>
                            <View style={[s.tradeBadge, { borderColor: color + '40', backgroundColor: color + '15' }]}>
                              <Text style={[s.tradeBadgeText, { color }]}>{label}</Text>
                            </View>
                          </View>
                          <Text style={s.guruTicker}>
                            {trade.ticker}
                            {trade.percentChangeFormatted ? ` · ${trade.percentChangeFormatted}` : ''}
                          </Text>
                        </View>
                        {/* Value */}
                        <Text style={[s.guruValue, { color }]}>{trade.dollarChangeFormatted}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Kongress Trades ───────────────────── */}
            {politicianTrades.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>KONGRESS TRADES</Text>
                </View>
                <View style={s.listCard}>
                  {politicianTrades.map((trade: any, i: number) => (
                    <TouchableOpacity
                      key={trade.ticker}
                      style={[s.polRow, i > 0 && s.rowBorder]}
                      onPress={() => router.push(`/stock/${trade.ticker}`)}
                      activeOpacity={0.7}
                    >
                      <View style={s.polIcon}>
                        <Ionicons name="flag" size={16} color="#8E8E93" />
                      </View>
                      <View style={s.polInfo}>
                        <Text style={s.polTicker}>{trade.ticker}</Text>
                        <Text style={s.polSub} numberOfLines={1}>
                          {trade.politicianCount} Politiker · {trade.transactionCount} Käufe
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.polValue}>
                          {trade.totalValueMax >= 1_000_000
                            ? `${(trade.totalValueMax / 1_000_000).toFixed(1)} Mio.`
                            : `${(trade.totalValueMax / 1_000).toFixed(0)} K`}
                        </Text>
                        <Text style={s.polValueLabel}>max. Volumen</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

import { theme, tabularStyle } from '../../lib/theme';

const d = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg.overlay },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_W, backgroundColor: theme.bg.base,
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border.default,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg - 2, paddingHorizontal: theme.space.xl, paddingTop: 64, paddingBottom: theme.space.xl },
  avatar: { width: 44, height: 44, borderRadius: theme.radius.full, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },
  userName: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  userSub: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border.default },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg - 2, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle },
  iconBox: { width: 34, height: 34, borderRadius: theme.radius.md - 1, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.medium },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.md, paddingBottom: theme.space.lg, flexDirection: 'row', alignItems: 'center', gap: theme.space.md },
  avatarBtn: { width: 38, height: 38, borderRadius: theme.radius.full, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  greeting: { color: theme.text.tertiary, fontSize: theme.font.caption },
  name: { color: theme.text.primary, fontSize: 20, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  bellBtn: { width: 38, height: 38, borderRadius: theme.radius.full, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  bellBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: theme.accent.negative, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: theme.bg.base },
  bellBadgeText: { color: theme.text.primary, fontSize: theme.font.micro, fontWeight: theme.weight.bold, ...tabularStyle },

  searchWrap: { paddingHorizontal: theme.space.lg, marginBottom: theme.space.lg },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.md, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 2,
  },
  searchInput: { flex: 1, color: theme.text.primary, fontSize: theme.font.title2 },
  searchDropdown: {
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.md, marginTop: theme.space.xs, overflow: 'hidden',
  },
  searchItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  searchItemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.default },
  searchSymbol: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, width: 60 },
  searchName: { color: theme.text.tertiary, fontSize: theme.font.body, flex: 1 },
  searchEx: { color: theme.text.muted, fontSize: theme.font.caption, marginLeft: theme.space.sm },

  section: { paddingHorizontal: theme.space.lg, marginBottom: theme.space.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.space.sm },
  sectionTitle: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider, textTransform: 'uppercase', marginBottom: theme.space.sm },
  timestampLabel: { color: theme.text.muted, fontSize: theme.font.caption, fontWeight: theme.weight.medium, ...tabularStyle },
  summaryCard: {
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.md, padding: theme.space.lg,
  },
  summaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.xs + 1,
    alignSelf: 'flex-start', paddingHorizontal: theme.space.sm, paddingVertical: 3,
    borderRadius: theme.radius.sm, backgroundColor: theme.bg.cardElevated, marginBottom: theme.space.sm + 2,
  },
  summaryBadgeText: { fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  summaryText: { color: theme.text.primary, fontSize: theme.font.title3, lineHeight: 20 },
  summarySource: { color: theme.text.muted, fontSize: theme.font.caption, marginTop: theme.space.sm },
  sectionLink: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.medium, marginBottom: theme.space.sm },

  sectorCard: {
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.md, overflow: 'hidden',
  },
  sectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm + 2, gap: theme.space.sm },
  sectorRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.default },
  sectorName: { color: theme.text.secondary, fontSize: theme.font.body, width: 120 },
  sectorBarWrap: { flex: 1, height: 3, backgroundColor: theme.border.default, borderRadius: 1.5, overflow: 'hidden' },
  sectorBar: { height: 3, borderRadius: 1.5, minWidth: 2 },
  sectorChange: { fontSize: theme.font.body, fontWeight: theme.weight.semibold, width: 54, textAlign: 'right', ...tabularStyle },

  listCard: {
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    borderRadius: theme.radius.md, overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.default },

  guruRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm + 2, paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.md },
  guruAvatar: {
    width: 36, height: 36, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.cardElevated, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  guruAvatarImg: { width: 36, height: 36, borderRadius: theme.radius.full },
  guruAvatarText: { color: theme.text.tertiary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  guruInfo: { flex: 1, gap: 2 },
  guruTopRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs + 2 },
  guruInvestorName: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, flex: 1 },
  guruTicker: { color: theme.text.tertiary, fontSize: theme.font.bodySm },
  tradeBadge: {
    borderRadius: theme.radius.sm - 2, borderWidth: 0,
    paddingHorizontal: theme.space.xs + 2, paddingVertical: 2,
  },
  tradeBadgeText: { fontSize: theme.font.caption, fontWeight: theme.weight.semibold },
  guruValue: { fontSize: theme.font.body, fontWeight: theme.weight.semibold, textAlign: 'right', ...tabularStyle },

  // Politician Trades
  polRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  polIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bg.cardHover, alignItems: 'center', justifyContent: 'center' },
  polInfo: { flex: 1 },
  polTicker: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.bold },
  polSub: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },
  polValue: { color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  polValueLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 1 },
});
