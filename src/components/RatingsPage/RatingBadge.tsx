// src/components/RatingsPage/RatingBadge.tsx - TERMINAL STYLE
'use client'

import React from 'react'

interface RatingBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showGrade?: boolean
}

export default function RatingBadge({ 
  score, 
  size = 'md', 
  className = '', 
  showGrade = true 
}: RatingBadgeProps) {
  
  const getScoreInfo = (score: number) => {
    if (score >= 90) return { 
      grade: 'A+', 
      textColor: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30'
    }
    if (score >= 80) return { 
      grade: 'A', 
      textColor: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30'
    }
    if (score >= 70) return { 
      grade: 'B+', 
      textColor: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30'
    }
    if (score >= 60) return { 
      grade: 'B', 
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/30'
    }
    if (score >= 50) return { 
      grade: 'C', 
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30'
    }
    if (score >= 30) return { 
      grade: 'D', 
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-400/10',
      borderColor: 'border-orange-400/30'
    }
    return { 
      grade: 'F', 
      textColor: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/30'
    }
  }

  const scoreInfo = getScoreInfo(score)
  
  const sizeClasses = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl'
  }

  if (showGrade) {
    return (
      <div className={`
        inline-flex items-center justify-center rounded-lg font-mono font-bold border
        ${scoreInfo.bgColor} ${scoreInfo.textColor} ${scoreInfo.borderColor}
        ${sizeClasses[size]} ${className}
      `}>
        {scoreInfo.grade}
      </div>
    )
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border
      ${scoreInfo.bgColor} ${scoreInfo.borderColor}
      ${className}
    `}>
      <div className={`
        w-5 h-5 rounded flex items-center justify-center border
        ${scoreInfo.bgColor} ${scoreInfo.textColor} ${scoreInfo.borderColor}
        text-xs font-bold font-mono
      `}>
        {scoreInfo.grade}
      </div>
      <span className="text-sm font-mono font-semibold text-theme-primary">
        {score}/100
      </span>
    </div>
  )
}