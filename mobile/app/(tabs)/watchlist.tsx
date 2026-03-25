import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import StockRow from '../../components/StockRow';

export default function WatchlistScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadWatchlist(); }, []));

  async function loadWatchlist() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const token = session.session.access_token;

      const res = await fetch('https://finclue.de/api/watchlist', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const watchlistItems = Array.isArray(data) ? data : [];
      setItems(watchlistItems);

      if (watchlistItems.length > 0) {
        const symbols = watchlistItems.map((i: any) => i.ticker || i.symbol).join(',');
        const qRes = await fetch(`https://finclue.de/api/quotes?symbols=${symbols}`);
        const qData = await qRes.json();
        setQuotes(Array.isArray(qData) ? qData : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="px-4 pt-2 pb-4">
        <Text className="text-text-primary text-2xl font-bold tracking-tight">Watchlist</Text>
        <Text className="text-text-secondary text-sm">{items.length} Aktien beobachtet</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#22C55E" className="mt-8" />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <View className="w-16 h-16 rounded-full bg-bg-card items-center justify-center">
            <Ionicons name="bookmark-outline" size={28} color="#475569" />
          </View>
          <Text className="text-text-primary font-semibold text-lg">Watchlist ist leer</Text>
          <Text className="text-text-secondary text-sm text-center px-8">
            Füge Aktien zu deiner Watchlist hinzu um sie hier zu sehen.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/')}
            className="bg-brand-muted border border-brand/30 rounded-xl px-6 py-3 mt-2"
          >
            <Text className="text-brand font-semibold">Aktien entdecken</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={quotes.length > 0 ? quotes : items.map((i: any) => ({ symbol: i.ticker || i.symbol }))}
          keyExtractor={(item) => item.symbol}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWatchlist(); }} tintColor="#22C55E" />}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}
          renderItem={({ item }) => (
            <StockRow quote={item} onPress={() => router.push(`/stock/${item.symbol}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
