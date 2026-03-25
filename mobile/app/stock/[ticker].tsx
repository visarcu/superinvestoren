import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getQuote, getCompanyProfile } from '../../lib/api';
import { supabase } from '../../lib/auth';
import PriceChange from '../../components/PriceChange';
import MetricCard from '../../components/MetricCard';

export default function StockScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials'>('overview');

  useEffect(() => {
    loadData();
  }, [ticker]);

  async function loadData() {
    try {
      const [qData, pData] = await Promise.all([
        getQuote(ticker!),
        getCompanyProfile(ticker!),
      ]);
      setQuote(Array.isArray(qData) ? qData[0] : qData);
      setProfile(Array.isArray(pData) ? pData[0] : pData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleWatchlist() {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    const token = session.session.access_token;
    try {
      if (inWatchlist) {
        await fetch(`https://finclue.de/api/watchlist/${ticker}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch('https://finclue.de/api/watchlist', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker }),
        });
      }
      setInWatchlist(!inWatchlist);
    } catch (e) { console.error(e); }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg-primary items-center justify-center">
        <ActivityIndicator color="#22C55E" size="large" />
      </SafeAreaView>
    );
  }

  const price = quote?.price ?? 0;
  const change = quote?.changesPercentage ?? 0;
  const isPositive = change >= 0;

  return (
    <>
      <Stack.Screen options={{ title: ticker || '', headerRight: () => (
        <TouchableOpacity onPress={toggleWatchlist} className="mr-2">
          <Ionicons name={inWatchlist ? 'bookmark' : 'bookmark-outline'} size={22} color={inWatchlist ? '#22C55E' : '#F8FAFC'} />
        </TouchableOpacity>
      )}} />

      <ScrollView className="flex-1 bg-bg-primary">
        {/* Price Header */}
        <View className="px-4 py-5 bg-bg-card border-b border-bg-elevated">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-text-primary text-3xl font-bold">
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <PriceChange value={quote?.change} isAbsolute />
                <PriceChange value={change} />
              </View>
            </View>
            <View className="items-end">
              <Text className="text-text-secondary text-xs">{profile?.exchange}</Text>
              <Text className="text-text-muted text-xs mt-0.5">{profile?.sector}</Text>
            </View>
          </View>

          {/* Company Name */}
          {profile?.companyName && (
            <Text className="text-text-secondary text-sm mt-2">{profile.companyName}</Text>
          )}

          {/* Quick Actions */}
          <View className="flex-row gap-2 mt-4">
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://finclue.de/analyse/stocks/${ticker}`)}
              className="flex-1 bg-brand/10 border border-brand/30 rounded-xl py-2.5 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-brand text-sm font-semibold">Vollanalyse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleWatchlist}
              className={`flex-1 rounded-xl py-2.5 items-center ${inWatchlist ? 'bg-brand' : 'bg-bg-elevated'}`}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-semibold ${inWatchlist ? 'text-bg-primary' : 'text-text-primary'}`}>
                {inWatchlist ? '✓ Watchlist' : '+ Watchlist'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Key Metrics */}
        <View className="px-4 py-4">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Kennzahlen</Text>
          <View className="flex-row flex-wrap gap-2">
            <MetricCard label="Marktkapital." value={formatMarketCap(quote?.marketCap)} />
            <MetricCard label="KGV" value={quote?.pe ? quote.pe.toFixed(1) : '—'} />
            <MetricCard label="52W Hoch" value={quote?.yearHigh ? `$${quote.yearHigh.toFixed(2)}` : '—'} />
            <MetricCard label="52W Tief" value={quote?.yearLow ? `$${quote.yearLow.toFixed(2)}` : '—'} />
            <MetricCard label="Volumen" value={formatVolume(quote?.volume)} />
            <MetricCard label="Ø Volumen" value={formatVolume(quote?.avgVolume)} />
            <MetricCard label="EPS" value={quote?.eps ? `$${quote.eps.toFixed(2)}` : '—'} />
            <MetricCard label="Ø 50 Tage" value={quote?.priceAvg50 ? `$${quote.priceAvg50.toFixed(2)}` : '—'} />
          </View>
        </View>

        {/* Description */}
        {profile?.description && (
          <View className="px-4 pb-4">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Über das Unternehmen</Text>
            <View className="bg-bg-card rounded-xl p-4">
              <Text className="text-text-secondary text-sm leading-5" numberOfLines={6}>
                {profile.description}
              </Text>
            </View>
          </View>
        )}

        {/* Deep Analysis Button */}
        <View className="px-4 pb-8">
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://finclue.de/analyse/stocks/${ticker}`)}
            className="bg-brand rounded-xl py-4 items-center flex-row justify-center gap-2"
            activeOpacity={0.85}
          >
            <Text className="text-bg-primary font-bold text-base">Detaillierte Analyse öffnen</Text>
            <Ionicons name="open-outline" size={18} color="#020617" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

function formatMarketCap(val?: number) {
  if (!val) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val}`;
}

function formatVolume(val?: number) {
  if (!val) return '—';
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return `${val}`;
}
