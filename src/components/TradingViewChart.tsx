// src/components/TradingViewChart.tsx - TradingView Widget Integration
'use client'

import React, { useEffect, useRef } from 'react'
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets'
import { useTheme } from '@/lib/useTheme'

interface StockData {
  date: string
  close: number
}

interface Props {
  ticker: string
  data?: StockData[]
  onAddComparison?: (ticker: string) => Promise<StockData[]>
}

// Custom TradingView Financials Widget
const TradingViewFinancials: React.FC<{ ticker: string; theme: string }> = ({ ticker, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing content
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol: `NASDAQ:${ticker}`,
      colorTheme: theme,
      isTransparent: true,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
      locale: 'de_DE'
    })

    containerRef.current.appendChild(script)
  }, [ticker, theme])

  return (
    <div ref={containerRef} className="w-full h-full">
      <div className="tradingview-widget-container">
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  )
}

// Clean TradingView Chart Widget (Symbol Overview)
const TradingViewDividends: React.FC<{ ticker: string; theme: string }> = ({ ticker, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear any existing content
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        [`NASDAQ:${ticker}|1D`]
      ],
      chartOnly: false,
      width: '100%',
      height: '100%',
      locale: 'de_DE',
      colorTheme: theme,
      autosize: true,
      showVolume: true,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      lineWidth: 2,
      lineType: 0,
      dateRanges: [
        '1d|1',
        '5d|5',
        '1m|30',
        '3m|60', 
        '6m|1D',
        'ytd|1D',
        '12m|1D',
        '60m|1W',
        'all|1M'
      ]
    })

    containerRef.current.appendChild(script)
  }, [ticker, theme])

  return (
    <div ref={containerRef} className="w-full h-full">
      <div className="tradingview-widget-container">
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  )
}

const TradingViewChart: React.FC<Props> = ({ ticker, data, onAddComparison }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="w-full">
      {/* Minimal Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {ticker} Chart
            </h3>
          </div>
          <div className={`text-xs px-3 py-1 rounded-full ${
            isDark 
              ? 'bg-gray-800/50 text-gray-400 border border-gray-700/50' 
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            Live Data
          </div>
        </div>
      </div>

      {/* TradingView Chart mit optimierter Sidebar */}
      <div className={`w-full h-[600px] rounded-lg overflow-hidden ${
        isDark 
          ? 'bg-gray-900/10 border border-gray-700/50' 
          : 'bg-gray-50/50 border border-gray-200'
      }`}>
        <AdvancedRealTimeChart
          theme={isDark ? 'dark' : 'light'}
          autosize={true}
          symbol={`NASDAQ:${ticker}`}
          interval="D"
          timezone="Etc/UTC"
          style="1"
          locale="de_DE"
          enable_publishing={false}
          allow_symbol_change={false}
          calendar={false}
          container_id={`tradingview_optimized_${ticker}`}
          hide_top_toolbar={false}
          hide_legend={false}
          save_image={false}
          studies={[]}
          show_popup_button={true}
          popup_width="1400"
          popup_height="800"
          withdateranges={true}
          range="12M"
          height={600}
          width="100%"
          hide_side_toolbar={false}
          details={true}
        />
      </div>



      {/* Clean Footer */}
      <div className={`mt-6 flex items-center justify-center text-xs ${
        isDark ? 'text-gray-500' : 'text-gray-500'
      }`}>
        <span>Powered by TradingView</span>
      </div>
    </div>
  )
}

export default TradingViewChart