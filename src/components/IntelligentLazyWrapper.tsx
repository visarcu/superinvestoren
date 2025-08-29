// src/components/IntelligentLazyWrapper.tsx - INTELLIGENT LAZY LOADING
'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface IntelligentLazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  minHeight?: number;
  className?: string;
  name?: string; // For debugging
}

const IntelligentLazyWrapper: React.FC<IntelligentLazyWrapperProps> = ({
  children,
  fallback,
  rootMargin = '150px',
  threshold = 0.1,
  minHeight = 400,
  className = '',
  name = 'Component'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          console.log(`👁️ [LazyWrapper] ${name} became visible - loading component`)
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasLoaded, rootMargin, threshold, name]);

  // Show skeleton while not visible
  if (!isVisible || !hasLoaded) {
    return (
      <div 
        ref={containerRef} 
        className={`${className} flex items-center justify-center bg-theme-card rounded-lg border border-theme/10`}
        style={{ minHeight: `${minHeight}px` }}
      >
        {fallback || (
          <div className="text-center p-8">
            <div className="w-12 h-12 bg-theme-tertiary rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-theme-secondary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-theme-secondary text-sm font-medium">{name} wird geladen...</p>
            <p className="text-theme-muted text-xs mt-1">Lädt automatisch wenn sichtbar</p>
          </div>
        )}
      </div>
    );
  }

  // Show actual component when visible
  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default IntelligentLazyWrapper;