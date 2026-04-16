// src/components/PortfolioBrokerSelector.tsx
// Premium Broker-Auswahl für Depot-Anlage — nutzt BrokerLogo-Komponente für Markenlogos.
'use client'

import React from 'react'
import {
  BuildingLibraryIcon,
  BanknotesIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { BROKER_CONFIGS, BrokerType, brokerTypeToLogoId } from '@/lib/brokerConfig'
import { BrokerLogo } from '@/components/portfolio/BrokerLogo'

interface PortfolioBrokerSelectorProps {
  selectedBroker: BrokerType | null
  onSelect: (broker: BrokerType) => void
  className?: string
}

// Fallback-Icons für Broker ohne eigenes Brand-Logo (ING, Comdirect, IB, andere, manual)
const FALLBACK_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  BuildingLibraryIcon,
  BanknotesIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
}

function BrokerAvatar({ brokerId, iconName, color }: { brokerId: BrokerType; iconName: string; color: string }) {
  const logoId = brokerTypeToLogoId(brokerId)
  if (logoId) {
    return <BrokerLogo brokerId={logoId} size={40} />
  }
  // Fallback: monogrammatischer Avatar mit Heroicon
  const Icon = FALLBACK_ICONS[iconName] || BuildingOffice2Icon
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
    >
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
  )
}

export default function PortfolioBrokerSelector({
  selectedBroker,
  onSelect,
  className = '',
}: PortfolioBrokerSelectorProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
      {BROKER_CONFIGS.map((broker) => {
        const isSelected = selectedBroker === broker.id

        return (
          <button
            key={broker.id}
            onClick={() => onSelect(broker.id)}
            className={`relative p-3.5 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-neutral-600 bg-neutral-900'
                : 'border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                <CheckIcon className="w-3 h-3 text-neutral-950" strokeWidth={3} />
              </div>
            )}

            <div className="flex items-start gap-3">
              <BrokerAvatar brokerId={broker.id} iconName={broker.iconName} color={broker.color} />
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="font-medium text-[13px] text-white truncate pr-5">
                  {broker.displayName}
                </h3>
                {broker.description && (
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug line-clamp-2">
                    {broker.description}
                  </p>
                )}
              </div>
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
  className = '',
}: PortfolioBrokerSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {BROKER_CONFIGS.map((broker) => {
        const isSelected = selectedBroker === broker.id

        return (
          <button
            key={broker.id}
            onClick={() => onSelect(broker.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[12px] ${
              isSelected
                ? 'border-neutral-600 bg-neutral-900 text-white'
                : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
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
  size = 'md',
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
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-[11px]',
    lg: 'px-3 py-1.5 text-[12px]',
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md font-medium bg-neutral-900 border border-neutral-800 text-neutral-300 ${sizeClasses[size]}`}>
      <div
        className={`rounded-full ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ backgroundColor: color }}
      />
      {displayName}
    </div>
  )
}
