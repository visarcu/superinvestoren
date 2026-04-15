import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import PriceChange from './PriceChange';
import StockLogo from './StockLogo';
import { theme, tabularStyle } from '../lib/theme';

interface Props { quote: any; onPress: () => void; }

export default function StockRow({ quote, onPress }: Props) {
  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={0.6}>
      <StockLogo ticker={quote.symbol || ''} size={36} borderRadius={10} />
      <View style={s.info}>
        <Text style={s.symbol} numberOfLines={1}>{quote.symbol}</Text>
        <Text style={s.name} numberOfLines={1}>{quote.name || ''}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>${price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <PriceChange value={change} small />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    paddingHorizontal: theme.space.lg,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: theme.space.md, minWidth: 0 },
  symbol: {
    color: theme.text.primary,
    fontWeight: theme.weight.semibold,
    fontSize: theme.font.body,
    letterSpacing: theme.tracking.normal,
  },
  name: {
    color: theme.text.tertiary,
    fontSize: theme.font.caption,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end', gap: 2 },
  price: {
    color: theme.text.primary,
    fontWeight: theme.weight.semibold,
    fontSize: theme.font.body,
    ...tabularStyle,
  },
});
