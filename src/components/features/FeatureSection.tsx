'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

type ImagePosition = 'left' | 'right' | 'center'

interface FeatureSectionProps {
  id: string
  image: string
  imageAlt: string
  headline: string
  subline: string
  imagePosition?: ImagePosition
  priority?: boolean
}

const fadeInViewport = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
}

export default function FeatureSection({
  id,
  image,
  imageAlt,
  headline,
  subline,
  imagePosition = 'center',
  priority = false,
}: FeatureSectionProps) {
  const headlineBlock = (
    <motion.div {...fadeInViewport}>
      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
        {headline}
      </h2>
      <p className="mt-5 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl">
        {subline}
      </p>
    </motion.div>
  )

  const imageBlock = (
    <motion.div
      {...fadeInViewport}
      transition={{ ...fadeInViewport.transition, delay: 0.1 }}
      className="relative w-full"
    >
      <div className="absolute inset-0 -z-10 blur-3xl opacity-40 bg-gradient-to-r from-brand/20 via-transparent to-brand-light/20 scale-105" />
      <Image
        src={image}
        alt={imageAlt}
        width={1920}
        height={1200}
        className="w-full h-auto rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/5"
        priority={priority}
        loading={priority ? undefined : 'lazy'}
      />
    </motion.div>
  )

  if (imagePosition === 'center') {
    return (
      <section
        id={id}
        className="min-h-[90vh] flex flex-col items-center justify-center py-24 md:py-32 scroll-mt-24"
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center flex flex-col items-center">
            <motion.div {...fadeInViewport}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.05]">
                {headline}
              </h2>
              <p className="mt-5 text-lg md:text-xl text-neutral-400 leading-relaxed max-w-2xl mx-auto">
                {subline}
              </p>
            </motion.div>
          </div>
          <div className="mt-12 md:mt-16">{imageBlock}</div>
        </div>
      </section>
    )
  }

  const textFirst = imagePosition === 'right'

  return (
    <section
      id={id}
      className="min-h-[90vh] flex items-center py-24 md:py-32 scroll-mt-24"
    >
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className={textFirst ? 'lg:order-1' : 'lg:order-2'}>{headlineBlock}</div>
        <div className={textFirst ? 'lg:order-2' : 'lg:order-1'}>{imageBlock}</div>
      </div>
    </section>
  )
}
