import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { supabase, checkIsPremium } from '../../lib/auth';
import PriceChange from '../../components/PriceChange';
import MetricCard from '../../components/MetricCard';
import StockLogo from '../../components/StockLogo';

const BASE_URL = 'https://finclue.de';
const SCREEN_WIDTH = Dimensions.get('window').width;

const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1J', days: 365 },
  { label: '5J', days: 1825 },
] as const;

type RangeKey = typeof RANGES[number]['label'];

interface HistoricalPoint { date: string; close: number; }
interface BullBear { id: string; text: string; category: string; }

export default function StockScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Chart state
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('1J');

  // AI Bulls/Bears state
  const [isPremium, setIsPremium] = useState(false);
  const [bulls, setBulls] = useState<BullBear[]>([]);
  const [bears, setBears] = useState<BullBear[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
    checkWatchlist();
    loadHistorical();
    loadPremiumAndAI();
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

  async function loadHistorical() {
    setChartLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/historical/${ticker}`);
      if (res.ok) {
        const data = await res.json();
        const points: HistoricalPoint[] = (data.historical || []).reverse();
        setHistorical(points);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setChartLoading(false);
    }
  }

  async function loadPremiumAndAI() {
    const premium = await checkIsPremium();
    setIsPremium(premium);
    if (premium) {
      setAiLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/bulls-bears/${ticker}`);
        if (res.ok) {
          const data = await res.json();
          setBulls(data.bulls || []);
          setBears(data.bears || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setAiLoading(false);
      }
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

  const chartData = useCallback(() => {
    const selectedRange = RANGES.find(r => r.label === range)!;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedRange.days);
    const filtered = historical.filter(p => new Date(p.date) >= cutoff);
    if (filtered.length === 0) return [];
    const maxPoints = 180;
    const step = Math.ceil(filtered.length / maxPoints);
    const sampled = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
    return sampled.map(p => ({ value: p.close }));
  }, [historical, range]);

  const chartPoints = chartData();
  const firstVal = chartPoints[0]?.value ?? 0;
  const lastVal = chartPoints[chartPoints.length - 1]?.value ?? 0;
  const isPositive = lastVal >= firstVal;
  const chartColor = isPositive ? '#22C55E' : '#EF4444';

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

        {/* Chart */}
        <View style={s.chartCard}>
          {chartLoading ? (
            <View style={s.chartLoading}>
              <ActivityIndicator color="#22C55E" size="small" />
            </View>
          ) : chartPoints.length > 1 ? (
            <>
              <LineChart
                data={chartPoints}
                width={SCREEN_WIDTH - 32}
                height={180}
                hideDataPoints
                color={chartColor}
                thickness={2}
                startFillColor={chartColor}
                endFillColor="transparent"
                startOpacity={0.18}
                endOpacity={0}
                areaChart
                curved
                initialSpacing={0}
                endSpacing={0}
                noOfSections={4}
                yAxisColor="transparent"
                xAxisColor="transparent"
                rulesColor="rgba(255,255,255,0.05)"
                rulesType="solid"
                yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
                hideYAxisText
                backgroundColor="transparent"
                adjustToWidth
              />
              <View style={s.rangePicker}>
                {RANGES.map(r => (
                  <TouchableOpacity
                    key={r.label}
                    onPress={() => setRange(r.label)}
                    style={[s.rangeBtn, range === r.label && s.rangeBtnActive]}
                  >
                    <Text style={[s.rangeBtnText, range === r.label && s.rangeBtnTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={s.chartLoading}>
              <Text style={s.noData}>Keine Chartdaten verfügbar</Text>
            </View>
          )}
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

        {/* AI Bulls & Bears */}
        <View style={s.section}>
          <View style={s.aiHeader}>
            <View style={s.aiTitleRow}>
              <View style={s.aiBadge}>
                <Text style={s.aiBadgeText}>AI</Text>
              </View>
              <Text style={s.sectionTitle}>60-SEKUNDEN CHECK</Text>
            </View>
            {!isPremium && (
              <View style={s.premiumBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={s.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>

          {isPremium ? (
            aiLoading ? (
              <View style={s.aiLoadingWrap}>
                <ActivityIndicator color="#22C55E" size="small" />
                <Text style={s.aiLoadingText}>Analyse wird geladen…</Text>
              </View>
            ) : (
              <View style={s.aiBullsBears}>
                {/* Bulls */}
                <View style={[s.aiCol, s.bullsCol]}>
                  <View style={s.aiColHeader}>
                    <Text style={s.bullEmoji}>🐂</Text>
                    <Text style={s.bullLabel}>Bull-Argumente</Text>
                  </View>
                  {bulls.map(b => (
                    <View key={b.id} style={s.argRow}>
                      <View style={s.bullDot} />
                      <Text style={s.argText}>{b.text}</Text>
                    </View>
                  ))}
                </View>

                {/* Bears */}
                <View style={[s.aiCol, s.bearsCol]}>
                  <View style={s.aiColHeader}>
                    <Text style={s.bearEmoji}>🐻</Text>
                    <Text style={s.bearLabel}>Bear-Argumente</Text>
                  </View>
                  {bears.map(b => (
                    <View key={b.id} style={s.argRow}>
                      <View style={s.bearDot} />
                      <Text style={s.argText}>{b.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          ) : (
            /* Locked state for non-premium */
            <View style={s.lockedCard}>
              <View style={s.lockedIconWrap}>
                <Ionicons name="lock-closed" size={28} color="#F59E0B" />
              </View>
              <Text style={s.lockedTitle}>Premium erforderlich</Text>
              <Text style={s.lockedDesc}>
                Hole dir Bull- und Bear-Argumente basierend auf unserem KI-Index – exklusiv für Premium-Mitglieder.
              </Text>
              {/* Blurred preview rows */}
              <View style={s.blurPreview} pointerEvents="none">
                <View style={s.previewRow}><View style={[s.previewLine, { width: '90%' }]} /></View>
                <View style={s.previewRow}><View style={[s.previewLine, { width: '75%' }]} /></View>
                <View style={s.previewRow}><View style={[s.previewLine, { width: '85%' }]} /></View>
              </View>
              <TouchableOpacity
                style={s.upgradeBtn}
                onPress={() => Linking.openURL('https://finclue.de/preise')}
                activeOpacity={0.8}
              >
                <Ionicons name="star" size={15} color="#020617" />
                <Text style={s.upgradeBtnText}>Jetzt Premium werden</Text>
              </TouchableOpacity>
            </View>
          )}
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

  // Chart
  chartCard: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    paddingTop: 16,
  },
  chartLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },
  noData: { color: '#475569', fontSize: 13 },
  rangePicker: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1E293B',
  },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  rangeBtnText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: '#22C55E' },

  section: { padding: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1E293B' },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },

  // AI section
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
  },
  aiBadgeText: { color: '#22C55E', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  premiumBadgeText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },

  aiLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24, justifyContent: 'center' },
  aiLoadingText: { color: '#64748B', fontSize: 13 },

  aiBullsBears: { gap: 12 },
  aiCol: { borderRadius: 14, padding: 16, borderWidth: 1 },
  bullsCol: { backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' },
  bearsCol: { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' },
  aiColHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bullEmoji: { fontSize: 18 },
  bearEmoji: { fontSize: 18 },
  bullLabel: { color: '#22C55E', fontSize: 13, fontWeight: '700' },
  bearLabel: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  argRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  bullDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginTop: 6, flexShrink: 0 },
  bearDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginTop: 6, flexShrink: 0 },
  argText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, flex: 1 },

  // Locked state
  lockedCard: {
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E293B',
    padding: 24, alignItems: 'center',
  },
  lockedIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  lockedTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  lockedDesc: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  blurPreview: { width: '100%', marginBottom: 20, gap: 8, opacity: 0.15 },
  previewRow: { backgroundColor: '#1E293B', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  previewLine: { height: 10, backgroundColor: '#334155', borderRadius: 5 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F59E0B', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  upgradeBtnText: { color: '#020617', fontSize: 15, fontWeight: '700' },
});
