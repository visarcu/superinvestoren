import { Text } from 'react-native';

interface Props {
  value: number;
  isAbsolute?: boolean;
  small?: boolean;
}

export default function PriceChange({ value, isAbsolute, small }: Props) {
  const isPositive = value >= 0;
  const color = isPositive ? '#34C759' : '#FF3B30';
  const sign = isPositive ? '+' : '';
  const fmt = (n: number, d = 2) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const label = isAbsolute
    ? `${sign}${fmt(Math.abs(value))} $`
    : `${sign}${fmt(Math.abs(value))} %`;

  return (
    <Text style={{ color, fontSize: small ? 12 : 13, fontWeight: '600' }}>{label}</Text>
  );
}
