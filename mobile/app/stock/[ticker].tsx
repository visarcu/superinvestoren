import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Linking } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
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
type FinTab = 'revenue' | 'netIncome' | 'fcf';

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

  // Financials state
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [finLoading, setFinLoading] = useState(true);
  const [finTab, setFinTab] = useState<FinTab>('revenue');

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
    loadFinancials();
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

  async function loadFinancials() {
    setFinLoading(true);
    try {
      const [fdRes, kmRes] = await Promise.all([
        fetch(`${BASE_URL}/api/financial-data/${ticker}?years=6&period=annual`),
        fetch(`${BASE_URL}/api/key-metrics/${ticker}?period=annual&limit=1`),
      ]);
      if (fdRes.ok) {
        const fd = await fdRes.json();
        // Sort oldest → newest
        const income = [...(fd.incomeStatements || [])].reverse().slice(-6);
        const cf = [...(fd.cashFlows || [])].reverse().slice(-6);
        setIncomeData(income);
        setCashFlowData(cf);
      }
      if (kmRes.ok) {
        const km = await kmRes.json();
        setKeyMetrics(Array.isArray(km) ? km[0] : km);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFinLoading(false);
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

  const chartResult = useCallback(() => {
    const selectedRange = RANGES.find(r => r.label === range)!;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedRange.days);
    const filtered = historical.filter(p => new Date(p.date) >= cutoff);
    if (filtered.length < 2) return null;

    // Downsample for performance
    const maxPoints = 200;
    const step = Math.ceil(filtered.length / maxPoints);
    const sampled = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);

    const values = sampled.map(p => p.close);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    // Add 2% padding so line doesn't touch edges
    const pad = (maxVal - minVal) * 0.06;

    // Performance for this period
    const firstClose = sampled[0].close;
    const lastClose = sampled[sampled.length - 1].close;
    const periodChange = lastClose - firstClose;
    const periodChangePct = firstClose > 0 ? (periodChange / firstClose) * 100 : 0;

    // X-axis labels: 4 evenly spread date labels
    const xLabelCount = 4;
    const xLabels: string[] = sampled.map(() => '');
    const interval = Math.floor((sampled.length - 1) / (xLabelCount - 1));
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.min(i * interval, sampled.length - 1);
      xLabels[idx] = formatDateLabel(sampled[idx].date, range);
    }

    return {
      points: sampled.map(p => ({ value: p.close })),
      xLabels,
      minVal: minVal - pad,
      maxVal: maxVal + pad,
      periodChange,
      periodChangePct,
      yMin: formatPrice(minVal),
      yMax: formatPrice(maxVal),
    };
  }, [historical, range]);

  const chart = chartResult();
  const chartPoints = chart?.points ?? [];
  const isPositive = (chart?.periodChange ?? 0) >= 0;
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
          ) : chart && chartPoints.length > 1 ? (
            <>
              {/* Performance Header */}
              <View style={s.chartPerfRow}>
                <Text style={[s.chartPerfChange, { color: chartColor }]}>
                  {isPositive ? '+' : ''}{chart.periodChange.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {' '}({isPositive ? '+' : ''}{chart.periodChangePct.toFixed(2)} %)
                </Text>
                <Text style={s.chartPerfLabel}>{RANGE_LABELS[range]}</Text>
              </View>

              {/* Chart + Y-axis */}
              <View style={s.chartArea}>
                <LineChart
                  data={chartPoints}
                  width={SCREEN_WIDTH - 32 - 52}
                  height={160}
                  hideDataPoints
                  color={chartColor}
                  thickness={1.5}
                  startFillColor={chartColor}
                  endFillColor="transparent"
                  startOpacity={0.2}
                  endOpacity={0}
                  areaChart
                  curved
                  initialSpacing={0}
                  endSpacing={0}
                  maxValue={chart.maxVal}
                  minValue={chart.minVal}
                  noOfSections={3}
                  yAxisColor="transparent"
                  xAxisColor="rgba(255,255,255,0.08)"
                  rulesColor="rgba(255,255,255,0.06)"
                  rulesType="solid"
                  hideYAxisText
                  xAxisLabelTextStyle={{ color: 'transparent', fontSize: 0 }}
                  backgroundColor="transparent"
                  adjustToWidth
                />
                {/* Y-axis labels on the right */}
                <View style={s.yAxis}>
                  <Text style={s.yLabel}>{chart.yMax}</Text>
                  <Text style={s.yLabel}>{formatPrice((chart.maxVal + chart.minVal) / 2)}</Text>
                  <Text style={s.yLabel}>{chart.yMin}</Text>
                </View>
              </View>

              {/* X-axis date labels */}
              <View style={s.xAxis}>
                {chart.xLabels.map((label, i) =>
                  label ? (
                    <Text
                      key={i}
                      style={[
                        s.xLabel,
                        { left: `${(i / (chart.xLabels.length - 1)) * 88}%` as any },
                      ]}
                    >
                      {label}
                    </Text>
                  ) : null
                )}
              </View>

              {/* Range selector */}
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

        {/* Finanzkennzahlen */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>FINANZKENNZAHLEN</Text>
          {/* Tab selector */}
          <View style={s.finTabs}>
            {([
              { key: 'revenue', label: 'Umsatz' },
              { key: 'netIncome', label: 'Gewinn' },
              { key: 'fcf', label: 'Free Cashflow' },
            ] as { key: FinTab; label: string }[]).map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setFinTab(t.key)}
                style={[s.finTab, finTab === t.key && s.finTabActive]}
              >
                <Text style={[s.finTabText, finTab === t.key && s.finTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {finLoading ? (
            <View style={s.finLoading}><ActivityIndicator color="#22C55E" size="small" /></View>
          ) : (() => {
            const rows = finTab === 'fcf' ? cashFlowData : incomeData;
            const field = finTab === 'revenue' ? 'revenue' : finTab === 'netIncome' ? 'netIncome' : 'freeCashFlow';
            if (!rows.length) return <View style={s.finLoading}><Text style={s.noData}>Keine Daten</Text></View>;

            const barData = rows.map(row => {
              const val = (row[field] || 0) / 1e9;
              const isNeg = val < 0;
              return {
                value: Math.abs(val),
                label: row.calendarYear || row.date?.slice(0, 4) || '',
                frontColor: isNeg ? '#EF4444' : '#22C55E',
                topLabelComponent: () => (
                  <Text style={s.barTopLabel}>{isNeg ? '-' : ''}{Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(1)}</Text>
                ),
              };
            });

            const latestRow = rows[rows.length - 1];
            const prevRow = rows[rows.length - 2];
            const latestVal = (latestRow?.[field] || 0) / 1e9;
            const prevVal = (prevRow?.[field] || 0) / 1e9;
            const yoyPct = prevVal !== 0 ? ((latestVal - prevVal) / Math.abs(prevVal)) * 100 : null;

            return (
              <>
                <BarChart
                  data={barData}
                  barWidth={Math.min(36, (SCREEN_WIDTH - 80) / barData.length - 8)}
                  spacing={Math.min(16, (SCREEN_WIDTH - 80) / barData.length - 20)}
                  roundedTop
                  hideRules
                  xAxisColor="rgba(255,255,255,0.08)"
                  yAxisColor="transparent"
                  hideYAxisText
                  noOfSections={3}
                  barBorderRadius={4}
                  xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                  backgroundColor="transparent"
                  width={SCREEN_WIDTH - 56}
                  height={130}
                  initialSpacing={12}
                />
                <View style={s.finSummaryRow}>
                  <Text style={s.finSummaryLabel}>
                    {latestRow?.calendarYear || latestRow?.date?.slice(0, 4)}: {' '}
                    <Text style={s.finSummaryValue}>{latestVal < 0 ? '-' : ''}{formatBigNumber(Math.abs(latestVal * 1e9))}</Text>
                  </Text>
                  {yoyPct !== null && (
                    <Text style={[s.finSummaryPct, { color: yoyPct >= 0 ? '#22C55E' : '#EF4444' }]}>
                      {yoyPct >= 0 ? '▲' : '▼'} {Math.abs(yoyPct).toFixed(1)} % YoY
                    </Text>
                  )}
                </View>
              </>
            );
          })()}
        </View>

        {/* Bewertung */}
        {keyMetrics && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>BEWERTUNG</Text>
            <View style={s.metricsGrid}>
              <MetricCard label="KGV" value={keyMetrics.peRatio ? keyMetrics.peRatio.toFixed(1) : '—'} />
              <MetricCard label="KUV" value={keyMetrics.priceToSalesRatio ? keyMetrics.priceToSalesRatio.toFixed(1) : '—'} />
              <MetricCard label="KBV" value={keyMetrics.pbRatio ? keyMetrics.pbRatio.toFixed(1) : '—'} />
              <MetricCard label="EV/EBITDA" value={keyMetrics.enterpriseValueOverEBITDA ? keyMetrics.enterpriseValueOverEBITDA.toFixed(1) : '—'} />
              <MetricCard
                label="FCF-Rendite"
                value={keyMetrics.fcfYield ? `${(keyMetrics.fcfYield * 100).toFixed(1)}%` : '—'}
              />
              <MetricCard
                label="Div.-Rendite"
                value={keyMetrics.dividendYield ? `${(keyMetrics.dividendYield * 100).toFixed(2)}%` : '—'}
              />
            </View>
          </View>
        )}

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

const RANGE_LABELS: Record<RangeKey, string> = {
  '1M': 'im letzten Monat',
  '3M': 'in den letzten 3 Monaten',
  '6M': 'in den letzten 6 Monaten',
  '1J': 'im letzten Jahr',
  '5J': 'in den letzten 5 Jahren',
};

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  if (val >= 100) return val.toFixed(1);
  return val.toFixed(2);
}

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function formatDateLabel(dateStr: string, range: RangeKey): string {
  const d = new Date(dateStr);
  const mon = MONTHS_DE[d.getMonth()];
  if (range === '1M') return `${d.getDate()}. ${mon}`;
  if (range === '5J') return `${mon} ${d.getFullYear()}`;
  return `${mon} ${String(d.getFullYear()).slice(2)}`;
}

function formatBigNumber(val?: number) {
  if (!val) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)} Bio.`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)} Mrd.`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)} Mio.`;
  return `$${val.toFixed(0)}`;
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
  },
  chartLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },
  noData: { color: '#475569', fontSize: 13 },

  // Performance header
  chartPerfRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 2,
  },
  chartPerfChange: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  chartPerfLabel: { color: '#475569', fontSize: 12 },

  // Chart + Y-axis side by side
  chartArea: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 8,
  },
  yAxis: {
    width: 44,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingVertical: 2,
  },
  yLabel: {
    color: '#475569',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },

  // X-axis
  xAxis: {
    height: 22,
    position: 'relative',
    marginLeft: 8,
    marginRight: 52,
    marginBottom: 2,
  },
  xLabel: {
    position: 'absolute',
    color: '#475569',
    fontSize: 10,
    top: 2,
  },

  rangePicker: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1E293B',
    marginTop: 4,
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

  // Finanzen section
  finTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  finTab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#1E293B',
  },
  finTabActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  finTabText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  finTabTextActive: { color: '#22C55E' },
  finLoading: { height: 100, alignItems: 'center', justifyContent: 'center' },
  barTopLabel: { color: '#94A3B8', fontSize: 9, textAlign: 'center', marginBottom: 2 },
  finSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, paddingHorizontal: 4,
  },
  finSummaryLabel: { color: '#94A3B8', fontSize: 13 },
  finSummaryValue: { color: '#F8FAFC', fontWeight: '700' },
  finSummaryPct: { fontSize: 13, fontWeight: '600' },

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
