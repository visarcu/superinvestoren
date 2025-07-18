// ============================================
// 📁 components/FallbackImage.tsx (NEU)
// ============================================

'use client'

import React from 'react'

interface FallbackImageProps {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
}

export default function FallbackImage({ 
  src, 
  alt, 
  className,
  fallbackSrc = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
}: FallbackImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        e.currentTarget.src = fallbackSrc
      }}
    />
  )
}