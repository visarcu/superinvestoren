// src/components/BullsBearsSection.tsx - PROFESSIONELLES FINCHAT-STYLE DESIGN
'use client'

import React, { useState, useEffect } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';

interface BullBearPoint {
  id: string;
  text: string;
  category: 'financial' | 'market' | 'competitive' | 'risk';
}

interface BullsBearsSectionProps {
  ticker: string;
  isPremium: boolean;
}

interface BullsBearsData {
  ticker: string;
  bulls: BullBearPoint[];
  bears: BullBearPoint[];
  lastUpdated: string;
  source: string;
}

const BullsBearsSection: React.FC<BullsBearsSectionProps> = ({ 
  ticker, 
  isPremium 
}) => {
  const [data, setData] = useState<BullsBearsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    
    loadBullsBears();
  }, [ticker]);

  const loadBullsBears = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bulls-bears/${ticker}`);
      
      if (!response.ok) {
        throw new Error('Failed to load bulls/bears data');
      }
      
      const bullsBearsData = await response.json();
      setData(bullsBearsData);
      
    } catch (err) {
      console.error('Error loading bulls/bears:', err);
      setError('Fehler beim Laden der Analyse');
    } finally {
      setLoading(false);
    }
  };

  // Loading State - PROFESSIONELL
  if (loading) {
    return (
      <div className="professional-card p-6 h-[500px] flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-red-500 rounded-lg"></div>
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-theme-secondary text-sm mt-3">Lade KI-Analyse...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State - PROFESSIONELL
  if (error) {
    return (
      <div className="professional-card p-6 h-[500px] flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-red-500 rounded-lg"></div>
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-4 text-sm font-medium">{error}</p>
            <button 
              onClick={loadBullsBears}
              className="btn-secondary"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Premium Lock Overlay - PROFESSIONELL
  if (!isPremium) {
    return (
      <div className="professional-card p-6 h-[500px] flex flex-col">
        <div className="flex items-center gap-3 mb-6">
 
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-base font-semibold text-theme-primary mb-2">KI Pro & Contra Analyse</h4>
            <p className="text-theme-secondary mb-6 text-sm leading-relaxed">
              Professionelle Bull/Bear-Cases generiert von fortschrittlicher KI für bessere Investment-Entscheidungen.
            </p>
            
            <Link
              href="/pricing"
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              14 Tage kostenlos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Content - PROFESSIONELL
  if (!data) return null;

  return (
    <div className="professional-card p-6 h-[500px] flex flex-col">
      <div className="flex items-center gap-3 mb-6">

        <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
      </div>

      {/* CONTENT mit optimiertem Scroll */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Bulls Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
              Bullen ({data.bulls.length})
            </h4>
          </div>
          
          <div className="space-y-4">
            {data.bulls.slice(0, 5).map((point, index) => (
              <div key={point.id} className="group">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-theme-secondary leading-relaxed text-sm group-hover:text-theme-primary transition-colors">
                    {point.text.length > 150 ? point.text.substring(0, 150) + '...' : point.text}
                  </p>
                </div>
                {index < data.bulls.slice(0, 5).length - 1 && (
                  <div className="ml-4 mt-3 h-px bg-border-color"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-theme"></div>

        {/* Bears Section */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 bg-red-400 rounded-full"></div>
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
              Bären ({data.bears.length})
            </h4>
          </div>
          
          <div className="space-y-4">
            {data.bears.slice(0, 5).map((point, index) => (
              <div key={point.id} className="group">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-theme-secondary leading-relaxed text-sm group-hover:text-theme-primary transition-colors">
                    {point.text.length > 150 ? point.text.substring(0, 150) + '...' : point.text}
                  </p>
                </div>
                {index < data.bears.slice(0, 5).length - 1 && (
                  <div className="ml-4 mt-3 h-px bg-border-color"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-theme flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span className="text-xs text-theme-muted">
            Aktualisiert: {new Date(data.lastUpdated).toLocaleDateString('de-DE')}
          </span>
        </div>
        <button 
          onClick={loadBullsBears} 
          className="text-xs text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-secondary rounded" 
          title="Aktualisieren"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BullsBearsSection;