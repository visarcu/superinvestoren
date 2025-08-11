// src/components/PageTransitionLoader.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransitionLoader() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const pathname = usePathname()

  useEffect(() => {
    // Reset bei Route-Änderung
    setIsLoading(false)
    setProgress(0)
  }, [pathname])

  useEffect(() => {
    // Intercepte alle Link-Klicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href && !link.target && link.href.startsWith(window.location.origin)) {
        const newPath = link.href.replace(window.location.origin, '')
        
        // Nur bei internen Links und wenn sich die Route ändert
        if (newPath !== pathname) {
          setIsLoading(true)
          setProgress(0)
          
          // Simuliere Progress
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 90) {
                clearInterval(interval)
                return 90
              }
              return prev + 10
            })
          }, 100)
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  if (!isLoading) return null

  return (
    <>
      {/* Top Loading Bar */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-black/20">
        <div 
          className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
        </div>
      </div>

      {/* Optional: Zentrale Loading Indication nach 0.5s */}
      {progress > 50 && (
        <div className="fixed inset-0 z-[99] pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 border-3 border-gray-700 border-t-green-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-green-400 rounded-full animate-spin animation-delay-150"></div>
                </div>
                <div>
                  <p className="text-white font-semibold">Lade Seite...</p>
                  <p className="text-gray-400 text-sm">Einen Moment bitte</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}