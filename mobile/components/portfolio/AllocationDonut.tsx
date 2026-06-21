import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { theme, tabularStyle } from '../../lib/theme';

const PALETTE = [
  '#34C759', '#0A84FF', '#FF9F0A', '#BF5AF2', '#FF375F',
  '#64D2FF', '#5E5CE6', '#30D158', '#FFD60A', '#A78BFA',
  '#F472B6',
];
const REST_COLOR = '#404040';
const CASH_COLOR = '#525252';

interface Holding {
  symbol: string;
  displayName?: string;
  name?: string;
  currentValue: number;
  weight?: number;
}

interface Props {
  holdings: Holding[];
  totalValue: number;
  cashPosition?: number;
  showCash?: boolean;
}

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function AllocationDonut({ holdings, totalValue, cashPosition = 0, showCash = true }: Props) {
  const slices = useMemo(() => {
    if (!holdings.length) return [];
    const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const top = sorted.slice(0, 11);
    const rest = sorted.slice(11);
    const restValue = rest.reduce((sum, h) => sum + h.currentValue, 0);

    const result = top.map((h, i) => ({
      label: h.symbol,
      name: h.displayName || h.name || h.symbol,
      value: h.currentValue,
      color: PALETTE[i % PALETTE.length],
    }));
    if (restValue > 0) {
      result.push({
        label: 'weitere', name: `+${rest.length} weitere`,
        value: restValue, color: REST_COLOR,
      });
    }
    if (showCash && cashPosition > 0) {
      result.push({
        label: 'Cash', name: 'Cash',
        value: cashPosition, color: CASH_COLOR,
      });
    }
    return result;
  }, [holdings, cashPosition, showCash]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const pieData = slices.map(s => ({ value: s.value, color: s.color }));

  if (slices.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Keine Positionen für Allokation</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.label}>
        <Text style={s.labelText}>ALLOKATION</Text>
      </View>
      <View style={s.body}>
        <View style={s.donutWrap}>
          <PieChart
            data={pieData}
            donut
            radius={70}
            innerRadius={50}
            innerCircleColor={theme.bg.card}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={s.centerLabel}>{slices.length}</Text>
                <Text style={s.centerSub}>{slices.length === 1 ? 'Position' : 'Posit.'}</Text>
              </View>
            )}
          />
        </View>

        <View style={s.legend}>
          {slices.slice(0, 7).map((sl, i) => {
            const pct = total > 0 ? (sl.value / total) * 100 : 0;
            return (
              <View key={`${sl.label}-${i}`} style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: sl.color }]} />
                <Text style={s.legendLabel} numberOfLines={1}>{sl.label}</Text>
                <Text style={s.legendPct}>{fmtDE(pct, 1)} %</Text>
              </View>
            );
          })}
          {slices.length > 7 && (
            <Text style={s.legendMore}>+ {slices.length - 7} weitere</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    padding: theme.space.lg,
  },
  label: { marginBottom: theme.space.md },
  labelText: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg },
  donutWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { color: theme.text.primary, fontSize: 24, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight, ...tabularStyle },
  centerSub: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: -2 },

  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.medium },
  legendPct: { color: theme.text.tertiary, fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold, ...tabularStyle },
  legendMore: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: 4, marginLeft: 16 },

  empty: { padding: theme.space.xl, alignItems: 'center' },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.body },
});
