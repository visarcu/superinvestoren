import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string;
}

export default function MetricCard({ label, value }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#111113', borderRadius: 12, padding: 12, width: '48%', borderWidth: 1, borderColor: '#1e1e20' },
  label: { color: '#475569', fontSize: 11, marginBottom: 4 },
  value: { color: '#F8FAFC', fontWeight: '600', fontSize: 14 },
});
