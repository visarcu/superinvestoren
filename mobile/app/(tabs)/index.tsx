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

const INVESTOR_PHOTOS: Record<string, string> = {
  buffett: 'https://finclue.de/images/buffett-cartoon.png',
  ackman: 'https://finclue.de/images/ackman-cartoon.png',
  burry: 'https://finclue.de/images/burry-cartoon.png',
  marks: 'https://finclue.de/images/marks-cartoon.png',
  pabrai: 'https://finclue.de/images/pabrai-cartoon.png',
  druckenmiller: 'https://finclue.de/images/druckenmiller-cartoon.png',
  tepper: 'https://finclue.de/images/tepper.png',
  gates: 'https://finclue.de/images/gates.png',
  einhorn: 'https://finclue.de/images/einhorn.png',
};
const TRADE_COLOR: Record<string, string> = { NEW: '#22C55E', ADD: '#22C55E', REDUCE: '#EF4444', SOLD: '#EF4444' };

const INVESTOR_NAMES: Record<string, string> = {
  buffett: 'Warren Buffett', ackman: 'Bill Ackman', gates: 'Bill Gates',
  burry: 'Michael Burry', klarman: 'Seth Klarman', akre: 'Chuck Akre',
  greenblatt: 'Joel Greenblatt', fisher: 'Ken Fisher', soros: 'George Soros',
  gayner: 'Thomas Gayner', tangen: 'Nicolai Tangen', pabrai: 'Mohnish Pabrai',
  peltz: 'Nelson Peltz', miller: 'Bill Miller', davis: 'Christopher Davis',
};

function formatInvestorName(slug: string): string {
  return INVESTOR_NAMES[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

function formatBigValue(v: number): string {
  if (!v) return '–';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Mrd. $`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} Mio. $`;
  return `${(v / 1000).toFixed(0)}K $`;
}

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

const MEHR_ITEMS = [
  { label: 'Superinvestoren', icon: 'people' as const, route: '/(tabs)/investors', color: '#6366F1' },
  { label: 'Finclue AI', icon: 'sparkles' as const, route: '/(tabs)/ai', color: '#F59E0B' },
  { label: 'Dividenden-Kalender', icon: 'calendar' as const, route: '/(tabs)/calendar', color: '#22C55E' },
  { label: 'Kursalarme', icon: 'notifications' as const, route: '/alerts', color: '#EF4444' },
  { label: 'Profil & Einstellungen', icon: 'person-circle' as const, route: '/(tabs)/profile', color: '#94a3b8' },
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
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* User Header */}
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
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {MEHR_ITEMS.map((item) => (
              <TouchableOpacity key={item.route} style={d.item} onPress={() => navigate(item.route)} activeOpacity={0.7}>
                <View style={[d.iconBox, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={d.itemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={15} color="#48484A" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split('@')[0] || 'Investor');
    });
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [quotesRes, popularRes, sectorRes, guruRes] = await Promise.allSettled([
        fetch(`${BASE}/api/quotes?symbols=${MARKET_SYMBOLS.join(',')}`),
        fetch(`${BASE}/api/quotes?symbols=${POPULAR_SYMBOLS.join(',')}`),
        fetch(`${BASE}/api/sector-performance`),
        fetch(`${BASE}/api/guru-trades`),
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
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
    <SafeAreaView style={s.container}>
      <SideDrawer visible={showDrawer} onClose={() => setShowDrawer(false)} userName={userName} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} tintColor="#22C55E" />
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
        </View>

        {/* ── Search ──────────────────────────────────── */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color="#475569" style={{ marginRight: 8 }} />
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
                <Ionicons name="close-circle" size={18} color="#475569" />
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
          <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
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
                            { width: `${barWidth}%` as any, backgroundColor: isPos ? '#22C55E' : '#475569' },
                          ]} />
                        </View>
                        <Text style={[s.sectorChange, { color: isPos ? '#22C55E' : '#94A3B8' }]}>
                          {sec.changeFormatted}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Märkte ───────────────────────────── */}
            {quotes.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>MÄRKTE</Text>
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
                            <Text style={s.guruInvestorName} numberOfLines={1}>{trade.investorName}</Text>
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
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const d = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_W, backgroundColor: '#111111',
    borderRightWidth: 1, borderRightColor: '#1C1C1E',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  userName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  userSub: { color: '#8E8E93', fontSize: 12, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#1C1C1E', marginHorizontal: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  greeting: { color: '#8E8E93', fontSize: 12 },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },

  // Search
  searchWrap: { paddingHorizontal: 16, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  searchDropdown: {
    backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20',
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  searchItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  searchItemBorder: { borderTopWidth: 1, borderTopColor: '#1e1e20' },
  searchSymbol: { color: '#F8FAFC', fontSize: 14, fontWeight: '600', width: 60 },
  searchName: { color: '#64748B', fontSize: 13, flex: 1 },
  searchEx: { color: '#475569', fontSize: 11, marginLeft: 8 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  sectionLink: { color: '#22C55E', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  // Sector
  sectorCard: {
    backgroundColor: '#111113', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e20', overflow: 'hidden',
  },
  sectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  sectorRowBorder: { borderTopWidth: 1, borderTopColor: '#1e1e20' },
  sectorName: { color: '#94A3B8', fontSize: 12, width: 120 },
  sectorBarWrap: { flex: 1, height: 4, backgroundColor: '#1e1e20', borderRadius: 2, overflow: 'hidden' },
  sectorBar: { height: 4, borderRadius: 2, minWidth: 2 },
  sectorChange: { fontSize: 12, fontWeight: '700', width: 54, textAlign: 'right' },

  // List card (markets + guru)
  listCard: {
    backgroundColor: '#111113', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e20', overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#1e1e20' },

  // Guru trades
  guruRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  guruAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e1e20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2c2c2e', overflow: 'hidden',
  },
  guruAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  guruAvatarText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  guruInfo: { flex: 1, gap: 2 },
  guruTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guruInvestorName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', flex: 1 },
  guruTicker: { color: '#475569', fontSize: 12 },
  tradeBadge: {
    borderRadius: 5, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  tradeBadgeText: { fontSize: 10, fontWeight: '700' },
  guruValue: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
