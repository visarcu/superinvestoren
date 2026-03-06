// src/components/chart-builder/colors.ts

export const CHART_COLORS = [
  '#2962FF', // Blue
  '#FF6B35', // Orange
  '#00C853', // Green
  '#FF9800', // Amber
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#607D8B', // Blue Grey
  '#FF5252', // Red
  '#7C4DFF', // Deep Purple
  '#00E676', // Light Green
  '#FF6E40', // Deep Orange
  '#448AFF', // Light Blue
  '#E040FB', // Fuchsia
  '#64FFDA', // Teal
  '#FFD740', // Yellow
]

export function getNextColor(usedColors: string[]): string {
  const available = CHART_COLORS.find(c => !usedColors.includes(c))
  return available || CHART_COLORS[usedColors.length % CHART_COLORS.length]
}
