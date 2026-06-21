import { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { theme, tabularStyle, perfColor } from '../../lib/theme';
import { supabase } from '../../lib/auth';

const BASE_URL = 'https://finclue.de';
const SCREEN_W = Dimensions.get('window').width;

export type ValueRange = '1M' | '3M' | '6M' | '1J' | 'Max';
type ChartView = 'value' | 'performance';

const RANGE_DAYS: Record<ValueRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, '1J': 365, 'Max': 5475,
};

// Benchmark-Farben — gleich wie Web
const COLOR_PORTFOLIO = '#2dd4bf';
const COLOR_SPY       = '#60a5fa';
const COLOR_MSCI      = '#a78bfa';
const COLOR_FTSE      = '#fbbf24';

interface HistoryPoint { date: string; value: number; invested?: number; }
interface PerfPoint {
  date: string;
  portfolioPerformance: number;
  spyPerformance: number;
  msciWorldPerformance: number;
  ftseAllWorldPerformance: number;
}

interface Props {
  portfolioId: string | null;
  holdings: Array<{ symbol: string; quantity: number; purchase_price: number }>;
  cashPosition?: number;
  defaultRange?: ValueRange;
}

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1e9) return `${fmtDE(v / 1e9, 1)} Mrd`;
  if (Math.abs(v) >= 1e6) return `${fmtDE(v / 1e6, 1)} Mio`;
  if (Math.abs(v) >= 1e3) return `${fmtDE(v / 1e3, 0)}K`;
  return fmtDE(v, 0);
}

// Downsample to N points (preserve last)
function downsample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = Math.max(1, Math.floor(arr.length / target));
  const sampled = arr.filter((_, i) => i % step === 0);
  if (sampled[sampled.length - 1] !== arr[arr.length - 1]) sampled.push(arr[arr.length - 1]);
  return sampled;
}

export default function ValueChart({ portfolioId, holdings, cashPosition = 0, defaultRange = '6M' }: Props) {
  const [range, setRange] = useState<ValueRange>(defaultRange);
  const [view, setView] = useState<ChartView>('value');
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [perfData, setPerfData] = useState<PerfPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holdings || holdings.length === 0) { setData([]); setPerfData([]); return; }
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${BASE_URL}/api/portfolio-history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            portfolioId,
            holdings: holdings.map(h => ({ symbol: h.symbol, quantity: h.quantity, purchase_price: h.purchase_price })),
            cashPosition,
            days: RANGE_DAYS[range],
          }),
        });
        if (!res.ok) throw new Error('Verlauf konnte nicht geladen werden');
        const json = await res.json();
        if (cancelled) return;
        setData(Array.isArray(json.data) ? json.data : []);
        setPerfData(Array.isArray(json.performanceData) ? json.performanceData : []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Fehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [portfolioId, range, holdings.length, cashPosition]);

  // ── VALUE MODE: Area Chart ──
  const valueChartData = useMemo(() => {
    if (!data.length) return [];
    return downsample(data, 50).map(p => ({ value: p.value }));
  }, [data]);

  const startVal = data[0]?.value ?? 0;
  const endVal = data[data.length - 1]?.value ?? 0;
  const change = endVal - startVal;
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0;
  const valueColor = change >= 0 ? theme.accent.positive : theme.accent.negative;

  // ── PERFORMANCE MODE: Multi-Line Chart ──
  const perfChartData = useMemo(() => {
    if (!perfData.length) return { portfolio: [], spy: [], msci: [], ftse: [], minV: 0, maxV: 0 };
    const sampled = downsample(perfData, 50);
    const portfolio = sampled.map(p => ({ value: p.portfolioPerformance }));
    const spy       = sampled.map(p => ({ value: p.spyPerformance }));
    const msci      = sampled.map(p => ({ value: p.msciWorldPerformance }));
    const ftse      = sampled.map(p => ({ value: p.ftseAllWorldPerformance }));
    const allVals = [
      ...portfolio.map(p => p.value),
      ...spy.map(p => p.value),
      ...msci.map(p => p.value),
      ...ftse.map(p => p.value),
    ];
    const minV = Math.min(0, ...allVals);
    const maxV = Math.max(0, ...allVals);
    return { portfolio, spy, msci, ftse, minV, maxV };
  }, [perfData]);

  const lastPerf = perfData[perfData.length - 1];

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.label}>
            {view === 'value' ? 'WERTENTWICKLUNG' : 'PERFORMANCE VS. BENCHMARKS'}
          </Text>
          {view === 'value' && !loading && data.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Text style={[s.deltaAbs, { color: valueColor }]}>
                {change >= 0 ? '+' : ''}{fmtDE(change, 0)} €
              </Text>
              <Text style={[s.deltaPct, { color: valueColor }]}>
                ({change >= 0 ? '+' : ''}{fmtDE(changePct, 2)} %)
              </Text>
            </View>
          )}
          {view === 'performance' && !loading && lastPerf && (
            <Text style={s.perfSummary}>
              Du:&nbsp;
              <Text style={[s.perfSummaryValue, { color: perfColor(lastPerf.portfolioPerformance) }]}>
                {lastPerf.portfolioPerformance >= 0 ? '+' : ''}{fmtDE(lastPerf.portfolioPerformance, 2)} %
              </Text>
            </Text>
          )}
        </View>

        {/* View Toggle */}
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewPill, view === 'value' && s.viewPillActive]}
            onPress={() => setView('value')}
            activeOpacity={0.7}
          >
            <Text style={[s.viewText, view === 'value' && s.viewTextActive]}>Wert</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewPill, view === 'performance' && s.viewPillActive]}
            onPress={() => setView('performance')}
            activeOpacity={0.7}
          >
            <Text style={[s.viewText, view === 'performance' && s.viewTextActive]}>Vergleich</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      <View style={s.chartArea}>
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={theme.accent.positive} size="small" />
          </View>
        ) : error ? (
          <View style={s.loadingBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : view === 'value' ? (
          valueChartData.length < 2 ? (
            <View style={s.loadingBox}>
              <Text style={s.errorText}>Nicht genug Daten für diesen Zeitraum</Text>
            </View>
          ) : (
            <LineChart
              areaChart
              data={valueChartData}
              curved
              color={valueColor}
              thickness={2}
              startFillColor={valueColor}
              endFillColor={valueColor}
              startOpacity={0.25}
              endOpacity={0}
              initialSpacing={0}
              endSpacing={0}
              spacing={(SCREEN_W - 32 - 56) / Math.max(1, valueChartData.length - 1)}
              hideDataPoints
              hideRules={false}
              rulesColor="rgba(255,255,255,0.05)"
              rulesType="solid"
              noOfSections={3}
              yAxisColor="transparent"
              xAxisColor="rgba(255,255,255,0.1)"
              yAxisTextStyle={{ color: '#64748B', fontSize: 10 }}
              yAxisLabelWidth={50}
              formatYLabel={(v) => fmtCompact(parseFloat(v))}
              hideYAxisText={false}
              backgroundColor="transparent"
              width={SCREEN_W - 32 - 56}
              height={160}
              adjustToWidth
            />
          )
        ) : (
          perfChartData.portfolio.length < 2 ? (
            <View style={s.loadingBox}>
              <Text style={s.errorText}>Keine Performance-Daten</Text>
            </View>
          ) : (
            <LineChart
              data={perfChartData.portfolio}
              data2={perfChartData.spy}
              data3={perfChartData.msci}
              data4={perfChartData.ftse}
              curved
              color1={COLOR_PORTFOLIO}
              color2={COLOR_SPY}
              color3={COLOR_MSCI}
              color4={COLOR_FTSE}
              thickness1={2.5}
              thickness2={1.5}
              thickness3={1.5}
              thickness4={1.5}
              hideDataPoints
              hideDataPoints1
              hideDataPoints2
              hideDataPoints3
              hideDataPoints4
              initialSpacing={0}
              endSpacing={0}
              spacing={(SCREEN_W - 32 - 56) / Math.max(1, perfChartData.portfolio.length - 1)}
              hideRules={false}
              rulesColor="rgba(255,255,255,0.05)"
              rulesType="solid"
              noOfSections={4}
              yAxisColor="transparent"
              xAxisColor="rgba(255,255,255,0.1)"
              yAxisTextStyle={{ color: '#64748B', fontSize: 10 }}
              yAxisLabelWidth={50}
              yAxisLabelSuffix=" %"
              formatYLabel={(v) => fmtDE(parseFloat(v), 0)}
              hideYAxisText={false}
              backgroundColor="transparent"
              width={SCREEN_W - 32 - 56}
              height={160}
              adjustToWidth
              maxValue={Math.max(5, perfChartData.maxV * 1.1)}
              mostNegativeValue={Math.min(0, perfChartData.minV * 1.1)}
            />
          )
        )}
      </View>

      {/* Legend (only in performance view) */}
      {view === 'performance' && !loading && lastPerf && (
        <View style={s.legend}>
          <LegendItem color={COLOR_PORTFOLIO} label="Du" value={lastPerf.portfolioPerformance} />
          <LegendItem color={COLOR_SPY} label="S&P 500" value={lastPerf.spyPerformance} />
          <LegendItem color={COLOR_MSCI} label="MSCI World" value={lastPerf.msciWorldPerformance} />
          <LegendItem color={COLOR_FTSE} label="FTSE AW" value={lastPerf.ftseAllWorldPerformance} />
        </View>
      )}

      {/* Range Selector */}
      <View style={s.rangeRow}>
        {(['1M', '3M', '6M', '1J', 'Max'] as ValueRange[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[s.rangePill, range === r && s.rangePillActive]}
            onPress={() => setRange(r)}
            activeOpacity={0.7}
          >
            <Text style={[s.rangeText, range === r && s.rangeTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendLabel}>{label}</Text>
      <Text style={[s.legendValue, { color: perfColor(value) }]}>
        {value >= 0 ? '+' : ''}{fmtDE(value, 1)} %
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.sm,
    gap: theme.space.sm,
  },
  label: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
  },
  deltaAbs: { fontSize: theme.font.title2, fontWeight: theme.weight.semibold, ...tabularStyle },
  deltaPct: { fontSize: theme.font.bodySm, fontWeight: theme.weight.medium, ...tabularStyle },
  perfSummary: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 4 },
  perfSummaryValue: { fontSize: theme.font.title2, fontWeight: theme.weight.semibold, ...tabularStyle },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: theme.bg.cardHover,
    borderRadius: theme.radius.sm,
    padding: 2,
  },
  viewPill: {
    paddingHorizontal: theme.space.sm + 2, paddingVertical: 4,
    borderRadius: theme.radius.sm - 2,
  },
  viewPillActive: { backgroundColor: theme.text.primary },
  viewText: { color: theme.text.muted, fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold },
  viewTextActive: { color: theme.text.inverse },

  chartArea: { paddingVertical: theme.space.sm, paddingRight: 8, minHeight: 180, justifyContent: 'center' },
  loadingBox: { height: 160, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: theme.text.tertiary, fontSize: theme.font.body, paddingHorizontal: 24, textAlign: 'center' },

  // Legend (performance mode)
  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm + 2,
    gap: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: theme.text.tertiary, fontSize: theme.font.captionSm, fontWeight: theme.weight.medium, flex: 1 },
  legendValue: { fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold, ...tabularStyle },

  rangeRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  rangePill: {
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.xs + 2,
    borderRadius: theme.radius.sm,
  },
  rangePillActive: { backgroundColor: theme.bg.cardHover },
  rangeText: { color: theme.text.muted, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: 0.3 },
  rangeTextActive: { color: theme.text.primary },
});
