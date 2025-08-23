// src/components/InvestorAvatar.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

interface InvestorAvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

// Schöne Farben für die generierten Avatare
const avatarColors = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600', 
  'from-purple-500 to-purple-600',
  'from-red-500 to-red-600',
  'from-yellow-500 to-yellow-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
  'from-teal-500 to-teal-600',
  'from-orange-500 to-orange-600',
  'from-cyan-500 to-cyan-600',
]

// Größen-Mapping
const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base', 
  lg: 'w-16 h-16 text-lg',
  xl: 'w-20 h-20 text-xl'
}

function getInitials(name: string): string {
  // Defensive programming: handle undefined/null names
  if (!name || typeof name !== 'string') return '??'
  
  // Entferne "–" und andere Sonderzeichen, dann nehme Initialen
  const cleanName = name.replace(/[–—-]/g, ' ').trim()
  const words = cleanName.split(' ').filter(word => word.length > 0)
  
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  
  // Nimm ersten Buchstaben vom ersten und letzten Wort
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

function getColorFromName(name: string): string {
  // Defensive programming: handle undefined/null names
  if (!name || typeof name !== 'string') return avatarColors[0]
  
  // Konsistenter Hash aus dem Namen für immer gleiche Farben
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export default function InvestorAvatar({ 
  name, 
  imageUrl, 
  size = 'md', 
  className = '' 
}: InvestorAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const initials = getInitials(name)
  const gradientColor = getColorFromName(name)
  const sizeClass = sizeClasses[size]
  
  // Zeige Fallback wenn kein Bild oder Fehler beim Laden
  const showFallback = !imageUrl || imageError

  return (
    <div className={`relative ${sizeClass} rounded-full overflow-hidden ${className}`}>
      {!showFallback && (
        <>
          {/* Loading Skeleton während Bild lädt */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-700 animate-pulse rounded-full" />
          )}
          
          {/* Echtes Bild */}
          <Image
            src={imageUrl!}
            alt={name}
            fill
            className="object-cover"
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true)
              setImageLoading(false)
            }}
          />
        </>
      )}
      
      {/* Fallback: Schöne Initialen mit Gradient */}
      {showFallback && (
        <div className={`
          w-full h-full 
          bg-gradient-to-br ${gradientColor}
          flex items-center justify-center
          text-white font-bold
          shadow-lg
          ring-1 ring-white/10
        `}>
          {initials}
        </div>
      )}
    </div>
  )
}