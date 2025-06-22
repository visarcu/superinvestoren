// src/app/analyse/stocks/[ticker]/not-found.tsx - 404 Seite für nicht gefundene Aktien
import Link from 'next/link'
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function StockNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="w-24 h-24 bg-gray-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-500" />
        </div>
        
        {/* Error Message */}
        <h1 className="text-2xl font-bold text-white mb-3">Aktie nicht gefunden</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Die angeforderte Aktie konnte nicht gefunden werden. 
          Überprüfe das Ticker-Symbol oder suche nach einer anderen Aktie.
        </p>
        
        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 w-full justify-center"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
          
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 w-full justify-center"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Andere Aktie suchen
          </Link>
        </div>
      </div>
    </div>
  )
}