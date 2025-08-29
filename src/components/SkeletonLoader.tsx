// Skeleton Loading Components for Performance Optimization
import React from 'react'

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-theme-card border border-theme/10 rounded-xl p-6 animate-pulse ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-theme/20 rounded"></div>
        <div>
          <div className="h-4 w-16 bg-theme/20 rounded mb-1"></div>
          <div className="h-3 w-24 bg-theme/10 rounded"></div>
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-20 bg-theme/20 rounded mb-1"></div>
        <div className="h-3 w-16 bg-theme/10 rounded"></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <div className="h-3 w-12 bg-theme/10 rounded mb-1"></div>
        <div className="h-4 w-16 bg-theme/20 rounded"></div>
      </div>
      <div>
        <div className="h-3 w-12 bg-theme/10 rounded mb-1"></div>
        <div className="h-4 w-16 bg-theme/20 rounded"></div>
      </div>
    </div>
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-theme-card border border-theme/10 rounded-xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-theme-secondary">
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-theme/20 rounded animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-theme/10">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="hover:bg-theme-secondary/30">
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <div className={`h-4 bg-theme/10 rounded animate-pulse ${j === 0 ? 'w-16' : 'w-12'}`}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-theme-card border border-theme/10 rounded-xl p-6 ${className}`}>
    <div className="h-4 w-32 bg-theme/20 rounded mb-4 animate-pulse"></div>
    <div className="h-64 bg-theme/10 rounded animate-pulse flex items-end justify-center">
      <div className="flex items-end gap-2 mb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-6 bg-theme/20 rounded-t animate-pulse"
            style={{ height: `${Math.random() * 100 + 20}px` }}
          ></div>
        ))}
      </div>
    </div>
  </div>
)

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="bg-theme-card border border-theme/10 rounded-xl p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme/20 rounded"></div>
            <div>
              <div className="h-4 w-20 bg-theme/20 rounded mb-1"></div>
              <div className="h-3 w-32 bg-theme/10 rounded"></div>
            </div>
          </div>
          <div className="text-right">
            <div className="h-4 w-16 bg-theme/20 rounded mb-1"></div>
            <div className="h-3 w-12 bg-theme/10 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
)