// src/components/InvestorFollowButton.tsx
'use client'

import { BellIcon, UserPlusIcon, CheckIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { useInvestorFollow } from '@/hooks/useInvestorFollow'

interface InvestorFollowButtonProps {
  investorSlug: string
  investorName: string
  variant?: 'default' | 'compact' | 'floating'
  className?: string
}

export default function InvestorFollowButton({ 
  investorSlug, 
  investorName,
  variant = 'default',
  className = ''
}: InvestorFollowButtonProps) {
  const { isFollowing, isLoading, isAuthenticated, toggleFollow } = useInvestorFollow(investorSlug)

  if (isLoading) {
    return (
      <button 
        disabled
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-700/50 border border-gray-600 text-gray-400 rounded-lg transition-all duration-200 ${className}`}
      >
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Laden...</span>
      </button>
    )
  }

  // Compact variant (für Header/kleine Räume)
  if (variant === 'compact') {
    return (
      <button
        onClick={toggleFollow}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
          isFollowing 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30' 
            : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white'
        } ${className}`}
      >
        {isFollowing ? (
          <BellIconSolid className="w-4 h-4" />
        ) : (
          <BellIcon className="w-4 h-4" />
        )}
        <span>{isFollowing ? 'Folge ich' : 'Folgen'}</span>
      </button>
    )
  }

  // Floating variant (für floating action button)
  if (variant === 'floating') {
    return (
      <button
        onClick={toggleFollow}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isFollowing 
            ? 'bg-green-500 hover:bg-green-400 text-white hover:scale-105' 
            : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white hover:scale-105'
        } ${className}`}
        title={isFollowing ? `Folge ${investorName}` : `${investorName} folgen`}
      >
        {isFollowing ? (
          <BellIconSolid className="w-6 h-6" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
      </button>
    )
  }

  // Default variant (für Hero-Bereiche)
  return (
    <div className="space-y-3">
      <button
        onClick={toggleFollow}
        className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
          isFollowing 
            ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30' 
            : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:text-white'
        } ${className}`}
      >
        {isFollowing ? (
          <BellIconSolid className="w-5 h-5" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        <span>{isFollowing ? 'Folge ich' : `${investorName} folgen`}</span>
        {isFollowing && <CheckIcon className="w-4 h-4" />}
      </button>
      
      {isFollowing && (
        <p className="text-xs text-green-400/80 text-center leading-relaxed">
          Du erhältst E-Mails bei neuen 13F-Filings
        </p>
      )}
      
      {!isAuthenticated && (
        <p className="text-xs text-gray-500 text-center">
          Anmelden um Benachrichtigungen zu erhalten
        </p>
      )}
    </div>
  )
}