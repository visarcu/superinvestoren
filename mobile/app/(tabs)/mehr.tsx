// Dummy screen — navigation handled by MehrMenu in _layout.tsx
import { View } from 'react-native';
import { theme } from '../../lib/theme';
export default function MehrScreen() {
  return <View style={{ flex: 1, backgroundColor: theme.bg.base }} />;
}
