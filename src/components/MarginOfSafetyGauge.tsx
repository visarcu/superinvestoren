'use client'

import React from 'react'
import { fmtPrice, fmtNum } from '@/utils/formatters'

interface MarginOfSafetyGaugeProps {
  currentPrice: number
  fairValue: number
  size?: 'sm' | 'md' | 'lg'
}

export default function MarginOfSafetyGauge({
  currentPrice,
  fairValue,
  size = 'md'
}: MarginOfSafetyGaugeProps) {
  // Calculate Margin of Safety: (Fair Value - Current Price) / Fair Value * 100
  // Positive = undervalued (good), Negative = overvalued (bad)
  const marginOfSafety = ((fairValue - currentPrice) / fairValue) * 100

  // Clamp between -100 and +100 for display
  const clampedMoS = Math.max(-100, Math.min(100, marginOfSafety))

  // Convert MoS to angle: -100% = -90deg (right/overvalued), +100% = +90deg (left/undervalued)
  // Center (0%) = 0deg (top)
  const angle = -clampedMoS * 0.9 // Scale to -90 to +90 degrees

  // Size configurations
  const sizeConfig = {
    sm: { width: 160, height: 100, strokeWidth: 12, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { width: 220, height: 130, strokeWidth: 16, fontSize: 'text-2xl', labelSize: 'text-sm' },
    lg: { width: 280, height: 160, strokeWidth: 20, fontSize: 'text-3xl', labelSize: 'text-base' }
  }

  const config = sizeConfig[size]
  const centerX = config.width / 2
  const centerY = config.height - 10
  const radius = config.width / 2 - config.strokeWidth

  // Create arc path for the gauge background
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle)
    const end = polarToCartesian(centerX, centerY, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    }
  }

  // Needle position
  const needleAngle = angle - 90 // Adjust for SVG coordinate system
  const needleLength = radius - 15
  const needleEnd = {
    x: centerX + needleLength * Math.cos(needleAngle * Math.PI / 180),
    y: centerY + needleLength * Math.sin(needleAngle * Math.PI / 180)
  }

  // Color based on MoS
  const getColor = () => {
    if (marginOfSafety >= 30) return '#22c55e' // Strong undervalued - green
    if (marginOfSafety >= 10) return '#84cc16' // Undervalued - lime
    if (marginOfSafety >= -10) return '#eab308' // Fair - yellow
    if (marginOfSafety >= -30) return '#f97316' // Overvalued - orange
    return '#ef4444' // Strong overvalued - red
  }

  const getLabel = () => {
    if (marginOfSafety >= 30) return 'Stark unterbewertet'
    if (marginOfSafety >= 10) return 'Unterbewertet'
    if (marginOfSafety >= -10) return 'Fair bewertet'
    if (marginOfSafety >= -30) return 'Überbewertet'
    return 'Stark überbewertet'
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={config.width} height={config.height} className="overflow-visible">
        {/* Background arcs - color segments */}
        {/* Green zone (undervalued) */}
        <path
          d={createArc(-90, -54)}
          fill="none"
          stroke="#22c55e"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        {/* Lime zone */}
        <path
          d={createArc(-54, -18)}
          fill="none"
          stroke="#84cc16"
          strokeWidth={config.strokeWidth}
          opacity={0.3}
        />
        {/* Yellow zone (fair) */}
        <path
          d={createArc(-18, 18)}
          fill="none"
          stroke="#eab308"
          strokeWidth={config.strokeWidth}
          opacity={0.3}
        />
        {/* Orange zone */}
        <path
          d={createArc(18, 54)}
          fill="none"
          stroke="#f97316"
          strokeWidth={config.strokeWidth}
          opacity={0.3}
        />
        {/* Red zone (overvalued) */}
        <path
          d={createArc(54, 90)}
          fill="none"
          stroke="#ef4444"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={getColor()}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill={getColor()}
        />

      </svg>

      {/* Value display */}
      <div className="text-center -mt-2">
        <div className={`${config.fontSize} font-bold`} style={{ color: getColor() }}>
          {marginOfSafety >= 0 ? '+' : ''}{fmtNum(marginOfSafety, 1)}%
        </div>
        <div className={`${config.labelSize} text-theme-muted mt-1`}>
          Margin of Safety
        </div>
        <div className={`${config.labelSize} font-medium mt-1`} style={{ color: getColor() }}>
          {getLabel()}
        </div>
      </div>

      {/* Price comparison */}
      <div className="flex items-center justify-center gap-6 mt-3 text-sm">
        <div className="text-center">
          <div className="text-theme-muted text-xs">Fair Value</div>
          <div className="font-semibold text-theme-primary">{fmtPrice(fairValue)}</div>
        </div>
        <div className="text-theme-muted">vs</div>
        <div className="text-center">
          <div className="text-theme-muted text-xs">Aktuell</div>
          <div className="font-semibold text-theme-primary">{fmtPrice(currentPrice)}</div>
        </div>
      </div>
    </div>
  )
}
