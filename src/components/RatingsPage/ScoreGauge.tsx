// src/components/RatingsPage/ScoreGauge.tsx - TERMINAL STYLE
'use client'

import React from 'react'

interface ScoreGaugeProps {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function ScoreGauge({ 
  score, 
  maxScore = 100, 
  size = 'md', 
  showText = true, 
  className = '' 
}: ScoreGaugeProps) {
  const percentage = Math.min((score / maxScore) * 100, 100)
  const radius = size === 'sm' ? 25 : size === 'md' ? 35 : 50
  const strokeWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 6
  const center = radius + strokeWidth
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (percentage / 100) * circumference

  // Terminal-style colors - minimal and professional
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981' // Terminal green
    if (score >= 60) return '#10b981' // Keep green for good scores
    if (score >= 40) return '#f59e0b' // Amber for average
    return '#ef4444' // Red for poor scores
  }

  const scoreColor = getScoreColor(score)
  const textSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={center * 2}
        height={center * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-mono font-bold text-theme-primary ${textSize}`}>
            {score}
          </div>
          {maxScore !== 100 && (
            <div className="text-xs text-theme-muted font-mono">
              /{maxScore}
            </div>
          )}
        </div>
      )}
    </div>
  )
}