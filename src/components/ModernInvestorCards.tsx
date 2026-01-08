'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowRightIcon, 
  TrendingUpIcon, 
  DollarSignIcon,
  EyeIcon,
  SparklesIcon,
  Users
} from 'lucide-react'

interface Holding {
  ticker: string
  value: string
  percentage: string
}

interface InvestorCardProps {
  name: string
  investor: string
  date: string
  filingId: string
  totalValue: string
  tickers: string
  holdings: Holding[]
}

interface ModernInvestorCardsProps {
  investors: InvestorCardProps[]
}

// Einzelne 3D Card Komponente
function InvestorCard({ 
  investor, 
  index, 
  isActive, 
  onClick 
}: { 
  investor: InvestorCardProps
  index: number
  isActive: boolean
  onClick: () => void 
}) {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Get investor slug from name for avatar
  const getInvestorSlug = (name: string) => {
    if (name.includes('Warren Buffett')) return 'buffett'
    if (name.includes('Bill Ackman')) return 'ackman' 
    if (name.includes('Howard Marks')) return 'marks'
    return 'buffett' // fallback
  }

  const slug = getInvestorSlug(investor.investor)

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative cursor-pointer transition-all duration-700 ease-out transform-gpu
        ${isActive ? 'scale-105 z-20' : 'scale-95 z-10'}
        ${isHovered ? 'scale-110' : ''}
      `}
      style={{
        transform: `
          perspective(1000px)
          rotateY(${isActive ? '0deg' : `${-5 + index * 3}deg`})
          rotateX(${isActive ? '0deg' : `${2 - index * 1}deg`})
          translateZ(${isActive ? '50px' : '0px'})
          translateY(${isActive ? '-20px' : `${index * 10}px`})
          scale(${isActive ? '1.05' : isHovered ? '1.02' : '0.95'})
        `,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Background Glow */}
      <div className={`
        absolute inset-0 rounded-3xl blur-xl transition-all duration-700
        ${isActive ? 'bg-brand/20 scale-110' : 'bg-brand/5 scale-100'}
        ${isHovered ? 'bg-brand/30 scale-120' : ''}
      `}></div>

      {/* Main Card */}
      <div className={`
        relative bg-gray-900/80 backdrop-blur-2xl border rounded-3xl overflow-hidden transition-all duration-700
        ${isActive ? 'border-green-500/50 shadow-2xl shadow-brand/20' : 'border-gray-700/50 shadow-xl shadow-black/20'}
        ${isHovered ? 'border-green-400/70 shadow-3xl shadow-green-500/30' : ''}
      `}>
        
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none"></div>
        
        {/* Header mit Avatar */}
        <div className="relative p-8 border-b border-gray-800/50">
          <div className="flex items-center gap-6">
            
            {/* 3D Avatar */}
            <div className={`
              relative transition-all duration-500 transform-gpu
              ${isActive ? 'scale-110' : 'scale-100'}
              ${isHovered ? 'scale-125 rotate-3' : ''}
            `}>
              <div className="absolute -inset-2 bg-gradient-to-br from-green-400 via-blue-500 to-green-500 rounded-full blur-lg opacity-60 animate-pulse"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full p-1 shadow-2xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-800 border-2 border-white/20">
                  <Image
                    src={`/images/${slug}.png`}
                    alt={investor.investor}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Floating Premium Badge */}
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <SparklesIcon className="w-4 h-4 text-black" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className={`
                text-2xl font-bold transition-all duration-300
                ${isActive ? 'text-white' : 'text-gray-100'}
                ${isHovered ? 'text-brand-light' : ''}
              `}>
                {investor.investor}
              </h3>
              <p className="text-gray-400 text-sm mt-1 font-medium">{investor.name}</p>
              
              {/* Portfolio Value mit Animation */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSignIcon className="w-4 h-4 text-brand-light" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Portfolio-Wert</span>
                </div>
                <div className={`
                  text-3xl font-black transition-all duration-300 bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent
                  ${isActive ? 'scale-110' : 'scale-100'}
                `}>
                  {investor.totalValue}
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Live</span>
              </div>
              <div className="text-xs text-gray-500">{investor.date}</div>
            </div>
          </div>
        </div>

        {/* Holdings Preview */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-gray-300">Top Holdings</span>
            </div>
            <div className="text-xs text-gray-500">{investor.holdings.length} Positionen</div>
          </div>

          {/* Holdings Grid */}
          <div className="space-y-3">
            {investor.holdings.slice(0, 3).map((holding, idx) => (
              <div 
                key={holding.ticker}
                className={`
                  flex items-center justify-between p-3 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-gray-800/50 hover:bg-gray-800/70' : 'bg-gray-800/30 hover:bg-gray-800/50'}
                  ${isHovered ? 'transform translate-x-2' : ''}
                `}
                style={{ transitionDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                    <span className="text-xs font-bold text-blue-400">{holding.ticker}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{holding.ticker}</div>
                    <div className="text-xs text-gray-400">{holding.percentage}% Portfolio</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-brand-light">{holding.value}</div>
                  <div className="text-xs text-gray-500">Market Value</div>
                </div>
              </div>
            ))}
          </div>

          {/* Ticker-Übersicht */}
          <div className="mt-6 p-3 bg-gradient-to-r from-brand/10 to-blue-500/10 rounded-xl border border-brand/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-brand-light" />
              <span className="text-xs font-semibold text-brand-light">Hauptpositionen</span>
            </div>
            <div className="text-sm text-gray-300 leading-relaxed">{investor.tickers}</div>
          </div>
        </div>

        {/* Footer mit Action */}
        {isActive && (
          <div className="p-6 bg-gradient-to-r from-gray-800/30 to-gray-800/50 border-t border-gray-700/50">
            <Link
              href={`/superinvestor/${slug}`}
              className="group flex items-center justify-between w-full p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
            >
              <div className="flex items-center gap-3">
                <EyeIcon className="w-5 h-5 text-black" />
                <span className="font-bold text-black">Portfolio analysieren</span>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-black group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// Haupt-Komponente
export default function ModernInvestorCards({ investors }: ModernInvestorCardsProps) {
  const [activeCard, setActiveCard] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer für Animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Auto-rotate cards
  useEffect(() => {
    if (!isVisible) return
    
    const interval = setInterval(() => {
      setActiveCard(prev => (prev + 1) % investors.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [investors.length, isVisible])

  return (
    <div ref={containerRef} className="relative w-full max-w-6xl mx-auto">
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-brand/10 to-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Cards Container */}
      <div className="relative perspective-1000">
        <div className="flex justify-center items-center min-h-[600px] relative">
          {investors.map((investor, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                transform: `translateX(${(index - activeCard) * 100}px) translateZ(${index === activeCard ? '0px' : '-50px'})`,
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <InvestorCard
                investor={investor}
                index={index}
                isActive={index === activeCard}
                onClick={() => setActiveCard(index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-3 mt-8">
        {investors.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveCard(index)}
            className={`
              relative w-3 h-3 rounded-full transition-all duration-300
              ${index === activeCard 
                ? 'bg-green-400 scale-125 shadow-lg shadow-green-400/50' 
                : 'bg-gray-600 hover:bg-gray-500 scale-100'
              }
            `}
          >
            {index === activeCard && (
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-12">
        <Link
          href="/superinvestor"
          className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-800/80 to-gray-900/80 hover:from-gray-700/80 hover:to-gray-800/80 border border-gray-700 hover:border-green-500/50 text-white rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm group"
        >
          <span className="font-semibold">Alle {investors.length} Super-Investoren entdecken</span>
          <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  )
}