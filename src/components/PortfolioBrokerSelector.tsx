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
import { BROKER_CONFIGS, BrokerType } from '@/lib/brokerConfig'

interface PortfolioBrokerSelectorProps {
  selectedBroker: BrokerType | null
  onSelect: (broker: BrokerType) => void
  className?: string
}

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
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${className}`}>
      {sortedBrokers.map((broker) => {
        const isSelected = selectedBroker === broker.id

        return (
          <button
            key={broker.id}
            onClick={() => onSelect(broker.id)}
            className={`relative p-4 rounded-lg border transition-all duration-200 text-left ${
              isSelected
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
              </div>
            )}

            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: `${broker.color}20` }}
            >
              <BrokerIcon
                iconName={broker.iconName}
                className="w-5 h-5"
                color={broker.color}
              />
            </div>

            <h3 className="font-medium text-white mb-0.5 text-sm">
              {broker.displayName}
            </h3>

            {broker.description && (
              <p className="text-xs text-neutral-500 line-clamp-2">
                {broker.description}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: broker.color }}
              />
              <span className="text-[10px] text-neutral-600">
                {broker.color}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm ${
              isSelected
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: broker.color }}
            />
            <span className="font-medium">{broker.displayName}</span>
          </button>
        )
      })}
    </div>
  )
}

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
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
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
