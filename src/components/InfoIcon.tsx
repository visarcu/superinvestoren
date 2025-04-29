'use client'

import React from 'react'

interface InfoIconProps {
  /** Der Text, der im Tooltip erscheinen soll */
  info: string
}

export default function InfoIcon({ info }: InfoIconProps) {
  return (
    <span
      className="ml-2 cursor-help text-gray-400"
      title={info}
      aria-label={info}
    >
      ℹ️
    </span>
  )
}