import { View, Text } from 'react-native';

interface Props {
  label: string;
  value: string;
}

export default function MetricCard({ label, value }: Props) {
  return (
    <View className="bg-bg-card rounded-xl p-3" style={{ width: '48%' }}>
      <Text className="text-text-muted text-xs mb-1">{label}</Text>
      <Text className="text-text-primary font-semibold text-sm">{value}</Text>
    </View>
  );
}
