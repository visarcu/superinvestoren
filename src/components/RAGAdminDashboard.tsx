// src/components/RAGAdminDashboard.tsx - RAG System Management Dashboard
'use client'
import React, { useState, useEffect } from 'react'
import {
  DocumentDuplicateIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface RAGStatus {
  enabled: boolean
  totalDocuments: number
  indexName: string
  lastUpdate: string
  documentsPerTicker: Record<string, number>
  documentsPerType: Record<string, number>
  avgRelevanceScore: number
  healthScore: number
}

interface DocumentInfo {
  id: string
  type: string
  ticker: string
  title: string
  date: string
  source: string
  chunkCount: number
}

interface IngestionJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  ticker: string
  type: 'earnings' | 'news' | 'full'
  startTime: Date
  progress: number
  message?: string
}

export default function RAGAdminDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null)
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [ingestionJobs, setIngestionJobs] = useState<IngestionJob[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'documents' | 'ingestion' | 'settings'>('overview')
  const [newTickerInput, setNewTickerInput] = useState('')

  // Load RAG status and data
  useEffect(() => {
    if (isAdmin) {
      loadRAGStatus()
    }
  }, [isAdmin])

  const loadRAGStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/rag/status')
      if (response.ok) {
        const data = await response.json()
        setRagStatus(data.status)
        setDocuments(data.documents || [])
        setIngestionJobs(data.jobs || [])
      }
    } catch (error) {
      console.error('Error loading RAG status:', error)
    } finally {
      setLoading(false)
    }
  }

  const startIngestion = async (ticker: string, type: 'earnings' | 'news' | 'full') => {
    try {
      const response = await fetch('/api/admin/rag/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, type })
      })
      
      if (response.ok) {
        await loadRAGStatus() // Refresh data
      }
    } catch (error) {
      console.error('Error starting ingestion:', error)
    }
  }

  const deleteDocuments = async (ticker: string) => {
    if (!confirm(`Alle Dokumente für ${ticker} löschen?`)) return
    
    try {
      const response = await fetch(`/api/admin/rag/documents/${ticker}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadRAGStatus()
      }
    } catch (error) {
      console.error('Error deleting documents:', error)
    }
  }

  const runHealthCheck = async () => {
    try {
      const response = await fetch('/api/admin/rag/health-check', {
        method: 'POST'
      })
      
      if (response.ok) {
        await loadRAGStatus()
      }
    } catch (error) {
      console.error('Error running health check:', error)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Admin Access Required</h3>
        <p className="text-gray-400">Du benötigst Admin-Rechte für das RAG Dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Lade RAG Status...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">RAG System Dashboard</h1>
        <p className="text-gray-400">Verwaltung des Retrieval-Augmented Generation Systems</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Status</p>
              <p className="text-2xl font-bold text-white">
                {ragStatus?.enabled ? 'Aktiv' : 'Inaktiv'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              ragStatus?.enabled ? 'bg-green-600/20' : 'bg-red-600/20'
            }`}>
              {ragStatus?.enabled ? (
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Dokumente</p>
              <p className="text-2xl font-bold text-white">
                {ragStatus?.totalDocuments || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <DocumentDuplicateIcon className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Health Score</p>
              <p className="text-2xl font-bold text-white">
                {ragStatus?.healthScore ? `${Math.round(ragStatus.healthScore * 100)}%` : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Letztes Update</p>
              <p className="text-sm font-medium text-white">
                {ragStatus?.lastUpdate ? new Date(ragStatus.lastUpdate).toLocaleDateString('de-DE') : 'Nie'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={loadRAGStatus}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
        <button
          onClick={runHealthCheck}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <CpuChipIcon className="w-4 h-4" />
          Health Check
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-8">
        <nav className="flex space-x-8">
          {(['overview', 'documents', 'ingestion', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && 'Übersicht'}
              {tab === 'documents' && 'Dokumente'}
              {tab === 'ingestion' && 'Daten-Import'}
              {tab === 'settings' && 'Einstellungen'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-8">
          {/* Document Types Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Dokument-Typen</h3>
            <div className="space-y-3">
              {ragStatus?.documentsPerType && Object.entries(ragStatus.documentsPerType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-gray-300 capitalize">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(count / (ragStatus.totalDocuments || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-8">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticker Coverage */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Ticker-Abdeckung</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ragStatus?.documentsPerTicker && Object.entries(ragStatus.documentsPerTicker)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 12)
                .map(([ticker, count]) => (
                <div key={ticker} className="bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">{ticker}</div>
                  <div className="text-sm text-gray-400">{count} Docs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'documents' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Dokumente Verwalten</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-4 text-gray-400 font-medium">Ticker</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Typ</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Titel</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Datum</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Chunks</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 20).map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-700/50">
                    <td className="p-4 text-white font-medium">{doc.ticker}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs">
                        {doc.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 max-w-xs truncate">{doc.title}</td>
                    <td className="p-4 text-gray-400">{new Date(doc.date).toLocaleDateString('de-DE')}</td>
                    <td className="p-4 text-gray-400">{doc.chunkCount}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-1 text-gray-400 hover:text-blue-400 transition-colors">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteDocuments(doc.ticker)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTab === 'ingestion' && (
        <div className="space-y-6">
          {/* Add New Ticker */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Neue Aktie hinzufügen</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Ticker (z.B. AAPL)"
                value={newTickerInput}
                onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => {
                  if (newTickerInput.trim()) {
                    startIngestion(newTickerInput.trim(), 'full')
                    setNewTickerInput('')
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Hinzufügen
              </button>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Import-Jobs</h3>
            </div>
            <div className="p-6">
              {ingestionJobs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Keine aktiven Jobs</p>
              ) : (
                <div className="space-y-4">
                  {ingestionJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          job.status === 'completed' ? 'bg-green-600/20' :
                          job.status === 'failed' ? 'bg-red-600/20' :
                          job.status === 'running' ? 'bg-blue-600/20' : 'bg-gray-600/20'
                        }`}>
                          {job.status === 'running' && (
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          )}
                          {job.status === 'completed' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                          {job.status === 'failed' && <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />}
                        </div>
                        <div>
                          <div className="text-white font-medium">{job.ticker} - {job.type}</div>
                          <div className="text-gray-400 text-sm">
                            {job.status === 'running' ? `${job.progress}% completed` : job.status}
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-400 text-sm">
                        {job.startTime.toLocaleTimeString('de-DE')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">RAG System Konfiguration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Index Name</label>
                <input
                  type="text"
                  value={ragStatus?.indexName || ''}
                  disabled
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Chunk Size</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Overlap</label>
                <input
                  type="number"
                  defaultValue={200}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Dangerous Zone</h3>
            <div className="space-y-4">
              <button className="w-full px-4 py-2 bg-red-600/20 border border-red-600/30 text-red-400 rounded hover:bg-red-600/30 transition-colors">
                RAG System zurücksetzen
              </button>
              <button className="w-full px-4 py-2 bg-red-600/20 border border-red-600/30 text-red-400 rounded hover:bg-red-600/30 transition-colors">
                Alle Dokumente löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}