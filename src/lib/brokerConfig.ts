// src/lib/brokerConfig.ts

export type BrokerType =
  | 'manual'
  | 'trade_republic'
  | 'scalable_capital'
  | 'ing'
  | 'comdirect'
  | 'interactive_brokers'
  | 'andere'

export interface BrokerConfig {
  id: BrokerType
  displayName: string
  color: string
  iconName: string // Heroicon name
  description?: string
}

export const BROKER_CONFIGS: BrokerConfig[] = [
  {
    id: 'trade_republic',
    displayName: 'Trade Republic',
    color: '#1A1A1A',
    iconName: 'DevicePhoneMobileIcon',
    description: 'Mobiler Neobroker aus Berlin'
  },
  {
    id: 'scalable_capital',
    displayName: 'Scalable Capital',
    color: '#00D09C',
    iconName: 'ChartBarIcon',
    description: 'Digitale Vermögensverwaltung'
  },
  {
    id: 'ing',
    displayName: 'ING',
    color: '#FF6200',
    iconName: 'BuildingLibraryIcon',
    description: 'Direktbank mit Depot'
  },
  {
    id: 'comdirect',
    displayName: 'Comdirect',
    color: '#FFD700',
    iconName: 'BanknotesIcon',
    description: 'Online-Broker der Commerzbank'
  },
  {
    id: 'interactive_brokers',
    displayName: 'Interactive Brokers',
    color: '#D41A1F',
    iconName: 'GlobeAltIcon',
    description: 'Internationaler Profi-Broker'
  },
  {
    id: 'manual',
    displayName: 'Manuelles Depot',
    color: '#6B7280',
    iconName: 'PencilSquareIcon',
    description: 'Eigene Verwaltung ohne Broker-Zuordnung'
  },
  {
    id: 'andere',
    displayName: 'Anderer Broker',
    color: '#8B5CF6',
    iconName: 'BuildingOffice2Icon',
    description: 'Sonstiger Broker mit eigenem Namen'
  },
]

export function getBrokerConfig(brokerId: BrokerType | string | null | undefined): BrokerConfig {
  const config = BROKER_CONFIGS.find(b => b.id === brokerId)
  return config || BROKER_CONFIGS.find(b => b.id === 'manual')!
}

export function getBrokerDisplayName(brokerId: BrokerType | string | null | undefined, customName?: string | null): string {
  if (brokerId === 'andere' && customName) {
    return customName
  }
  return getBrokerConfig(brokerId).displayName
}

export function getBrokerColor(brokerId: BrokerType | string | null | undefined, customColor?: string | null): string {
  if (customColor) {
    return customColor
  }
  return getBrokerConfig(brokerId).color
}
