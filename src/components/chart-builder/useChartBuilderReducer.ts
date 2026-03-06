// src/components/chart-builder/useChartBuilderReducer.ts
'use client'

import { useReducer } from 'react'
import { ChartBuilderState, ChartBuilderAction, ActiveMetric } from './types'
import { getNextColor } from './colors'
import { getMetricDefinition } from './metricRegistry'

const initialState: ChartBuilderState = {
  stocks: [],
  stockNames: {},
  activeMetrics: [],
  granularity: 'annual',
  timeRange: '5Y',
  viewMode: 'normal',
  title: '',
  description: '',
  loading: false,
  dataCache: {},
}

function chartBuilderReducer(state: ChartBuilderState, action: ChartBuilderAction): ChartBuilderState {
  switch (action.type) {
    case 'ADD_STOCK': {
      if (state.stocks.includes(action.ticker)) return state
      return {
        ...state,
        stocks: [...state.stocks, action.ticker],
        stockNames: { ...state.stockNames, [action.ticker]: action.name },
      }
    }

    case 'REMOVE_STOCK': {
      const newStockNames = { ...state.stockNames }
      delete newStockNames[action.ticker]
      const newDataCache = { ...state.dataCache }
      delete newDataCache[action.ticker]
      return {
        ...state,
        stocks: state.stocks.filter(s => s !== action.ticker),
        stockNames: newStockNames,
        activeMetrics: state.activeMetrics.filter(m => m.stockTicker !== action.ticker),
        dataCache: newDataCache,
      }
    }

    case 'ADD_METRIC': {
      // Prevent duplicates
      const exists = state.activeMetrics.some(
        m => m.metricKey === action.metric.metricKey && m.stockTicker === action.metric.stockTicker
      )
      if (exists) return state
      return {
        ...state,
        activeMetrics: [...state.activeMetrics, action.metric],
      }
    }

    case 'ADD_METRICS_BULK': {
      const newMetrics = action.metrics.filter(
        newM => !state.activeMetrics.some(
          existing => existing.metricKey === newM.metricKey && existing.stockTicker === newM.stockTicker
        )
      )
      if (newMetrics.length === 0) return state
      return {
        ...state,
        activeMetrics: [...state.activeMetrics, ...newMetrics],
      }
    }

    case 'REMOVE_METRIC':
      return {
        ...state,
        activeMetrics: state.activeMetrics.filter(m => m.id !== action.id),
      }

    case 'TOGGLE_METRIC_VISIBILITY':
      return {
        ...state,
        activeMetrics: state.activeMetrics.map(m =>
          m.id === action.id ? { ...m, visible: !m.visible } : m
        ),
      }

    case 'SET_METRIC_COLOR':
      return {
        ...state,
        activeMetrics: state.activeMetrics.map(m =>
          m.id === action.id ? { ...m, color: action.color } : m
        ),
      }

    case 'SET_GRANULARITY':
      return { ...state, granularity: action.granularity, dataCache: {} }

    case 'SET_TIME_RANGE':
      return { ...state, timeRange: action.timeRange }

    case 'SET_CUSTOM_DATE_RANGE':
      return { ...state, timeRange: 'custom', customDateRange: action.range }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode }

    case 'SET_TITLE':
      return { ...state, title: action.title }

    case 'SET_DESCRIPTION':
      return { ...state, description: action.description }

    case 'SET_LOADING':
      return { ...state, loading: action.loading }

    case 'CACHE_DATA':
      return {
        ...state,
        dataCache: { ...state.dataCache, [action.ticker]: action.data },
      }

    case 'LOAD_PRESET': {
      // Clear existing metrics and add preset metrics for all stocks
      const usedColors: string[] = []
      const newMetrics: ActiveMetric[] = []

      for (const stock of state.stocks) {
        for (const metricKey of action.preset.metrics) {
          const def = getMetricDefinition(metricKey)
          if (!def) continue
          const color = getNextColor(usedColors)
          usedColors.push(color)
          newMetrics.push({
            id: `${stock}_${metricKey}_${Date.now()}`,
            metricKey,
            stockTicker: stock,
            color,
            visible: true,
            yAxisSide: determineYAxisSide(def.unit, newMetrics),
          })
        }
      }

      return {
        ...state,
        activeMetrics: newMetrics,
        granularity: action.preset.granularity || state.granularity,
        timeRange: action.preset.timeRange || state.timeRange,
        title: state.stocks.length === 1
          ? `${state.stocks[0]} - ${action.preset.name}`
          : action.preset.name,
      }
    }

    case 'CLEAR_METRICS':
      return { ...state, activeMetrics: [] }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

function determineYAxisSide(unit: string, existingMetrics: ActiveMetric[]): 'left' | 'right' {
  if (existingMetrics.length === 0) return 'left'
  // Check what units are already on the left
  const leftUnits = new Set<string>()
  for (const m of existingMetrics) {
    if (m.yAxisSide === 'left') {
      const def = getMetricDefinition(m.metricKey)
      if (def) leftUnits.add(def.unit)
    }
  }
  // If this unit is already on the left, keep it there
  if (leftUnits.has(unit)) return 'left'
  // If left has a different unit, put this on the right
  if (leftUnits.size > 0) return 'right'
  return 'left'
}

export function useChartBuilderReducer() {
  return useReducer(chartBuilderReducer, initialState)
}

export { initialState }
