'use client'

import Image from 'next/image'

type LogoProps = {
  src: string
  alt: string
  className?: string  // <— neu: optionaler Klassennamen-Prop
}

export default function Logo({ src, alt, className }: LogoProps) {
  return (
    <div
      // Default-Styles + alles, was du per className reinschickst
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
        className="object-contain p-3"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/logos/default.svg'
        }}
      />
    </div>
  )
}