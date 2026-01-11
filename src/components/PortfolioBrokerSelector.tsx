// src/components/PortfolioBrokerSelector.tsx
'use client'

import React from 'react'
import {
  DevicePhoneMobileIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { BROKER_CONFIGS, BrokerConfig, BrokerType } from '@/lib/brokerConfig'

interface PortfolioBrokerSelectorProps {
  selectedBroker: BrokerType | null
  onSelect: (broker: BrokerType) => void
  className?: string
}

// Icon mapping
const BROKER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DevicePhoneMobileIcon,
  ChartBarIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  BuildingOffice2Icon
}

function BrokerIcon({ iconName, className, color }: { iconName: string; className?: string; color?: string }) {
  const Icon = BROKER_ICONS[iconName] || BuildingOffice2Icon
  return (
    <span style={{ color }}>
      <Icon className={className} />
    </span>
  )
}

export default function PortfolioBrokerSelector({
  selectedBroker,
  onSelect,
  className = ''
}: PortfolioBrokerSelectorProps) {
  // Sortiere: Bekannte Broker zuerst, dann manual/andere am Ende
  const sortedBrokers = [...BROKER_CONFIGS].sort((a, b) => {
    const order: Record<string, number> = {
      trade_republic: 1,
      scalable_capital: 2,
      ing: 3,
      comdirect: 4,
      interactive_brokers: 5,
      andere: 6,
      manual: 7
    }
    return (order[a.id] || 99) - (order[b.id] || 99)
  })

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {sortedBrokers.map((broker) => {
        const isSelected = selectedBroker === broker.id

        return (
          <button
            key={broker.id}
            onClick={() => onSelect(broker.id)}
            className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
              isSelected
                ? 'border-brand bg-brand/10 shadow-lg shadow-brand/20'
                : 'border-theme/20 bg-theme-card hover:border-theme/40 hover:bg-theme-secondary/30'
            }`}
          >
            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3">
                <CheckCircleIcon className="w-6 h-6 text-brand" />
              </div>
            )}

            {/* Icon with Broker Color */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${broker.color}20` }}
            >
              <BrokerIcon
                iconName={broker.iconName}
                className="w-6 h-6"
                color={broker.color}
              />
            </div>

            {/* Broker Name */}
            <h3 className="font-semibold text-theme-primary mb-1">
              {broker.displayName}
            </h3>

            {/* Description */}
            {broker.description && (
              <p className="text-sm text-theme-secondary line-clamp-2">
                {broker.description}
              </p>
            )}

            {/* Color Indicator */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: broker.color }}
              />
              <span className="text-xs text-theme-muted">
                {broker.color}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Compact version for inline selection
export function PortfolioBrokerSelectorCompact({
  selectedBroker,
  onSelect,
  className = ''
}: PortfolioBrokerSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {BROKER_CONFIGS.map((broker) => {
        const isSelected = selectedBroker === broker.id

        return (
          <button
            key={broker.id}
            onClick={() => onSelect(broker.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              isSelected
                ? 'border-brand bg-brand/10 text-brand-light'
                : 'border-theme/20 bg-theme-card text-theme-secondary hover:border-theme/40'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: broker.color }}
            />
            <span className="text-sm font-medium">{broker.displayName}</span>
          </button>
        )
      })}
    </div>
  )
}

// Single broker badge display
export function BrokerBadge({
  brokerId,
  customName,
  customColor,
  size = 'md'
}: {
  brokerId: BrokerType | string | null
  customName?: string | null
  customColor?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const broker = BROKER_CONFIGS.find(b => b.id === brokerId) || BROKER_CONFIGS.find(b => b.id === 'manual')!
  const displayName = brokerId === 'andere' && customName ? customName : broker.displayName
  const color = customColor || broker.color

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <div
        className={`rounded-full ${size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
        style={{ backgroundColor: color }}
      />
      {displayName}
    </div>
  )
}
