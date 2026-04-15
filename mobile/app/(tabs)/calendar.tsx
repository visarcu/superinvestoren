import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
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

type MainTab = 'dividends' | 'earnings';
type SourceFilter = 'portfolio' | 'watchlist' | 'both';

interface DividendEvent {
  symbol: string;
  paymentDate: string;
  exDividendDate: string;
  dividend: number;
  currency?: string;
  frequency?: string;
}

interface EarningsEvent {
  ticker: string;
  companyName: string;
  date: string;
  time: string;
  quarter: string;
  estimatedEPS: number | null;
  actualEPS: number | null;
}

function fmtCurrency(val: number, currency = 'USD') {
  return val.toLocaleString('de-DE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CalendarScreen() {
  const [mainTab, setMainTab]           = useState<MainTab>('dividends');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('portfolio');

  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);

  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([]);
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);

  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const [currentDate, setCurrentDate]   = useState(new Date());
  const [selectedDay, setSelectedDay]   = useState<string | null>(null);

  const today    = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // ─── Derived ticker list ────────────────────────────────
  function getActiveTickers(pf: string[], wl: string[], filter: SourceFilter) {
    if (filter === 'portfolio') return pf;
    if (filter === 'watchlist') return wl;
    return [...new Set([...pf, ...wl])];
  }

  // ─── Load tickers from Supabase ─────────────────────────
  async function loadTickers() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { router.replace('/(auth)/login'); return { pf: [], wl: [] }; }
    const userId = sessionData.session.user.id;

    const [{ data: portfolios }, { data: watchlist }] = await Promise.all([
      supabase.from('portfolios').select('id').eq('user_id', userId),
      supabase.from('watchlists').select('ticker').eq('user_id', userId),
    ]);

    const pf: string[] = [];
    if (portfolios && portfolios.length > 0) {
      const ids = portfolios.map((p: any) => p.id);
      const { data: holdings } = await supabase
        .from('portfolio_holdings').select('symbol').in('portfolio_id', ids);
      holdings?.forEach((h: any) => { if (!pf.includes(h.symbol)) pf.push(h.symbol); });
    }
    const wl: string[] = watchlist?.map((w: any) => w.ticker) || [];
    return { pf, wl };
  }

  // ─── Load dividends ──────────────────────────────────────
  async function loadDividends(tickers: string[], token: string) {
    if (tickers.length === 0) { setDividendEvents([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/dividends-calendar?tickers=${tickers.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const events: DividendEvent[] = (Array.isArray(data) ? data : [])
        .map((item: any) => ({
          symbol:          item.ticker || item.symbol || '',
          paymentDate:     item.paymentDate || item.date || '',
          exDividendDate:  item.exDate || item.date || '',
          dividend:        item.dividend || 0,
          currency:        'USD',
          frequency:       item.frequency,
        }))
        .filter((e: DividendEvent) => !!e.paymentDate && !!e.symbol)
        .sort((a: DividendEvent, b: DividendEvent) => a.paymentDate.localeCompare(b.paymentDate));
      setDividendEvents(events);
    } catch (e) { console.error('[Calendar] dividends', e); }
  }

  // ─── Load earnings ───────────────────────────────────────
  async function loadEarnings(tickers: string[]) {
    if (tickers.length === 0) { setEarningsEvents([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/earnings-calendar?tickers=${tickers.join(',')}`);
      if (!res.ok) return;
      const data = await res.json();
      setEarningsEvents(Array.isArray(data) ? data : []);
    } catch (e) { console.error('[Calendar] earnings', e); }
  }

  // ─── Main load ───────────────────────────────────────────
  async function load(filter: SourceFilter = sourceFilter) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }
      const token = sessionData.session.access_token;

      const { pf, wl } = await loadTickers();
      setPortfolioTickers(pf);
      setWatchlistTickers(wl);

      const tickers = getActiveTickers(pf, wl, filter);
      await Promise.all([loadDividends(tickers, token), loadEarnings(tickers)]);
    } catch (e) {
      console.error('[Calendar]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Reload when source filter changes
  async function onFilterChange(f: SourceFilter) {
    setSourceFilter(f);
    setSelectedDay(null);
    setLoading(true);
    await load(f);
  }

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [sourceFilter]);

  // ─── Calendar helpers ────────────────────────────────────
  function buildCalendarDays() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const days: (string | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(`${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
    return days;
  }

  function changeMonth(dir: number) {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
    setSelectedDay(null);
  }

  // ─── Dividends calendar ──────────────────────────────────
  function getDividendDayEvents(dateStr: string) {
    return dividendEvents.filter(e => e.paymentDate === dateStr);
  }

  function renderDividendsTab() {
    const year     = currentDate.getFullYear();
    const month    = currentDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2,'0')}`;
    const calDays  = buildCalendarDays();
    const monthEvents = dividendEvents.filter(e => e.paymentDate.startsWith(monthStr));
    const monthTotal  = monthEvents.reduce((s, e) => s + e.dividend, 0);
    const selectedEvents = selectedDay ? getDividendDayEvents(selectedDay) : [];
    const upcoming = dividendEvents.filter(e => e.paymentDate >= todayStr).slice(0, 20);
    const grouped: Record<string, DividendEvent[]> = {};
    for (const e of upcoming) {
      if (!grouped[e.paymentDate]) grouped[e.paymentDate] = [];
      grouped[e.paymentDate].push(e);
    }

    if (dividendEvents.length === 0 && !loading) {
      return (
        <View style={s.emptyTab}>
          <Ionicons name="cash-outline" size={40} color="#334155" />
          <Text style={s.emptyTitle}>Keine Dividenden</Text>
          <Text style={s.emptyText}>Füge Aktien zum {sourceFilter === 'portfolio' ? 'Depot' : 'Watchlist'} hinzu</Text>
        </View>
      );
    }

    return (
      <>
        {/* Month Nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.monthTitle}>{MONTHS_DE[month]} {year}</Text>
            {monthTotal > 0 && (
              <Text style={s.monthTotal}>Gesamt: <Text style={{ color: '#34C759' }}>{fmtCurrency(monthTotal)}</Text></Text>
            )}
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dowRow}>
          {DAYS_DE.map(d => <Text key={d} style={s.dowLabel}>{d}</Text>)}
        </View>

        {/* Grid */}
        <View style={s.calGrid}>
          {calDays.map((dateStr, i) => {
            if (!dateStr) return <View key={`e-${i}`} style={s.calCell} />;
            const dayNum    = parseInt(dateStr.split('-')[2]);
            const hasEvents = getDividendDayEvents(dateStr).length > 0;
            const isToday   = dateStr === todayStr;
            const isSel     = dateStr === selectedDay;
            return (
              <TouchableOpacity key={dateStr} disabled={!hasEvents}
                style={[s.calCell, hasEvents && s.calCellHasEvent, isSel && s.calCellSelected, isToday && !isSel && s.calCellToday]}
                onPress={() => setSelectedDay(isSel ? null : dateStr)}>
                <Text style={[s.calDayNum, isToday && s.calDayToday, isSel && s.calDaySelected, hasEvents && !isSel && s.calDayHasEvent]}>{dayNum}</Text>
                {hasEvents && <View style={[s.calDot, isSel && { backgroundColor: '#fff' }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day */}
        {selectedDay && (
          <View style={s.dayDetail}>
            <Text style={s.dayDetailTitle}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {selectedEvents.length === 0
              ? <Text style={s.noData}>Keine Dividende an diesem Tag</Text>
              : selectedEvents.map((ev, i) => <DividendRow key={i} event={ev} />)
            }
          </View>
        )}

        {/* Upcoming */}
        <View style={s.upcomingSection}>
          <Text style={s.sectionTitle}>KOMMENDE DIVIDENDEN</Text>
          {Object.keys(grouped).length === 0
            ? <Text style={s.noData}>Keine kommenden Dividenden</Text>
            : Object.entries(grouped).map(([dateStr, evs]) => {
                const isToday2 = dateStr === todayStr;
                const label = isToday2
                  ? 'Heute'
                  : new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                const dayTotal = evs.reduce((s, e) => s + e.dividend, 0);
                return (
                  <View key={dateStr} style={s.upcomingGroup}>
                    <View style={s.upcomingDateRow}>
                      <Text style={[s.upcomingDate, isToday2 && { color: '#34C759' }]}>{label}</Text>
                      {dayTotal > 0 && <Text style={s.upcomingDayTotal}>{fmtCurrency(dayTotal)}</Text>}
                    </View>
                    {evs.map((ev, i) => <DividendRow key={i} event={ev} />)}
                  </View>
                );
              })
          }
        </View>
      </>
    );
  }

  // ─── Earnings calendar ───────────────────────────────────
  function getEarningsDayEvents(dateStr: string) {
    return earningsEvents.filter(e => e.date === dateStr);
  }

  function renderEarningsTab() {
    const year     = currentDate.getFullYear();
    const month    = currentDate.getMonth();
    const calDays  = buildCalendarDays();
    const upcoming = earningsEvents.filter(e => e.date >= todayStr).slice(0, 30);
    const grouped: Record<string, EarningsEvent[]> = {};
    for (const e of upcoming) {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    }
    const selectedEvents = selectedDay ? getEarningsDayEvents(selectedDay) : [];

    if (earningsEvents.length === 0 && !loading) {
      return (
        <View style={s.emptyTab}>
          <Ionicons name="bar-chart-outline" size={40} color="#334155" />
          <Text style={s.emptyTitle}>Keine Quartalszahlen</Text>
          <Text style={s.emptyText}>Füge Aktien zum {sourceFilter === 'portfolio' ? 'Depot' : 'Watchlist'} hinzu</Text>
        </View>
      );
    }

    return (
      <>
        {/* Month Nav */}
        <View style={s.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={s.monthBtn}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={s.monthTitle}>{MONTHS_DE[month]} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={s.dowRow}>
          {DAYS_DE.map(d => <Text key={d} style={s.dowLabel}>{d}</Text>)}
        </View>

        {/* Grid */}
        <View style={s.calGrid}>
          {calDays.map((dateStr, i) => {
            if (!dateStr) return <View key={`e-${i}`} style={s.calCell} />;
            const dayNum    = parseInt(dateStr.split('-')[2]);
            const hasEvents = getEarningsDayEvents(dateStr).length > 0;
            const isToday   = dateStr === todayStr;
            const isSel     = dateStr === selectedDay;
            return (
              <TouchableOpacity key={dateStr} disabled={!hasEvents}
                style={[s.calCell, hasEvents && s.calCellHasEvent, isSel && s.calCellSelected, isToday && !isSel && s.calCellToday]}
                onPress={() => setSelectedDay(isSel ? null : dateStr)}>
                <Text style={[s.calDayNum, isToday && s.calDayToday, isSel && s.calDaySelected, hasEvents && !isSel && s.calDayHasEvent]}>{dayNum}</Text>
                {hasEvents && <View style={[s.calDot, isSel && { backgroundColor: '#fff' }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day */}
        {selectedDay && (
          <View style={s.dayDetail}>
            <Text style={s.dayDetailTitle}>
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {selectedEvents.length === 0
              ? <Text style={s.noData}>Keine Quartalszahlen an diesem Tag</Text>
              : selectedEvents.map((ev, i) => <EarningsRow key={i} event={ev} />)
            }
          </View>
        )}

        {/* Upcoming */}
        <View style={s.upcomingSection}>
          <Text style={s.sectionTitle}>KOMMENDE QUARTALSZAHLEN</Text>
          {Object.keys(grouped).length === 0
            ? <Text style={s.noData}>Keine bevorstehenden Quartalszahlen</Text>
            : Object.entries(grouped).map(([dateStr, evs]) => {
                const isToday2 = dateStr === todayStr;
                const label = isToday2
                  ? 'Heute'
                  : new Date(dateStr + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <View key={dateStr} style={s.upcomingGroup}>
                    <View style={s.upcomingDateRow}>
                      <Text style={[s.upcomingDate, isToday2 && { color: '#34C759' }]}>{label}</Text>
                    </View>
                    {evs.map((ev, i) => <EarningsRow key={i} event={ev} />)}
                  </View>
                );
              })
          }
        </View>
      </>
    );
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kalender</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Main tabs */}
      <View style={s.mainTabBar}>
        <TouchableOpacity style={[s.mainTabBtn, mainTab === 'dividends' && s.mainTabBtnActive]}
          onPress={() => { setMainTab('dividends'); setSelectedDay(null); }}>
          <Text style={[s.mainTabText, mainTab === 'dividends' && s.mainTabTextActive]}>Dividenden</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.mainTabBtn, mainTab === 'earnings' && s.mainTabBtnActive]}
          onPress={() => { setMainTab('earnings'); setSelectedDay(null); }}>
          <Text style={[s.mainTabText, mainTab === 'earnings' && s.mainTabTextActive]}>Quartalszahlen</Text>
        </TouchableOpacity>
      </View>

      {/* Source filter */}
      <View style={s.filterRow}>
        {(['portfolio','watchlist','both'] as SourceFilter[]).map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, sourceFilter === f && s.filterChipActive]}
            onPress={() => onFilterChange(f)}>
            <Text style={[s.filterChipText, sourceFilter === f && s.filterChipTextActive]}>
              {f === 'portfolio' ? 'Depot' : f === 'watchlist' ? 'Watchlist' : 'Beide'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#34C759" size="large" /></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#34C759" />}
        >
          {mainTab === 'dividends' ? renderDividendsTab() : renderEarningsTab()}
        </ScrollView>
      )}
    </View>
  );
}

// ─── DividendRow ─────────────────────────────────────────
function DividendRow({ event }: { event: DividendEvent }) {
  const [logoErr, setLogoErr] = useState(false);
  const FREQ_DE: Record<string, string> = {
    Monthly: 'Monatlich', Quarterly: 'Quartalsweise',
    'Semi-Annual': 'Halbjährlich', Annual: 'Jährlich',
  };
  return (
    <TouchableOpacity style={s.eventRow} onPress={() => router.push(`/stock/${event.symbol}`)}>
      <View style={s.eventLogo}>
        {!logoErr ? (
          <Image source={{ uri: `https://financialmodelingprep.com/image-stock/${event.symbol}.png` }}
            style={{ width: 32, height: 32, borderRadius: 8 }} onError={() => setLogoErr(true)} />
        ) : (
          <View style={s.eventLogoFallback}>
            <Text style={s.eventLogoText}>{event.symbol[0]}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eventSymbol}>{event.symbol}</Text>
        <Text style={s.eventSub}>Ex-Tag: {event.exDividendDate
          ? new Date(event.exDividendDate + 'T12:00:00').toLocaleDateString('de-DE') : '—'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.eventValue}>{(event.dividend || 0).toLocaleString('de-DE', { minimumFractionDigits: 4 })} $</Text>
        {event.frequency && <Text style={s.eventFreq}>{FREQ_DE[event.frequency] || event.frequency}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── EarningsRow ─────────────────────────────────────────
function EarningsRow({ event }: { event: EarningsEvent }) {
  const [logoErr, setLogoErr] = useState(false);
  const timeLabel = event.time === 'bmo' ? 'Vor Börseneröffnung'
    : event.time === 'amc' ? 'Nach Börsenschluss' : event.time || '';
  return (
    <TouchableOpacity style={s.eventRow} onPress={() => router.push(`/stock/${event.ticker}`)}>
      <View style={s.eventLogo}>
        {!logoErr ? (
          <Image source={{ uri: `https://financialmodelingprep.com/image-stock/${event.ticker}.png` }}
            style={{ width: 32, height: 32, borderRadius: 8 }} onError={() => setLogoErr(true)} />
        ) : (
          <View style={s.eventLogoFallback}>
            <Text style={s.eventLogoText}>{event.ticker[0]}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eventSymbol}>{event.ticker}</Text>
        {timeLabel ? <Text style={s.eventSub}>{timeLabel}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.eventQuarter}>{event.quarter}</Text>
        {event.estimatedEPS != null && (
          <Text style={s.eventFreq}>EPS est. {event.estimatedEPS.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#2C2C2E',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  // Main tab bar
  mainTabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2C2C2E',
  },
  mainTabBtn: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  mainTabBtnActive: { borderBottomColor: '#34C759' },
  mainTabText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  mainTabTextActive: { color: '#34C759' },

  // Source filter chips
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#2C2C2E', backgroundColor: '#1C1C1E',
  },
  filterChipActive: { borderColor: '#34C759', backgroundColor: 'rgba(34,197,94,0.1)' },
  filterChipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#34C759' },

  // Empty state
  emptyTab: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },

  // Calendar
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
    width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, marginVertical: 2,
  },
  calCellHasEvent: { backgroundColor: 'rgba(34,197,94,0.08)' },
  calCellSelected: { backgroundColor: '#34C759' },
  calCellToday: { borderWidth: 1, borderColor: '#34C759' },
  calDayNum: { color: '#64748b', fontSize: 14 },
  calDayHasEvent: { color: '#fff', fontWeight: '600' },
  calDayToday: { color: '#34C759', fontWeight: '700' },
  calDaySelected: { color: '#fff', fontWeight: '700' },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#34C759', marginTop: 2 },

  // Day detail
  dayDetail: {
    marginHorizontal: 16, marginTop: 12, backgroundColor: '#1C1C1E',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2C2C2E',
  },
  dayDetailTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12 },

  // Upcoming
  upcomingSection: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  upcomingGroup: { marginBottom: 20 },
  upcomingDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  upcomingDate: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  upcomingDayTotal: { color: '#34C759', fontSize: 13, fontWeight: '700' },

  // Event rows
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1C1C1E', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2C2C2E',
  },
  eventLogo: { width: 36, height: 36, borderRadius: 8, overflow: 'hidden' },
  eventLogoFallback: {
    width: 36, height: 36, borderRadius: 8, backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  eventLogoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  eventSymbol: { color: '#fff', fontSize: 14, fontWeight: '700' },
  eventSub: { color: '#475569', fontSize: 12, marginTop: 2 },
  eventValue: { color: '#34C759', fontSize: 14, fontWeight: '700' },
  eventFreq: { color: '#475569', fontSize: 11, marginTop: 2 },
  eventQuarter: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  noData: { color: '#475569', fontSize: 14, textAlign: 'center', paddingVertical: 12 },
});
