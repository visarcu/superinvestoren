'use client'

// Tab-Leiste für benannte Watchlists: "Alle" + eigene Listen (Premium).
// Anlegen/Umbenennen inline per Input, Löschen mit confirm().
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WatchlistGroup } from './types'

interface WatchlistTabsProps {
  groups: WatchlistGroup[]
  activeId: 'all' | string
  allCount: number
  countByGroup: Record<string, number>
  isPremium: boolean
  onSelect: (id: 'all' | string) => void
  onCreate: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => void
}

function InlineNameInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string
  onSubmit: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = () => {
    const name = value.trim()
    if (name.length === 0) {
      onCancel()
      return
    }
    onSubmit(name)
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={onCancel}
      maxLength={40}
      placeholder="Name der Liste"
      className="h-8 w-36 px-3 rounded-full bg-white/[0.06] border border-white/[0.12] text-[12px] text-white placeholder-white/25 outline-none focus:border-white/25"
    />
  )
}

export default function WatchlistTabs({
  groups,
  activeId,
  allCount,
  countByGroup,
  isPremium,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: WatchlistTabsProps) {
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const router = useRouter()

  const chipBase =
    'h-8 px-3.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5'

  return (
    <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
      {/* Alle */}
      <button
        onClick={() => onSelect('all')}
        className={`${chipBase} ${
          activeId === 'all'
            ? 'bg-white/[0.1] text-white'
            : 'bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/70'
        }`}
      >
        Alle
        <span className="text-[10px] text-white/35 tabular-nums">{allCount}</span>
      </button>

      {/* Eigene Listen */}
      {groups.map(g =>
        renamingId === g.id ? (
          <InlineNameInput
            key={g.id}
            initial={g.name}
            onSubmit={name => {
              setRenamingId(null)
              if (name !== g.name) onRename(g.id, name)
            }}
            onCancel={() => setRenamingId(null)}
          />
        ) : (
          <div
            key={g.id}
            className={`${chipBase} ${
              activeId === g.id
                ? 'bg-white/[0.1] text-white'
                : 'bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/70'
            }`}
          >
            <button onClick={() => onSelect(g.id)} className="flex items-center gap-1.5">
              {g.name}
              <span className="text-[10px] text-white/35 tabular-nums">{countByGroup[g.id] ?? 0}</span>
            </button>

            {/* Umbenennen/Löschen nur auf aktivem Tab */}
            {activeId === g.id && (
              <span className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-white/[0.08]">
                <button
                  onClick={() => setRenamingId(g.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-white/80 transition-colors"
                  title={`Liste "${g.name}" umbenennen`}
                  aria-label={`Liste "${g.name}" umbenennen`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(g.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-white/35 hover:text-red-400 transition-colors"
                  title={`Liste "${g.name}" löschen`}
                  aria-label={`Liste "${g.name}" löschen`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    />
                  </svg>
                </button>
              </span>
            )}
          </div>
        )
      )}

      {/* Neue Liste */}
      {creating ? (
        <InlineNameInput
          initial=""
          onSubmit={name => {
            setCreating(false)
            onCreate(name)
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          onClick={() => {
            if (!isPremium) {
              router.push('/pricing')
              return
            }
            setCreating(true)
          }}
          className={`${chipBase} border border-dashed ${
            isPremium
              ? 'border-white/[0.12] text-white/40 hover:text-white/70 hover:border-white/25 bg-transparent'
              : 'border-amber-400/25 text-amber-400/70 hover:text-amber-400 bg-transparent'
          }`}
          title={isPremium ? 'Neue Liste anlegen' : 'Eigene Listen sind ein Premium-Feature'}
        >
          {isPremium ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          )}
          Neue Liste
        </button>
      )}
    </div>
  )
}
