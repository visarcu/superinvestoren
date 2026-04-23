'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRightIcon } from '@heroicons/react/24/outline'

type Layout = 'center' | 'left' | 'right'

interface Props {
  image: string
  alt: string
  linkHref: string
  linkLabel: string
  eyebrow?: string
  headline?: string
  subline?: string
  layout?: Layout
}

const fadeInViewport = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
}

export default function LandingFeatureShowcase({
  image,
  alt,
  linkHref,
  linkLabel,
  eyebrow,
  headline,
  subline,
  layout = 'center',
}: Props) {
  const imageBlock = (
    <motion.div
      {...fadeInViewport}
      transition={{ ...fadeInViewport.transition, delay: layout === 'center' ? 0.1 : 0 }}
      className="relative w-full"
    >
      <Image
        src={image}
        alt={alt}
        width={1920}
        height={1200}
        className="w-full h-auto"
        style={{
          maskImage:
            'radial-gradient(ellipse 90% 92% at center, black 55%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 92% at center, black 55%, transparent 100%)',
        }}
        loading="lazy"
      />
    </motion.div>
  )

  const textBlock = (
    <motion.div {...fadeInViewport}>
      {eyebrow && (
        <div className="text-sm font-medium text-orange-400 uppercase tracking-wider mb-4">
          {eyebrow}
        </div>
      )}
      {headline && (
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
          {headline}
        </h2>
      )}
      {subline && (
        <p className="mt-5 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-xl">
          {subline}
        </p>
      )}
      <div className="mt-8">
        <Link
          href={linkHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-neutral-300 transition-colors"
        >
          {linkLabel}
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  )

  if (layout === 'center') {
    return (
      <section className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          {(eyebrow || headline || subline) && (
            <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
              <motion.div {...fadeInViewport}>
                {eyebrow && (
                  <div className="text-sm font-medium text-orange-400 uppercase tracking-wider mb-4">
                    {eyebrow}
                  </div>
                )}
                {headline && (
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
                    {headline}
                  </h2>
                )}
                {subline && (
                  <p className="mt-5 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto">
                    {subline}
                  </p>
                )}
              </motion.div>
            </div>
          )}
          {imageBlock}
          <div className="mt-8 text-center">
            <Link
              href={linkHref}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {linkLabel}
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const textFirst = layout === 'right'

  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className={textFirst ? 'lg:order-1' : 'lg:order-2'}>
            {textBlock}
          </div>
          <div className={textFirst ? 'lg:order-2' : 'lg:order-1'}>
            {imageBlock}
          </div>
        </div>
      </div>
    </section>
  )
}
