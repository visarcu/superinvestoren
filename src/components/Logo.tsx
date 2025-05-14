'use client'

import Image from 'next/image'

export default function Logo({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-20 h-20 relative rounded-full overflow-hidden bg-white shadow-lg">
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