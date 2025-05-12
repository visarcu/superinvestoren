// src/components/CompanyLogo.tsx
'use client'
import React from 'react'
import Image from 'next/image'
import { domainForTicker } from '@/lib/clearbit'

interface Props {
  ticker: string
  className?: string
}

export default function CompanyLogo({ ticker, className = '' }: Props) {
  const domain = domainForTicker(ticker) // z.B. 'apple.com'
  const url = `https://logo.clearbit.com/${domain}`

  return (
    <Image
      src={url}
      alt={`${ticker} Logo`}
      width={64}
      height={64}
      unoptimized
      className={className}
    />
  )
}