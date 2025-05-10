// components/CompanyLogo.tsx
'use client'
import Image from 'next/image'

interface Props {
  website?: string
  size?: number
  className?: string
}

export default function CompanyLogo({ website, size = 32, className }: Props) {
  const domain = website ? new URL(website).hostname.replace(/^www\./, '') : null
  const src = domain
    ? `https://logo.clearbit.com/${domain}?size=${size * 2}`
    : '/placeholder-logo.svg'

  return (
    <Image
      src={src}
      alt={domain ? `${domain} logo` : 'Logo nicht verfügbar'}
      width={size}
      height={size}
      className={className}
      onError={e => { e.currentTarget.src = '/placeholder-logo.svg' }}
    />
  )
}