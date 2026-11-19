'use client'
// "Für dich"-Feed auf der Terminal-Startseite: neue 13F-Filings gefolgter
// Investoren, Superinvestor-Käufe/-Verkäufe und Insider-Käufe bei Watchlist-
// und Depot-Aktien sowie anstehende Quartalszahlen. Daten: GET /api/feed.

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { formatSignedPercent, formatUsdCompact } from '@/lib/displayFormat'
import type { FeedEarningsItem, FeedItem, PersonalFeed as FeedData } from '@/lib/personalFeed'

const LAST_SEEN_KEY = 'finclue:feed:lastSeen'
const INITIAL_ITEMS = 6

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY)
  } catch {
    return null
  }
}

function writeLastSeen(iso: string) {
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, iso)
  } catch {
    // privater Modus o. Ä. – dann gibt es eben keine "Neu"-Markierung
  }
}

function relativeDay(isoDate: string): string {
  const date = new Date(isoDate.slice(0, 10) + 'T12:00:00')
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000)
  if (Math.abs(diff) <= 6) return new Intl.RelativeTimeFormat('de', { numeric: 'auto' }).format(diff, 'day')
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function insiderRole(role: string | null): string | null {
  if (!role) return null
  const r = role.toLowerCase()
  if (r.includes('officer:')) return role.split(':')[1].trim()
  if (r.includes('director')) return 'Board-Mitglied'
  if (r.includes('10 percent')) return 'Großaktionär'
  return role
}

function earningsTime(time: string | null): string | null {
  if (time === 'bmo') return 'vor Börsenstart'
  if (time === 'amc') return 'nach Börsenschluss'
  return null
}

const MOVE_LABEL = { new: 'neu gekauft', increased: 'aufgestockt', reduced: 'reduziert', sold: 'komplett verkauft' } as const

function ItemRow({ item, isNew }: { item: FeedItem; isNew: boolean }) {
  let href: string
  let title: React.ReactNode
  let detail: React.ReactNode

  if (item.type === 'filing') {
    const parts = [
      item.counts.new && `${item.counts.new} neu`,
      item.counts.increased && `${item.counts.increased} aufgestockt`,
      item.counts.reduced && `${item.counts.reduced} reduziert`,
      item.counts.sold && `${item.counts.sold} verkauft`,
    ].filter(Boolean)
    href = `/superinvestor/${item.investorSlug}`
    title = (
      <>
        <span className="font-medium">{item.investorName}</span> hat das 13F für {item.periodLabel} eingereicht
      </>
    )
    detail = (
      <>
        {parts.length > 0 ? parts.join(' · ') : 'Keine Veränderungen'}
        {item.topBuys.length > 0 && (
          <span className="text-emerald-400">
            {' · '}
            {item.topBuys
              .filter(m => m.ticker)
              .map(m => `${m.ticker} ${m.kind === 'new' ? 'neu' : formatSignedPercent(m.pctChange ?? 0)}`)
              .join(', ')}
          </span>
        )}
      </>
    )
  } else if (item.type === 'move') {
    href = `/analyse/stocks/${item.ticker.toLowerCase()}`
    title = (
      <>
        <span className="font-medium">{item.investorName}</span> hat <span className="font-medium">{item.ticker}</span>{' '}
        {MOVE_LABEL[item.change]}
        {item.pctChange !== null && (
          <span className={item.pctChange >= 0 ? 'text-emerald-400' : 'text-red-400'}> ({formatSignedPercent(item.pctChange)})</span>
        )}
      </>
    )
    detail = (
      <>
        {item.periodLabel}
        {item.portfolioShare !== null &&
          ` · ${
            item.portfolioShare < 0.001
              ? '< 0,1'
              : (item.portfolioShare * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })
          } % des Portfolios`}
      </>
    )
  } else {
    const role = insiderRole(item.insiderRole)
    href = `/analyse/stocks/${item.ticker.toLowerCase()}/insider`
    title = (
      <>
        Insider-Kauf bei <span className="font-medium">{item.ticker}</span>
        {item.totalValue > 0 && <span className="text-emerald-400"> (≈ {formatUsdCompact(item.totalValue)})</span>}
      </>
    )
    detail = (
      <>
        {titleCase(item.insiderName)}
        {role ? `, ${role}` : ''}
        {item.buyCount > 1 ? ` · insgesamt ${item.buyCount} Insider-Käufe in 30 Tagen` : ''}
      </>
    )
  }

  return (
    <li>
      <Link href={href} className="flex items-start gap-3 py-2.5 group">
        <span
          aria-hidden
          className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isNew ? 'bg-brand' : 'bg-theme-tertiary'}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-theme-primary group-hover:underline underline-offset-4">{title}</span>
          <span className="block text-xs text-theme-muted truncate">{detail}</span>
        </span>
        <span className="text-xs text-theme-muted whitespace-nowrap">{relativeDay(item.date)}</span>
      </Link>
    </li>
  )
}

function EarningsList({ items }: { items: FeedEarningsItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-theme-muted">Keine Quartalszahlen in den nächsten 14 Tagen.</p>
  }
  return (
    <ul className="divide-y divide-white/[0.04]">
      {items.map(e => (
        <li key={`${e.ticker}-${e.date}`}>
          <Link href={`/analyse/stocks/${e.ticker.toLowerCase()}/earnings`} className="flex items-center justify-between gap-3 py-2 group">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-theme-primary group-hover:underline underline-offset-4">{e.ticker}</span>
              {e.companyName && <span className="block text-xs text-theme-muted truncate">{e.companyName}</span>}
            </span>
            <span className="text-right shrink-0">
              <span className="block text-sm text-theme-primary">
                {new Date(e.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </span>
              {earningsTime(e.time) && <span className="block text-xs text-theme-muted">{earningsTime(e.time)}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function PersonalFeed() {
  const [feed, setFeed] = useState<FeedData | null>(null)
  const [failed, setFailed] = useState(false)
  const [lastSeen, setLastSeen] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLastSeen(readLastSeen())

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) throw new Error('no session')
        const res = await fetch('/api/feed', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as FeedData
        if (cancelled) return
        setFeed(data)
        writeLastSeen(new Date().toISOString())
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  const isNew = (date: string) => !lastSeen || date.slice(0, 10) > lastSeen.slice(0, 10)
  const newCount = feed ? feed.items.filter(i => isNew(i.date)).length : 0
  const visibleItems = feed ? (showAll ? feed.items : feed.items.slice(0, INITIAL_ITEMS)) : []
  const tracksNothing = feed && feed.followedInvestors === 0 && feed.trackedTickers === 0

  return (
    <section aria-labelledby="fuer-dich" className="bg-theme-card border border-white/[0.04] rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="fuer-dich" className="text-lg font-semibold text-theme-primary">
          Für dich
        </h2>
        {feed && !tracksNothing && (
          <span className="text-xs text-theme-muted">
            {lastSeen && newCount > 0
              ? `${newCount} neu seit deinem letzten Besuch`
              : `${feed.followedInvestors} Investoren · ${feed.trackedTickers} Aktien im Blick`}
          </span>
        )}
      </div>

      {!feed ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 rounded-lg bg-theme-secondary animate-pulse" />
          ))}
        </div>
      ) : tracksNothing ? (
        <p className="mt-3 text-sm text-theme-secondary">
          Hier siehst du, was sich bei deinen Aktien und Investoren tut: neue 13F-Meldungen, Käufe und Verkäufe von
          Superinvestoren, Insider-Käufe und anstehende Quartalszahlen.{' '}
          <Link href="/superinvestor/investors" className="text-theme-primary underline underline-offset-4">
            Investoren folgen
          </Link>{' '}
          oder{' '}
          <Link href="/analyse/watchlist" className="text-theme-primary underline underline-offset-4">
            Aktien auf die Watchlist setzen
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            {feed.items.length === 0 ? (
              <p className="text-sm text-theme-muted">
                Gerade nichts Neues bei deinen Investoren und Aktien. 13F-Meldungen erscheinen jeweils rund 45 Tage nach Quartalsende.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-white/[0.04]">
                  {visibleItems.map((item, i) => (
                    <ItemRow key={`${item.type}-${i}-${item.date}`} item={item} isNew={!!lastSeen && isNew(item.date)} />
                  ))}
                </ul>
                {feed.items.length > INITIAL_ITEMS && (
                  <button
                    type="button"
                    onClick={() => setShowAll(v => !v)}
                    className="mt-2 text-xs text-theme-muted hover:text-theme-primary transition-colors"
                  >
                    {showAll ? 'Weniger anzeigen' : `Alle ${feed.items.length} anzeigen`}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs uppercase tracking-wider text-theme-muted mb-1">Demnächst: Quartalszahlen</h3>
            <EarningsList items={feed.upcomingEarnings} />
          </div>
        </div>
      )}
    </section>
  )
}
