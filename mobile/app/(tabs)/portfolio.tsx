import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/auth';
import PriceChange from '../../components/PriceChange';

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadPortfolio(); }, []));

  async function loadPortfolio() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const token = session.session.access_token;

      const res = await fetch('https://finclue.de/api/portfolio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHoldings(Array.isArray(data?.holdings) ? data.holdings : []);
      setSummary(data?.summary || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const totalValue = summary?.totalValue || holdings.reduce((s: number, h: any) => s + (h.currentValue || 0), 0);
  const totalGain = summary?.totalGain || holdings.reduce((s: number, h: any) => s + (h.gain || 0), 0);
  const totalGainPct = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPortfolio(); }} tintColor="#22C55E" />}
      >
        <View className="px-4 pt-2 pb-4">
          <Text className="text-text-primary text-2xl font-bold tracking-tight">Portfolio</Text>
        </View>

        {/* Summary Card */}
        <View className="mx-4 mb-4 rounded-2xl overflow-hidden">
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            className="p-5"
          >
            <Text className="text-text-secondary text-sm mb-1">Gesamtwert</Text>
            <Text className="text-text-primary text-3xl font-bold mb-2">
              ${totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View className="flex-row items-center gap-2">
              <PriceChange value={totalGain} isAbsolute />
              <PriceChange value={totalGainPct} />
            </View>
          </LinearGradient>
        </View>

        {loading ? (
          <ActivityIndicator color="#22C55E" className="mt-8" />
        ) : holdings.length === 0 ? (
          <View className="items-center justify-center gap-3 py-12">
            <View className="w-16 h-16 rounded-full bg-bg-card items-center justify-center">
              <Ionicons name="briefcase-outline" size={28} color="#475569" />
            </View>
            <Text className="text-text-primary font-semibold text-lg">Portfolio ist leer</Text>
            <Text className="text-text-secondary text-sm text-center px-8">
              Importiere dein Portfolio auf finclue.de
            </Text>
          </View>
        ) : (
          <View className="px-4 gap-1">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Positionen</Text>
            {holdings.map((h: any) => (
              <TouchableOpacity
                key={h.symbol || h.ticker}
                onPress={() => router.push(`/stock/${h.symbol || h.ticker}`)}
                className="bg-bg-card rounded-xl px-4 py-3.5 flex-row items-center"
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <Text className="text-text-primary font-bold">{h.symbol || h.ticker}</Text>
                  <Text className="text-text-secondary text-xs mt-0.5">{h.shares} Aktien</Text>
                </View>
                <View className="items-end">
                  <Text className="text-text-primary font-semibold">
                    ${(h.currentValue || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <PriceChange value={h.gainPercent || 0} small />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
