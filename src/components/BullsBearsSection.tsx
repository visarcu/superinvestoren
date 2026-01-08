// src/components/BullsBearsSection.tsx - SUBTLE BLUR ONLY
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
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

const BullsBearsSection: React.FC<BullsBearsSectionProps> = React.memo(({ 
  ticker, 
  isPremium 
}) => {
  const [data, setData] = useState<BullsBearsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBullsBears = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🚀 [Bulls&Bears] Fast-loading for ${ticker}`);
      
      // Use AbortController for faster timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(`/api/bulls-bears/${ticker}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=300' // 5 minutes cache
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to load bulls/bears data');
      }
      
      const bullsBearsData = await response.json();
      console.log(`✅ [Bulls&Bears] Fast-loaded for ${ticker}`);
      setData(bullsBearsData);
      
    } catch (err) {
      console.error('Error loading bulls/bears:', err);
      setError('Bulls & Bears Analyse momentan nicht verfügbar. Versuchen Sie es später nochmal.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    
    loadBullsBears();
  }, [ticker, loadBullsBears]);

  // Loading State
  if (loading) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>
        <div className="p-6 h-[400px] flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner />
            <p className="text-theme-secondary text-sm mt-3">Lade KI-Analyse...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>
        <div className="p-6 h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4 text-sm font-medium">{error}</p>
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

  // Main Content mit Premium Blur
  if (!data) return null;

  // Premium Teaser: Zeige ersten Bull + Bear Punkt, blur den Rest
  if (!isPremium) {
    const teaserBulls = data.bulls.slice(0, 2)
    const blurredBulls = data.bulls.slice(2, 5)
    const teaserBears = data.bears.slice(0, 2)
    const blurredBears = data.bears.slice(2, 5)

    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Bulls Section - Teaser */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                <h4 className="text-sm font-semibold text-brand-light uppercase tracking-wide">
                  Bullen ({data.bulls.length})
                </h4>
              </div>

              {/* Sichtbare Teaser-Punkte */}
              <div className="space-y-4">
                {teaserBulls.map((point, index) => (
                  <div key={point.id} className="group">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-theme-secondary leading-relaxed text-sm">
                        {point.text.length > 150 ? point.text.substring(0, 150) + '...' : point.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geblurrte weitere Punkte */}
              {blurredBulls.length > 0 && (
                <div className="mt-3 filter blur-sm opacity-40 pointer-events-none select-none space-y-3">
                  {blurredBulls.slice(0, 2).map((point) => (
                    <div key={point.id} className="flex gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-theme-secondary leading-relaxed text-sm">
                        {point.text.substring(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-theme/20"></div>

            {/* Bears Section - Teaser */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                  Bären ({data.bears.length})
                </h4>
              </div>

              {/* Sichtbare Teaser-Punkte */}
              <div className="space-y-4">
                {teaserBears.map((point, index) => (
                  <div key={point.id} className="group">
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-theme-secondary leading-relaxed text-sm">
                        {point.text.length > 150 ? point.text.substring(0, 150) + '...' : point.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Geblurrte weitere Punkte */}
              {blurredBears.length > 0 && (
                <div className="mt-3 filter blur-sm opacity-40 pointer-events-none select-none space-y-3">
                  {blurredBears.slice(0, 2).map((point) => (
                    <div key={point.id} className="flex gap-3">
                      <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-theme-secondary leading-relaxed text-sm">
                        {point.text.substring(0, 80)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Premium CTA */}
          <div className="mt-6 pt-4 border-t border-theme/10">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand/10 hover:bg-brand/20 border border-brand/20 hover:border-green-500/30 rounded-lg transition-colors"
            >
              <LockClosedIcon className="w-4 h-4 text-brand" />
              <span className="text-brand font-medium text-sm">
                +{data.bulls.length + data.bears.length - 4} weitere Punkte freischalten
              </span>
              <ArrowRightIcon className="w-4 h-4 text-brand" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Premium User: Voller Zugang
  return (
    <div className="bg-theme-card rounded-lg">
      <div className="px-6 py-4 border-b border-theme/10">
        <h3 className="text-lg font-bold text-theme-primary">Bullen vs Bären</h3>
      </div>

      <div className="p-6">
        <div className="h-[400px] overflow-y-auto space-y-6 pr-2">

          {/* Bulls Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-4 h-4 bg-green-400 rounded-full"></div>
              <h4 className="text-sm font-semibold text-brand-light uppercase tracking-wide">
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
                    <div className="ml-4 mt-3 h-px bg-theme/20"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-theme/20"></div>

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
                    <div className="ml-4 mt-3 h-px bg-theme/20"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-theme/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-xs text-theme-muted">
              Aktualisiert: {new Date(data.lastUpdated).toLocaleDateString('de-DE')}
            </span>
          </div>
          <button
            onClick={loadBullsBears}
            className="text-xs text-theme-muted hover:text-theme-primary transition-colors p-1.5 hover:bg-theme-tertiary rounded"
            title="Aktualisieren"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

BullsBearsSection.displayName = 'BullsBearsSection';

export default BullsBearsSection;