// components/Card.tsx
import React, { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  borderColor?: string
  hoverBg?: string
}

export default function Card({
  children,
  className = '',
  borderColor = 'border-theme',
  hoverBg = 'hover:bg-theme-hover',
}: CardProps) {
  return (
    <div
      className={`
        bg-theme-card
        border ${borderColor}
        rounded-2xl p-5
        shadow-[var(--shadow-card)]
        transition ${hoverBg}
        ${className}
      `}
    >
      {children}
    </div>
  )
}