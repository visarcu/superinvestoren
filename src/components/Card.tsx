// src/components/Card.tsx
import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        bg-card-dark 
        rounded-xl 
        shadow-lg 
        p-6 
        ${className}
      `}
    >
      {children}
    </div>
  )
}