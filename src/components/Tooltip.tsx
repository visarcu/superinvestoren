// src/components/Tooltip.tsx
'use client'

import React, { ReactNode, useState } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 whitespace-normal">
          {text}
        </div>
      )}
    </span>
  )
}