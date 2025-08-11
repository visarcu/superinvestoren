// components/PageLoader.tsx
import { ChartBarIcon } from '@heroicons/react/24/outline'

export default function PageLoader() {
  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header mit Animation */}
      <section className="bg-theme-primary pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="h-4 w-32 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse"></div>
          </div>
          
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-green-500/20 rounded animate-pulse"></div>
              <div className="h-10 w-64 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-6 w-full max-w-3xl bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse"></div>
              <div className="h-6 w-full max-w-2xl bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Info Box Skeleton */}
          <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-4 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-4 w-full bg-gray-800 rounded"></div>
              <div className="h-4 w-full bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Stats Grid mit schönem Effekt */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {[0,1,2,3].map(i => (
            <div 
              key={i} 
              className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-xl p-6 animate-pulse border border-gray-800"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-8 w-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-800 rounded mb-1"></div>
                  <div className="h-3 w-32 bg-gray-800/50 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dropdown Skeleton */}
        <div className="bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/20 rounded-xl p-4 mb-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg"></div>
              <div>
                <div className="h-5 w-48 bg-gray-800 rounded mb-2"></div>
                <div className="h-3 w-64 bg-gray-800/50 rounded"></div>
              </div>
            </div>
            <div className="h-10 w-40 bg-gray-800 rounded-lg"></div>
          </div>
        </div>

        {/* Charts Grid mit Wave Animation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[0,1,2].map(i => (
            <div 
              key={i}
              className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 rounded-xl p-6 border border-gray-800"
              style={{ 
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                animationDelay: `${i * 200}ms` 
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gradient-to-r from-gray-700 to-gray-600 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-800 rounded"></div>
                </div>
              </div>
              
              {/* List Items mit Stagger Effect */}
              <div className="space-y-3">
                {[0,1,2,3,4].map(j => (
                  <div 
                    key={j}
                    className="flex justify-between items-center p-3 bg-gray-900/30 rounded-lg"
                    style={{ 
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      animationDelay: `${(i * 200) + (j * 50)}ms` 
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-600 rounded-full"></div>
                      <div>
                        <div className="h-4 w-16 bg-gray-700 rounded mb-1"></div>
                        <div className="h-3 w-24 bg-gray-800 rounded"></div>
                      </div>
                    </div>
                    <div className="h-6 w-12 bg-green-500/10 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Loading Text in der Mitte */}
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-green-500/30 animate-pulse" />
            <div className="text-gray-600 font-medium">Market Insights laden...</div>
          </div>
        </div>
      </div>
    </div>
  )
}