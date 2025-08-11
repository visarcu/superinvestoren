// src/components/SkeletonLoaders.tsx
'use client'

// Skeleton für Investor Cards
export function InvestorCardSkeleton() {
  return (
    <div className="bg-[#161618] rounded-2xl p-8 animate-pulse">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 bg-gray-800 rounded-full"></div>
      </div>
      <div className="h-6 bg-gray-800 rounded-lg mx-auto w-32 mb-2"></div>
      <div className="h-4 bg-gray-800 rounded-lg mx-auto w-24 mb-4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-800 rounded-lg"></div>
        <div className="h-3 bg-gray-800 rounded-lg"></div>
        <div className="h-3 bg-gray-800 rounded-lg"></div>
      </div>
    </div>
  )
}

// Skeleton für Trending Stocks Section
export function TrendingStocksSkeleton() {
  return (
    <div className="bg-[#161618] rounded-xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gray-800 rounded-lg"></div>
        <div className="h-5 bg-gray-800 rounded-lg w-32"></div>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg h-16"></div>
        ))}
      </div>
    </div>
  )
}

// Skeleton für Stats Cards
export function StatsCardSkeleton() {
  return (
    <div className="bg-[#161618] rounded-2xl p-8 animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-800 rounded-xl"></div>
        <div>
          <div className="h-5 bg-gray-800 rounded-lg w-32 mb-2"></div>
          <div className="h-3 bg-gray-800 rounded-lg w-24"></div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-12 bg-gray-800 rounded-lg"></div>
        <div className="h-4 bg-gray-800 rounded-lg"></div>
        <div className="h-4 bg-gray-800 rounded-lg w-3/4"></div>
      </div>
    </div>
  )
}

// Loading Overlay für Page Transitions
export function PageLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-fadeIn">
      <div className="bg-black/90 rounded-2xl p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-green-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-green-400 rounded-full animate-spin-reverse"></div>
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Lade Portfolio-Daten...</p>
            <p className="text-gray-400 text-sm mt-1">Analysiere 13F-Filings</p>
          </div>
        </div>
      </div>
    </div>
  )
}