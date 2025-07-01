// src/components/FilingsTab.tsx
import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  InformationCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// Basierend auf deiner holdingsHistory Struktur
interface Filing {
  quarter: string;
  date: string;
  form: string;
  period: string;
  accession: string;
  url?: string;
  status: 'original' | 'amendment';
  positions: number;
}

interface FilingsTabProps {
  investorSlug: string;
  snapshots: Array<{
    quarter: string;
    data: {
      date: string;
      form?: string;
      period?: string;
      accession?: string;
      positions: any[];
    }
  }>;
}

export default function FilingsTab({ investorSlug, snapshots }: FilingsTabProps) {
  const [filterType, setFilterType] = useState<'all' | '13F' | 'amendments'>('all');

  // Convert snapshots to filing format
  const filings: Filing[] = snapshots.map(snap => {
    const form = snap.data.form || '13F-HR';
    const status: 'original' | 'amendment' = form.includes('/A') ? 'amendment' : 'original';
    
    return {
      quarter: snap.quarter,
      date: snap.data.date,
      form,
      period: snap.data.period || snap.data.date,
      accession: snap.data.accession || 'N/A',
      status,
      positions: snap.data.positions?.length || 0,
      // ✅ FIXED: Richtige SEC URL-Struktur
      url: snap.data.accession ? 
        `https://www.sec.gov/Archives/edgar/data/${getFilerId(investorSlug)}/${snap.data.accession}-index.html` : 
        undefined
    };
  }).reverse(); // Neueste zuerst

  function getFilerId(slug: string): string {
    const filerIds: Record<string, string> = {
      'buffett': '1067983',  // Berkshire Hathaway
      'ackman': '1336528',   // Pershing Square
      'gates': '1166559',    // Gates Foundation
      'marks': '1007478',    // Oaktree Capital
    };
    return filerIds[slug] || '0000000000';
  }

  const filteredFilings = filings.filter(filing => {
    if (filterType === '13F') return filing.form.startsWith('13F');
    if (filterType === 'amendments') return filing.status === 'amendment';
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFormColor = (form: string) => {
    if (form.includes('/A')) return 'text-yellow-400 bg-yellow-500/20';
    if (form.startsWith('13F')) return 'text-green-400 bg-green-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">SEC Filings</h2>
            <p className="text-sm text-gray-400">Originale Quelldokumente</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Filings</option>
            <option value="13F">Nur 13F</option>
            <option value="amendments">Korrekturen</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{filings.length}</div>
          <div className="text-sm text-gray-400">Gesamt Filings</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {filings.filter(f => f.form.startsWith('13F')).length}
          </div>
          <div className="text-sm text-gray-400">13F Reports</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {filings.filter(f => f.status === 'amendment').length}
          </div>
          <div className="text-sm text-gray-400">Korrekturen</div>
        </div>
      </div>

      {/* Filings Table */}
      <div className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-gray-800/50 border-b border-gray-700 text-sm font-medium text-gray-400">
          <div>Formular-Typ</div>
          <div>Periode</div>
          <div>Eingereicht am</div>
          <div>Positionen</div>
          <div>Aktenzeichen</div>
          <div>SEC Ansicht</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-700">
          {filteredFilings.map((filing, index) => (
            <div 
              key={`${filing.quarter}-${index}`}
              className="grid grid-cols-6 gap-4 p-4 hover:bg-gray-800/30 transition-colors"
            >
              {/* Form Type */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getFormColor(filing.form)}`}>
                  {filing.form}
                </span>
                {filing.status === 'amendment' && (
                  <span className="text-xs text-yellow-400" title="Korrektur">●</span>
                )}
              </div>

              {/* Period */}
              <div className="text-white font-medium">{filing.quarter}</div>

              {/* Filing Date */}
              <div className="text-gray-300">{formatDate(filing.date)}</div>

              {/* Positions */}
              <div className="text-gray-300">{filing.positions.toLocaleString('de-DE')}</div>

              {/* Accession */}
              <div className="text-gray-400 font-mono text-xs">
                {filing.accession !== 'N/A' ? 
                  filing.accession.substring(0, 15) + '...' : 
                  'Nicht verfügbar'
                }
              </div>

              {/* Action */}
              <div className="flex items-center gap-2">
                {filing.url ? (
                  <a
                    href={filing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
                  >
                    <DocumentTextIcon className="w-3 h-3" />
                    SEC öffnen
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-gray-500 text-xs">Nicht verfügbar</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredFilings.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Keine Filings für den gewählten Filter gefunden.</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="mb-2">
              <strong className="text-white">13F-HR:</strong> Quartalsberichte für institutionelle Investment Manager mit über 100 Mio. $ verwalteten Vermögens.
            </p>
            <p>
              <strong className="text-white">Korrekturen (/A):</strong> Berichtigungen zu bereits eingereichten Reports. 
              Alle Daten auf dieser Seite basieren auf den neuesten verfügbaren Filings der SEC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}