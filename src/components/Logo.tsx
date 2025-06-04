// src/components/Logo.tsx
'use client'
import Image from 'next/image'

type LogoProps = {
  src: string
  alt: string
  className?: string
  padding?: 'none' | 'small' | 'medium' | 'large' // Neuer Prop für flexibles Padding
}

export default function Logo({ src, alt, className, padding = 'small' }: LogoProps) {
  // Padding-Klassen basierend auf dem padding Prop
  const paddingClasses = {
    none: 'p-0',
    small: 'p-1',      // Viel weniger Padding (4px statt 12px)
    medium: 'p-2',     // 8px
    large: 'p-3'       // Original 12px
  }

  return (
    <div
      className={`
        relative
        rounded-full
        overflow-hidden
        bg-white
        shadow-lg
        ${className ?? ''}
      `}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-contain ${paddingClasses[padding]}`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/logos/default.svg'
        }}
      />
    </div>
  )
}