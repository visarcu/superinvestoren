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
  borderColor = 'border-gray-700',
  hoverBg = 'hover:bg-gray-700/50',
}: CardProps) {
  return (
    <div
      className={`
        bg-gray-800/60 backdrop-blur-md
        border ${borderColor}
        rounded-2xl p-5
        transition ${hoverBg}
        ${className}
      `}
    >
      {children}
    </div>
  )
}