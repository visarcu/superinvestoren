// components/LearnToggle.tsx - StockUnlock Style Toggle
import React, { useState, useEffect } from 'react'
import { AcademicCapIcon } from '@heroicons/react/24/outline'

interface LearnToggleProps {
  isLearnMode: boolean
  onToggle: (enabled: boolean) => void
}

const LearnToggle: React.FC<LearnToggleProps> = ({ isLearnMode, onToggle }) => {
  return (
    <button
      onClick={() => onToggle(!isLearnMode)}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 text-sm font-medium
        ${isLearnMode 
          ? 'bg-blue-500/20 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10' 
          : 'bg-theme-secondary border-theme text-theme-muted hover:text-theme-primary hover:border-blue-500/30'
        }
      `}
    >
      <AcademicCapIcon className={`w-4 h-4 transition-all duration-300 ${isLearnMode ? 'text-blue-400' : 'text-theme-muted'}`} />
      <span>Lernen</span>
      
      {/* Toggle Switch */}
      <div className={`
        relative w-10 h-5 rounded-full transition-all duration-300
        ${isLearnMode ? 'bg-blue-500' : 'bg-theme-tertiary'}
      `}>
        <div className={`
          absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-md
          ${isLearnMode ? 'left-5' : 'left-0.5'}
        `}></div>
      </div>
    </button>
  )
}

export default LearnToggle