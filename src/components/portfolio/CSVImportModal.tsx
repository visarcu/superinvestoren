// src/components/portfolio/CSVImportModal.tsx
// Multi-Step CSV Import Wizard für Scalable Capital Transaktionen
'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { parseScalableCSV, reconstructHoldings, type ParsedTransaction, type CSVParseResult } from '@/lib/scalableCSVParser'
import { resolveISINsLocally } from '@/lib/isinResolver'
import { checkBulkDuplicates } from '@/lib/duplicateCheck'
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  portfolioName: string
  onImportComplete: () => void
}

type ImportStep = 'upload' | 'resolve' | 'preview' | 'importing' | 'done'

// Typen für die Anzeige
const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: 'Kauf', color: 'text-emerald-400' },
  sell: { label: 'Verkauf', color: 'text-red-400' },
  dividend: { label: 'Dividende', color: 'text-blue-400' },
  cash_deposit: { label: 'Einzahlung', color: 'text-emerald-400' },
  cash_withdrawal: { label: 'Auszahlung', color: 'text-red-400' },
  transfer_in: { label: 'Einbuchung', color: 'text-violet-400' },
  transfer_out: { label: 'Ausbuchung', color: 'text-orange-400' },
}

export default function CSVImportModal({
  isOpen,
  onClose,
  portfolioId,
  portfolioName,
  onImportComplete,
}: CSVImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isinMap, setIsinMap] = useState<Map<string, { symbol: string; name: string; source: string }>>(new Map())
  const [unresolvedISINs, setUnresolvedISINs] = useState<string[]>([])
  const [resolving, setResolving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ transactions: number; holdings: number } | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({})
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset State
  const resetState = useCallback(() => {
    setStep('upload')
    setParseResult(null)
    setIsinMap(new Map())
    setUnresolvedISINs([])
    setResolving(false)
    setImporting(false)
    setImportProgress({ current: 0, total: 0 })
    setImportError(null)
    setImportResult(null)
    setManualMappings({})
    setDuplicateIndices(new Set())
    setDuplicateCheckDone(false)
    setCheckingDuplicates(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  // === STEP 1: Upload + Auto-Resolve ===
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = parseScalableCSV(text)
      setParseResult(result)

      if (result.uniqueISINs.length > 0) {
        // Phase 1: Lokal auflösen (etfs.ts)
        const { resolved, unresolved } = resolveISINsLocally(result.uniqueISINs)

        const newMap = new Map<string, { symbol: string; name: string; source: string }>()
        resolved.forEach((value, key) => {
          newMap.set(key, { symbol: value.symbol, name: value.name, source: value.source })
        })

        // Phase 2: Unaufgelöste ISINs automatisch via API auflösen
        if (unresolved.length > 0) {
          setIsinMap(newMap)
          setUnresolvedISINs(unresolved)
          setStep('resolve')
          setResolving(true)

          try {
            const response = await fetch('/api/portfolio/resolve-isins', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isins: unresolved }),
            })

            if (response.ok) {
              const { results } = await response.json()
              const stillUnresolved: string[] = []

              for (const isin of unresolved) {
                if (results[isin]) {
                  newMap.set(isin, {
                    symbol: results[isin].symbol,
                    name: results[isin].name,
                    source: results[isin].source || 'openfigi',
                  })
                } else {
                  stillUnresolved.push(isin)
                }
              }

              setIsinMap(new Map(newMap))
              setUnresolvedISINs(stillUnresolved)
            }
          } catch (error: any) {
            console.error('Auto ISIN resolution error:', error)
          } finally {
            setResolving(false)
          }
        } else {
          // Alles lokal aufgelöst
          setIsinMap(newMap)
          setUnresolvedISINs([])
          setStep('resolve')
        }
      } else {
        setStep('resolve')
      }
    } catch (error: any) {
      setImportError(`Fehler beim Lesen der Datei: ${error.message}`)
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // === STEP 2: ISIN Resolution (manueller Retry-Button) ===
  const resolveViaAPI = useCallback(async () => {
    if (unresolvedISINs.length === 0) return

    setResolving(true)
    try {
      const response = await fetch('/api/portfolio/resolve-isins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isins: unresolvedISINs }),
      })

      if (response.ok) {
        const { results } = await response.json()
        const newMap = new Map(isinMap)
        const stillUnresolved: string[] = []

        for (const isin of unresolvedISINs) {
          if (results[isin]) {
            newMap.set(isin, {
              symbol: results[isin].symbol,
              name: results[isin].name,
              source: results[isin].source || 'openfigi',
            })
          } else {
            stillUnresolved.push(isin)
          }
        }

        setIsinMap(newMap)
        setUnresolvedISINs(stillUnresolved)
      }
    } catch (error: any) {
      console.error('ISIN resolution error:', error)
    } finally {
      setResolving(false)
    }
  }, [unresolvedISINs, isinMap])

  const handleManualMapping = useCallback((isin: string, symbol: string) => {
    setManualMappings(prev => ({ ...prev, [isin]: symbol }))
  }, [])

  const applyManualMappings = useCallback(() => {
    const newMap = new Map(isinMap)
    const stillUnresolved: string[] = []

    for (const isin of unresolvedISINs) {
      const manual = manualMappings[isin]
      if (manual && manual.trim()) {
        // Beschreibung aus den Transaktionen holen
        const tx = parseResult?.transactions.find(t => t.isin === isin)
        newMap.set(isin, { symbol: manual.trim().toUpperCase(), name: tx?.name || manual, source: 'manual' })
      } else {
        stillUnresolved.push(isin)
      }
    }

    setIsinMap(newMap)
    setUnresolvedISINs(stillUnresolved)
  }, [unresolvedISINs, manualMappings, isinMap, parseResult])

  // Transaktionen mit aufgelösten Symbolen
  const resolvedTransactions = useMemo(() => {
    if (!parseResult) return []

    return parseResult.transactions.map(tx => {
      if (tx.symbol) return tx // Bereits aufgelöst (z.B. CASH)

      const resolved = isinMap.get(tx.isin)
      if (resolved) {
        return { ...tx, symbol: resolved.symbol, name: resolved.name || tx.name }
      }

      return tx // Unaufgelöst — ISIN als Fallback
    })
  }, [parseResult, isinMap])

  // Holdings Vorschau
  const previewHoldings = useMemo(() => {
    const txWithSymbols = resolvedTransactions.filter(t => t.symbol)
    return reconstructHoldings(txWithSymbols)
  }, [resolvedTransactions])

  // Duplikat-Prüfung starten wenn Preview-Step erreicht wird
  const runDuplicateCheck = useCallback(async () => {
    const txWithSymbols = resolvedTransactions.filter(t => t.symbol)
    if (txWithSymbols.length === 0) return

    setCheckingDuplicates(true)
    try {
      const dupes = await checkBulkDuplicates(
        portfolioId,
        txWithSymbols.map(tx => ({
          type: tx.type,
          symbol: tx.symbol!,
          date: tx.date,
          quantity: tx.quantity,
          price: tx.price,
        }))
      )
      setDuplicateIndices(dupes)
      setDuplicateCheckDone(true)
    } catch (error) {
      console.error('Duplikat-Prüfung fehlgeschlagen:', error)
      setDuplicateCheckDone(true)
    } finally {
      setCheckingDuplicates(false)
    }
  }, [resolvedTransactions, portfolioId])

  // Zusammenfassung für Preview
  const importSummary = useMemo(() => {
    if (!parseResult) return null

    const withSymbols = resolvedTransactions.filter(t => t.symbol)
    const withoutSymbols = resolvedTransactions.filter(t => !t.symbol && t.isin)

    return {
      totalTransactions: withSymbols.length,
      skippedNoSymbol: withoutSymbols.length,
      duplicateCount: duplicateIndices.size,
      newTransactions: withSymbols.length - duplicateIndices.size,
      holdings: previewHoldings.length,
      byType: parseResult.summary.byType,
    }
  }, [parseResult, resolvedTransactions, previewHoldings, duplicateIndices])

  // === STEP 4: Import ===
  const handleImport = useCallback(async () => {
    if (!parseResult) return

    setStep('importing')
    setImporting(true)
    setImportError(null)

    try {
      const txWithSymbols = resolvedTransactions.filter(t => t.symbol)
      // Duplikate herausfiltern
      const txToImport = txWithSymbols.filter((_, i) => !duplicateIndices.has(i))
      setImportProgress({ current: 0, total: txToImport.length })

      if (txToImport.length === 0) {
        setImportError('Keine neuen Transaktionen zum Importieren (alle sind Duplikate).')
        setStep('preview')
        setImporting(false)
        return
      }

      // Transaktionen in Batches von 50 einfügen
      const batchSize = 50
      for (let i = 0; i < txToImport.length; i += batchSize) {
        const batch = txToImport.slice(i, i + batchSize)

        const rows = batch.map(tx => ({
          portfolio_id: portfolioId,
          type: tx.type,
          symbol: tx.symbol!,
          name: tx.name,
          quantity: tx.quantity,
          price: tx.price,
          total_value: tx.totalValue,
          date: tx.date,
          notes: tx.notes,
        }))

        const { error } = await supabase
          .from('portfolio_transactions')
          .insert(rows)

        if (error) throw error

        setImportProgress({ current: Math.min(i + batchSize, txToImport.length), total: txToImport.length })
      }

      // Holdings erstellen/aktualisieren
      const holdings = reconstructHoldings(txToImport)

      for (const holding of holdings) {
        // Prüfen ob Holding bereits existiert
        const { data: existing } = await supabase
          .from('portfolio_holdings')
          .select('id, quantity, purchase_price')
          .eq('portfolio_id', portfolioId)
          .eq('symbol', holding.symbol)
          .single()

        if (existing) {
          // Bestehende Position aufstocken (Durchschnittskostenmethode)
          const newTotalQty = existing.quantity + holding.quantity
          const newAvgPrice = (
            (existing.quantity * existing.purchase_price) +
            (holding.quantity * holding.avgPrice)
          ) / newTotalQty

          await supabase
            .from('portfolio_holdings')
            .update({
              quantity: newTotalQty,
              purchase_price: newAvgPrice,
              purchase_currency: 'EUR',
            })
            .eq('id', existing.id)
        } else {
          // Neue Position erstellen
          await supabase
            .from('portfolio_holdings')
            .insert({
              portfolio_id: portfolioId,
              symbol: holding.symbol,
              name: holding.name,
              quantity: holding.quantity,
              purchase_price: holding.avgPrice,
              purchase_date: holding.earliestDate,
              purchase_currency: 'EUR',
            })
        }
      }

      // Cash-Position aktualisieren
      const cashTransactions = txToImport.filter(t =>
        t.type === 'cash_deposit' || t.type === 'cash_withdrawal'
      )
      if (cashTransactions.length > 0) {
        const netCash = cashTransactions.reduce((sum, tx) => {
          return sum + (tx.type === 'cash_deposit' ? tx.totalValue : -tx.totalValue)
        }, 0)

        if (netCash !== 0) {
          const { data: portfolio } = await supabase
            .from('portfolios')
            .select('cash_position')
            .eq('id', portfolioId)
            .single()

          if (portfolio) {
            await supabase
              .from('portfolios')
              .update({ cash_position: (portfolio.cash_position || 0) + netCash })
              .eq('id', portfolioId)
          }
        }
      }

      setImportResult({
        transactions: txToImport.length,
        holdings: holdings.length,
      })
      setStep('done')
    } catch (error: any) {
      console.error('Import error:', error)
      setImportError(error.message || 'Fehler beim Import')
      setStep('preview') // Zurück zum Preview
    } finally {
      setImporting(false)
    }
  }, [parseResult, resolvedTransactions, portfolioId])

  // Format helpers
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-neutral-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">CSV Import</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Transaktionen in "{portfolioName}" importieren
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-800/50 flex-shrink-0">
          {[
            { key: 'upload', label: '1. Upload' },
            { key: 'resolve', label: '2. Symbole' },
            { key: 'preview', label: '3. Vorschau' },
          ].map((s, i) => {
            const isActive = s.key === step || (step === 'importing' && s.key === 'preview') || (step === 'done' && s.key === 'preview')
            const isDone =
              (s.key === 'upload' && step !== 'upload') ||
              (s.key === 'resolve' && ['preview', 'importing', 'done'].includes(step))

            return (
              <React.Fragment key={s.key}>
                {i > 0 && <div className="w-8 h-px bg-neutral-700" />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  isActive ? 'text-emerald-400' : isDone ? 'text-neutral-400' : 'text-neutral-600'
                }`}>
                  {isDone ? (
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                      isActive ? 'border-emerald-400 text-emerald-400' : 'border-neutral-600 text-neutral-600'
                    }`}>
                      {i + 1}
                    </span>
                  )}
                  {s.label}
                </div>
              </React.Fragment>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* === UPLOAD STEP === */}
          {step === 'upload' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-neutral-800 rounded-2xl flex items-center justify-center">
                <DocumentTextIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-base font-medium text-white mb-2">Scalable Capital CSV hochladen</h3>
              <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">
                Lade deinen Transaktions-Export von Scalable Capital hoch.
                Das Format wird automatisch erkannt.
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl cursor-pointer transition-colors font-medium text-sm">
                <ArrowUpTrayIcon className="w-4 h-4" />
                CSV-Datei auswählen
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-neutral-600 mt-4">
                Unterstützt: Scalable Capital Broker CSV-Export (Semikolon-getrennt)
              </p>

              {importError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{importError}</p>
                </div>
              )}
            </div>
          )}

          {/* === RESOLVE STEP === */}
          {step === 'resolve' && parseResult && (
            <div>
              {/* Parse Summary */}
              <div className="bg-neutral-800/30 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-white mb-2">CSV geparst</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Transaktionen</p>
                    <p className="text-white font-medium">{parseResult.summary.imported}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Übersprungen</p>
                    <p className="text-neutral-400">{parseResult.summary.skipped}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Wertpapiere</p>
                    <p className="text-white font-medium">{parseResult.uniqueISINs.length}</p>
                  </div>
                </div>
              </div>

              {/* ISIN Resolution Status */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  ISIN → Symbol Zuordnung
                  <span className="ml-2 text-xs text-neutral-500">
                    {isinMap.size}/{parseResult.uniqueISINs.length} aufgelöst
                  </span>
                </h4>

                {/* Aufgelöste ISINs */}
                {isinMap.size > 0 && (
                  <div className="mb-3">
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {Array.from(isinMap.entries()).map(([isin, info]) => (
                        <div key={isin} className="flex items-center justify-between py-1.5 px-3 bg-emerald-500/5 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="text-neutral-400 font-mono text-xs">{isin}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{info.symbol}</span>
                            <span className="text-[10px] text-neutral-600 px-1.5 py-0.5 bg-neutral-800 rounded">{info.source === 'etf_static' ? 'ETF' : info.source === 'cusip_local' ? 'Lokal' : info.source === 'openfigi' ? 'FIGI' : info.source === 'fmp_api' ? 'FMP' : 'Manuell'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unaufgelöste ISINs */}
                {unresolvedISINs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-amber-400">{unresolvedISINs.length} nicht aufgelöst</span>
                    </div>

                    <div className="space-y-2 mb-3">
                      {unresolvedISINs.map(isin => {
                        const tx = parseResult.transactions.find(t => t.isin === isin)
                        return (
                          <div key={isin} className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-mono text-neutral-400">{isin}</span>
                              {tx && <span className="text-xs text-neutral-500 ml-2">{tx.name}</span>}
                            </div>
                            <input
                              type="text"
                              placeholder="Symbol"
                              value={manualMappings[isin] || ''}
                              onChange={(e) => handleManualMapping(isin, e.target.value)}
                              className="w-24 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs uppercase"
                            />
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={resolveViaAPI}
                        disabled={resolving}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {resolving ? (
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                        )}
                        {resolving ? 'Suche...' : 'Erneut suchen'}
                      </button>

                      {Object.keys(manualMappings).length > 0 && (
                        <button
                          onClick={applyManualMappings}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Manuelle Zuordnung anwenden
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {unresolvedISINs.length === 0 && isinMap.size > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Alle ISINs erfolgreich aufgelöst!</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === PREVIEW STEP === */}
          {step === 'preview' && importSummary && (
            <div>
              <h4 className="text-sm font-medium text-white mb-3">Import-Vorschau</h4>

              {/* Zusammenfassung */}
              <div className="bg-neutral-800/30 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-500">Transaktionen</p>
                    <p className="text-white font-medium text-lg">{importSummary.totalTransactions}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Positionen</p>
                    <p className="text-white font-medium text-lg">{importSummary.holdings}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500">Duplikate</p>
                    {checkingDuplicates ? (
                      <div className="flex items-center gap-1.5">
                        <ArrowPathIcon className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
                        <span className="text-neutral-500 text-sm">Prüfe...</span>
                      </div>
                    ) : (
                      <p className={`font-medium text-lg ${importSummary.duplicateCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {importSummary.duplicateCount}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-neutral-500">Neu</p>
                    <p className="text-emerald-400 font-medium text-lg">{importSummary.newTransactions}</p>
                  </div>
                </div>
              </div>

              {/* Duplikat-Warnung */}
              {duplicateCheckDone && importSummary.duplicateCount > 0 && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-neutral-400">
                      <p className="font-medium text-amber-400 mb-1">
                        {importSummary.duplicateCount} Duplikat{importSummary.duplicateCount !== 1 ? 'e' : ''} erkannt
                      </p>
                      <p>
                        {importSummary.duplicateCount} Transaktion{importSummary.duplicateCount !== 1 ? 'en existieren' : ' existiert'} bereits im Depot und {importSummary.duplicateCount !== 1 ? 'werden' : 'wird'} übersprungen.
                        Es werden nur {importSummary.newTransactions} neue Transaktionen importiert.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Typ-Verteilung */}
              <div className="mb-4">
                <h5 className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">Nach Typ</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(importSummary.byType).map(([type, count]) => {
                    const config = TYPE_LABELS[type]
                    return (
                      <span key={type} className={`px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 ${config?.color || 'text-neutral-400'}`}>
                        {config?.label || type}: {count}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Holdings Vorschau */}
              {previewHoldings.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">Resultierende Positionen</h5>
                  <div className="max-h-60 overflow-y-auto space-y-0 border border-neutral-800/50 rounded-xl overflow-hidden">
                    {previewHoldings.sort((a, b) => (b.quantity * b.avgPrice) - (a.quantity * a.avgPrice)).map(h => (
                      <div key={h.symbol} className="flex items-center justify-between py-2.5 px-3 border-b border-neutral-800/30 last:border-b-0">
                        <div>
                          <span className="font-medium text-white text-sm">{h.symbol}</span>
                          <p className="text-xs text-neutral-500 truncate max-w-[200px]">{h.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white">{h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 3 })} Stk.</p>
                          <p className="text-xs text-neutral-500">Ø {formatCurrency(h.avgPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{importError}</p>
                </div>
              )}

              {/* Hinweis */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                <div className="flex gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-neutral-400">
                    <p className="font-medium text-amber-400 mb-1">Hinweis</p>
                    <p>Der Import erstellt Transaktionen und Positionen im Depot "{portfolioName}". Bestehende Positionen werden aktualisiert (Durchschnittskostenmethode). Die Cash-Position wird anhand von Ein-/Auszahlungen angepasst.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === IMPORTING STEP === */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
              <h3 className="text-base font-medium text-white mb-2">Importiere Transaktionen...</h3>
              <p className="text-sm text-neutral-500">
                {importProgress.current} / {importProgress.total}
              </p>
              <div className="mt-4 max-w-xs mx-auto bg-neutral-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* === DONE STEP === */}
          {step === 'done' && importResult && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <CheckIcon className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-base font-medium text-white mb-2">Import abgeschlossen!</h3>
              <p className="text-sm text-neutral-500 mb-1">
                {importResult.transactions} Transaktionen importiert
              </p>
              <p className="text-sm text-neutral-500">
                {importResult.holdings} Positionen erstellt/aktualisiert
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-neutral-800 flex-shrink-0">
          <div>
            {step === 'resolve' && (
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('resolve')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {step !== 'done' && step !== 'importing' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Abbrechen
              </button>
            )}

            {step === 'resolve' && (
              <button
                onClick={() => { setStep('preview'); runDuplicateCheck() }}
                disabled={isinMap.size === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                Weiter
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={importing || !importSummary || importSummary.totalTransactions === 0}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {importing ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="w-4 h-4" />
                )}
                Jetzt importieren
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={() => { handleClose(); onImportComplete() }}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                Fertig
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
