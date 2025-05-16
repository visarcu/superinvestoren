// components/InvestorAvatar.tsx
'use client'               // falls du client-state oder next/image in App-Router nutzt
import React from 'react'
import Image from 'next/image'

interface InvestorAvatarProps {
  name: string
  imageUrl?: string
  borderColor: string
}

export function InvestorAvatar({
  name,
  imageUrl,
  borderColor,
}: InvestorAvatarProps) {
  return imageUrl ? (
    <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 ${borderColor}`}>
      <Image
        src={imageUrl}
        alt={name}
        width={48}
        height={48}
        className="object-cover"
      />
    </div>
  ) : (
    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
      {/* hier dein Fallback-SVG */}
      <svg className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4S14.21 4 12 4 8 5.79 8 8s1.79 4 4 4z"/>
        <path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/>
      </svg>
    </div>
  )
}