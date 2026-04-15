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
          <Ionicons name="cash-outline" size={40} color={theme.text.muted} />
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
            <Ionicons name="chevron-back" size={20} color={theme.text.secondary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.monthTitle}>{MONTHS_DE[month]} {year}</Text>
            {monthTotal > 0 && (
              <Text style={s.monthTotal}>Gesamt: <Text style={{ color: theme.accent.positive }}>{fmtCurrency(monthTotal)}</Text></Text>
            )}
          </View>
          <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} />
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
                {hasEvents && <View style={[s.calDot, isSel && { backgroundColor: theme.text.inverse }]} />}
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
                      <Text style={[s.upcomingDate, isToday2 && { color: theme.accent.positive }]}>{label}</Text>
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
          <Ionicons name="bar-chart-outline" size={40} color={theme.text.muted} />
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
            <Ionicons name="chevron-back" size={20} color={theme.text.secondary} />
          </TouchableOpacity>
          <Text style={s.monthTitle}>{MONTHS_DE[month]} {year}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.text.secondary} />
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
                {hasEvents && <View style={[s.calDot, isSel && { backgroundColor: theme.text.inverse }]} />}
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
                      <Text style={[s.upcomingDate, isToday2 && { color: theme.accent.positive }]}>{label}</Text>
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
          <Ionicons name="chevron-back" size={22} color={theme.text.primary} />
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
        <View style={s.center}><ActivityIndicator color={theme.text.tertiary} size="large" /></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text.tertiary} />}
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

import { theme, tabularStyle } from '../../lib/theme';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, paddingTop: 60, paddingBottom: theme.space.md,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.md },

  mainTabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border.default },
  mainTabBtn: {
    flex: 1, paddingVertical: theme.space.md, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  mainTabBtnActive: { borderBottomColor: theme.text.primary },
  mainTabText: { color: theme.text.tertiary, fontSize: theme.font.title3, fontWeight: theme.weight.medium },
  mainTabTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  filterRow: { flexDirection: 'row', gap: theme.space.sm, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md },
  filterChip: {
    paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.xs + 2,
    borderRadius: theme.radius.full,
    borderWidth: 1, borderColor: theme.border.default, backgroundColor: theme.bg.card,
  },
  filterChipActive: { borderColor: theme.border.strong, backgroundColor: theme.bg.cardElevated },
  filterChipText: { color: theme.text.tertiary, fontSize: theme.font.body, fontWeight: theme.weight.medium },
  filterChipTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  emptyTab: { alignItems: 'center', justifyContent: 'center', gap: theme.space.md, paddingTop: 80 },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', lineHeight: 20 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg,
  },
  monthBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  monthTotal: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2, ...tabularStyle },
  dowRow: { flexDirection: 'row', paddingHorizontal: theme.space.sm, marginBottom: theme.space.xs },
  dowLabel: { flex: 1, textAlign: 'center', color: theme.text.muted, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.space.sm },
  calCell: {
    width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: theme.radius.sm, marginVertical: 2,
  },
  calCellHasEvent: { backgroundColor: theme.bg.card },
  calCellSelected: { backgroundColor: theme.text.primary },
  calCellToday: { borderWidth: 1, borderColor: theme.border.strong },
  calDayNum: { color: theme.text.tertiary, fontSize: theme.font.title3, ...tabularStyle },
  calDayHasEvent: { color: theme.text.primary, fontWeight: theme.weight.semibold },
  calDayToday: { color: theme.text.primary, fontWeight: theme.weight.bold },
  calDaySelected: { color: theme.text.inverse, fontWeight: theme.weight.bold },
  calDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.accent.positive, marginTop: 2 },

  dayDetail: {
    marginHorizontal: theme.space.lg, marginTop: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
  },
  dayDetailTitle: { color: theme.text.tertiary, fontSize: theme.font.body, fontWeight: theme.weight.semibold, marginBottom: theme.space.md, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },

  upcomingSection: { marginTop: theme.space.xxl, paddingHorizontal: theme.space.lg },
  sectionTitle: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider, textTransform: 'uppercase', marginBottom: theme.space.md },
  upcomingGroup: { marginBottom: theme.space.xl },
  upcomingDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.space.sm },
  upcomingDate: { color: theme.text.secondary, fontSize: theme.font.body, fontWeight: theme.weight.semibold, ...tabularStyle },
  upcomingDayTotal: { color: theme.accent.positive, fontSize: theme.font.body, fontWeight: theme.weight.semibold, ...tabularStyle },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.md, padding: theme.space.md,
    marginBottom: theme.space.sm, borderWidth: 1, borderColor: theme.border.default,
  },
  eventLogo: { width: 32, height: 32, borderRadius: theme.radius.sm, overflow: 'hidden' },
  eventLogoFallback: {
    width: 32, height: 32, borderRadius: theme.radius.sm,
    backgroundColor: theme.bg.cardElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  eventLogoText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  eventSymbol: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  eventSub: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  eventValue: { color: theme.accent.positive, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, ...tabularStyle },
  eventFreq: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2, ...tabularStyle },
  eventQuarter: { color: theme.text.secondary, fontSize: theme.font.body, fontWeight: theme.weight.medium, ...tabularStyle },

  noData: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', paddingVertical: theme.space.md },
});
