import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import PriceChange from '../../components/PriceChange';
import MetricCard from '../../components/MetricCard';
import StockLogo from '../../components/StockLogo';

const BASE_URL = 'https://finclue.de';

export default function StockScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    loadData();
    checkWatchlist();
  }, [ticker]);

  async function loadData() {
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`${BASE_URL}/api/quotes?symbols=${ticker}`),
        fetch(`${BASE_URL}/api/company-profile/${ticker}`),
      ]);
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuote(Array.isArray(qData) ? qData[0] : qData);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProfile(Array.isArray(pData) ? pData[0] : pData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function checkWatchlist() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from('watchlists')
        .select('id')
        .eq('user_id', session.session.user.id)
        .eq('ticker', ticker)
        .single();
      setInWatchlist(!!data);
    } catch { /* not in watchlist */ }
  }

  async function toggleWatchlist() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', session.session.user.id)
          .eq('ticker', ticker);
        setInWatchlist(false);
      } else {
        await supabase
          .from('watchlists')
          .insert({ user_id: session.session.user.id, ticker });
        setInWatchlist(true);
      }
    } catch (e) { console.error(e); }
    finally { setWatchlistLoading(false); }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker || '',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerRight: () => (
            <TouchableOpacity onPress={toggleWatchlist} disabled={watchlistLoading} style={{ marginRight: 4 }}>
              <Ionicons
                name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={inWatchlist ? '#22C55E' : '#94A3B8'}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={s.scroll}>
        {/* Price Header */}
        <View style={s.priceHeader}>
          <View style={s.priceRow}>
            <View style={s.priceLeft}>
              <StockLogo ticker={ticker!} size={48} borderRadius={12} />
              <View style={{ marginLeft: 14 }}>
                <Text style={s.price}>
                  ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <View style={s.changeRow}>
                  <PriceChange value={quote?.change ?? 0} isAbsolute />
                  <PriceChange value={change} />
                </View>
              </View>
            </View>
            <View style={s.exchangeInfo}>
              {profile?.exchange ? <Text style={s.exchange}>{profile.exchange}</Text> : null}
              {profile?.sector ? <Text style={s.sector}>{profile.sector}</Text> : null}
            </View>
          </View>
          {profile?.companyName ? (
            <Text style={s.companyName}>{profile.companyName}</Text>
          ) : null}

          {/* Watchlist Button */}
          <TouchableOpacity
            onPress={toggleWatchlist}
            disabled={watchlistLoading}
            style={[s.watchlistBtn, inWatchlist && s.watchlistBtnActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={inWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={inWatchlist ? '#020617' : '#22C55E'}
            />
            <Text style={[s.watchlistBtnText, inWatchlist && s.watchlistBtnTextActive]}>
              {inWatchlist ? 'In Watchlist' : '+ Watchlist'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Key Metrics */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>KENNZAHLEN</Text>
          <View style={s.metricsGrid}>
            <MetricCard label="Marktkapital." value={formatMarketCap(quote?.marketCap)} />
            <MetricCard label="KGV" value={quote?.pe ? quote.pe.toFixed(1) : '—'} />
            <MetricCard label="52W Hoch" value={quote?.yearHigh ? `$${quote.yearHigh.toFixed(2)}` : '—'} />
            <MetricCard label="52W Tief" value={quote?.yearLow ? `$${quote.yearLow.toFixed(2)}` : '—'} />
            <MetricCard label="Volumen" value={formatVolume(quote?.volume)} />
            <MetricCard label="Ø Volumen" value={formatVolume(quote?.avgVolume)} />
            <MetricCard label="EPS" value={quote?.eps ? `$${quote.eps.toFixed(2)}` : '—'} />
            <MetricCard label="Ø 50 Tage" value={quote?.priceAvg50 ? `$${quote.priceAvg50.toFixed(2)}` : '—'} />
          </View>
        </View>

        {/* Description */}
        {profile?.description ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>ÜBER DAS UNTERNEHMEN</Text>
            <View style={s.descCard}>
              <Text style={s.descText} numberOfLines={8}>{profile.description}</Text>
            </View>
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function formatMarketCap(val?: number) {
  if (!val) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val}`;
}

function formatVolume(val?: number) {
  if (!val) return '—';
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return `${val}`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scroll: { flex: 1, backgroundColor: '#020617' },
  priceHeader: { backgroundColor: '#0F172A', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceLeft: { flexDirection: 'row', alignItems: 'center' },
  price: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  changeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  exchangeInfo: { alignItems: 'flex-end' },
  exchange: { color: '#94A3B8', fontSize: 12 },
  sector: { color: '#64748B', fontSize: 12, marginTop: 2 },
  companyName: { color: '#94A3B8', fontSize: 13, marginTop: 8 },
  watchlistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 14, backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  watchlistBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  watchlistBtnText: { color: '#22C55E', fontWeight: '600', fontSize: 14 },
  watchlistBtnTextActive: { color: '#020617' },
  section: { padding: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
});
