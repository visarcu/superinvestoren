import { useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { theme, tabularStyle } from '../../lib/theme';
import { supabase } from '../../lib/auth';

const BASE_URL = 'https://finclue.de';
const SCREEN_W = Dimensions.get('window').width;

export type ValueRange = '1M' | '3M' | '6M' | '1J' | 'Max';

const RANGE_DAYS: Record<ValueRange, number> = {
  '1M': 30, '3M': 90, '6M': 180, '1J': 365, 'Max': 5475,
};

interface HistoryPoint { date: string; value: number; invested?: number; }

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

export default function ValueChart({ portfolioId, holdings, cashPosition = 0, defaultRange = '6M' }: Props) {
  const [range, setRange] = useState<ValueRange>(defaultRange);
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holdings || holdings.length === 0) { setData([]); return; }
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
        const arr: HistoryPoint[] = Array.isArray(json.data) ? json.data : [];
        setData(arr);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Fehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [portfolioId, range, holdings.length, cashPosition]);

  // Chart data: downsample to ~50 points for performance
  const chartData = useMemo(() => {
    if (!data.length) return [];
    const targetPoints = 50;
    const step = Math.max(1, Math.floor(data.length / targetPoints));
    const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
    return sampled.map(p => ({ value: p.value }));
  }, [data]);

  const startVal = data[0]?.value ?? 0;
  const endVal = data[data.length - 1]?.value ?? 0;
  const change = endVal - startVal;
  const changePct = startVal > 0 ? (change / startVal) * 100 : 0;
  const isPositive = change >= 0;
  const lineColor = isPositive ? theme.accent.positive : theme.accent.negative;

  return (
    <View style={s.card}>
      {/* Header: Performance Stats */}
      <View style={s.header}>
        <View>
          <Text style={s.label}>WERTENTWICKLUNG</Text>
          {!loading && data.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <Text style={[s.deltaAbs, { color: lineColor }]}>
                {isPositive ? '+' : ''}{fmtDE(change, 0)} €
              </Text>
              <Text style={[s.deltaPct, { color: lineColor }]}>
                ({isPositive ? '+' : ''}{fmtDE(changePct, 2)} %)
              </Text>
            </View>
          )}
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
        ) : chartData.length < 2 ? (
          <View style={s.loadingBox}>
            <Text style={s.errorText}>Nicht genug Daten für diesen Zeitraum</Text>
          </View>
        ) : (
          <LineChart
            areaChart
            data={chartData}
            curved
            color={lineColor}
            thickness={2}
            startFillColor={lineColor}
            endFillColor={lineColor}
            startOpacity={0.25}
            endOpacity={0}
            initialSpacing={0}
            endSpacing={0}
            spacing={(SCREEN_W - 32 - 56) / Math.max(1, chartData.length - 1)}
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
        )}
      </View>

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

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg, paddingBottom: theme.space.sm,
  },
  label: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
  },
  deltaAbs: { fontSize: theme.font.title2, fontWeight: theme.weight.semibold, ...tabularStyle },
  deltaPct: { fontSize: theme.font.bodySm, fontWeight: theme.weight.medium, ...tabularStyle },

  chartArea: { paddingVertical: theme.space.sm, paddingRight: 8, minHeight: 180, justifyContent: 'center' },
  loadingBox: { height: 160, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: theme.text.tertiary, fontSize: theme.font.body },

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
