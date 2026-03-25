import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import PriceChange from './PriceChange';
import StockLogo from './StockLogo';

interface Props { quote: any; onPress: () => void; }

export default function StockRow({ quote, onPress }: Props) {
  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;
  return (
    <TouchableOpacity onPress={onPress} style={s.row} activeOpacity={0.7}>
      <View style={s.logoWrap}>
        <StockLogo ticker={quote.symbol || ''} size={42} borderRadius={10} />
      </View>
      <View style={s.info}>
        <Text style={s.symbol}>{quote.symbol}</Text>
        <Text style={s.name} numberOfLines={1}>{quote.name || ''}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.price}>${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <PriceChange value={change} small />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  logoWrap: { marginRight: 12 },
  info: { flex: 1 },
  symbol: { color: '#F8FAFC', fontWeight: '600', fontSize: 14 },
  name: { color: '#64748B', fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  price: { color: '#F8FAFC', fontWeight: '600', fontSize: 14 },
});
