import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/auth';

const BASE_URL = 'https://finclue.de';

const FREQ_DE: Record<string, string> = {
  Monthly: 'Monatlich', Quarterly: 'Quartalsweise',
  'Semi-Annual': 'Halbjährlich', Annual: 'Jährlich',
};

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const DAYS_DE = ['Mo','Di','Mi','Do','Fr','Sa','So'];

interface DividendEvent {
  symbol: string;
  name?: string;
  paymentDate: string;
  exDividendDate: string;
  dividend: number;
  adjDividend?: number;
  totalPayout?: number;
  currency?: string;
  frequency?: string;
}

function fmtDE(val: number, dec = 2) {
  return val.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCurrency(val: number, currency = 'USD') {
  return val.toLocaleString('de-DE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getLogoUrl(ticker: string) {
  return `https://financialmodelingprep.com/image-stock/${ticker}.png`;
}

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<DividendEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [totalMonth, setTotalMonth] = useState(0);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  async function load() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }
      const userId = sessionData.session.user.id;

      // Get portfolio holdings + watchlist tickers
      const [{ data: portfolios }, { data: watchlist }] = await Promise.all([
        supabase.from('portfolios').select('id').eq('user_id', userId),
        supabase.from('watchlists').select('ticker').eq('user_id', userId),
      ]);

      const holdingTickers: string[] = [];
      if (portfolios && portfolios.length > 0) {
        const portfolioIds = portfolios.map((p: any) => p.id);
        const { data: holdings } = await supabase
          .from('portfolio_holdings')
          .select('symbol, quantity')
          .in('portfolio_id', portfolioIds);
        if (holdings) {
          holdings.forEach((h: any) => {
            if (!holdingTickers.includes(h.symbol)) holdingTickers.push(h.symbol);
          });
        }
      }

      const watchlistTickers = watchlist?.map((w: any) => w.ticker) || [];
      const allTickers = [...new Set([...holdingTickers, ...watchlistTickers])];

      if (allTickers.length === 0) {
        setEvents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch dividend calendar
      const token = sessionData.session.access_token;
      const res = await fetch(`${BASE_URL}/api/dividends-calendar?tickers=${allTickers.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) { setLoading(false); setRefreshing(false); return; }
      const data = await res.json();

      // API returns flat array: [{ ticker, date, paymentDate, exDate, dividend, yield, frequency, ... }]
      const allEvents: DividendEvent[] = (Array.isArray(data) ? data : [])
        .map((item: any) => ({
          symbol: item.ticker || item.symbol || '',
          paymentDate: item.paymentDate || item.date || '',
          exDividendDate: item.exDate || item.date || '',
          dividend: item.dividend || 0,
          currency: 'USD',
          frequency: item.frequency,
        }))
        .filter((e: DividendEvent) => !!e.paymentDate && !!e.symbol)
        .sort((a: DividendEvent, b: DividendEvent) => a.paymentDate.localeCompare(b.paymentDate));

      setEvents(allEvents);

      // Calculate month total
      const yr = currentDate.getFullYear();
      const mo = currentDate.getMonth();
      const monthStr = `${yr}-${String(mo + 1).padStart(2, '0')}`;
      const monthTotal = allEvents
        .filter(e => e.paymentDate.startsWith(monthStr))
        .reduce((sum, e) => sum + (e.totalPayout || e.dividend), 0);
      setTotalMonth(monthTotal);

      // Auto-select today if has events, else null
      const hasToday = allEvents.some(e => e.paymentDate === todayStr);
      setSelectedDay(hasToday ? todayStr : null);
    } catch (e) {
      console.error('[Calendar]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, []);

  // Build calendar grid
  function buildCalendarDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0 offset
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(ds);
    }
    return days;
  }

  function getEventsForDay(dateStr: string) {
    return events.filter(e => e.paymentDate === dateStr);
  }

  function changeMonth(dir: number) {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  }

  const calDays = buildCalendarDays();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = events.filter(e => e.paymentDate.startsWith(monthStr));
  const monthTotal = monthEvents.reduce((s, e) => s + (e.totalPayout || e.dividend), 0);

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  // Upcoming events (next 30 days from today, sorted)
  const upcomingEvents = events.filter(e => e.paymentDate >= todayStr).slice(0, 20);

  // Group upcoming by date
  const grouped: Record<string, DividendEvent[]> = {};
  for (const e of upcomingEvents) {
    if (!grouped[e.paymentDate]) grouped[e.paymentDate] = [];
    grouped[e.paymentDate].push(e);
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Dividenden-Kalender</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#22C55E" size="large" /></View>
      ) : events.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="calendar-outline" size={48} color="#334155" />
          <Text style={s.emptyTitle}>Keine Dividenden gefunden</Text>
          <Text style={s.emptyText}>Füge Aktien zu deinem Portfolio oder{'\n'}deiner Watchlist hinzu</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
        >
          {/* Month Nav */}
          <View style={s.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn}>
              <Ionicons name="chevron-back" size={20} color="#94a3b8" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={s.monthTitle}>{MONTHS_DE[month]} {year}</Text>
              {monthTotal > 0 && (
                <Text style={s.monthTotal}>Gesamt: <Text style={{ color: '#22C55E' }}>{fmtCurrency(monthTotal)}</Text></Text>
              )}
            </View>
            <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={s.dowRow}>
            {DAYS_DE.map(d => (
              <Text key={d} style={s.dowLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={s.calGrid}>
            {calDays.map((dateStr, i) => {
              if (!dateStr) return <View key={`empty-${i}`} style={s.calCell} />;
              const dayNum = parseInt(dateStr.split('-')[2]);
              const dayEvents = getEventsForDay(dateStr);
              const hasEvents = dayEvents.length > 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDay;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[
                    s.calCell,
                    hasEvents && s.calCellHasEvent,
                    isSelected && s.calCellSelected,
                    isToday && !isSelected && s.calCellToday,
                  ]}
                  onPress={() => setSelectedDay(isSelected ? null : dateStr)}
                  disabled={!hasEvents}
                >
                  <Text style={[
                    s.calDayNum,
                    isToday && s.calDayToday,
                    isSelected && s.calDaySelected,
                    hasEvents && !isSelected && s.calDayHasEvent,
                  ]}>{dayNum}</Text>
                  {hasEvents && (
                    <View style={[s.calDot, isSelected && { backgroundColor: '#fff' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected day detail */}
          {selectedDay && (
            <View style={s.dayDetail}>
              <Text style={s.dayDetailTitle}>
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {selectedEvents.length === 0 ? (
                <Text style={s.noData}>Keine Dividende an diesem Tag</Text>
              ) : (
                selectedEvents.map((ev, i) => (
                  <DividendRow key={i} event={ev} />
                ))
              )}
            </View>
          )}

          {/* Upcoming list */}
          <View style={s.upcomingSection}>
            <Text style={s.sectionTitle}>KOMMENDE DIVIDENDEN</Text>
            {Object.keys(grouped).length === 0 ? (
              <Text style={s.noData}>Keine kommenden Dividenden</Text>
            ) : (
              Object.entries(grouped).map(([dateStr, evs]) => {
                const dateObj = new Date(dateStr + 'T12:00:00');
                const isToday2 = dateStr === todayStr;
                const label = isToday2 ? 'Heute' : dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                const dayTotal = evs.reduce((s, e) => s + (e.totalPayout || e.dividend), 0);
                return (
                  <View key={dateStr} style={s.upcomingGroup}>
                    <View style={s.upcomingDateRow}>
                      <Text style={[s.upcomingDate, isToday2 && { color: '#22C55E' }]}>{label}</Text>
                      {dayTotal > 0 && <Text style={s.upcomingDayTotal}>{fmtCurrency(dayTotal)}</Text>}
                    </View>
                    {evs.map((ev, i) => (
                      <DividendRow key={i} event={ev} />
                    ))}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function DividendRow({ event }: { event: DividendEvent }) {
  const [logoErr, setLogoErr] = useState(false);
  return (
    <TouchableOpacity style={s.divRow} onPress={() => router.push(`/stock/${event.symbol}`)}>
      <View style={s.divLogo}>
        {!logoErr ? (
          <Image
            source={{ uri: `https://financialmodelingprep.com/image-stock/${event.symbol}.png` }}
            style={{ width: 32, height: 32, borderRadius: 8 }}
            onError={() => setLogoErr(true)}
          />
        ) : (
          <View style={s.divLogoFallback}>
            <Text style={s.divLogoText}>{event.symbol[0]}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.divSymbol}>{event.symbol}</Text>
        <Text style={s.divExDate}>Ex-Tag: {event.exDividendDate ? new Date(event.exDividendDate + 'T12:00:00').toLocaleDateString('de-DE') : '—'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.divDividend}>{(event.dividend || 0).toLocaleString('de-DE', { minimumFractionDigits: 4 })} $</Text>
        {event.frequency ? (
          <Text style={s.divFreq}>{FREQ_DE[event.frequency] || event.frequency}</Text>
        ) : (
          <Ionicons name="chevron-forward" size={14} color="#475569" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e1e20',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '600', marginTop: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  monthTotal: { color: '#64748b', fontSize: 13, marginTop: 2 },

  dowRow: { flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4 },
  dowLabel: { flex: 1, textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: '600' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  calCell: {
    width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, marginVertical: 2,
  },
  calCellHasEvent: { backgroundColor: 'rgba(34,197,94,0.08)' },
  calCellSelected: { backgroundColor: '#22C55E' },
  calCellToday: { borderWidth: 1, borderColor: '#22C55E' },
  calDayNum: { color: '#64748b', fontSize: 14 },
  calDayHasEvent: { color: '#fff', fontWeight: '600' },
  calDayToday: { color: '#22C55E', fontWeight: '700' },
  calDaySelected: { color: '#fff', fontWeight: '700' },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#22C55E', marginTop: 2 },

  dayDetail: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#111113',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e20',
  },
  dayDetailTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  upcomingSection: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  upcomingGroup: { marginBottom: 20 },
  upcomingDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  upcomingDate: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  upcomingDayTotal: { color: '#22C55E', fontSize: 13, fontWeight: '700' },

  divRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#111113', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#1e1e20',
  },
  divLogo: { width: 36, height: 36, borderRadius: 8, overflow: 'hidden' },
  divLogoFallback: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  divLogoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  divSymbol: { color: '#fff', fontSize: 14, fontWeight: '700' },
  divExDate: { color: '#475569', fontSize: 12, marginTop: 2 },
  divDividend: { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  divFreq: { color: '#475569', fontSize: 11, marginTop: 2 },
  noData: { color: '#475569', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
