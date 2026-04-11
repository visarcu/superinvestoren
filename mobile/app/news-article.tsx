import { useLocalSearchParams, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

export default function NewsArticleScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Stack.Screen options={{
        title: title ? (title.length > 40 ? title.slice(0, 40) + '…' : title) : 'Artikel',
        headerStyle: { backgroundColor: '#111113' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: '',
      }} />
      {loading && (
        <View style={s.loader}>
          <ActivityIndicator color="#22C55E" size="large" />
        </View>
      )}
      <WebView
        source={{ uri: decodeURIComponent(url) }}
        onLoadEnd={() => setLoading(false)}
        style={s.webview}
        allowsBackForwardNavigationGestures
        startInLoadingState={false}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  webview: { flex: 1 },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 10, backgroundColor: '#0a0a0b' },
});
