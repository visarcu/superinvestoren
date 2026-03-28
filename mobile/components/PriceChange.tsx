import { View, Text } from 'react-native';

interface Props {
  value: number;
  isAbsolute?: boolean;
  small?: boolean;
}

export default function PriceChange({ value, isAbsolute, small }: Props) {
  const isPositive = value >= 0;
  const color = isPositive ? '#22C55E' : '#EF4444';
  const bg = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
  const sign = isPositive ? '+' : '';
  const fmt = (n: number, d = 2) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const label = isAbsolute
    ? `${sign}${fmt(Math.abs(value))} $`
    : `${sign}${fmt(Math.abs(value))} %`;

  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: small ? 5 : 7, paddingVertical: small ? 2 : 3 }}>
      <Text style={{ color, fontSize: small ? 11 : 13, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
