import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Linking,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
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

type MainTab = 'overview' | 'earnings' | 'investors' | 'insider' | 'financials' | 'valuation' | 'estimates' | 'dividends';
type FinBarTab = 'revenue' | 'netIncome' | 'fcf';
type FinDetailTab = 'income' | 'balance' | 'cashflow';

interface HistoricalPoint { date: string; close: number; }
interface BullBear { id: string; text: string; category: string; }
interface Transcript { symbol: string; quarter: number; year: number; date: string; content: string; }

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'Übersicht' },
  { key: 'earnings', label: 'Quartal' },
  { key: 'investors', label: 'Investoren' },
  { key: 'insider', label: 'Insider' },
  { key: 'financials', label: 'Finanzen' },
  { key: 'valuation', label: 'Bewertung' },
  { key: 'estimates', label: 'Schätzungen' },
  { key: 'dividends', label: 'Dividende' },
];

export default function StockScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();

  // ─── Core ───────────────────────────────────────────────
  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // ─── Tab ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const loadedTabs = useRef<Set<MainTab>>(new Set(['overview']));

  // ─── Chart ──────────────────────────────────────────────
  const [historical, setHistorical] = useState<HistoricalPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('1J');

  // ─── Financials (bar charts + bewertung) ─────────────────
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [balanceData, setBalanceData] = useState<any[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<any>(null);
  const [finLoading, setFinLoading] = useState(true);
  const [finBarTab, setFinBarTab] = useState<FinBarTab>('revenue');
  const [finDetailTab, setFinDetailTab] = useState<FinDetailTab>('income');

  // ─── Similar stocks ─────────────────────────────────────
  const [similarStocks, setSimilarStocks] = useState<any[]>([]);

  // ─── AI Bulls/Bears ──────────────────────────────────────
  const [isPremium, setIsPremium] = useState(false);
  const [bulls, setBulls] = useState<BullBear[]>([]);
  const [bears, setBears] = useState<BullBear[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // ─── Earnings tab ────────────────────────────────────────
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTIdx, setSelectedTIdx] = useState(0);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // ─── Investors tab ───────────────────────────────────────
  const [siPositions, setSiPositions] = useState<any[]>([]);
  const [siSummary, setSiSummary] = useState<any>(null);
  const [siLoading, setSiLoading] = useState(false);

  // ─── Insider tab ─────────────────────────────────────────
  const [insiderData, setInsiderData] = useState<any[]>([]);
  const [insiderLoading, setInsiderLoading] = useState(false);

  // ─── Valuation tab ───────────────────────────────────────
  const [valuationData, setValuationData] = useState<any[]>([]);
  const [valuationLoading, setValuationLoading] = useState(false);

  // ─── Estimates tab ───────────────────────────────────────
  const [estimatesData, setEstimatesData] = useState<any[]>([]);
  const [estimatesLoading, setEstimatesLoading] = useState(false);

  // ─── Dividends tab ───────────────────────────────────────
  const [dividendData, setDividendData] = useState<any>(null);
  const [dividendLoading, setDividendLoading] = useState(false);

  // ─── Load on mount ───────────────────────────────────────
  useEffect(() => {
    loadData();
    checkWatchlistState();
    loadHistorical();
    loadFinancials();
    loadPremiumAndAI();
  }, [ticker]);

  // ─── Lazy load on tab switch ─────────────────────────────
  useEffect(() => {
    if (loadedTabs.current.has(activeTab)) return;
    loadedTabs.current.add(activeTab);
    if (activeTab === 'earnings') loadEarnings();
    if (activeTab === 'investors') loadInvestors();
    if (activeTab === 'insider') loadInsider();
    if (activeTab === 'valuation') loadValuation();
    if (activeTab === 'estimates') loadEstimates();
    if (activeTab === 'dividends') loadDividends();
  }, [activeTab]);

  // ─── Data loaders ────────────────────────────────────────
  async function loadData() {
    try {
      const [qRes, pRes] = await Promise.all([
        fetch(`${BASE_URL}/api/quotes?symbols=${ticker}`),
        fetch(`${BASE_URL}/api/company-profile/${ticker}`),
      ]);
      if (qRes.ok) { const d = await qRes.json(); setQuote(Array.isArray(d) ? d[0] : d); }
      if (pRes.ok) {
        const d = await pRes.json();
        const p = Array.isArray(d) ? d[0] : d;
        setProfile(p);
        if (p?.sector) loadSimilarStocks(p.sector);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadSimilarStocks(sector: string) {
    try {
      const res = await fetch(`${BASE_URL}/api/screener?sector=${encodeURIComponent(sector)}&limit=12`);
      if (!res.ok) return;
      const d = await res.json();
      const stocks = (d.data || d || []).filter((s: any) => s.symbol !== ticker).slice(0, 8);
      if (stocks.length === 0) return;

      // Fetch live quotes for real changesPercentage
      const symbols = stocks.map((s: any) => s.symbol || s.ticker).join(',');
      const qRes = await fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`);
      if (qRes.ok) {
        const quotes: any[] = await qRes.json();
        const quoteMap = new Map(quotes.map((q: any) => [q.symbol, q]));
        const enriched = stocks.map((s: any) => {
          const sym = s.symbol || s.ticker;
          const q = quoteMap.get(sym);
          return q ? { ...s, changesPercentage: q.changesPercentage, price: q.price } : s;
        });
        setSimilarStocks(enriched);
      } else {
        setSimilarStocks(stocks);
      }
    } catch (e) { console.error(e); }
  }

  async function loadHistorical() {
    setChartLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/historical/${ticker}`);
      if (res.ok) {
        const d = await res.json();
        setHistorical((d.historical || []).reverse());
      }
    } catch (e) { console.error(e); }
    finally { setChartLoading(false); }
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
        setIncomeData([...(fd.incomeStatements || [])].reverse().slice(-6));
        setCashFlowData([...(fd.cashFlows || [])].reverse().slice(-6));
        setBalanceData([...(fd.balanceSheets || [])].reverse().slice(-6));
      }
      if (kmRes.ok) {
        const km = await kmRes.json();
        setKeyMetrics(Array.isArray(km) ? km[0] : km);
      }
    } catch (e) { console.error(e); }
    finally { setFinLoading(false); }
  }

  async function loadPremiumAndAI() {
    const premium = await checkIsPremium();
    setIsPremium(premium);
    if (!premium) return;
    setAiLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/bulls-bears/${ticker}`);
      if (res.ok) { const d = await res.json(); setBulls(d.bulls || []); setBears(d.bears || []); }
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  }

  async function loadEarnings() {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/earnings-transcripts?ticker=${ticker}&limit=8`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d) && d.length > 0) {
          setTranscripts(d);
          if (isPremium) loadAiSummary(d[0]);
        }
      }
    } catch (e) { console.error(e); }
    finally { setTranscriptLoading(false); }
  }

  async function loadAiSummary(t: Transcript) {
    setAiSummary(null);
    setSummaryLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/earnings-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t.symbol, year: t.year, quarter: t.quarter, content: t.content }),
      });
      if (res.ok) { const d = await res.json(); setAiSummary(d.summary || null); }
    } catch (e) { console.error(e); }
    finally { setSummaryLoading(false); }
  }

  async function loadInvestors() {
    setSiLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/stocks/${ticker}/super-investors`);
      if (res.ok) {
        const d = await res.json();
        setSiPositions(d.positions || []);
        setSiSummary(d.summary || null);
      }
    } catch (e) { console.error(e); }
    finally { setSiLoading(false); }
  }

  async function loadInsider() {
    setInsiderLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/insider-trading?symbol=${ticker}&limit=25`);
      if (res.ok) {
        const d = await res.json();
        setInsiderData(d.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setInsiderLoading(false); }
  }

  async function loadValuation() {
    setValuationLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/key-metrics/${ticker}?period=annual&limit=5`);
      if (res.ok) {
        const d = await res.json();
        setValuationData(Array.isArray(d) ? [...d].reverse() : []);
      }
    } catch(e) { console.error(e); }
    finally { setValuationLoading(false); }
  }

  async function loadEstimates() {
    setEstimatesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/analyst-estimates/${ticker}`);
      if (res.ok) {
        const d = await res.json();
        setEstimatesData(Array.isArray(d) ? d.slice(0, 6) : []);
      }
    } catch(e) { console.error(e); }
    finally { setEstimatesLoading(false); }
  }

  async function loadDividends() {
    setDividendLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/dividends/${ticker}`);
      if (res.ok) {
        const d = await res.json();
        setDividendData(d);
      }
    } catch(e) { console.error(e); }
    finally { setDividendLoading(false); }
  }

  async function checkWatchlistState() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const { data } = await supabase
        .from('watchlists').select('id')
        .eq('user_id', session.session.user.id).eq('ticker', ticker).single();
      setInWatchlist(!!data);
    } catch { /* not in watchlist */ }
  }

  async function toggleWatchlist() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await supabase.from('watchlists').delete()
          .eq('user_id', session.session.user.id).eq('ticker', ticker);
        setInWatchlist(false);
      } else {
        await supabase.from('watchlists').insert({ user_id: session.session.user.id, ticker });
        setInWatchlist(true);
      }
    } catch (e) { console.error(e); }
    finally { setWatchlistLoading(false); }
  }

  // ─── Chart computation ───────────────────────────────────
  const chartResult = useCallback(() => {
    const sel = RANGES.find(r => r.label === range)!;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - sel.days);
    const filtered = historical.filter(p => new Date(p.date) >= cutoff);
    if (filtered.length < 2) return null;
    const maxPoints = 200;
    const step = Math.ceil(filtered.length / maxPoints);
    const sampled = filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
    const values = sampled.map(p => p.close);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const pad = (maxVal - minVal) * 0.06;
    const firstClose = sampled[0].close;
    const lastClose = sampled[sampled.length - 1].close;
    const periodChange = lastClose - firstClose;
    const periodChangePct = firstClose > 0 ? (periodChange / firstClose) * 100 : 0;
    const xLabelCount = 4;
    const xLabels: string[] = sampled.map(() => '');
    const interval = Math.floor((sampled.length - 1) / (xLabelCount - 1));
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.min(i * interval, sampled.length - 1);
      xLabels[idx] = formatDateLabel(sampled[idx].date, range);
    }
    return {
      points: sampled.map(p => ({ value: p.close })),
      xLabels, minVal: minVal - pad, maxVal: maxVal + pad,
      periodChange, periodChangePct,
      yMin: formatPrice(minVal), yMax: formatPrice(maxVal),
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

  // ─── Latest financials for extra metrics ─────────────────
  const latestIncome = incomeData[incomeData.length - 1];
  const latestCF = cashFlowData[cashFlowData.length - 1];

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker || '',
          headerStyle: { backgroundColor: '#111113' },
          headerTintColor: '#F8FAFC',
          headerRight: () => (
            <TouchableOpacity onPress={toggleWatchlist} disabled={watchlistLoading} style={{ marginRight: 4 }}>
              <Ionicons name={inWatchlist ? 'bookmark' : 'bookmark-outline'} size={22}
                color={inWatchlist ? '#22C55E' : '#94A3B8'} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Price Header ─────────────────────────────── */}
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
          {profile?.companyName ? <Text style={s.companyName}>{profile.companyName}</Text> : null}
          <TouchableOpacity onPress={toggleWatchlist} disabled={watchlistLoading}
            style={[s.watchlistBtn, inWatchlist && s.watchlistBtnActive]} activeOpacity={0.7}>
            <Ionicons name={inWatchlist ? 'bookmark' : 'bookmark-outline'} size={16}
              color={inWatchlist ? '#0a0a0b' : '#22C55E'} />
            <Text style={[s.watchlistBtnText, inWatchlist && s.watchlistBtnTextActive]}>
              {inWatchlist ? 'In Watchlist' : '+ Watchlist'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Main Tab Bar ─────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mainTabBar} contentContainerStyle={s.mainTabBarContent}>
          {MAIN_TABS.map(t => (
            <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)}
              style={[s.mainTab, activeTab === t.key && s.mainTabActive]}>
              <Text style={[s.mainTabText, activeTab === t.key && s.mainTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ════════════════════════════════════════════════
            TAB: ÜBERSICHT
        ════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Chart */}
            <View style={s.chartCard}>
              {chartLoading ? (
                <View style={s.chartLoading}><ActivityIndicator color="#22C55E" size="small" /></View>
              ) : chart && chartPoints.length > 1 ? (
                <>
                  <View style={s.chartPerfRow}>
                    <Text style={[s.chartPerfChange, { color: chartColor }]}>
                      {isPositive ? '+' : ''}
                      {chart.periodChange.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' '}({isPositive ? '+' : ''}{chart.periodChangePct.toFixed(2)} %)
                    </Text>
                    <Text style={s.chartPerfLabel}>{RANGE_LABELS[range]}</Text>
                  </View>
                  <View style={s.chartArea}>
                    <LineChart
                      data={chartPoints}
                      width={SCREEN_WIDTH - 32 - 52}
                      height={160}
                      hideDataPoints color={chartColor} thickness={1.5}
                      startFillColor={chartColor} endFillColor="transparent"
                      startOpacity={0.2} endOpacity={0}
                      areaChart curved initialSpacing={0} endSpacing={0}
                      maxValue={chart.maxVal} minValue={chart.minVal}
                      noOfSections={3}
                      yAxisColor="transparent" xAxisColor="rgba(255,255,255,0.08)"
                      rulesColor="rgba(255,255,255,0.06)" rulesType="solid"
                      hideYAxisText xAxisLabelTextStyle={{ color: 'transparent', fontSize: 0 }}
                      backgroundColor="transparent" adjustToWidth
                    />
                    <View style={s.yAxis}>
                      <Text style={s.yLabel}>{chart.yMax}</Text>
                      <Text style={s.yLabel}>{formatPrice((chart.maxVal + chart.minVal) / 2)}</Text>
                      <Text style={s.yLabel}>{chart.yMin}</Text>
                    </View>
                  </View>
                  <View style={s.xAxis}>
                    {chart.xLabels.map((label, i) =>
                      label ? (
                        <Text key={i} style={[s.xLabel, { left: `${(i / (chart.xLabels.length - 1)) * 88}%` as any }]}>
                          {label}
                        </Text>
                      ) : null
                    )}
                  </View>
                  <View style={s.rangePicker}>
                    {RANGES.map(r => (
                      <TouchableOpacity key={r.label} onPress={() => setRange(r.label)}
                        style={[s.rangeBtn, range === r.label && s.rangeBtnActive]}>
                        <Text style={[s.rangeBtnText, range === r.label && s.rangeBtnTextActive]}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={s.chartLoading}><Text style={s.noData}>Keine Chartdaten verfügbar</Text></View>
              )}
            </View>

            {/* Kennzahlen */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>KENNZAHLEN</Text>
              <View style={s.metricsGrid}>
                <MetricCard label="Marktkapital." value={formatMarketCap(quote?.marketCap)} />
                <MetricCard label="KGV" value={quote?.pe ? quote.pe.toFixed(1) : '—'} />
                <MetricCard label="EPS" value={quote?.eps ? `$${quote.eps.toFixed(2)}` : '—'} />
                <MetricCard label="52W Hoch" value={quote?.yearHigh ? `$${quote.yearHigh.toFixed(2)}` : '—'} />
                <MetricCard label="52W Tief" value={quote?.yearLow ? `$${quote.yearLow.toFixed(2)}` : '—'} />
                <MetricCard label="Volumen" value={formatVolume(quote?.volume)} />
                <MetricCard label="Ø Volumen" value={formatVolume(quote?.avgVolume)} />
                <MetricCard label="Ø 50 Tage" value={quote?.priceAvg50 ? `$${quote.priceAvg50.toFixed(2)}` : '—'} />
                {/* Extra metrics from financials */}
                <MetricCard
                  label="Gewinnmarge"
                  value={latestIncome?.netIncomeRatio ? `${(latestIncome.netIncomeRatio * 100).toFixed(1)}%` : '—'}
                />
                <MetricCard
                  label="EBITDA"
                  value={latestIncome?.ebitda ? formatBigNumber(latestIncome.ebitda) : '—'}
                />
                <MetricCard
                  label="CapEx"
                  value={latestCF?.capitalExpenditure ? formatBigNumber(Math.abs(latestCF.capitalExpenditure)) : '—'}
                />
                <MetricCard
                  label="Div. je Aktie"
                  value={profile?.lastDiv ? `$${Number(profile.lastDiv).toFixed(2)}` : '—'}
                />
                <MetricCard
                  label="Aktien im Umlauf"
                  value={profile?.sharesOutstanding ? formatBigNumber(profile.sharesOutstanding) : '—'}
                />
              </View>
            </View>

            {/* Finanzkennzahlen (Bar chart) */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>FINANZKENNZAHLEN</Text>
              <View style={s.finTabs}>
                {([
                  { key: 'revenue', label: 'Umsatz' },
                  { key: 'netIncome', label: 'Gewinn' },
                  { key: 'fcf', label: 'Free Cashflow' },
                ] as { key: FinBarTab; label: string }[]).map(t => (
                  <TouchableOpacity key={t.key} onPress={() => setFinBarTab(t.key)}
                    style={[s.finTab, finBarTab === t.key && s.finTabActive]}>
                    <Text style={[s.finTabText, finBarTab === t.key && s.finTabTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {finLoading ? (
                <View style={s.finLoading}><ActivityIndicator color="#22C55E" size="small" /></View>
              ) : (() => {
                const rows = finBarTab === 'fcf' ? cashFlowData : incomeData;
                const field = finBarTab === 'revenue' ? 'revenue' : finBarTab === 'netIncome' ? 'netIncome' : 'freeCashFlow';
                if (!rows.length) return <View style={s.finLoading}><Text style={s.noData}>Keine Daten</Text></View>;
                const barData = rows.map(row => {
                  const val = (row[field] || 0) / 1e9;
                  const isNeg = val < 0;
                  return {
                    value: Math.abs(val) || 0.01,
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
                      roundedTop hideRules
                      xAxisColor="rgba(255,255,255,0.08)" yAxisColor="transparent" hideYAxisText
                      noOfSections={3} barBorderRadius={4}
                      xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                      backgroundColor="transparent" width={SCREEN_WIDTH - 56} height={130} initialSpacing={12}
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
                  <MetricCard label="FCF-Rendite" value={keyMetrics.fcfYield ? `${(keyMetrics.fcfYield * 100).toFixed(1)}%` : '—'} />
                  <MetricCard label="Div.-Rendite" value={keyMetrics.dividendYield ? `${(keyMetrics.dividendYield * 100).toFixed(2)}%` : '—'} />
                </View>
              </View>
            )}

            {/* AI Bulls & Bears */}
            <View style={s.section}>
              <View style={s.aiHeader}>
                <View style={s.aiTitleRow}>
                  <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI</Text></View>
                  <Text style={s.sectionTitle}>60-SEKUNDEN CHECK</Text>
                </View>
                {!isPremium && (
                  <View style={s.premiumBadge}>
                    <Ionicons name="star" size={10} color="#22C55E" />
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
                <View style={s.lockedCard}>
                  <View style={s.lockedIconWrap}><Ionicons name="lock-closed" size={28} color="#22C55E" /></View>
                  <Text style={s.lockedTitle}>Premium erforderlich</Text>
                  <Text style={s.lockedDesc}>Hole dir Bull- und Bear-Argumente basierend auf unserem KI-Index – exklusiv für Premium-Mitglieder.</Text>
                  <View style={s.blurPreview} pointerEvents="none">
                    <View style={s.previewRow}><View style={[s.previewLine, { width: '90%' }]} /></View>
                    <View style={s.previewRow}><View style={[s.previewLine, { width: '75%' }]} /></View>
                    <View style={s.previewRow}><View style={[s.previewLine, { width: '85%' }]} /></View>
                  </View>
                  <TouchableOpacity style={s.upgradeBtn} onPress={() => Linking.openURL('https://finclue.de/preise')} activeOpacity={0.8}>
                    <Ionicons name="star" size={15} color="#020617" />
                    <Text style={s.upgradeBtnText}>Jetzt Premium werden</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Beschreibung */}
            {profile?.description ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>ÜBER DAS UNTERNEHMEN</Text>
                <View style={s.descCard}>
                  <Text style={s.descText} numberOfLines={6}>{profile.description}</Text>
                </View>
              </View>
            ) : null}

            {/* Ähnliche Aktien */}
            {similarStocks.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>ÄHNLICHE AKTIEN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {similarStocks.map(stock => {
                    const sym = stock.symbol || stock.ticker;
                    const chg = stock.changesPercentage ?? stock.changePercentage ?? 0;
                    const pos = chg >= 0;
                    return (
                      <TouchableOpacity key={sym} style={s.similarCard}
                        onPress={() => router.push(`/stock/${sym}`)}>
                        <StockLogo ticker={sym} size={36} borderRadius={8} />
                        <Text style={s.similarTicker}>{sym}</Text>
                        <Text style={[s.similarChange, { color: pos ? '#22C55E' : '#EF4444' }]}>
                          {pos ? '+' : ''}{chg.toFixed(1)}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════
            TAB: QUARTALSZAHLEN
        ════════════════════════════════════════════════ */}
        {activeTab === 'earnings' && (
          <View style={s.tabContent}>
            {transcriptLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : transcripts.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Earnings-Daten verfügbar</Text></View>
            ) : (
              <>
                {/* Quarter selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {transcripts.map((t, i) => (
                    <TouchableOpacity key={i}
                      onPress={() => {
                        setSelectedTIdx(i);
                        setShowFullTranscript(false);
                        if (isPremium) loadAiSummary(t);
                      }}
                      style={[s.quarterChip, selectedTIdx === i && s.quarterChipActive]}>
                      <Text style={[s.quarterChipText, selectedTIdx === i && s.quarterChipTextActive]}>
                        Q{t.quarter} {t.year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {(() => {
                  const t = transcripts[selectedTIdx];
                  if (!t) return null;
                  return (
                    <>
                      <Text style={s.earningsDate}>
                        {new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </Text>

                      {/* AI Summary */}
                      <View style={[s.aiSummaryCard, !isPremium && s.aiSummaryCardLocked]}>
                        <View style={s.aiSummaryHeader}>
                          <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI</Text></View>
                          <Text style={s.aiSummaryTitle}>Zusammenfassung</Text>
                          {!isPremium && (
                            <View style={[s.premiumBadge, { marginLeft: 'auto' as any }]}>
                              <Ionicons name="star" size={10} color="#22C55E" />
                              <Text style={s.premiumBadgeText}>Premium</Text>
                            </View>
                          )}
                        </View>
                        {isPremium ? (
                          summaryLoading ? (
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 12 }}>
                              <ActivityIndicator color="#22C55E" size="small" />
                              <Text style={s.aiLoadingText}>Zusammenfassung wird generiert…</Text>
                            </View>
                          ) : aiSummary ? (
                            aiSummary.split('\n\n').map((para, i) => (
                              <Text key={i} style={s.aiSummaryText}>{para}</Text>
                            ))
                          ) : (
                            <Text style={s.noData}>Keine Zusammenfassung verfügbar</Text>
                          )
                        ) : (
                          <>
                            <View style={[s.blurPreview, { marginBottom: 12 }]} pointerEvents="none">
                              <View style={s.previewRow}><View style={[s.previewLine, { width: '95%' }]} /></View>
                              <View style={s.previewRow}><View style={[s.previewLine, { width: '80%' }]} /></View>
                              <View style={s.previewRow}><View style={[s.previewLine, { width: '88%' }]} /></View>
                            </View>
                            <TouchableOpacity style={[s.upgradeBtn, { alignSelf: 'flex-start' }]}
                              onPress={() => Linking.openURL('https://finclue.de/preise')}>
                              <Ionicons name="star" size={13} color="#020617" />
                              <Text style={[s.upgradeBtnText, { fontSize: 13 }]}>Premium freischalten</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {/* Transcript */}
                      <View style={s.transcriptCard}>
                        <Text style={s.transcriptTitle}>Earnings Call Transkript</Text>
                        <Text style={s.transcriptText} numberOfLines={showFullTranscript ? undefined : 12}>
                          {t.content}
                        </Text>
                        <TouchableOpacity onPress={() => setShowFullTranscript(v => !v)} style={s.transcriptToggle}>
                          <Text style={s.transcriptToggleText}>
                            {showFullTranscript ? 'Weniger anzeigen ▲' : 'Vollständiges Transkript ▼'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SUPERINVESTOREN
        ════════════════════════════════════════════════ */}
        {activeTab === 'investors' && (
          <View style={s.tabContent}>
            {siLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : siPositions.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Superinvestoren-Daten</Text></View>
            ) : (
              <>
                {siSummary && (
                  <View style={s.siSummaryRow}>
                    <View style={s.siSummaryItem}>
                      <Text style={s.siSummaryVal}>{siSummary.totalInvestors}</Text>
                      <Text style={s.siSummaryLabel}>Investoren</Text>
                    </View>
                    <View style={s.siSummaryItem}>
                      <Text style={s.siSummaryVal}>{siSummary.formattedTotalValue}</Text>
                      <Text style={s.siSummaryLabel}>Gesamtwert</Text>
                    </View>
                    <View style={s.siSummaryItem}>
                      <Text style={[s.siSummaryVal, { color: '#22C55E' }]}>{siSummary.increasingTrends}</Text>
                      <Text style={s.siSummaryLabel}>Aufgestockt</Text>
                    </View>
                    <View style={s.siSummaryItem}>
                      <Text style={[s.siSummaryVal, { color: '#EF4444' }]}>{siSummary.decreasingTrends}</Text>
                      <Text style={s.siSummaryLabel}>Reduziert</Text>
                    </View>
                  </View>
                )}
                {siPositions.map((pos: any, i: number) => {
                  const trend = pos.position?.trend;
                  const isNew = pos.position?.isNewPosition;
                  const trendColor = isNew ? '#94A3B8' : trend === 'increasing' ? '#22C55E' : trend === 'decreasing' ? '#EF4444' : '#94A3B8';
                  const trendLabel = isNew ? 'Neu' : trend === 'increasing' ? '▲' : trend === 'decreasing' ? '▼' : '—';
                  return (
                    <TouchableOpacity key={i} style={s.siRow}
                      onPress={() => router.push(`/investor/${pos.investor?.slug || pos.investor?.name?.toLowerCase()}`)}>
                      <View style={s.siAvatar}>
                        <Text style={s.siAvatarText}>{(pos.investor?.name || '?').charAt(0)}</Text>
                      </View>
                      <View style={s.siInfo}>
                        <Text style={s.siName}>{pos.investor?.name}</Text>
                        <Text style={s.siMeta}>
                          {pos.position?.formattedPortfolioPercentage} des Portfolios · {pos.position?.formattedValue}
                        </Text>
                      </View>
                      <View style={s.siTrend}>
                        <Text style={[s.siTrendText, { color: trendColor }]}>{trendLabel}</Text>
                        {pos.position?.changeSharePercentage !== 0 && !isNew && (
                          <Text style={[s.siChangeText, { color: trendColor }]}>
                            {pos.position?.changeSharePercentage > 0 ? '+' : ''}{pos.position?.changeSharePercentage?.toFixed(1)}%
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: INSIDER TRADING
        ════════════════════════════════════════════════ */}
        {activeTab === 'insider' && (
          <View style={s.tabContent}>
            {insiderLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : insiderData.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Insider-Transaktionen</Text></View>
            ) : (
              insiderData.map((tx: any, i: number) => {
                const isBuy = tx.acquiredDisposedCode === 'A' || tx.transactionType?.toLowerCase().includes('buy');
                const txColor = isBuy ? '#22C55E' : '#EF4444';
                const txLabel = isBuy ? 'KAUF' : 'VERKAUF';
                const val = tx.price && tx.securitiesTransacted
                  ? tx.price * tx.securitiesTransacted : null;
                return (
                  <View key={i} style={s.insiderRow}>
                    <View style={[s.insiderBadge, { backgroundColor: isBuy ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                      <Text style={[s.insiderBadgeText, { color: txColor }]}>{txLabel}</Text>
                    </View>
                    <View style={s.insiderInfo}>
                      <Text style={s.insiderName}>{tx.reportingName}</Text>
                      <Text style={s.insiderMeta}>
                        {tx.typeOfOwner}
                        {tx.securitiesTransacted ? ` · ${Number(tx.securitiesTransacted).toLocaleString('de-DE')} Aktien` : ''}
                        {val ? ` · ${formatBigNumber(val)}` : ''}
                      </Text>
                    </View>
                    <Text style={s.insiderDate}>
                      {tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '—'}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: FINANZEN (Detail)
        ════════════════════════════════════════════════ */}
        {activeTab === 'financials' && (
          <View style={s.tabContent}>
            {/* Sub-tab bar */}
            <View style={s.finDetailTabs}>
              {([
                { key: 'income', label: 'GuV' },
                { key: 'balance', label: 'Bilanz' },
                { key: 'cashflow', label: 'Cashflow' },
              ] as { key: FinDetailTab; label: string }[]).map(t => (
                <TouchableOpacity key={t.key} onPress={() => setFinDetailTab(t.key)}
                  style={[s.finDetailTab, finDetailTab === t.key && s.finDetailTabActive]}>
                  <Text style={[s.finDetailTabText, finDetailTab === t.key && s.finDetailTabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {finLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : (() => {
              const rows = finDetailTab === 'balance' ? balanceData : finDetailTab === 'cashflow' ? cashFlowData : incomeData;
              if (!rows.length) return <View style={s.tabLoading}><Text style={s.noData}>Keine Daten</Text></View>;

              const years = rows.map(r => r.calendarYear || r.date?.slice(0, 4) || '');

              const fields: { label: string; key: string }[] =
                finDetailTab === 'income' ? [
                  { label: 'Umsatz', key: 'revenue' },
                  { label: 'Bruttogewinn', key: 'grossProfit' },
                  { label: 'EBITDA', key: 'ebitda' },
                  { label: 'Betriebsgewinn', key: 'operatingIncome' },
                  { label: 'Nettogewinn', key: 'netIncome' },
                  { label: 'EPS', key: 'eps' },
                  { label: 'Bruttomarge', key: 'grossProfitRatio' },
                  { label: 'Nettomarge', key: 'netIncomeRatio' },
                ] : finDetailTab === 'balance' ? [
                  { label: 'Ges. Vermögen', key: 'totalAssets' },
                  { label: 'Umlaufvermögen', key: 'totalCurrentAssets' },
                  { label: 'Ges. Schulden', key: 'totalLiabilities' },
                  { label: 'Kurzfr. Schulden', key: 'totalCurrentLiabilities' },
                  { label: 'Eigenkapital', key: 'totalStockholdersEquity' },
                  { label: 'Barmittel', key: 'cashAndCashEquivalents' },
                  { label: 'Nettoverschuldung', key: 'netDebt' },
                ] : [
                  { label: 'Op. Cashflow', key: 'operatingCashFlow' },
                  { label: 'CapEx', key: 'capitalExpenditure' },
                  { label: 'Free Cashflow', key: 'freeCashFlow' },
                  { label: 'Inv. Cashflow', key: 'investingActivitiesCashFlow' },
                  { label: 'Fin. Cashflow', key: 'financingActivitiesCashFlow' },
                  { label: 'Dividenden', key: 'dividendsPaid' },
                  { label: 'Aktienrückkauf', key: 'commonStockRepurchased' },
                ];

              const isRatio = (key: string) => key.endsWith('Ratio') || key === 'eps';

              return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Header row */}
                    <View style={s.finTableHeader}>
                      <Text style={[s.finTableCell, s.finTableLabelCell, s.finTableHeaderText]}>Kennzahl</Text>
                      {years.map(y => (
                        <Text key={y} style={[s.finTableCell, s.finTableHeaderText]}>{y}</Text>
                      ))}
                    </View>
                    {/* Data rows */}
                    {fields.map((f, fi) => (
                      <View key={f.key} style={[s.finTableRow, fi % 2 === 0 && s.finTableRowAlt]}>
                        <Text style={[s.finTableCell, s.finTableLabelCell, s.finTableLabel]}>{f.label}</Text>
                        {rows.map((row, ri) => {
                          const val = row[f.key];
                          let display = '—';
                          if (val !== null && val !== undefined) {
                            if (isRatio(f.key)) {
                              display = `${(val * (f.key === 'eps' ? 1 : 100)).toFixed(f.key === 'eps' ? 2 : 1)}${f.key === 'eps' ? '' : '%'}`;
                            } else {
                              display = formatBigNumber(Math.abs(val));
                              if (val < 0) display = '-' + display;
                            }
                          }
                          const isNeg = val !== null && val !== undefined && val < 0;
                          return (
                            <Text key={ri} style={[s.finTableCell, s.finTableValue, isNeg && { color: '#EF4444' }]}>
                              {display}
                            </Text>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: BEWERTUNG
        ════════════════════════════════════════════════ */}
        {activeTab === 'valuation' && (
          <View style={s.tabContent}>
            {valuationLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : valuationData.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Bewertungsdaten</Text></View>
            ) : (() => {
              const years = valuationData.map(r => r.calendarYear || r.date?.slice(0,4) || '');
              const fields = [
                { label: 'KGV', key: 'peRatio', isPercent: false },
                { label: 'KUV', key: 'priceToSalesRatio', isPercent: false },
                { label: 'KBV', key: 'pbRatio', isPercent: false },
                { label: 'EV/EBITDA', key: 'enterpriseValueOverEBITDA', isPercent: false },
                { label: 'EV/Umsatz', key: 'evToSales', isPercent: false },
                { label: 'FCF-Rendite', key: 'fcfYield', isPercent: true },
                { label: 'Div.-Rendite', key: 'dividendYield', isPercent: true },
                { label: 'ROE', key: 'roe', isPercent: true },
                { label: 'ROIC', key: 'roic', isPercent: true },
              ];
              return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={s.finTableHeader}>
                      <Text style={[s.finTableCell, s.finTableLabelCell, s.finTableHeaderText]}>Kennzahl</Text>
                      {years.map(y => <Text key={y} style={[s.finTableCell, s.finTableHeaderText]}>{y}</Text>)}
                    </View>
                    {fields.map((f, fi) => (
                      <View key={f.key} style={[s.finTableRow, fi % 2 === 0 && s.finTableRowAlt]}>
                        <Text style={[s.finTableCell, s.finTableLabelCell, s.finTableLabel]}>{f.label}</Text>
                        {valuationData.map((row, ri) => {
                          const val = row[f.key];
                          let display = '—';
                          if (val !== null && val !== undefined && !isNaN(val)) {
                            display = f.isPercent ? `${(val * 100).toFixed(1)}%` : val.toFixed(1);
                          }
                          return <Text key={ri} style={[s.finTableCell, s.finTableValue]}>{display}</Text>;
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SCHÄTZUNGEN
        ════════════════════════════════════════════════ */}
        {activeTab === 'estimates' && (
          <View style={s.tabContent}>
            {estimatesLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : estimatesData.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Schätzungen verfügbar</Text></View>
            ) : (
              <>
                <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>ANALYSTEN-KONSENSUS</Text>
                {estimatesData.map((est: any, i: number) => {
                  const year = est.date?.slice(0, 4) || '—';
                  const epsAvg = est.estimatedEpsAvg;
                  const epsLow = est.estimatedEpsLow;
                  const epsHigh = est.estimatedEpsHigh;
                  const revAvg = est.estimatedRevenueAvg;
                  const revLow = est.estimatedRevenueLow;
                  const revHigh = est.estimatedRevenueHigh;
                  const analysts = est.numberAnalystsEstimatedEps || est.numberAnalystEstimatedRevenue || '—';
                  return (
                    <View key={i} style={s.estimateCard}>
                      <View style={s.estimateHeader}>
                        <Text style={s.estimateYear}>{year}</Text>
                        <Text style={s.estimateAnalysts}>{analysts} Analysten</Text>
                      </View>
                      <View style={s.estimateRow}>
                        <View style={s.estimateItem}>
                          <Text style={s.estimateLabel}>EPS (erwartet)</Text>
                          <Text style={s.estimateValue}>{epsAvg != null ? `$${epsAvg.toFixed(2)}` : '—'}</Text>
                          {epsLow != null && epsHigh != null && (
                            <Text style={s.estimateRange}>${epsLow.toFixed(2)} – ${epsHigh.toFixed(2)}</Text>
                          )}
                        </View>
                        <View style={s.estimateDivider} />
                        <View style={s.estimateItem}>
                          <Text style={s.estimateLabel}>Umsatz (erwartet)</Text>
                          <Text style={s.estimateValue}>{revAvg != null ? formatBigNumber(revAvg) : '—'}</Text>
                          {revLow != null && revHigh != null && (
                            <Text style={s.estimateRange}>{formatBigNumber(revLow)} – {formatBigNumber(revHigh)}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: DIVIDENDE
        ════════════════════════════════════════════════ */}
        {activeTab === 'dividends' && (
          <View style={s.tabContent}>
            {dividendLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#22C55E" /></View>
            ) : !dividendData ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Dividenden-Daten</Text></View>
            ) : (
              <>
                {/* Key metrics */}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>DIVIDENDEN-ÜBERSICHT</Text>
                  <View style={s.metricsGrid}>
                    <MetricCard label="Dividendenrendite" value={dividendData.currentYield != null ? `${dividendData.currentYield.toFixed(2)}%` : '—'} />
                    <MetricCard label="TTM je Aktie" value={dividendData.ttmDividendPerShare != null ? `$${dividendData.ttmDividendPerShare.toFixed(2)}` : '—'} />
                    <MetricCard label="Ausschüttungsquote" value={dividendData.payoutRatio != null ? `${(dividendData.payoutRatio * 100).toFixed(1)}%` : '—'} />
                    <MetricCard label="Wachstum (5J)" value={dividendData.dividendGrowthRate != null ? `${dividendData.dividendGrowthRate.toFixed(1)}%` : '—'} />
                    <MetricCard label="Jahre in Folge" value={dividendData.consecutiveYears != null ? `${dividendData.consecutiveYears}` : '—'} />
                  </View>
                </View>

                {/* Yearly bar chart */}
                {dividendData.yearlyDividends && Object.keys(dividendData.yearlyDividends).length > 0 && (() => {
                  const entries = Object.entries(dividendData.yearlyDividends as Record<string, number>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-7);
                  const barData = entries.map(([year, val]) => ({
                    value: val || 0.001,
                    label: year,
                    frontColor: '#22C55E',
                    topLabelComponent: () => (
                      <Text style={s.barTopLabel}>${val.toFixed(2)}</Text>
                    ),
                  }));
                  return (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>JAHRES-DIVIDENDE</Text>
                      <View style={s.chartCard}>
                        <BarChart
                          data={barData}
                          barWidth={Math.min(36, (SCREEN_WIDTH - 80) / barData.length - 8)}
                          spacing={Math.min(16, (SCREEN_WIDTH - 80) / barData.length - 20)}
                          roundedTop hideRules
                          xAxisColor="rgba(255,255,255,0.08)" yAxisColor="transparent" hideYAxisText
                          noOfSections={3} barBorderRadius={4}
                          xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                          backgroundColor="transparent" width={SCREEN_WIDTH - 56} height={130} initialSpacing={12}
                        />
                      </View>
                    </View>
                  );
                })()}

                {/* Recent history */}
                {dividendData.history && dividendData.history.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>VERLAUF</Text>
                    <View style={s.divHistoryCard}>
                      {dividendData.history.slice(0, 10).map((d: any, i: number) => (
                        <View key={i} style={[s.divHistoryRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#1e1e20' }]}>
                          <Text style={s.divHistoryDate}>
                            {d.date ? new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </Text>
                          <Text style={s.divHistoryAmount}>${Number(d.dividend || d.adjDividend || 0).toFixed(4)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

// ─── Constants & Helpers ─────────────────────────────────────
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

function formatBigNumber(val?: number): string {
  if (!val && val !== 0) return '—';
  if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)} Bio.`;
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)} Mrd.`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)} Mio.`;
  return `$${val.toFixed(0)}`;
}

function formatMarketCap(val?: number): string {
  if (!val) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val}`;
}

function formatVolume(val?: number): string {
  if (!val) return '—';
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return `${val}`;
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scroll: { flex: 1, backgroundColor: '#0a0a0b' },

  // Price Header
  priceHeader: { backgroundColor: '#111113', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e1e20' },
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
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start',
  },
  watchlistBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  watchlistBtnText: { color: '#22C55E', fontWeight: '600', fontSize: 14 },
  watchlistBtnTextActive: { color: '#0a0a0b' },

  // Main Tab Bar
  mainTabBar: { backgroundColor: '#111113', borderBottomWidth: 1, borderBottomColor: '#1e1e20' },
  mainTabBarContent: { paddingHorizontal: 16, paddingVertical: 0, gap: 4 },
  mainTab: { paddingHorizontal: 16, paddingVertical: 13 },
  mainTabActive: { borderBottomWidth: 2, borderBottomColor: '#22C55E' },
  mainTabText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  mainTabTextActive: { color: '#22C55E' },

  // Tab Content wrapper
  tabContent: { padding: 16, gap: 12 },
  tabLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },

  // Chart
  chartCard: {
    backgroundColor: '#111113', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, borderWidth: 1, borderColor: '#1e1e20', overflow: 'hidden',
  },
  chartLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },
  noData: { color: '#475569', fontSize: 13 },
  chartPerfRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 2 },
  chartPerfChange: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  chartPerfLabel: { color: '#475569', fontSize: 12 },
  chartArea: { flexDirection: 'row', alignItems: 'stretch', paddingLeft: 8 },
  yAxis: { width: 44, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8, paddingVertical: 2 },
  yLabel: { color: '#475569', fontSize: 10 },
  xAxis: { height: 22, position: 'relative', marginLeft: 8, marginRight: 52, marginBottom: 2 },
  xLabel: { position: 'absolute', color: '#475569', fontSize: 10, top: 2 },
  rangePicker: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1e1e20', marginTop: 4,
  },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  rangeBtnText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: '#22C55E' },

  // Sections
  section: { padding: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descCard: { backgroundColor: '#111113', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e20' },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },

  // Finanzen bar chart
  finTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  finTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1e1e20' },
  finTabActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  finTabText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  finTabTextActive: { color: '#22C55E' },
  finLoading: { height: 100, alignItems: 'center', justifyContent: 'center' },
  barTopLabel: { color: '#94A3B8', fontSize: 9, textAlign: 'center', marginBottom: 2 },
  finSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingHorizontal: 4 },
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
  premiumBadgeText: { color: '#22C55E', fontSize: 10, fontWeight: '700' },
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
  lockedCard: {
    backgroundColor: '#111113', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e20', padding: 24, alignItems: 'center',
  },
  lockedIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  lockedTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  lockedDesc: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  blurPreview: { width: '100%', marginBottom: 20, gap: 8, opacity: 0.15 },
  previewRow: { backgroundColor: '#1e1e20', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  previewLine: { height: 10, backgroundColor: '#2c2c2e', borderRadius: 5 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13,
  },
  upgradeBtnText: { color: '#0a0a0b', fontSize: 15, fontWeight: '700' },

  // Similar stocks
  similarCard: {
    backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#1e1e20',
    padding: 12, alignItems: 'center', gap: 6, minWidth: 80,
  },
  similarTicker: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  similarChange: { fontSize: 11, fontWeight: '600' },

  // Earnings tab
  quarterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#1e1e20', backgroundColor: '#111113',
  },
  quarterChipActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  quarterChipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  quarterChipTextActive: { color: '#22C55E' },
  earningsDate: { color: '#475569', fontSize: 12, marginTop: 4 },
  aiSummaryCard: {
    backgroundColor: '#111113', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  aiSummaryCardLocked: { borderColor: '#1e1e20' },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiSummaryTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  aiSummaryText: { color: '#CBD5E1', fontSize: 13, lineHeight: 21, marginBottom: 8 },
  transcriptCard: {
    backgroundColor: '#111113', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#1e1e20',
  },
  transcriptTitle: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  transcriptText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  transcriptToggle: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  transcriptToggleText: { color: '#22C55E', fontSize: 13, fontWeight: '600' },

  // Investors tab
  siSummaryRow: {
    flexDirection: 'row', backgroundColor: '#111113', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e20', padding: 16,
  },
  siSummaryItem: { flex: 1, alignItems: 'center' },
  siSummaryVal: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  siSummaryLabel: { color: '#475569', fontSize: 11, marginTop: 2 },
  siRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111113', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1e1e20',
  },
  siAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1e1e20', alignItems: 'center', justifyContent: 'center',
  },
  siAvatarText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },
  siInfo: { flex: 1 },
  siName: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  siMeta: { color: '#475569', fontSize: 12, marginTop: 2 },
  siTrend: { alignItems: 'flex-end' },
  siTrendText: { fontSize: 16, fontWeight: '700' },
  siChangeText: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Insider tab
  insiderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111113', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1e1e20',
  },
  insiderBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 66, alignItems: 'center' },
  insiderBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  insiderInfo: { flex: 1 },
  insiderName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  insiderMeta: { color: '#475569', fontSize: 11, marginTop: 2 },
  insiderDate: { color: '#64748B', fontSize: 11 },

  // Financials detail tab
  finDetailTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  finDetailTab: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20', alignItems: 'center',
  },
  finDetailTabActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  finDetailTabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  finDetailTabTextActive: { color: '#22C55E' },
  finTableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e20' },
  finTableHeaderText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  finTableRow: { flexDirection: 'row', paddingVertical: 10 },
  finTableRowAlt: { backgroundColor: 'rgba(30,41,59,0.4)' },
  finTableCell: { width: 80, textAlign: 'right', paddingHorizontal: 6 },
  finTableLabelCell: { width: 130, textAlign: 'left' },
  finTableLabel: { color: '#94A3B8', fontSize: 12 },
  finTableValue: { color: '#F8FAFC', fontSize: 12, fontWeight: '500' },

  // Estimates tab
  estimateCard: { backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#1e1e20', marginHorizontal: 16, marginBottom: 10, padding: 16 },
  estimateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  estimateYear: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  estimateAnalysts: { color: '#64748B', fontSize: 12 },
  estimateRow: { flexDirection: 'row', alignItems: 'flex-start' },
  estimateItem: { flex: 1, paddingHorizontal: 4 },
  estimateDivider: { width: 1, backgroundColor: '#1e1e20', marginHorizontal: 8, alignSelf: 'stretch' },
  estimateLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  estimateValue: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  estimateRange: { color: '#475569', fontSize: 11 },

  // Dividends tab
  divHistoryCard: { backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#1e1e20', overflow: 'hidden' },
  divHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  divHistoryDate: { color: '#94A3B8', fontSize: 13 },
  divHistoryAmount: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
});
