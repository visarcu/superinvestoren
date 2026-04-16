import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Linking, Image,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { WebView } from 'react-native-webview';
import { supabase, checkIsPremium } from '../../lib/auth';
import PriceChange from '../../components/PriceChange';
import MetricCard from '../../components/MetricCard';
import StockLogo from '../../components/StockLogo';
import { INVESTOR_PHOTOS } from '../../lib/investorPhotos';

const BASE_URL = 'https://finclue.de';
const SCREEN_WIDTH = Dimensions.get('window').width;

const RANGES = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1J', days: 365 },
  { label: '5J', days: 1825 },
  { label: 'Max', days: 36500 },
] as const;
type RangeKey = typeof RANGES[number]['label'];

type MainTab = 'overview' | 'earnings' | 'investors' | 'insider' | 'financials' | 'holdings' | 'valuation' | 'estimates' | 'dividends';
type FinBarTab = 'revenue' | 'netIncome' | 'fcf' | 'ebitda' | 'eps' | 'capex' | 'dividends' | 'shares';
type FinDetailTab = 'income' | 'balance' | 'cashflow';

interface HistoricalPoint { date: string; close: number; }
interface BullBear { id: string; text: string; category: string; }
interface Transcript { symbol: string; quarter: number; year: number; date: string; content: string; }

const ALL_TABS: { key: MainTab; label: string; etfOnly?: boolean; hideForEtf?: boolean }[] = [
  { key: 'overview',   label: 'Übersicht' },
  { key: 'financials', label: 'Finanzen',    hideForEtf: true },
  { key: 'valuation',  label: 'Bewertung',   hideForEtf: true },
  { key: 'estimates',  label: 'Schätzungen', hideForEtf: true },
  { key: 'earnings',   label: 'Quartal',     hideForEtf: true },
  { key: 'dividends',  label: 'Dividende' },
  { key: 'investors',  label: 'Investoren' },
  { key: 'insider',    label: 'Insider',     hideForEtf: true },
  { key: 'holdings',   label: 'Holdings',    etfOnly: true },
];

export default function StockScreen() {
  const { ticker, tab: initialTab } = useLocalSearchParams<{ ticker: string; tab?: string }>();

  // ─── Core ───────────────────────────────────────────────
  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // ─── Tab ────────────────────────────────────────────────
  const validTabs: MainTab[] = ['overview','earnings','investors','insider','financials','holdings','valuation','estimates','dividends'];
  const startTab: MainTab = (initialTab && validTabs.includes(initialTab as MainTab)) ? initialTab as MainTab : 'overview';
  const [activeTab, setActiveTab] = useState<MainTab>(startTab);
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

  // ─── Chart mode ──────────────────────────────────────────
  const [chartMode, setChartMode] = useState<'simple' | 'tradingview'>('simple');

  // ─── Similar stocks ─────────────────────────────────────
  const [similarStocks, setSimilarStocks] = useState<any[]>([]);

  // ─── News ────────────────────────────────────────────────
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

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
  const [earningsSubTab, setEarningsSubTab] = useState<'transcript' | 'surprises'>('transcript');
  const [earningSurprises, setEarningSurprises] = useState<any[]>([]);
  const [surprisesLoading, setSurprisesLoading] = useState(false);

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
  const [priceTargets, setPriceTargets] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any | null>(null);

  // ─── Dividends tab ───────────────────────────────────────
  const [dividendData, setDividendData] = useState<any>(null);
  const [dividendLoading, setDividendLoading] = useState(false);

  // ─── ETF Holdings tab ────────────────────────────────────
  const [etfHoldings, setEtfHoldings] = useState<any[]>([]);
  const [etfHoldingsLoading, setEtfHoldingsLoading] = useState(false);

  // ─── Load on mount ───────────────────────────────────────
  useEffect(() => {
    loadData();
    checkWatchlistState();
    loadHistorical();
    loadFinancials();
    loadPremiumAndAI();
    loadNews();
  }, [ticker]);

  // ─── Lazy load on tab switch ─────────────────────────────
  useEffect(() => {
    if (loadedTabs.current.has(activeTab)) return;
    loadedTabs.current.add(activeTab);
    const loaders: Record<string, () => void> = {
      earnings: loadEarnings,
      investors: loadInvestors,
      insider: loadInsider,
      holdings: loadEtfHoldings,
      valuation: loadValuation,
      estimates: loadEstimates,
      dividends: loadDividends,
    };
    loaders[activeTab]?.();
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
        fetch(`${BASE_URL}/api/financial-data/${ticker}?years=10&period=annual`),
        fetch(`${BASE_URL}/api/key-metrics/${ticker}?period=annual&limit=1`),
      ]);
      if (fdRes.ok) {
        const fd = await fdRes.json();
        setIncomeData([...(fd.incomeStatements || [])].reverse().slice(-10));
        setCashFlowData([...(fd.cashFlows || [])].reverse().slice(-10));
        setBalanceData([...(fd.balanceSheets || [])].reverse().slice(-10));
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

  async function loadNews() {
    setNewsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/stock-news/${ticker}?limit=8`);
      if (res.ok) {
        const d = await res.json();
        setNewsArticles(d.articles || []);
      }
    } catch (e) { console.error(e); }
    finally { setNewsLoading(false); }
  }

  async function loadEarnings() {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/earnings-transcripts?ticker=${ticker}&limit=8`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d) && d.length > 0) {
          setTranscripts(d);
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

  async function loadEarningSurprises() {
    if (earningSurprises.length > 0) return;
    setSurprisesLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/earnings-surprises/${ticker}`);
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d)) setEarningSurprises(d.slice(0, 16));
      }
    } catch (e) { console.error(e); }
    finally { setSurprisesLoading(false); }
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
      const [kmRes, estRes] = await Promise.all([
        fetch(`${BASE_URL}/api/key-metrics/${ticker}?period=annual&limit=5`),
        fetch(`${BASE_URL}/api/analyst-estimates/${ticker}`),
      ]);
      if (kmRes.ok) {
        const d = await kmRes.json();
        setValuationData(Array.isArray(d) ? [...d].reverse() : []);
      }
      // Also pre-load estimates for forward PE calculation (shared with estimates tab)
      if (estRes.ok && estimatesData.length === 0) {
        const d = await estRes.json();
        setEstimatesData(Array.isArray(d) ? d.slice(0, 6) : []);
      }
    } catch(e) { console.error(e); }
    finally { setValuationLoading(false); }
  }

  async function loadEstimates() {
    setEstimatesLoading(true);
    try {
      const [estRes, ptRes, ratRes] = await Promise.all([
        fetch(`${BASE_URL}/api/analyst-estimates/${ticker}`),
        fetch(`${BASE_URL}/api/price-targets/${ticker}`),
        fetch(`${BASE_URL}/api/recommendations/${ticker}`),
      ]);
      if (estRes.ok) {
        const d = await estRes.json();
        setEstimatesData(Array.isArray(d) ? d.slice(0, 6) : []);
      }
      if (ptRes.ok) {
        const d = await ptRes.json();
        setPriceTargets(Array.isArray(d.targets) ? d.targets.slice(0, 15) : []);
      }
      if (ratRes.ok) {
        const d = await ratRes.json();
        setRatings(d);
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

  async function loadEtfHoldings() {
    setEtfHoldingsLoading(true);
    try {
      // Get latest available date first
      const datesRes = await fetch(`${BASE_URL}/api/etf-holdings-dates/${ticker}`);
      if (!datesRes.ok) return;
      const datesData = await datesRes.json();
      if (!Array.isArray(datesData) || datesData.length === 0) return;
      const latestDate = datesData[0].date;

      const res = await fetch(`${BASE_URL}/api/etf-holdings/${ticker}?date=${latestDate}`);
      if (res.ok) {
        const d = await res.json();
        setEtfHoldings(Array.isArray(d) ? d.slice(0, 25) : []);
      }
    } catch (e) { console.error(e); }
    finally { setEtfHoldingsLoading(false); }
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
  const chartColor = isPositive ? '#34C759' : '#FF3B30';

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#34C759" size="large" style={{ marginTop: 32 }} />
      </SafeAreaView>
    );
  }

  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;

  // ─── Latest financials for extra metrics ─────────────────
  const latestIncome = incomeData[incomeData.length - 1];
  const latestCF = cashFlowData[cashFlowData.length - 1];

  const isEtf = !!profile?.isEtf;
  const MAIN_TABS = ALL_TABS.filter(t => {
    if (isEtf && t.hideForEtf) return false;
    if (!isEtf && t.etfOnly) return false;
    return true;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: ticker || '',
          headerBackTitle: 'Zurück',
          headerStyle: { backgroundColor: '#1C1C1E' },
          headerTintColor: '#F8FAFC',
          headerRight: () => (
            <TouchableOpacity onPress={toggleWatchlist} disabled={watchlistLoading} style={{ marginRight: 4 }}>
              <Ionicons name={inWatchlist ? 'bookmark' : 'bookmark-outline'} size={22}
                color={inWatchlist ? '#34C759' : '#94A3B8'} />
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
                  {fmtDE(price)} $
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
              color={inWatchlist ? '#000000' : '#34C759'} />
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
              {/* Chart mode toggle */}
              <View style={s.chartModeToggle}>
                <TouchableOpacity
                  style={[s.chartModeBtn, chartMode === 'simple' && s.chartModeBtnActive]}
                  onPress={() => setChartMode('simple')}
                >
                  <Text style={[s.chartModeBtnText, chartMode === 'simple' && s.chartModeBtnTextActive]}>Einfach</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.chartModeBtn, chartMode === 'tradingview' && s.chartModeBtnActive]}
                  onPress={() => setChartMode('tradingview')}
                >
                  <Text style={[s.chartModeBtnText, chartMode === 'tradingview' && s.chartModeBtnTextActive]}>TradingView</Text>
                </TouchableOpacity>
              </View>

              {chartMode === 'tradingview' ? (
                <View style={s.tvContainer}>
                  <WebView
                    source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#000000;overflow:hidden;}</style></head><body><div id="tv" style="width:100%;height:100vh;"></div><script src="https://s3.tradingview.com/tv.js"></script><script>new TradingView.widget({autosize:true,symbol:"${ticker}",interval:"D",timezone:"Europe/Berlin",theme:"dark",style:"1",locale:"de",toolbar_bg:"#1C1C1E",enable_publishing:false,hide_side_toolbar:true,allow_symbol_change:false,save_image:false,container_id:"tv"});</script></body></html>` }}
                    style={s.tvWebView}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                    renderLoading={() => (
                      <View style={s.tvLoading}>
                        <ActivityIndicator color="#34C759" size="small" />
                        <Text style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>TradingView lädt...</Text>
                      </View>
                    )}
                  />
                </View>
              ) : chartLoading ? (
                <View style={s.chartLoading}><ActivityIndicator color="#34C759" size="small" /></View>
              ) : chart && chartPoints.length > 1 ? (
                <>
                  <View style={s.chartPerfRow}>
                    <Text style={[s.chartPerfChange, { color: chartColor }]}>
                      {isPositive ? '+' : ''}
                      {fmtDE(chart.periodChange)}
                      {' '}({isPositive ? '+' : ''}{fmtDE(chart.periodChangePct)} %)
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

            {/* Kennzahlen — nur für Aktien */}
            {!isEtf && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>KENNZAHLEN</Text>
              <View style={s.metricsGrid}>
                <MetricCard label="Marktkapital." value={formatMarketCap(quote?.marketCap)} />
                <MetricCard label="KGV (TTM)" value={quote?.pe ? fmtDE(quote.pe, 1) : '—'} />
                <MetricCard label="KGV (Fwd)" value={
                  estimatesData.length > 0 && estimatesData[0]?.estimatedEpsAvg > 0 && quote?.price
                    ? fmtDE(quote.price / estimatesData[0].estimatedEpsAvg, 1)
                    : '—'
                } />
                <MetricCard label="52W Hoch" value={quote?.yearHigh ? `${fmtDE(quote.yearHigh)} $` : '—'} />
                <MetricCard label="52W Tief" value={quote?.yearLow ? `${fmtDE(quote.yearLow)} $` : '—'} />
                <MetricCard label="Volumen (Tag)" value={formatVolume(quote?.volume)} />
                <MetricCard label="Ø Volumen" value={formatVolume(quote?.avgVolume)} />
                <MetricCard
                  label="Gewinnmarge"
                  value={latestIncome?.netIncomeRatio ? `${fmtDE(latestIncome.netIncomeRatio * 100, 1)} %` : '—'}
                />
              </View>
            </View>
            )}

            {/* Finanzkennzahlen (Bar chart) — nur für Aktien */}
            {!isEtf && <View style={s.section}>
              <Text style={s.sectionTitle}>FINANZKENNZAHLEN</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.finTabs}>
                  {([
                    { key: 'revenue',   label: 'Umsatz' },
                    { key: 'ebitda',    label: 'EBITDA' },
                    { key: 'netIncome', label: 'Gewinn' },
                    { key: 'eps',       label: 'EPS' },
                    { key: 'fcf',       label: 'Freier Cashflow' },
                    { key: 'capex',     label: 'Investitionen' },
                    { key: 'dividends', label: 'Dividenden' },
                    { key: 'shares',    label: 'Aktien im Umlauf' },
                  ] as { key: FinBarTab; label: string }[]).map(t => (
                    <TouchableOpacity key={t.key} onPress={() => setFinBarTab(t.key)}
                      style={[s.finTab, finBarTab === t.key && s.finTabActive]}>
                      <Text style={[s.finTabText, finBarTab === t.key && s.finTabTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {finLoading ? (
                <View style={s.finLoading}><ActivityIndicator color="#34C759" size="small" /></View>
              ) : (() => {
                // Determine data source and field
                const isCashflowTab = finBarTab === 'fcf' || finBarTab === 'capex' || finBarTab === 'dividends';
                const rows = isCashflowTab ? cashFlowData : incomeData;
                const fieldMap: Record<FinBarTab, string> = {
                  revenue: 'revenue',
                  netIncome: 'netIncome',
                  fcf: 'freeCashFlow',
                  ebitda: 'ebitda',
                  eps: 'eps',
                  capex: 'capitalExpenditure',
                  dividends: 'dividendsPaid',
                  shares: 'weightedAverageShsOut',
                };
                const field = fieldMap[finBarTab];
                const isEps = finBarTab === 'eps';
                const isShares = finBarTab === 'shares';
                // EPS and shares use different scale
                const scale = isEps || isShares ? 1 : 1e9;
                const useAbsValue = finBarTab === 'capex' || finBarTab === 'dividends';

                if (!rows.length) return <View style={s.finLoading}><Text style={s.noData}>Keine Daten</Text></View>;

                const barData = rows.map(row => {
                  const rawVal = row[field] ?? 0;
                  const val = useAbsValue ? Math.abs(rawVal) / scale : rawVal / scale;
                  const isNeg = !useAbsValue && val < 0;
                  const displayVal = Math.abs(val);
                  return {
                    value: displayVal || 0.001,
                    label: row.calendarYear || row.date?.slice(0, 4) || '',
                    frontColor: isNeg ? '#FF3B30' : '#34C759',
                    topLabelComponent: () => (
                      <Text style={s.barTopLabel}>
                        {isNeg ? '-' : ''}
                        {isEps ? `${fmtDE(displayVal)} $` : isShares ? formatBigNumber(displayVal * 1e9) : (displayVal >= 100 ? fmtDE(displayVal, 0) : fmtDE(displayVal, 1))}
                      </Text>
                    ),
                  };
                });

                const latestRow = rows[rows.length - 1];
                const prevRow = rows[rows.length - 2];
                const latestRaw = latestRow?.[field] ?? 0;
                const prevRaw = prevRow?.[field] ?? 0;
                const latestVal = useAbsValue ? Math.abs(latestRaw) / scale : latestRaw / scale;
                const prevVal = useAbsValue ? Math.abs(prevRaw) / scale : prevRaw / scale;
                const yoyPct = prevVal !== 0 ? ((latestVal - prevVal) / Math.abs(prevVal)) * 100 : null;

                const latestDisplay = isEps
                  ? `${fmtDE(latestVal)} $`
                  : isShares
                    ? formatBigNumber(latestVal * 1e9)
                    : `${latestVal < 0 ? '-' : ''}${formatBigNumber(Math.abs(latestVal * 1e9))}`;

                return (
                  <>
                    <BarChart
                      data={barData}
                      barWidth={Math.min(28, (SCREEN_WIDTH - 80) / barData.length - 6)}
                      spacing={Math.min(10, (SCREEN_WIDTH - 80) / barData.length - 16)}
                      roundedTop hideRules
                      xAxisColor="rgba(255,255,255,0.08)" yAxisColor="transparent" hideYAxisText
                      noOfSections={4} barBorderRadius={4}
                      xAxisLabelTextStyle={{ color: '#64748B', fontSize: 9 }}
                      backgroundColor="transparent" width={SCREEN_WIDTH - 56} height={150} initialSpacing={8}
                      maxValue={Math.max(...barData.map(d => d.value)) * 1.15}
                    />
                    <View style={s.finSummaryRow}>
                      <Text style={s.finSummaryLabel}>
                        {latestRow?.calendarYear || latestRow?.date?.slice(0, 4)}: {' '}
                        <Text style={s.finSummaryValue}>{latestDisplay}</Text>
                      </Text>
                      {yoyPct !== null && (
                        <Text style={[s.finSummaryPct, { color: yoyPct >= 0 ? '#34C759' : '#FF3B30' }]}>
                          {yoyPct >= 0 ? '▲' : '▼'} {fmtDE(Math.abs(yoyPct), 1)} % YoY
                        </Text>
                      )}
                    </View>
                  </>
                );
              })()}
            </View>}

            {/* Bewertung — nur für Aktien */}
            {!isEtf && keyMetrics && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>BEWERTUNG</Text>
                <View style={s.metricsGrid}>
                  <MetricCard label="KGV (TTM)" value={keyMetrics.peRatio ? fmtDE(keyMetrics.peRatio, 1) : '—'} />
                  <MetricCard label="KUV" value={keyMetrics.priceToSalesRatio ? fmtDE(keyMetrics.priceToSalesRatio, 1) : '—'} />
                  <MetricCard label="KBV" value={keyMetrics.pbRatio ? fmtDE(keyMetrics.pbRatio, 1) : '—'} />
                  <MetricCard label="EV/EBITDA" value={keyMetrics.enterpriseValueOverEBITDA ? fmtDE(keyMetrics.enterpriseValueOverEBITDA, 1) : '—'} />
                  <MetricCard label="FCF-Rendite" value={keyMetrics.fcfYield ? `${fmtDE(keyMetrics.fcfYield * 100, 1)} %` : '—'} />
                  <MetricCard label="Div.-Rendite" value={keyMetrics.dividendYield ? `${fmtDE(keyMetrics.dividendYield * 100, 2)} %` : '—'} />
                </View>
              </View>
            )}

            {/* AI Bulls & Bears — nicht für ETFs */}
            {!isEtf && <View style={s.section}>
              <View style={s.aiHeader}>
                <View style={s.aiTitleRow}>
                  <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI</Text></View>
                  <Text style={s.sectionTitle}>60-SEKUNDEN CHECK</Text>
                </View>
                {!isPremium && (
                  <View style={s.premiumBadge}>
                    <Ionicons name="star" size={10} color="#34C759" />
                    <Text style={s.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
              {isPremium ? (
                aiLoading ? (
                  <View style={s.aiLoadingWrap}>
                    <ActivityIndicator color="#34C759" size="small" />
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
                  <View style={s.lockedIconWrap}><Ionicons name="lock-closed" size={28} color="#34C759" /></View>
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
            </View>}

            {/* ETF Infos */}
            {isEtf && profile?.expenseRatio != null && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>ETF-DETAILS</Text>
                <View style={s.metricsGrid}>
                  <MetricCard label="TER" value={`${fmtDE(profile.expenseRatio * 100, 2)} %`} />
                  {profile?.etfProvider ? <MetricCard label="Anbieter" value={profile.etfProvider} /> : null}
                  {profile?.aum ? <MetricCard label="Volumen (AUM)" value={`${fmtDE(profile.aum / 1e9, 1)} Mrd. $`} /> : null}
                </View>
              </View>
            )}

            {/* Beschreibung */}
            {profile?.description ? (
              <View style={s.section}>
                <Text style={s.sectionTitle}>{isEtf ? 'ÜBER DEN ETF' : 'ÜBER DAS UNTERNEHMEN'}</Text>
                <View style={s.descCard}>
                  <Text style={s.descText} numberOfLines={6}>{profile.description}</Text>
                </View>
              </View>
            ) : null}

            {/* AI Analyse Button */}
            <View style={s.section}>
              <TouchableOpacity
                style={s.aiAnalyseBtn}
                onPress={() => router.push({ pathname: '/(tabs)/ai', params: { ticker: ticker! } })}
              >
                <View style={s.aiAnalyseBadge}>
                  <Text style={s.aiAnalyseBadgeText}>AI</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.aiAnalyseTitle}>60-Sekunden Check</Text>
                  <Text style={s.aiAnalyseSub}>KI-Analyse für {ticker}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#34C759" />
              </TouchableOpacity>
            </View>

            {/* Kursalarm Button */}
            <TouchableOpacity style={s.alertBtn} onPress={() => router.push('/alerts' as any)}>
              <Ionicons name="notifications-outline" size={18} color="#FF3B30" />
              <Text style={s.alertBtnText}>Kursalarm setzen</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF3B30" />
            </TouchableOpacity>

            {/* News */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>NACHRICHTEN</Text>
              {newsLoading ? (
                <ActivityIndicator color="#34C759" size="small" style={{ marginVertical: 12 }} />
              ) : newsArticles.length === 0 ? (
                <Text style={s.noData}>Keine Nachrichten verfügbar</Text>
              ) : (
                <View style={s.newsCard}>
                  {newsArticles.map((article: any, i: number) => {
                    const age = article.publishedDate
                      ? (() => {
                          const diff = Date.now() - new Date(article.publishedDate).getTime();
                          const h = Math.floor(diff / 3600000);
                          if (h < 1) return 'Gerade eben';
                          if (h < 24) return `vor ${h}h`;
                          const d = Math.floor(h / 24);
                          return `vor ${d}T`;
                        })()
                      : '';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[s.newsRow, i > 0 && s.newsRowBorder]}
                        onPress={() => Linking.openURL(article.url)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.newsTitle} numberOfLines={2}>{article.title}</Text>
                          <View style={s.newsMeta}>
                            <Text style={s.newsSource}>{article.site}</Text>
                            {age ? <Text style={s.newsAge}>{age}</Text> : null}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#2c2c2e" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

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
                        <Text style={[s.similarChange, { color: pos ? '#34C759' : '#FF3B30' }]}>
                          {pos ? '+' : ''}{fmtDE(chg, 1)} %
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
            {/* Sub-tab bar */}
            <View style={s.subTabBar}>
              <TouchableOpacity
                style={[s.subTabBtn, earningsSubTab === 'transcript' && s.subTabBtnActive]}
                onPress={() => setEarningsSubTab('transcript')}
              >
                <Text style={[s.subTabText, earningsSubTab === 'transcript' && s.subTabTextActive]}>Transkript</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.subTabBtn, earningsSubTab === 'surprises' && s.subTabBtnActive]}
                onPress={() => {
                  setEarningsSubTab('surprises');
                  loadEarningSurprises();
                }}
              >
                <Text style={[s.subTabText, earningsSubTab === 'surprises' && s.subTabTextActive]}>Earnings Surprises</Text>
              </TouchableOpacity>
            </View>

            {/* ── SUB-TAB: TRANSKRIPT ── */}
            {earningsSubTab === 'transcript' && (
              transcriptLoading ? (
                <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
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
                          setAiSummary(null);
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
                                <Ionicons name="star" size={10} color="#34C759" />
                                <Text style={s.premiumBadgeText}>Premium</Text>
                              </View>
                            )}
                          </View>
                          {isPremium ? (
                            summaryLoading ? (
                              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 12 }}>
                                <ActivityIndicator color="#34C759" size="small" />
                                <Text style={s.aiLoadingText}>Zusammenfassung wird generiert…</Text>
                              </View>
                            ) : aiSummary ? (
                              aiSummary.split('\n\n').map((para, i) => (
                                <Text key={i} style={s.aiSummaryText}>{para}</Text>
                              ))
                            ) : (
                              <TouchableOpacity
                                style={[s.upgradeBtn, { alignSelf: 'flex-start' }]}
                                onPress={() => { const t = transcripts[selectedTIdx]; if (t) loadAiSummary(t); }}
                              >
                                <Ionicons name="sparkles" size={13} color="#020617" />
                                <Text style={[s.upgradeBtnText, { fontSize: 13 }]}>Zusammenfassung generieren</Text>
                              </TouchableOpacity>
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
              )
            )}

            {/* ── SUB-TAB: EARNINGS SURPRISES ── */}
            {earningsSubTab === 'surprises' && (
              surprisesLoading ? (
                <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
              ) : earningSurprises.length === 0 ? (
                <View style={s.tabLoading}><Text style={s.noData}>Keine Earnings Surprises verfügbar</Text></View>
              ) : (
                <View style={s.surprisesTable}>
                  {/* Table header */}
                  <View style={s.surprisesHeader}>
                    <Text style={[s.surprisesCell, s.surprisesHeaderText, { flex: 1.4 }]}>Quartal</Text>
                    <Text style={[s.surprisesCell, s.surprisesHeaderText, { flex: 1.2, textAlign: 'right' }]}>Erwartet</Text>
                    <Text style={[s.surprisesCell, s.surprisesHeaderText, { flex: 1.2, textAlign: 'right' }]}>Tatsächlich</Text>
                    <Text style={[s.surprisesCell, s.surprisesHeaderText, { flex: 1, textAlign: 'right' }]}>Surprise</Text>
                  </View>
                  {earningSurprises.map((item, i) => {
                    const surprisePct = item.actualEarningResult != null && item.estimatedEarning != null && item.estimatedEarning !== 0
                      ? ((item.actualEarningResult - item.estimatedEarning) / Math.abs(item.estimatedEarning)) * 100
                      : null;
                    const isPositive = surprisePct != null && surprisePct >= 0;
                    const isNegative = surprisePct != null && surprisePct < 0;
                    const dateStr = item.date ? new Date(item.date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) : '–';
                    const fmtEps = (v: number | null) =>
                      v != null ? v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–';
                    return (
                      <View key={i} style={[s.surprisesRow, i % 2 === 0 && s.surprisesRowAlt]}>
                        <Text style={[s.surprisesCell, { flex: 1.4, color: '#94A3B8' }]}>{dateStr}</Text>
                        <Text style={[s.surprisesCell, { flex: 1.2, textAlign: 'right', color: '#CBD5E1' }]}>
                          {fmtEps(item.estimatedEarning)}
                        </Text>
                        <Text style={[s.surprisesCell, { flex: 1.2, textAlign: 'right', color: '#CBD5E1' }]}>
                          {fmtEps(item.actualEarningResult)}
                        </Text>
                        <Text style={[s.surprisesCell, {
                          flex: 1,
                          textAlign: 'right',
                          fontWeight: '600',
                          color: isPositive ? '#34C759' : isNegative ? '#FF3B30' : '#94A3B8',
                        }]}>
                          {surprisePct != null
                            ? `${isPositive ? '+' : ''}${surprisePct.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                            : '–'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SUPERINVESTOREN
        ════════════════════════════════════════════════ */}
        {activeTab === 'investors' && (
          <View style={s.tabContent}>
            {siLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
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
                      <Text style={[s.siSummaryVal, { color: '#34C759' }]}>{siSummary.increasingTrends}</Text>
                      <Text style={s.siSummaryLabel}>Aufgestockt</Text>
                    </View>
                    <View style={s.siSummaryItem}>
                      <Text style={[s.siSummaryVal, { color: '#FF3B30' }]}>{siSummary.decreasingTrends}</Text>
                      <Text style={s.siSummaryLabel}>Reduziert</Text>
                    </View>
                  </View>
                )}
                {siPositions.map((pos: any, i: number) => {
                  const trend = pos.position?.trend;
                  const isNew = pos.position?.isNewPosition;
                  const trendColor = isNew ? '#94A3B8' : trend === 'increasing' ? '#34C759' : trend === 'decreasing' ? '#FF3B30' : '#94A3B8';
                  const trendLabel = isNew ? 'Neu' : trend === 'increasing' ? '▲' : trend === 'decreasing' ? '▼' : '—';
                  const slug = pos.investor?.slug || pos.investor?.name?.toLowerCase();
                  const photoUrl = INVESTOR_PHOTOS[slug];
                  return (
                    <TouchableOpacity key={i} style={s.siRow}
                      onPress={() => router.push(`/investor/${slug}`)}>
                      <View style={s.siAvatar}>
                        {photoUrl
                          ? <Image source={{ uri: photoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                          : <Text style={s.siAvatarText}>{(pos.investor?.name || '?').charAt(0)}</Text>}
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
                            {pos.position?.changeSharePercentage > 0 ? '+' : ''}{fmtDE(pos.position?.changeSharePercentage, 1)} %
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
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : insiderData.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Insider-Transaktionen</Text></View>
            ) : (
              insiderData.map((tx: any, i: number) => {
                const isBuy = tx.acquiredDisposedCode === 'A' || tx.transactionType?.toLowerCase().includes('buy');
                const txColor = isBuy ? '#34C759' : '#FF3B30';
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
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : (() => {
              const rawRows = finDetailTab === 'balance' ? balanceData : finDetailTab === 'cashflow' ? cashFlowData : incomeData;
              const rows = [...rawRows].reverse();
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
                              display = `${fmtDE(val * (f.key === 'eps' ? 1 : 100), f.key === 'eps' ? 2 : 1)}${f.key === 'eps' ? ' $' : ' %'}`;
                            } else {
                              display = formatBigNumber(Math.abs(val));
                              if (val < 0) display = '-' + display;
                            }
                          }
                          const isNeg = val !== null && val !== undefined && val < 0;
                          return (
                            <Text key={ri} style={[s.finTableCell, s.finTableValue, isNeg && { color: '#FF3B30' }]}>
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
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : valuationData.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Bewertungsdaten</Text></View>
            ) : (() => {
              const valuationRows = [...valuationData].reverse();
              const years = valuationRows.map(r => r.calendarYear || r.date?.slice(0,4) || '');
              const fields = [
                { label: 'KGV (Jahresende)', key: 'peRatio', isPercent: false },
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
                        {valuationRows.map((row, ri) => {
                          const val = row[f.key];
                          let display = '—';
                          if (val !== null && val !== undefined && !isNaN(val)) {
                            display = f.isPercent ? `${fmtDE(val * 100, 1)} %` : fmtDE(val, 1);
                          }
                          return <Text key={ri} style={[s.finTableCell, s.finTableValue]}>{display}</Text>;
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            })()}

            {/* ── Forward KGV ──────────────────────────── */}
            {!valuationLoading && estimatesData.length > 0 && (() => {
              const currentYear = new Date().getFullYear();
              const currentPE = quote?.pe && quote.pe > 0 ? quote.pe : null;
              const currentEPS = quote?.eps && quote.eps > 0 ? quote.eps : null;
              const currentPrice2 = quote?.price ?? 0;

              const futureRows = estimatesData
                .filter((e: any) => parseInt(e.date?.slice(0, 4), 10) > currentYear)
                .sort((a: any, b: any) => a.date.localeCompare(b.date))
                .slice(0, 4)
                .map((e: any) => ({
                  year: e.date?.slice(0, 4),
                  eps: e.estimatedEpsAvg,
                  pe: e.estimatedEpsAvg > 0 && currentPrice2 > 0 ? currentPrice2 / e.estimatedEpsAvg : null,
                }));

              if (futureRows.length === 0) return null;

              const analystCount = estimatesData[0]?.numberAnalystsEstimatedEps;

              function fwdPeColor(pe: number | null) {
                return pe != null ? '#F8FAFC' : '#475569';
              }

              return (
                <View style={[s.section, { marginTop: 20 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={s.sectionTitle}>FORWARD KGV</Text>
                    {analystCount ? (
                      <Text style={{ color: '#475569', fontSize: 11 }}>{analystCount} Analysten</Text>
                    ) : null}
                  </View>

                  <View style={s.fwdPeCard}>
                    {/* Header row */}
                    <View style={[s.fwdPeRow, { backgroundColor: '#000000' }]}>
                      <Text style={s.fwdPeHeaderLabel}>Jahr</Text>
                      <Text style={s.fwdPeHeaderLabel}>EPS</Text>
                      <Text style={s.fwdPeHeaderLabel}>KGV</Text>
                    </View>

                    {/* Actual current */}
                    <View style={[s.fwdPeRow, { backgroundColor: '#1C1C1E' }]}>
                      <Text style={s.fwdPeYear}>{currentYear} (TTM)</Text>
                      <Text style={s.fwdPeEPS}>{currentEPS ? `${fmtDE(currentEPS)} $` : '—'}</Text>
                      <Text style={[s.fwdPeValue, { color: '#F8FAFC' }]}>
                        {currentPE ? `${fmtDE(currentPE, 1)}x` : '—'}
                      </Text>
                    </View>

                    {/* Future estimates */}
                    {futureRows.map((row, i) => (
                      <View key={i} style={[s.fwdPeRow, i % 2 === 0 && s.fwdPeRowAlt]}>
                        <Text style={s.fwdPeYear}>{row.year}</Text>
                        <Text style={s.fwdPeEPS}>{row.eps != null ? `${fmtDE(row.eps)} $` : '—'}</Text>
                        <Text style={[s.fwdPeValue, { color: fwdPeColor(row.pe) }]}>
                          {row.pe != null ? `${fmtDE(row.pe, 1)}x` : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={{ color: '#475569', fontSize: 10, marginTop: 6, paddingHorizontal: 2 }}>
                    Forward-KGV = Aktueller Kurs ÷ Konsensus-EPS
                  </Text>
                </View>
              );
            })()}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: HOLDINGS (ETF)
        ════════════════════════════════════════════════ */}
        {activeTab === 'holdings' && (
          <View style={s.tabContent}>
            {etfHoldingsLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : etfHoldings.length === 0 ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Holdings-Daten verfügbar</Text></View>
            ) : (
              <View>
                <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>TOP HOLDINGS</Text>
                <View style={s.holdingsCard}>
                  {etfHoldings.map((h: any, i: number) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.holdingRow, i > 0 && s.holdingRowBorder]}
                      onPress={() => h.symbol && router.push(`/stock/${h.symbol}`)}
                      activeOpacity={h.symbol ? 0.7 : 1}
                    >
                      <View style={s.holdingRank}>
                        <Text style={s.holdingRankText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.holdingSymbol}>{h.symbol || 'N/A'}</Text>
                        <Text style={s.holdingName} numberOfLines={1}>{h.name}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.holdingPct}>{h.pctVal != null ? `${fmtDE(h.pctVal, 2)} %` : '—'}</Text>
                        {h.valUsd > 0 && (
                          <Text style={s.holdingVal}>{formatMarketCap(h.valUsd)}</Text>
                        )}
                      </View>
                      {h.symbol && <Ionicons name="chevron-forward" size={14} color="#2c2c2e" style={{ marginLeft: 6 }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SCHÄTZUNGEN
        ════════════════════════════════════════════════ */}
        {activeTab === 'estimates' && (
          <View style={s.tabContent}>
            {estimatesLoading ? (
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : (
              <>
                {/* ── Analyst Rating Consensus ── */}
                {ratings && (() => {
                  const buy = (ratings.analystRatingsbuy || 0) + (ratings.analystRatingsStrongBuy || 0);
                  const hold = ratings.analystRatingsHold || 0;
                  const sell = (ratings.analystRatingsSell || 0) + (ratings.analystRatingsStrongSell || 0);
                  const total = buy + hold + sell;
                  if (total === 0) return null;
                  const buyPct = (buy / total) * 100;
                  const holdPct = (hold / total) * 100;
                  const sellPct = (sell / total) * 100;
                  const consensus = buyPct >= 60 ? 'Kaufen' : buyPct >= 40 ? 'Halten' : 'Verkaufen';
                  const consensusColor = buyPct >= 60 ? '#34C759' : buyPct >= 40 ? '#F59E0B' : '#FF3B30';
                  return (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>ANALYSTEN-RATING</Text>
                      <View style={s.ratingCard}>
                        <View style={s.ratingConsensus}>
                          <Text style={[s.ratingConsensusLabel, { color: consensusColor }]}>{consensus}</Text>
                          <Text style={s.ratingTotal}>{total} Analysten</Text>
                        </View>
                        {/* Bar */}
                        <View style={s.ratingBarContainer}>
                          {buyPct > 0 && <View style={[s.ratingBarSegment, { flex: buyPct, backgroundColor: '#34C759' }]} />}
                          {holdPct > 0 && <View style={[s.ratingBarSegment, { flex: holdPct, backgroundColor: '#F59E0B' }]} />}
                          {sellPct > 0 && <View style={[s.ratingBarSegment, { flex: sellPct, backgroundColor: '#FF3B30' }]} />}
                        </View>
                        <View style={s.ratingLegend}>
                          <View style={s.ratingLegendItem}>
                            <View style={[s.ratingDot, { backgroundColor: '#34C759' }]} />
                            <Text style={s.ratingLegendText}>Kaufen ({buy})</Text>
                          </View>
                          <View style={s.ratingLegendItem}>
                            <View style={[s.ratingDot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={s.ratingLegendText}>Halten ({hold})</Text>
                          </View>
                          <View style={s.ratingLegendItem}>
                            <View style={[s.ratingDot, { backgroundColor: '#FF3B30' }]} />
                            <Text style={s.ratingLegendText}>Verkaufen ({sell})</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })()}

                {/* ── Price Targets ── */}
                {priceTargets.length > 0 && (() => {
                  const currentPrice = quote?.price;
                  const targets = priceTargets.map(t => t.priceTarget).filter(Boolean);
                  const avgTarget = targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : null;
                  const highTarget = targets.length > 0 ? Math.max(...targets) : null;
                  const lowTarget = targets.length > 0 ? Math.min(...targets) : null;
                  const upside = avgTarget && currentPrice ? ((avgTarget - currentPrice) / currentPrice) * 100 : null;
                  return (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>KURSZIELE</Text>
                      <View style={s.ptCard}>
                        <View style={s.ptMainRow}>
                          <View style={s.ptMainItem}>
                            <Text style={s.ptMainLabel}>Ø Kursziel</Text>
                            <Text style={s.ptMainValue}>{avgTarget != null ? `${fmtDE(avgTarget, 2)} $` : '—'}</Text>
                          </View>
                          {upside != null && (
                            <View style={[s.ptUpsideBadge, { backgroundColor: upside >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                              <Text style={[s.ptUpsideText, { color: upside >= 0 ? '#34C759' : '#FF3B30' }]}>
                                {upside >= 0 ? '+' : ''}{fmtDE(upside, 1)} %
                              </Text>
                              <Text style={s.ptUpsideLabel}>Potenzial</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.ptRangeRow}>
                          <View style={s.ptRangeItem}>
                            <Text style={s.ptRangeLabel}>Hoch</Text>
                            <Text style={[s.ptRangeValue, { color: '#34C759' }]}>{highTarget != null ? `${fmtDE(highTarget, 2)} $` : '—'}</Text>
                          </View>
                          <View style={s.ptRangeDivider} />
                          <View style={s.ptRangeItem}>
                            <Text style={s.ptRangeLabel}>Tief</Text>
                            <Text style={[s.ptRangeValue, { color: '#FF3B30' }]}>{lowTarget != null ? `${fmtDE(lowTarget, 2)} $` : '—'}</Text>
                          </View>
                          <View style={s.ptRangeDivider} />
                          <View style={s.ptRangeItem}>
                            <Text style={s.ptRangeLabel}>Aktuell</Text>
                            <Text style={s.ptRangeValue}>{currentPrice != null ? `${fmtDE(currentPrice, 2)} $` : '—'}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Recent analyst calls */}
                      <Text style={[s.sectionTitle, { marginTop: 16 }]}>ANALYSTEN-CALLS</Text>
                      <View style={s.ptCallsList}>
                        {priceTargets.slice(0, 10).map((pt: any, i: number) => {
                          const date = pt.publishedDate ? new Date(pt.publishedDate).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
                          const upPct = currentPrice && pt.priceTarget ? ((pt.priceTarget - currentPrice) / currentPrice) * 100 : null;
                          return (
                            <View key={i} style={[s.ptCallRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2C2C2E' }]}>
                              <View style={{ flex: 1 }}>
                                <Text style={s.ptCallCompany} numberOfLines={1}>{pt.analystCompany || '—'}</Text>
                                <Text style={s.ptCallDate}>{date}</Text>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={s.ptCallTarget}>{pt.priceTarget != null ? `${fmtDE(pt.priceTarget, 2)} $` : '—'}</Text>
                                {upPct != null && (
                                  <Text style={[s.ptCallUpside, { color: upPct >= 0 ? '#34C759' : '#FF3B30' }]}>
                                    {upPct >= 0 ? '+' : ''}{fmtDE(upPct, 1)} %
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* ── Aktuelle Kennzahlen ── */}
                {(quote?.eps || latestIncome?.revenue) && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>AKTUELLE KENNZAHLEN</Text>
                    <View style={s.metricsGrid}>
                      {quote?.eps ? <MetricCard label="EPS (TTM)" value={`${fmtDE(quote.eps)} $`} /> : null}
                      {latestIncome?.revenue ? <MetricCard label="Umsatz (letzt. GJ)" value={formatBigNumber(latestIncome.revenue)} /> : null}
                      {latestIncome?.netIncome ? <MetricCard label="Gewinn (letzt. GJ)" value={formatBigNumber(latestIncome.netIncome)} /> : null}
                    </View>
                  </View>
                )}

                {/* ── EPS & Revenue Estimates ── */}
                {estimatesData.length === 0 ? (
                  !ratings && priceTargets.length === 0 && (
                    <View style={s.tabLoading}><Text style={s.noData}>Keine Schätzungen verfügbar</Text></View>
                  )
                ) : (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>EPS & UMSATZ-SCHÄTZUNGEN</Text>
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
                              <Text style={s.estimateValue}>{epsAvg != null ? `${fmtDE(epsAvg)} $` : '—'}</Text>
                              {epsLow != null && epsHigh != null && (
                                <Text style={s.estimateRange}>{fmtDE(epsLow)} $ – {fmtDE(epsHigh)} $</Text>
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
                  </View>
                )}
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
              <View style={s.tabLoading}><ActivityIndicator color="#34C759" /></View>
            ) : !dividendData ? (
              <View style={s.tabLoading}><Text style={s.noData}>Keine Dividenden-Daten</Text></View>
            ) : (() => {
              const ci = dividendData.currentInfo;
              const yearlyData = dividendData.historical as Record<string, number> | null;
              const quarterly = dividendData.quarterlyHistory as any[] | null;
              const growthRate = ci?.dividendGrowthRate;
              return (
                <>
                  {/* Key metrics */}
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>DIVIDENDEN-ÜBERSICHT</Text>
                    <View style={s.metricsGrid}>
                      <MetricCard label="Dividendenrendite" value={ci?.currentYield ? `${fmtDE(ci.currentYield * 100, 2)} %` : '—'} />
                      <MetricCard label="Div./Aktie (12M)" value={ci?.dividendPerShareTTM ? `${fmtDE(ci.dividendPerShareTTM)} $` : '—'} />
                      <MetricCard label="Ausschüttungsquote" value={ci?.payoutRatio ? `${fmtDE(ci.payoutRatio * 100, 1)} %` : '—'} />
                      <MetricCard label="Wachstum (Ø p.a.)" value={growthRate != null ? `${fmtDE(growthRate, 1)} %` : '—'} />
                      <MetricCard label="Qualität" value={(() => {
                        const q = ci?.dividendQuality;
                        if (!q?.category || q.category === '—') return '—';
                        const labels: Record<string, string> = {
                          excellent: 'Hervorragend', good: 'Gut', average: 'Durchschnittl.',
                          poor: 'Schwach', none: '—',
                        };
                        return labels[q.category.toLowerCase()] || q.category;
                      })()} />
                    </View>
                  </View>

                  {/* Yearly bar chart */}
                  {yearlyData && Object.keys(yearlyData).length > 0 && (() => {
                    const entries = Object.entries(yearlyData)
                      .filter(([, v]) => v > 0)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .slice(-10);
                    const barData = entries.map(([year, val]) => ({
                      value: val || 0.001,
                      label: year.slice(2),
                      frontColor: '#34C759',
                      topLabelComponent: () => (
                        <Text style={s.barTopLabel}>{fmtDE(val)} $</Text>
                      ),
                    }));
                    return (
                      <View style={s.section}>
                        <Text style={s.sectionTitle}>JAHRES-DIVIDENDE JE AKTIE</Text>
                        <View style={s.chartCard}>
                          <BarChart
                            data={barData}
                            barWidth={Math.min(32, (SCREEN_WIDTH - 80) / barData.length - 6)}
                            spacing={Math.min(12, (SCREEN_WIDTH - 80) / barData.length - 18)}
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

                  {/* Quarterly history */}
                  {quarterly && quarterly.length > 0 && (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>QUARTALSVERLAUF</Text>
                      <View style={s.divHistoryCard}>
                        {quarterly.slice(0, 12).map((d: any, i: number) => (
                          <View key={i} style={[s.divHistoryRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#2C2C2E' }]}>
                            <Text style={s.divHistoryDate}>
                              {d.date ? new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </Text>
                            <Text style={s.divHistoryAmount}>{fmtDE(Number(d.amount || d.dividend || d.adjDividend || 0), 4)} $</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              );
            })()}
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
  'Max': 'seit Beginn',
};

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  if (val >= 100) return fmtDE(val, 1);
  return fmtDE(val, 2);
}

const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function formatDateLabel(dateStr: string, range: RangeKey): string {
  const d = new Date(dateStr);
  const mon = MONTHS_DE[d.getMonth()];
  if (range === '1M') return `${d.getDate()}. ${mon}`;
  if (range === '5J') return `${mon} ${d.getFullYear()}`;
  return `${mon} ${String(d.getFullYear()).slice(2)}`;
}

function fmtDE(val: number, decimals = 2): string {
  return val.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatBigNumber(val?: number): string {
  if (!val && val !== 0) return '—';
  if (Math.abs(val) >= 1e12) return `${fmtDE(val / 1e12, 2)} Bio. $`;
  if (Math.abs(val) >= 1e9) return `${fmtDE(val / 1e9, 1)} Mrd. $`;
  if (Math.abs(val) >= 1e6) return `${fmtDE(val / 1e6, 0)} Mio. $`;
  return `${fmtDE(val, 0)} $`;
}

function formatMarketCap(val?: number): string {
  if (!val) return '—';
  if (val >= 1e12) return `${fmtDE(val / 1e12, 1)} Bio. $`;
  if (val >= 1e9) return `${fmtDE(val / 1e9, 1)} Mrd. $`;
  if (val >= 1e6) return `${fmtDE(val / 1e6, 0)} Mio. $`;
  return `${fmtDE(val, 0)} $`;
}

function formatVolume(val?: number): string {
  if (!val) return '—';
  if (val >= 1e6) return `${fmtDE(val / 1e6, 1)} Mio.`;
  if (val >= 1e3) return `${fmtDE(val / 1e3, 0)} Tsd.`;
  return fmtDE(val, 0);
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scroll: { flex: 1, backgroundColor: '#000000' },

  // Price Header
  priceHeader: { backgroundColor: '#1C1C1E', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
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
  watchlistBtnActive: { backgroundColor: '#34C759', borderColor: '#34C759' },
  watchlistBtnText: { color: '#34C759', fontWeight: '600', fontSize: 14 },
  watchlistBtnTextActive: { color: '#000000' },

  // Main Tab Bar
  mainTabBar: { backgroundColor: '#1C1C1E', borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  mainTabBarContent: { paddingHorizontal: 16, paddingVertical: 0, gap: 4 },
  mainTab: { paddingHorizontal: 16, paddingVertical: 13 },
  mainTabActive: { borderBottomWidth: 2, borderBottomColor: '#34C759' },
  mainTabText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  mainTabTextActive: { color: '#34C759' },

  // Tab Content wrapper
  tabContent: { padding: 16, gap: 12 },
  tabLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },

  // Chart
  // Chart mode toggle
  chartModeToggle: { flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 10, padding: 3, marginHorizontal: 16, marginBottom: 12, marginTop: 4 },
  chartModeBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  chartModeBtnActive: { backgroundColor: '#2C2C2E' },
  chartModeBtnText: { color: '#475569', fontSize: 13, fontWeight: '500' },
  chartModeBtnTextActive: { color: '#F8FAFC', fontWeight: '600' },
  tvContainer: { height: 380, marginHorizontal: 0, borderRadius: 0, overflow: 'hidden' },
  tvWebView: { flex: 1, backgroundColor: '#000000' },
  tvLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },

  chartCard: {
    backgroundColor: '#1C1C1E', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden',
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
    borderTopWidth: 1, borderTopColor: '#2C2C2E', marginTop: 4,
  },
  rangeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rangeBtnActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  rangeBtnText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  rangeBtnTextActive: { color: '#34C759' },

  // Sections
  section: { padding: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  descCard: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2C2C2E' },
  descText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },

  // Finanzen bar chart
  finTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  finTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#2C2C2E' },
  finTabActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#34C759' },
  finTabText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  finTabTextActive: { color: '#34C759' },
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
  aiBadgeText: { color: '#34C759', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)',
  },
  premiumBadgeText: { color: '#34C759', fontSize: 10, fontWeight: '700' },
  aiLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24, justifyContent: 'center' },
  aiLoadingText: { color: '#64748B', fontSize: 13 },
  aiBullsBears: { gap: 12 },
  aiCol: { borderRadius: 14, padding: 16, borderWidth: 1 },
  bullsCol: { backgroundColor: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' },
  bearsCol: { backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' },
  aiColHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bullEmoji: { fontSize: 18 },
  bearEmoji: { fontSize: 18 },
  bullLabel: { color: '#34C759', fontSize: 13, fontWeight: '700' },
  bearLabel: { color: '#FF3B30', fontSize: 13, fontWeight: '700' },
  argRow: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' },
  bullDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34C759', marginTop: 6, flexShrink: 0 },
  bearDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', marginTop: 6, flexShrink: 0 },
  argText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, flex: 1 },
  lockedCard: {
    backgroundColor: '#1C1C1E', borderRadius: 16,
    borderWidth: 1, borderColor: '#2C2C2E', padding: 24, alignItems: 'center',
  },
  lockedIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  lockedTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  lockedDesc: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  blurPreview: { width: '100%', marginBottom: 20, gap: 8, opacity: 0.15 },
  previewRow: { backgroundColor: '#2C2C2E', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  previewLine: { height: 10, backgroundColor: '#2c2c2e', borderRadius: 5 },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#34C759', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13,
  },
  upgradeBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },

  // Similar stocks
  similarCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E',
    padding: 12, alignItems: 'center', gap: 6, minWidth: 80,
  },
  similarTicker: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
  similarChange: { fontSize: 11, fontWeight: '600' },

  // Earnings sub-tabs
  subTabBar: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  subTabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#2C2C2E', backgroundColor: '#1C1C1E',
  },
  subTabBtnActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#34C759' },
  subTabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  subTabTextActive: { color: '#34C759' },

  // Earnings surprises table
  surprisesTable: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#2C2C2E' },
  surprisesHeader: {
    flexDirection: 'row', backgroundColor: '#1C1C1E',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2C2C2E',
  },
  surprisesHeaderText: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  surprisesRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#0d0d0f' },
  surprisesRowAlt: { backgroundColor: '#000000' },
  surprisesCell: { fontSize: 13, color: '#CBD5E1' },

  // Earnings tab
  quarterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#2C2C2E', backgroundColor: '#1C1C1E',
  },
  quarterChipActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#34C759' },
  quarterChipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  quarterChipTextActive: { color: '#34C759' },
  earningsDate: { color: '#475569', fontSize: 12, marginTop: 4 },
  aiSummaryCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  aiSummaryCardLocked: { borderColor: '#2C2C2E' },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiSummaryTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  aiSummaryText: { color: '#CBD5E1', fontSize: 13, lineHeight: 21, marginBottom: 8 },
  transcriptCard: {
    backgroundColor: '#1C1C1E', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  transcriptTitle: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  transcriptText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  transcriptToggle: { marginTop: 12, paddingVertical: 8, alignItems: 'center' },
  transcriptToggleText: { color: '#34C759', fontSize: 13, fontWeight: '600' },

  // Investors tab
  siSummaryRow: {
    flexDirection: 'row', backgroundColor: '#1C1C1E', borderRadius: 14,
    borderWidth: 1, borderColor: '#2C2C2E', padding: 16,
  },
  siSummaryItem: { flex: 1, alignItems: 'center' },
  siSummaryVal: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  siSummaryLabel: { color: '#475569', fontSize: 11, marginTop: 2 },
  siRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1C1C1E', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  siAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
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
    backgroundColor: '#1C1C1E', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2C2C2E',
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
    backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#2C2C2E', alignItems: 'center',
  },
  finDetailTabActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#34C759' },
  finDetailTabText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  finDetailTabTextActive: { color: '#34C759' },
  finTableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  finTableHeaderText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  finTableRow: { flexDirection: 'row', paddingVertical: 10 },
  finTableRowAlt: { backgroundColor: 'rgba(30,41,59,0.4)' },
  finTableCell: { width: 80, textAlign: 'right', paddingHorizontal: 6 },
  finTableLabelCell: { width: 130, textAlign: 'left' },
  finTableLabel: { color: '#94A3B8', fontSize: 12 },
  finTableValue: { color: '#F8FAFC', fontSize: 12, fontWeight: '500' },

  // Estimates tab
  estimateCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', marginHorizontal: 16, marginBottom: 10, padding: 16 },
  estimateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  estimateYear: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  estimateAnalysts: { color: '#64748B', fontSize: 12 },
  estimateRow: { flexDirection: 'row', alignItems: 'flex-start' },
  estimateItem: { flex: 1, paddingHorizontal: 4 },
  estimateDivider: { width: 1, backgroundColor: '#2C2C2E', marginHorizontal: 8, alignSelf: 'stretch' },
  estimateLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  estimateValue: { color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  estimateRange: { color: '#475569', fontSize: 11 },

  // Rating card
  ratingCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', padding: 16 },
  ratingConsensus: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  ratingConsensusLabel: { fontSize: 22, fontWeight: '800' },
  ratingTotal: { color: '#64748B', fontSize: 12 },
  ratingBarContainer: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 14, gap: 2 },
  ratingBarSegment: { borderRadius: 3 },
  ratingLegend: { flexDirection: 'row', gap: 16 },
  ratingLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingDot: { width: 8, height: 8, borderRadius: 4 },
  ratingLegendText: { color: '#94A3B8', fontSize: 12 },

  // Price target card
  ptCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', padding: 16, marginBottom: 4 },
  ptMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ptMainItem: {},
  ptMainLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  ptMainValue: { color: '#F8FAFC', fontSize: 24, fontWeight: '800' },
  ptUpsideBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  ptUpsideText: { fontSize: 18, fontWeight: '800' },
  ptUpsideLabel: { color: '#64748B', fontSize: 11, marginTop: 2 },
  ptRangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  ptRangeItem: { flex: 1, alignItems: 'center' },
  ptRangeDivider: { width: 1, height: 28, backgroundColor: '#2C2C2E' },
  ptRangeLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  ptRangeValue: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  ptCallsList: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  ptCallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  ptCallCompany: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  ptCallDate: { color: '#475569', fontSize: 11, marginTop: 2 },
  ptCallTarget: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  ptCallUpside: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'right' },

  // Dividends tab
  divHistoryCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  divHistoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  divHistoryDate: { color: '#94A3B8', fontSize: 13 },
  divHistoryAmount: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },

  // News
  newsCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  aiAnalyseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1C1C1E', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#34C75930',
  },
  aiAnalyseBadge: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#34C75920', borderWidth: 1, borderColor: '#34C75940',
    alignItems: 'center', justifyContent: 'center',
  },
  aiAnalyseBadgeText: { fontSize: 11, fontWeight: '800', color: '#34C759' },
  aiAnalyseTitle: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  aiAnalyseSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Kursalarm Button
  alertBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
    padding: 14, marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  alertBtnText: { flex: 1, color: '#FF3B30', fontSize: 14, fontWeight: '600' },

  newsRow: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  newsRowBorder: { borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  newsTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '500', lineHeight: 20, marginBottom: 6 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  newsSource: { color: '#475569', fontSize: 12, fontWeight: '600' },
  newsAge: { color: '#2c2c2e', fontSize: 12 },

  // Forward KGV
  fwdPeCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden' },
  fwdPeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  fwdPeRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  fwdPeHeaderLabel: { color: '#475569', fontSize: 11, fontWeight: '700', flex: 1, letterSpacing: 0.5 },
  fwdPeYear: { color: '#94A3B8', fontSize: 13, flex: 1 },
  fwdPeEPS: { color: '#64748B', fontSize: 13, flex: 1 },
  fwdPeValue: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'right' as const },

  // ETF Holdings
  holdingsCard: { backgroundColor: '#1C1C1E', borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2E', overflow: 'hidden', marginHorizontal: 16 },
  holdingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  holdingRowBorder: { borderTopWidth: 1, borderTopColor: '#2C2C2E' },
  holdingRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center' },
  holdingRankText: { color: '#34C759', fontSize: 11, fontWeight: '700' },
  holdingSymbol: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  holdingName: { color: '#475569', fontSize: 12, marginTop: 1 },
  holdingPct: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  holdingVal: { color: '#475569', fontSize: 11, marginTop: 1 },
});
