// src/components/chart-builder/ChartBuilder.tsx
'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useChartBuilderReducer } from './useChartBuilderReducer'
import { useChartBuilderData } from './useChartBuilderData'
import { buildChartData, filterByTimeRange, determineYAxisConfig } from './dataProcessing'
import ChartHeader from './ChartHeader'
import ChartSidebar from './ChartSidebar'
import ChartCanvas from './ChartCanvas'
import TimeControls from './TimeControls'
import ChartFooter from './ChartFooter'
import PresetModal from './PresetModal'

export default function ChartBuilder() {
  const [state, dispatch] = useChartBuilderReducer()
  const [user, setUser] = useState<User | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [showPresetModal, setShowPresetModal] = useState(false)
  const [showMyCharts, setShowMyCharts] = useState(false)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      setUser(session.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setIsPremium(profile?.is_premium || false)
    }
    checkAuth()
  }, [])

  // Data fetching
  useChartBuilderData(state, dispatch)

  const maxStocks = isPremium ? 10 : 2
  const maxMetrics = isPremium ? Infinity : 2

  // Check if any metric is a price metric
  const hasPriceMetric = useMemo(
    () => state.activeMetrics.some(m => m.metricKey === 'stockPrice'),
    [state.activeMetrics]
  )

  // Build chart data
  const rawChartData = useMemo(
    () => buildChartData(state.activeMetrics, state.dataCache, state.viewMode, state.granularity),
    [state.activeMetrics, state.dataCache, state.viewMode, state.granularity]
  )

  // Filter by time range
  const chartData = useMemo(
    () => filterByTimeRange(rawChartData, state.timeRange, state.customDateRange),
    [rawChartData, state.timeRange, state.customDateRange]
  )

  // Y-axis configuration
  const yAxisConfigs = useMemo(
    () => determineYAxisConfig(state.activeMetrics),
    [state.activeMetrics]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modals
      if (e.key === 'Escape') {
        if (showPresetModal) setShowPresetModal(false)
        if (showMyCharts) setShowMyCharts(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPresetModal, showMyCharts])

  // Get current date for subtitle
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-theme-primary overflow-hidden">
      {/* Header */}
      <ChartHeader
        state={state}
        dispatch={dispatch}
        onOpenPresets={() => setShowPresetModal(true)}
        onOpenMyCharts={() => setShowMyCharts(true)}
        isPremium={isPremium}
      />

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <ChartSidebar
          state={state}
          dispatch={dispatch}
          maxStocks={maxStocks}
          maxMetrics={maxMetrics}
          isPremium={isPremium}
        />

        {/* Chart + Footer column */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Time controls */}
          <TimeControls
            granularity={state.granularity}
            timeRange={state.timeRange}
            viewMode={state.viewMode}
            hasPriceMetric={hasPriceMetric}
            isPremium={isPremium}
            onGranularityChange={g => dispatch({ type: 'SET_GRANULARITY', granularity: g })}
            onTimeRangeChange={r => dispatch({ type: 'SET_TIME_RANGE', timeRange: r })}
            onViewModeChange={m => dispatch({ type: 'SET_VIEW_MODE', viewMode: m })}
          />

          {/* Chart - constrained height like QualtTrim */}
          <div className="h-[min(55vh,480px)] min-h-[320px] flex-shrink-0">
            <ChartCanvas
              chartData={chartData}
              activeMetrics={state.activeMetrics}
              yAxisConfigs={yAxisConfigs}
              viewMode={state.viewMode}
              loading={state.loading}
            />
          </div>

          {/* Footer stats */}
          <ChartFooter
            activeMetrics={state.activeMetrics}
            chartData={chartData}
            viewMode={state.viewMode}
            onRemoveMetric={id => dispatch({ type: 'REMOVE_METRIC', id })}
          />
        </div>
      </div>

      {/* Preset Modal */}
      <PresetModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        dispatch={dispatch}
        hasStocks={state.stocks.length > 0}
      />
    </div>
  )
}
