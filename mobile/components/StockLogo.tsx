import { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';

const LOGO_DEV_TOKEN = 'pk_GAfJgFASR7C4-2XKGx2izg';

const COLORS = [
  '#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B',
  '#EF4444', '#06B6D4', '#EC4899', '#14B8A6',
  '#F97316', '#A855F7', '#84CC16', '#0EA5E9',
];

function getColor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Props {
  ticker: string;
  size?: number;
  borderRadius?: number;
}

export default function StockLogo({ ticker, size = 44, borderRadius = 10 }: Props) {
  const upper = ticker.toUpperCase();
  const [stage, setStage] = useState(0);

  const getUri = () => {
    switch (stage) {
      case 0:
        return `https://img.logo.dev/ticker/${upper}?token=${LOGO_DEV_TOKEN}`;
      case 1:
        return `https://financialmodelingprep.com/image-stock/${upper}.png`;
      default:
        return null;
    }
  };

  const uri = getUri();
  const color = getColor(upper);

  if (!uri) {
    return (
      <View style={[s.fallback, { width: size, height: size, borderRadius, backgroundColor: color + '25', borderColor: color + '50' }]}>
        <Text style={[s.initials, { color, fontSize: size * 0.3 }]}>{upper.slice(0, 2)}</Text>
      </View>
    );
  }

  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius }]}>
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        resizeMode="contain"
        onError={() => setStage(s => s + 1)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: '#1E293B' },
  fallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  initials: { fontWeight: '700' },
});
