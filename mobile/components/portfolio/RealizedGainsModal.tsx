import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme, tabularStyle, perfColor } from '../../lib/theme';
import StockLogo from '../StockLogo';

interface Props {
  visible: boolean;
  onClose: () => void;
  total: number;
  perSymbol: Record<string, { realized: number; sells: number }>;
}

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(v: number) { return `${fmtDE(v)} €`; }

export default function RealizedGainsModal({ visible, onClose, total, perSymbol }: Props) {
  const sorted = Object.entries(perSymbol).sort(([, a], [, b]) => b.realized - a.realized);
  const winners = sorted.filter(([, v]) => v.realized > 0).length;
  const losers = sorted.filter(([, v]) => v.realized < 0).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.title}>Realisierte Gewinne</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.text.tertiary} />
            </TouchableOpacity>
          </View>

          {/* Total Card */}
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>GESAMT REALISIERT</Text>
            <Text style={[s.totalValue, { color: perfColor(total) }]}>
              {total >= 0 ? '+' : ''}{fmtCurrency(total)}
            </Text>
            <View style={s.statsRow}>
              <View style={s.statCell}>
                <Ionicons name="trending-up" size={14} color={theme.accent.positive} />
                <Text style={s.statText}>{winners} Gewinner</Text>
              </View>
              <View style={s.statCell}>
                <Ionicons name="trending-down" size={14} color={theme.accent.negative} />
                <Text style={s.statText}>{losers} Verlierer</Text>
              </View>
              <View style={s.statCell}>
                <Ionicons name="layers-outline" size={14} color={theme.text.tertiary} />
                <Text style={s.statText}>{sorted.length} gesamt</Text>
              </View>
            </View>
          </View>

          {/* List per symbol */}
          <Text style={s.sectionLabel}>JE POSITION</Text>
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={s.card}>
              {sorted.map(([symbol, v], i) => (
                <TouchableOpacity
                  key={symbol}
                  style={[s.row, i < sorted.length - 1 && s.rowBorder]}
                  onPress={() => { onClose(); router.push(`/stock/${symbol}`); }}
                  activeOpacity={0.6}
                >
                  <StockLogo ticker={symbol} size={32} borderRadius={8} />
                  <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                    <Text style={s.symbol}>{symbol}</Text>
                    <Text style={s.subtext}>
                      {v.sells} {v.sells === 1 ? 'Verkauf' : 'Verkäufe'}
                    </Text>
                  </View>
                  <Text style={[s.gainValue, { color: perfColor(v.realized) }]}>
                    {v.realized >= 0 ? '+' : ''}{fmtCurrency(v.realized)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={s.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={theme.text.tertiary} />
            <Text style={s.disclaimerText}>
              Berechnung nach durchschnittlicher Kostenmethode. Steuerliche Berechnung kann abweichen.
            </Text>
          </View>

          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>Schließen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bg.cardElevated,
    borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    paddingBottom: 34, paddingTop: theme.space.md,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.strong,
    alignSelf: 'center', marginBottom: theme.space.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, marginBottom: theme.space.md,
  },
  title: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },

  totalCard: {
    marginHorizontal: theme.space.lg,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginBottom: theme.space.lg,
  },
  totalLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginBottom: theme.space.xs,
  },
  totalValue: { fontSize: 28, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight, ...tabularStyle },
  statsRow: { flexDirection: 'row', gap: theme.space.lg, marginTop: theme.space.md, paddingTop: theme.space.md, borderTopWidth: 1, borderTopColor: theme.border.default },
  statCell: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: theme.text.secondary, fontSize: theme.font.bodySm, fontWeight: theme.weight.medium },

  sectionLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase',
    paddingHorizontal: theme.space.lg, marginBottom: theme.space.sm,
  },
  card: {
    marginHorizontal: theme.space.lg,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.border.default,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.md, paddingVertical: theme.space.md - 1 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border.default },
  symbol: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  subtext: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  gainValue: { fontSize: theme.font.title3, fontWeight: theme.weight.semibold, ...tabularStyle },

  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginHorizontal: theme.space.lg, marginTop: theme.space.md,
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm,
  },
  disclaimerText: { flex: 1, color: theme.text.tertiary, fontSize: theme.font.captionSm, lineHeight: 14 },

  closeBtn: {
    marginHorizontal: theme.space.lg, marginTop: theme.space.sm,
    paddingVertical: theme.space.md + 2, borderRadius: theme.radius.md,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  closeBtnText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
});
