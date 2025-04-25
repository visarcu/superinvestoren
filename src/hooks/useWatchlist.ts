// src/hooks/useWatchlist.ts
'use client'
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'superinvestor_watchlist'

export function useWatchlist() {
  const [items, setItems] = useState<string[]>([])

  // beim Mount aus localStorage laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // speichert neuen Zustand in state + localStorage
  const save = useCallback((newItems: string[]) => {
    setItems(newItems)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
  }, [])

  // Funktionen
  const add = useCallback((slug: string) => {
    if (!items.includes(slug)) save([...items, slug])
  }, [items, save])

  const remove = useCallback((slug: string) => {
    save(items.filter(i => i !== slug))
  }, [items, save])

  const toggle = useCallback((slug: string) => {
    items.includes(slug) ? remove(slug) : add(slug)
  }, [items, add, remove])

  const isInList = useCallback((slug: string) => items.includes(slug), [items])

  return { items, add, remove, toggle, isInList }
}