// components/StockChart.tsx
'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    TradingView: any
  }
}

// Utility: Script nachladen, wenn noch nicht da
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

interface Props {
  symbol: string
  width?: string | number
  height?: number
}

export default function StockChart({
  symbol,
  width = '100%',
  height = 400,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        // 1) TradingView Skript nachladen
        await loadScript('https://s3.tradingview.com/tv.js')
        if (cancelled) return

        // 2) Widget initialisieren
        window.TradingView?.widget({
          width,
          height,
          symbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'Light',
          style: '1',
          locale: 'de',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current!,
        })
      } catch (e) {
        console.error('TradingView widget init failed', e)
      }
    }
    init()
    return () => {
      cancelled = true
      // falls nötig: containerRef.current.innerHTML = ''
    }
  }, [symbol, width, height])

  return <div ref={containerRef} />
}