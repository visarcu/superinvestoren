import { View, Text, StyleSheet } from 'react-native';
import { theme, tabularStyle } from '../lib/theme';

interface Props {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}

export default function MetricCard({ label, value, positive, negative }: Props) {
  const valueColor = positive
    ? theme.accent.positive
    : negative
    ? theme.accent.negative
    : theme.text.primary;
  return (
    <View style={s.card}>
      <Text style={s.label}>{label}</Text>
      <Text style={[s.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    width: '48%',
    borderWidth: 1,
    borderColor: theme.border.default,
  },
  label: {
    color: theme.text.tertiary,
    fontSize: theme.font.caption,
    marginBottom: theme.space.sm,
    fontWeight: theme.weight.medium,
    letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase',
  },
  value: {
    fontWeight: theme.weight.semibold,
    fontSize: theme.font.title2,
    letterSpacing: theme.tracking.normal,
    ...tabularStyle,
  },
});
