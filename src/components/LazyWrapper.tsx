// src/components/LazyWrapper.tsx
'use client'

import React, { ReactNode } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import LoadingSpinner from '@/components/LoadingSpinner'

interface LazyWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  minHeight?: string
  rootMargin?: string
  threshold?: number
}

export default function LazyWrapper({
  children,
  fallback,
  className = '',
  minHeight = '200px',
  rootMargin = '200px', // Load 200px before it becomes visible
  threshold = 0.1
}: LazyWrapperProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: true
  })

  const defaultFallback = (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{ minHeight }}
    >
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-theme-muted text-sm mt-2">Lade Komponente...</p>
      </div>
    </div>
  )

  return (
    <div ref={ref} className={className} style={{ minHeight: isIntersecting ? 'auto' : minHeight }}>
      {isIntersecting ? children : (fallback || defaultFallback)}
    </div>
  )
}