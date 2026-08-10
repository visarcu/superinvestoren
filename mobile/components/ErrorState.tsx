import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { isOffline } from '../lib/net';

interface Props {
  error: unknown;
  onRetry: () => void;
  /** Kompakte Variante für Bereiche innerhalb eines Screens. */
  compact?: boolean;
}

/**
 * Ladefehler mit Wiederholen-Button. Ersetzt den bisherigen Zustand, in dem
 * ein fehlgeschlagener Request wie "keine Daten vorhanden" aussah.
 */
export default function ErrorState({ error, onRetry, compact }: Props) {
  const offline = isOffline(error);

  return (
    <View style={[s.wrap, compact && s.wrapCompact]}>
      <Ionicons
        name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
        size={compact ? 24 : 34}
        color={theme.text.muted}
      />
      <Text style={[s.title, compact && s.titleCompact]}>
        {offline ? 'Keine Verbindung' : 'Laden fehlgeschlagen'}
      </Text>
      {!compact && (
        <Text style={s.desc}>
          {offline
            ? 'Prüfe dein Netz und versuche es erneut.'
            : 'Die Daten sind gerade nicht erreichbar.'}
        </Text>
      )}
      <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.8}>
        <Ionicons name="refresh" size={14} color={theme.text.primary} />
        <Text style={s.btnText}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
  wrapCompact: { paddingVertical: 24, gap: 6 },
  title: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, marginTop: 4 },
  titleCompact: { fontSize: theme.font.body },
  desc: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center', lineHeight: 19 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: theme.radius.md, backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
  },
  btnText: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.medium },
});
