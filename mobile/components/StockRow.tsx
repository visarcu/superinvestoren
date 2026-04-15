import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import PriceChange from './PriceChange';
import StockLogo from './StockLogo';

interface Props { quote: any; onPress: () => void; }

export default function StockRow({ quote, onPress }: Props) {
  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={0.6}>
      <StockLogo ticker={quote.symbol || ''} size={40} borderRadius={20} />
      <View style={s.info}>
        <Text style={s.symbol}>{quote.symbol}</Text>
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
  row: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: 12 },
  symbol: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  name: { color: '#8E8E93', fontSize: 13, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  price: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
