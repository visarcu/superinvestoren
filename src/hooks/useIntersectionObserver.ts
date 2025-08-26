// src/hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    triggerOnce = true
  } = options

  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const targetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        
        if (isVisible && !hasIntersected) {
          setIsIntersecting(true)
          setHasIntersected(true)
          
          if (triggerOnce) {
            observer.unobserve(target)
          }
        } else if (!triggerOnce) {
          setIsIntersecting(isVisible)
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(target)

    return () => {
      observer.unobserve(target)
    }
  }, [threshold, rootMargin, triggerOnce, hasIntersected])

  return {
    ref: targetRef,
    isIntersecting: triggerOnce ? hasIntersected : isIntersecting,
    hasIntersected
  }
}