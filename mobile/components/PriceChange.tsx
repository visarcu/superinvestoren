import { Text } from 'react-native';
import { theme, tabularStyle } from '../lib/theme';

interface Props {
  value: number;
  isAbsolute?: boolean;
  small?: boolean;
}

export default function PriceChange({ value, isAbsolute, small }: Props) {
  const isPositive = value >= 0;
  const color = isPositive ? theme.accent.positive : theme.accent.negative;
  const sign = isPositive ? '+' : '';
  const fmt = (n: number, d = 2) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const label = isAbsolute
    ? `${sign}${fmt(Math.abs(value))} $`
    : `${sign}${fmt(Math.abs(value))} %`;

  return (
    <Text
      style={{
        color,
        fontSize: small ? theme.font.bodySm : theme.font.body,
        fontWeight: theme.weight.semibold,
        ...tabularStyle,
      }}
    >
      {label}
    </Text>
  );
}
