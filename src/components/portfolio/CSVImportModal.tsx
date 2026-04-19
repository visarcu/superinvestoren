// src/components/portfolio/CSVImportModal.tsx
// Multi-Step Import Wizard nach Parqet-Stil:
//   Broker auswählen → Anleitung → Upload → Cash-Handling → Vorschau → Import → Fertig
// Unterstützt: Scalable Capital (CSV), Trade Republic / Flatex / Smartbroker+ (PDF), Freedom24 (XLSX)
'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { reconstructHoldings, type ParsedTransaction, type CSVParseResult } from '@/lib/scalableCSVParser'
import { resolveISINsLocally } from '@/lib/isinResolver'
import { checkBulkDuplicates } from '@/lib/duplicateCheck'
import type { FlatexParsedTransaction } from '@/lib/flatexPDFParser'
import {
  IMPORT_BROKERS,
  getImportBroker,
  formatToBrokerId,
  type ImportBrokerId,
  type ImportBrokerInfo,
} from '@/lib/importBrokerConfig'
import { BrokerLogo } from './BrokerLogo'
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BanknotesIcon,
  CurrencyEuroIcon,
  NoSymbolIcon,
  LightBulbIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  portfolioId: string
  portfolioName: string
  onImportComplete: () => void
}

type WizardStep =
  | 'broker'
  | 'instructions'
  | 'upload'
  | 'processing'
  | 'resolve'
  | 'cash'
  | 'preview'
  | 'importing'
  | 'done'

type CashMode = 'include' | 'ignore'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: 'Kauf', color: 'text-emerald-400' },
  sell: { label: 'Verkauf', color: 'text-red-400' },
  dividend: { label: 'Dividende', color: 'text-blue-400' },
  cash_deposit: { label: 'Einzahlung', color: 'text-emerald-400' },
  cash_withdrawal: { label: 'Auszahlung', color: 'text-red-400' },
  transfer_in: { label: 'Einbuchung', color: 'text-violet-400' },
  transfer_out: { label: 'Ausbuchung', color: 'text-orange-400' },
}

// Sichtbare Hauptschritte im Step-Indikator
const MAIN_STEPS: { key: WizardStep[]; label: string }[] = [
  { key: ['broker'], label: 'Broker' },
  { key: ['instructions'], label: 'Anleitung' },
  { key: ['upload', 'processing', 'resolve'], label: 'Upload' },
  { key: ['cash'], label: 'Cash' },
  { key: ['preview', 'importing', 'done'], label: 'Vorschau' },
]

export default function CSVImportModal({
  isOpen,
  onClose,
  portfolioId,
  portfolioName,
  onImportComplete,
}: CSVImportModalProps) {
  // === Wizard-State ===
  const [step, setStep] = useState<WizardStep>('broker')
  const [selectedBroker, setSelectedBroker] = useState<ImportBrokerInfo | null>(null)
  const [cashMode, setCashMode] = useState<CashMode>('include')

  // === Parser / Resolve State ===
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [isinMap, setIsinMap] = useState<Map<string, { symbol: string; name: string; source: string }>>(new Map())
  const [unresolvedISINs, setUnresolvedISINs] = useState<string[]>([])
  const [resolving, setResolving] = useState(false)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({})
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfErrors, setPdfErrors] = useState<string[]>([])
  // Historische Schlusskurse für transfer_in/out-Transaktionen (Key: "SYMBOL|YYYY-MM-DD")
  // ING-Depotüberträge haben keinen Einstandskurs — hier ziehen wir den Tagesschlusskurs.
  const [transferPrices, setTransferPrices] = useState<Record<string, number>>({})
  const [fetchingTransferPrices, setFetchingTransferPrices] = useState(false)

  // === Import State ===
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importError, setImportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    transactionsAttempted: number
    transactionsSaved: number
    duplicatesSkipped: number
    holdingsCreated: number
    holdingsUpdated: number
    cashMode: CashMode
    cashTransactionsImported: number
    unresolvedSymbols: number
  } | null>(null)

  // === Duplikate ===
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [pendingDuplicateCheck, setPendingDuplicateCheck] = useState(false)

  // === UI State ===
  const [showSkippedDetails, setShowSkippedDetails] = useState(false)
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const autoInputRef = useRef<HTMLInputElement>(null)

  // === Reset-Feature: existierende Portfolio-Daten ===
  const [existingDataCount, setExistingDataCount] = useState<{ transactions: number; holdings: number } | null>(null)
  const [resetBeforeImport, setResetBeforeImport] = useState(false)

  // Prüfe existierende Daten im Portfolio (wird beim Öffnen des Modals gemacht)
  React.useEffect(() => {
    if (!isOpen || !portfolioId) return
    let cancelled = false
    ;(async () => {
      const [{ count: txCount }, { count: holdCount }] = await Promise.all([
        supabase.from('portfolio_transactions').select('id', { count: 'exact', head: true }).eq('portfolio_id', portfolioId),
        supabase.from('portfolio_holdings').select('id', { count: 'exact', head: true }).eq('portfolio_id', portfolioId),
      ])
      if (cancelled) return
      setExistingDataCount({ transactions: txCount || 0, holdings: holdCount || 0 })
    })()
    return () => { cancelled = true }
  }, [isOpen, portfolioId])

  // Nach ISIN-Resolution: historische Schlusskurse für Transfer-Transaktionen
  // (ohne Einstandspreis) fetchen. Pro Symbol ein FMP-Call mit Range.
  React.useEffect(() => {
    if (!parseResult || isinMap.size === 0) return
    // Alle Transfer-Transaktionen finden, die noch keinen Preis haben
    const needsPrice: Array<{ symbol: string; date: string }> = []
    const seen = new Set<string>()
    for (const tx of parseResult.transactions) {
      if (!tx.isFromTransfer) continue
      if (tx.price > 0) continue
      if (!tx.date) continue
      const symbol = tx.symbol || isinMap.get(tx.isin)?.symbol
      if (!symbol) continue
      const key = `${symbol}|${tx.date}`
      if (seen.has(key)) continue
      seen.add(key)
      if (transferPrices[key]) continue // schon gefetcht
      needsPrice.push({ symbol, date: tx.date })
    }
    if (needsPrice.length === 0) return

    let cancelled = false
    ;(async () => {
      setFetchingTransferPrices(true)
      try {
        const resp = await fetch('/api/portfolio/historical-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: needsPrice }),
        })
        if (!resp.ok) return
        const { results } = await resp.json() as { results: Record<string, number> }
        if (cancelled || !results) return
        setTransferPrices(prev => ({ ...prev, ...results }))
      } finally {
        if (!cancelled) setFetchingTransferPrices(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseResult, isinMap])

  // === Reset ===
  const resetState = useCallback(() => {
    setStep('broker')
    setSelectedBroker(null)
    setCashMode('include')
    setParseResult(null)
    setIsinMap(new Map())
    setUnresolvedISINs([])
    setResolving(false)
    setTransferPrices({})
    setFetchingTransferPrices(false)
    setImporting(false)
    setImportProgress({ current: 0, total: 0 })
    setImportError(null)
    setImportResult(null)
    setManualMappings({})
    setDuplicateIndices(new Set())
    setDuplicateCheckDone(false)
    setCheckingDuplicates(false)
    setShowSkippedDetails(false)
    setShowDuplicateDetails(false)
    setPdfParsing(false)
    setPdfErrors([])
    setDetectedFormat(null)
    setIsDragOver(false)
    setPendingDuplicateCheck(false)
    setResetBeforeImport(false)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  // ======================================================================
  // STEP 1: Broker auswählen
  // ======================================================================
  const handleSelectBroker = useCallback((broker: ImportBrokerInfo) => {
    setSelectedBroker(broker)
    setStep('instructions')
  }, [])

  // ======================================================================
  // STEP 3: Upload → Auto-Format-Erkennung
  // ======================================================================
  const runISINResolve = useCallback(async (
    uniqueISINs: string[],
    setMap: (m: Map<string, { symbol: string; name: string; source: string }>) => void,
  ) => {
    if (uniqueISINs.length === 0) {
      // Keine ISINs → direkt zu Cash-Step
      setStep('cash')
      setPendingDuplicateCheck(true)
      return
    }
    const { resolved, unresolved } = resolveISINsLocally(uniqueISINs)
    const newMap = new Map<string, { symbol: string; name: string; source: string }>()
    resolved.forEach((value, key) => {
      newMap.set(key, { symbol: value.symbol, name: value.name, source: value.source })
    })

    if (unresolved.length === 0) {
      setMap(newMap)
      setUnresolvedISINs([])
      setStep('cash')
      setPendingDuplicateCheck(true)
      return
    }

    setMap(newMap)
    setResolving(true)
    try {
      const resp = await fetch('/api/portfolio/resolve-isins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isins: unresolved }),
      })
      if (resp.ok) {
        const { results } = await resp.json()
        const stillUnresolved: string[] = []
        for (const isin of unresolved) {
          if (results[isin]) {
            newMap.set(isin, { symbol: results[isin].symbol, name: results[isin].name, source: results[isin].source || 'openfigi' })
          } else {
            stillUnresolved.push(isin)
          }
        }
        setMap(new Map(newMap))
        setUnresolvedISINs(stillUnresolved)
        if (stillUnresolved.length === 0) {
          setStep('cash')
          setPendingDuplicateCheck(true)
        } else {
          setStep('resolve')
        }
      }
    } catch {
      setUnresolvedISINs(unresolved)
      setStep('resolve')
    } finally {
      setResolving(false)
    }
  }, [])

  const handleAutoUpload = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return

    setPdfParsing(true)
    setPdfErrors([])
    setImportError(null)
    setDetectedFormat(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setImportError('Nicht angemeldet. Bitte neu einloggen.')
        return
      }

      const formData = new FormData()
      fileArr.forEach(f => formData.append('files', f))

      const response = await fetch('/api/portfolio/import-auto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }))
        setImportError(err.error || 'Import fehlgeschlagen')
        return
      }

      const data = await response.json()

      if (data.errors?.length > 0) setPdfErrors(data.errors)

      if (!data.transactions || data.transactions.length === 0) {
        setImportError('Keine Transaktionen erkannt. Bitte prüfe Dateiformat und Inhalt.')
        return
      }

      setDetectedFormat(data.formatLabel)

      // Warnung wenn Broker-Format nicht zur Auswahl passt
      if (selectedBroker && selectedBroker.id !== 'other') {
        const detectedBrokerId = formatToBrokerId(data.format)
        if (detectedBrokerId !== selectedBroker.id) {
          setPdfErrors(prev => [
            `Hinweis: Du hast "${selectedBroker.name}" ausgewählt, die Datei sieht aber nach "${getImportBroker(detectedBrokerId).name}" aus. Der Import läuft trotzdem weiter.`,
            ...prev,
          ])
        }
      }

      let parsedTransactions: ParsedTransaction[]
      let uniqueISINs: string[]

      if (data.format === 'scalable' || data.format === 'zero' || data.format === 'trading212') {
        // Alle CSV-Parser liefern bereits ParsedTransaction[]
        parsedTransactions = data.transactions as ParsedTransaction[]
        uniqueISINs = (data.uniqueISINs as string[]) || []
      } else {
        // Typ-Erweiterung für PDF-Parser die auch Transfer-Typen liefern (z.B. ING)
        const txs = data.transactions as (Omit<FlatexParsedTransaction, 'type'> & {
          type: FlatexParsedTransaction['type'] | 'transfer_in' | 'transfer_out'
          isFromTransfer?: boolean
        })[]
        uniqueISINs = [...new Set(txs.map(t => t.isin).filter(Boolean))]
        parsedTransactions = txs.map(tx => ({
          date: tx.date,
          type: tx.type,
          isin: tx.isin,
          symbol: '',
          name: tx.name,
          quantity: tx.quantity,
          price: tx.price,
          totalValue: tx.totalValue,
          fee: tx.fees || 0,
          tax: 0,
          notes: tx.notes,
          originalType: `${data.format}_${tx.type}`,
          // Transfer-in/out ohne Einstandspreis werden unten via Historical-Price-API nachgezogen
          isFromTransfer: tx.isFromTransfer || tx.type === 'transfer_in' || tx.type === 'transfer_out',
        }))
      }

      const byType: Record<string, number> = {}
      parsedTransactions.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1 })

      setParseResult({
        transactions: parsedTransactions,
        uniqueISINs,
        skipped: [],
        summary: {
          total: parsedTransactions.length,
          imported: parsedTransactions.length,
          skipped: 0,
          byType,
        },
      })

      setStep('processing')
      await runISINResolve(uniqueISINs, setIsinMap)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      setImportError(`Upload fehlgeschlagen: ${msg}`)
    } finally {
      setPdfParsing(false)
      if (autoInputRef.current) autoInputRef.current.value = ''
    }
  }, [runISINResolve, selectedBroker])

  // ======================================================================
  // STEP 4: ISIN Resolution
  // ======================================================================
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
    } catch (error) {
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
        const tx = parseResult?.transactions.find(t => t.isin === isin)
        newMap.set(isin, { symbol: manual.trim().toUpperCase(), name: tx?.name || manual, source: 'manual' })
      } else {
        stillUnresolved.push(isin)
      }
    }

    setIsinMap(newMap)
    setUnresolvedISINs(stillUnresolved)
  }, [unresolvedISINs, manualMappings, isinMap, parseResult])

  // ======================================================================
  // Transaktionen mit aufgelösten Symbolen + Cash-Filter
  // ======================================================================
  const resolvedTransactions = useMemo(() => {
    if (!parseResult) return []

    return parseResult.transactions.map(tx => {
      // Symbol via ISIN-Map auflösen (falls noch nicht gesetzt)
      let resolved = tx
      if (!tx.symbol) {
        const res = isinMap.get(tx.isin)
        if (res) resolved = { ...tx, symbol: res.symbol, name: res.name || tx.name }
      }

      // Transfer ohne Einstandskurs → historischen Schlusskurs einsetzen (falls gefetcht)
      if (resolved.isFromTransfer && resolved.price === 0 && resolved.symbol && resolved.date) {
        const key = `${resolved.symbol}|${resolved.date}`
        const histPrice = transferPrices[key]
        if (histPrice && histPrice > 0) {
          resolved = {
            ...resolved,
            price: histPrice,
            totalValue: histPrice * resolved.quantity,
            notes: `${resolved.notes} · Einstandskurs: Schlusskurs am Übertragsdatum (${histPrice.toFixed(2)}€)`,
          }
        }
      }
      return resolved
    })
  }, [parseResult, isinMap, transferPrices])

  // Nach Cash-Mode gefilterte Transaktionen
  const cashFilteredTransactions = useMemo(() => {
    if (cashMode === 'include') return resolvedTransactions
    // cashMode === 'ignore': Cash-Transaktionen rausfiltern
    return resolvedTransactions.filter(t => t.type !== 'cash_deposit' && t.type !== 'cash_withdrawal')
  }, [resolvedTransactions, cashMode])

  const previewHoldings = useMemo(() => {
    const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol && t.symbol !== 'CASH')
    return reconstructHoldings(txWithSymbols)
  }, [cashFilteredTransactions])

  // Duplikat-Prüfung
  const runDuplicateCheck = useCallback(async () => {
    const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol)
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
  }, [cashFilteredTransactions, portfolioId])

  React.useEffect(() => {
    if (pendingDuplicateCheck && step === 'preview') {
      setPendingDuplicateCheck(false)
      runDuplicateCheck()
    }
  }, [pendingDuplicateCheck, step, runDuplicateCheck])

  const duplicateTransactions = useMemo(() => {
    if (duplicateIndices.size === 0) return []
    const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol)
    return Array.from(duplicateIndices).map(i => txWithSymbols[i]).filter(Boolean)
  }, [cashFilteredTransactions, duplicateIndices])

  // Summary
  const importSummary = useMemo(() => {
    if (!parseResult) return null

    const withSymbols = cashFilteredTransactions.filter(t => t.symbol)
    const withoutSymbols = resolvedTransactions.filter(t => !t.symbol && t.isin)
    const cashTxCount = resolvedTransactions.filter(t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal').length

    const byType: Record<string, number> = {}
    cashFilteredTransactions.forEach(t => { byType[t.type] = (byType[t.type] || 0) + 1 })

    // Holdings-Markierungen
    const transferHoldings = previewHoldings.filter(h => h.fromTransfer)
    const corpActionHoldings = previewHoldings.filter(h => h.fromCorpAction)

    // Bei Reset: alle bestehenden Daten werden gelöscht → keine Duplikate relevant
    const effectiveDuplicateCount = resetBeforeImport ? 0 : duplicateIndices.size

    return {
      totalTransactions: withSymbols.length,
      skippedNoSymbol: withoutSymbols.length,
      duplicateCount: effectiveDuplicateCount,
      newTransactions: withSymbols.length - effectiveDuplicateCount,
      holdings: previewHoldings.length,
      byType,
      cashTxCount,
      cashIncluded: cashMode === 'include',
      transferHoldings,
      corpActionHoldings,
      stockSplits: parseResult.stockSplits || [],
      tickerRenames: parseResult.tickerRenames || [],
    }
  }, [parseResult, resolvedTransactions, cashFilteredTransactions, previewHoldings, duplicateIndices, cashMode, resetBeforeImport])

  // ======================================================================
  // STEP 7: Import
  // ======================================================================
  const handleImport = useCallback(async () => {
    if (!parseResult) return

    setStep('importing')
    setImporting(true)
    setImportError(null)

    try {
      // Optional: Bestehende Daten des Portfolios löschen (Reset)
      // Nur Transactions + Holdings löschen, NICHT das Portfolio selbst (cash_position, name etc. bleiben)
      if (resetBeforeImport) {
        const [delTx, delHold] = await Promise.all([
          supabase.from('portfolio_transactions').delete().eq('portfolio_id', portfolioId),
          supabase.from('portfolio_holdings').delete().eq('portfolio_id', portfolioId),
        ])
        if (delTx.error) throw new Error(`Fehler beim Löschen der Transaktionen: ${delTx.error.message}`)
        if (delHold.error) throw new Error(`Fehler beim Löschen der Positionen: ${delHold.error.message}`)
        // Auch Cash-Position auf 0 zurücksetzen (wird gleich neu berechnet)
        await supabase.from('portfolios').update({ cash_position: 0 }).eq('id', portfolioId)
      }

      const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol)
      // Bei Reset: alle Duplikate ignorieren (wurden ja gerade gelöscht)
      const txToImport = resetBeforeImport
        ? txWithSymbols
        : txWithSymbols.filter((_, i) => !duplicateIndices.has(i))
      setImportProgress({ current: 0, total: txToImport.length })

      if (txToImport.length === 0) {
        setImportError('Keine neuen Transaktionen zum Importieren (alle sind Duplikate).')
        setStep('preview')
        setImporting(false)
        return
      }

      let savedCount = 0

      // Batch-Import
      const batchSize = 50
      for (let i = 0; i < txToImport.length; i += batchSize) {
        const batch = txToImport.slice(i, i + batchSize)

        const rows = batch.map(tx => ({
          portfolio_id: portfolioId,
          type: tx.type,
          symbol: tx.symbol!,
          name: tx.name,
          quantity: parseFloat(tx.quantity.toFixed(8)),
          price: parseFloat(tx.price.toFixed(4)),
          total_value: parseFloat(tx.totalValue.toFixed(2)),
          fee: parseFloat((tx.fee || 0).toFixed(4)),
          date: tx.date,
          notes: tx.notes,
        }))

        const { error } = await supabase
          .from('portfolio_transactions')
          .insert(rows)

        if (error) throw error

        savedCount += rows.length
        setImportProgress({ current: Math.min(i + batchSize, txToImport.length), total: txToImport.length })
      }

      // Holdings erstellen/aktualisieren
      const holdings = reconstructHoldings(txToImport.filter(t => t.symbol !== 'CASH'))
      let holdingsCreated = 0
      let holdingsUpdated = 0

      for (const holding of holdings) {
        const { data: existing } = await supabase
          .from('portfolio_holdings')
          .select('id, quantity, purchase_price')
          .eq('portfolio_id', portfolioId)
          .eq('symbol', holding.symbol)
          .single()

        if (existing) {
          const existQty = Number(existing.quantity) || 0
          const existPrice = Number(existing.purchase_price) || 0
          const newTotalQty = parseFloat((existQty + holding.quantity).toFixed(8))
          const newAvgPrice = newTotalQty > 0
            ? parseFloat(((existQty * existPrice + holding.quantity * holding.avgPrice) / newTotalQty).toFixed(4))
            : 0

          await supabase
            .from('portfolio_holdings')
            .update({
              quantity: newTotalQty,
              purchase_price: newAvgPrice,
              purchase_currency: 'EUR',
            })
            .eq('id', existing.id)
          holdingsUpdated++
        } else {
          await supabase
            .from('portfolio_holdings')
            .insert({
              portfolio_id: portfolioId,
              symbol: holding.symbol,
              name: holding.name,
              isin: holding.isin || null,
              quantity: parseFloat(holding.quantity.toFixed(8)),
              purchase_price: parseFloat(holding.avgPrice.toFixed(4)),
              purchase_date: holding.earliestDate,
              purchase_currency: 'EUR',
            })
          holdingsCreated++
        }
      }

      // Cash-Position aktualisieren — nur bei cashMode === 'include'
      let cashTransactionsImported = 0
      if (cashMode === 'include') {
        const { data: allPortfolioTx } = await supabase
          .from('portfolio_transactions')
          .select('type, total_value')
          .eq('portfolio_id', portfolioId)

        if (allPortfolioTx && allPortfolioTx.length > 0) {
          const hasCashFlowData = allPortfolioTx.some(
            tx => tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
          )

          if (hasCashFlowData) {
            const totalCash = allPortfolioTx.reduce((sum, tx) => {
              const val = Number(tx.total_value) || 0
              switch (tx.type) {
                case 'cash_deposit':   return sum + val
                case 'cash_withdrawal': return sum - val
                case 'buy':            return sum - val
                case 'sell':           return sum + val
                case 'dividend':       return sum + val
                default:               return sum
              }
            }, 0)

            await supabase
              .from('portfolios')
              .update({ cash_position: totalCash })
              .eq('id', portfolioId)
          }
        }
        cashTransactionsImported = txToImport.filter(
          t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal'
        ).length
      }

      setImportResult({
        transactionsAttempted: cashFilteredTransactions.filter(t => t.symbol).length,
        transactionsSaved: savedCount,
        duplicatesSkipped: resetBeforeImport ? 0 : duplicateIndices.size,
        holdingsCreated,
        holdingsUpdated,
        cashMode,
        cashTransactionsImported,
        unresolvedSymbols: resolvedTransactions.filter(t => !t.symbol && t.isin).length,
      })
      setStep('done')
    } catch (error: any) {
      console.error('Import error:', error)
      setImportError(error.message || 'Fehler beim Import')
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }, [parseResult, cashFilteredTransactions, resolvedTransactions, portfolioId, duplicateIndices, cashMode, resetBeforeImport])

  // Format helpers
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

  if (!isOpen) return null

  // ======================================================================
  // Step-Indikator
  // ======================================================================
  const currentMainStepIndex = MAIN_STEPS.findIndex(s => s.key.includes(step))

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-neutral-800/60 flex-shrink-0 overflow-x-auto">
      {MAIN_STEPS.map((s, i) => {
        const isActive = i === currentMainStepIndex
        const isDone = i < currentMainStepIndex
        return (
          <React.Fragment key={i}>
            {i > 0 && <div className={`w-4 h-px ${isDone ? 'bg-neutral-600' : 'bg-neutral-800'}`} />}
            <div className={`flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap tracking-tight ${
              isActive ? 'text-white' : isDone ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              {isDone ? (
                <CheckIcon className="w-3 h-3 text-neutral-400" />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${
                  isActive ? 'border-white text-white' : 'border-neutral-700 text-neutral-600'
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
  )

  // ======================================================================
  // Render Step Content
  // ======================================================================
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-neutral-800/80 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800/80 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {selectedBroker && step !== 'broker' && (
              <BrokerLogo brokerId={selectedBroker.id} size={32} />
            )}
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-white tracking-tight">
                {step === 'broker' ? 'Depot importieren' : `Import · ${selectedBroker?.shortName || 'Wizard'}`}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                {step === 'broker' ? 'Wähle deinen Broker' : `Ziel-Depot: ${portfolioName}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-neutral-800/60 rounded-lg transition-colors flex-shrink-0"
          >
            <XMarkIcon className="w-4.5 h-4.5 text-neutral-500 hover:text-neutral-300" />
          </button>
        </div>

        {/* Step Indicator */}
        {step !== 'broker' && renderStepIndicator()}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* === STEP 1: Broker-Auswahl === */}
          {step === 'broker' && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Von welchem Broker?</h3>
                <p className="text-[13px] text-neutral-500">
                  Wähle deinen Broker — wir zeigen dir dann, wo genau du die Export-Datei findest.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {IMPORT_BROKERS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBroker(b)}
                    className="group p-3.5 rounded-xl border border-neutral-800/80 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <BrokerLogo brokerId={b.id} size={36} />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-[13px] text-white">{b.name}</span>
                          {b.isBetterThanPdf && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">CSV</span>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {b.formats.join(' · ')}
                          {b.supportsMultiFile && ' · Mehrere Dateien'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-neutral-600 mt-6 text-center">
                Dein Broker fehlt? Schreib uns an <span className="text-neutral-400">support@finclue.de</span>
              </p>
            </div>
          )}

          {/* === STEP 2: Anleitung === */}
          {step === 'instructions' && selectedBroker && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">{selectedBroker.instructions.title}</h3>
                <p className="text-[13px] text-neutral-500">
                  Folge diesen Schritten, um die Export-Datei zu bekommen.
                </p>
              </div>

              {/* Schritt-Liste */}
              <ol className="space-y-1 mb-5">
                {selectedBroker.instructions.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 py-2.5 px-3 rounded-lg hover:bg-neutral-900/50 transition-colors">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-800 text-[11px] font-semibold text-neutral-300 flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-neutral-200 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Hinweis */}
              {selectedBroker.instructions.hint && (
                <div className="mb-5 p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <div className="flex gap-2.5">
                    <LightBulbIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-neutral-400" />
                    <p className="text-[12px] text-neutral-400 leading-relaxed">{selectedBroker.instructions.hint}</p>
                  </div>
                </div>
              )}

              {/* Login-Button */}
              {selectedBroker.instructions.loginUrl && (
                <a
                  href={selectedBroker.instructions.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 text-[13px] text-neutral-200 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                  {selectedBroker.instructions.loginLabel || 'Zur Broker-Website'}
                </a>
              )}
            </div>
          )}

          {/* === STEP 3: Upload === */}
          {step === 'upload' && selectedBroker && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Datei hochladen</h3>
                <p className="text-[13px] text-neutral-500">
                  Akzeptiert: {selectedBroker.formats.join(', ')}
                  {selectedBroker.supportsMultiFile && ' · mehrere Dateien möglich'}
                </p>
              </div>

              <label
                className={`relative flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border border-dashed cursor-pointer transition-all ${
                  pdfParsing
                    ? 'pointer-events-none opacity-50 border-neutral-800 bg-neutral-900/50'
                    : isDragOver
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/30 hover:bg-neutral-900/60'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragOver(false)
                  if (e.dataTransfer.files.length > 0) handleAutoUpload(e.dataTransfer.files)
                }}
              >
                {pdfParsing ? (
                  <>
                    <ArrowPathIcon className="w-8 h-8 text-neutral-400 animate-spin" />
                    <p className="text-[13px] text-neutral-400">Datei wird verarbeitet…</p>
                  </>
                ) : (
                  <>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-emerald-500/10' : 'bg-neutral-900 border border-neutral-800'}`}>
                      <ArrowUpTrayIcon className={`w-5 h-5 transition-colors ${isDragOver ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-white">Datei hier ablegen oder klicken</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        {selectedBroker.formats.join(' · ')} · max. 10 MB
                      </p>
                    </div>
                  </>
                )}
                <input
                  ref={autoInputRef}
                  type="file"
                  accept={selectedBroker.accept}
                  multiple={selectedBroker.supportsMultiFile}
                  onChange={(e) => { if (e.target.files) handleAutoUpload(e.target.files) }}
                  className="hidden"
                />
              </label>

              {pdfErrors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs font-medium text-amber-400 mb-1">Hinweise:</p>
                  <ul className="space-y-0.5">
                    {pdfErrors.map((err, i) => (
                      <li key={i} className="text-xs text-neutral-400">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{importError}</p>
                </div>
              )}
            </div>
          )}

          {/* === STEP: PROCESSING === */}
          {step === 'processing' && (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
              <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Datei wird verarbeitet…</h3>
              <p className="text-[13px] text-neutral-500">
                {detectedFormat ? (
                  <><span className="text-neutral-300">{detectedFormat}</span> erkannt · Wertpapiere werden aufgelöst</>
                ) : 'Wertpapiere werden aufgelöst'}
              </p>
            </div>
          )}

          {/* === STEP 4: RESOLVE === */}
          {step === 'resolve' && parseResult && (
            <div>
              <div className="mb-4">
                <h3 className="text-base font-medium text-white mb-1">
                  Wertpapiere zuordnen
                </h3>
                <p className="text-sm text-neutral-500">
                  {isinMap.size} von {parseResult.uniqueISINs.length} automatisch erkannt.
                  {unresolvedISINs.length > 0 && ` ${unresolvedISINs.length} ISIN${unresolvedISINs.length !== 1 ? 's' : ''} manuell zuordnen:`}
                </p>
              </div>

              {resolving && (
                <div className="flex items-center gap-3 p-4 bg-neutral-800/30 rounded-xl mb-4">
                  <ArrowPathIcon className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white">Symbole werden aufgelöst...</p>
                    <p className="text-xs text-neutral-500">{isinMap.size}/{parseResult.uniqueISINs.length} gefunden</p>
                  </div>
                </div>
              )}

              {unresolvedISINs.length > 0 && (
                <div>
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
                        Anwenden
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === STEP 5: CASH === */}
          {step === 'cash' && parseResult && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">
                  Cash-Bewegungen
                </h3>
                <p className="text-[13px] text-neutral-500">
                  {resolvedTransactions.filter(t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal').length} Ein-/Auszahlungen in deiner Datei — wie sollen wir damit umgehen?
                </p>
              </div>

              <div className="space-y-2">
                {/* Option A: include */}
                <button
                  onClick={() => setCashMode('include')}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    cashMode === 'include'
                      ? 'border-neutral-600 bg-neutral-900'
                      : 'border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                      cashMode === 'include' ? 'border-white bg-white' : 'border-neutral-600'
                    }`}>
                      {cashMode === 'include' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-950" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-[13px] text-white">Cash übernehmen</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          Empfohlen
                        </span>
                      </div>
                      <p className="text-[12px] text-neutral-400 leading-relaxed">
                        Ein-/Auszahlungen und Zinsen werden importiert, Cash-Position wird automatisch berechnet — so wie im Broker-Depot.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option B: ignore */}
                <button
                  onClick={() => setCashMode('ignore')}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    cashMode === 'ignore'
                      ? 'border-neutral-600 bg-neutral-900'
                      : 'border-neutral-800/80 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/70'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                      cashMode === 'ignore' ? 'border-white bg-white' : 'border-neutral-600'
                    }`}>
                      {cashMode === 'ignore' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-neutral-950" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5">
                        <span className="font-medium text-[13px] text-white">Cash ignorieren</span>
                      </div>
                      <p className="text-[12px] text-neutral-400 leading-relaxed">
                        Nur Käufe, Verkäufe und Dividenden — Cash-Position bleibt unverändert. Sinnvoll, wenn du Cash separat verwaltest.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* === STEP 6: PREVIEW === */}
          {step === 'preview' && importSummary && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Import-Vorschau</h3>
                <p className="text-[13px] text-neutral-500">Prüfe die Zusammenfassung bevor du importierst.</p>
              </div>

              {/* Kennzahlen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-800/80 border border-neutral-800/80 rounded-xl overflow-hidden mb-5">
                <div className="bg-neutral-950 p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Transaktionen</p>
                  <p className="text-white font-semibold text-xl tracking-tight tabular-nums">{importSummary.totalTransactions}</p>
                </div>
                <div className="bg-neutral-950 p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Positionen</p>
                  <p className="text-white font-semibold text-xl tracking-tight tabular-nums">{importSummary.holdings}</p>
                </div>
                <div className="bg-neutral-950 p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Duplikate</p>
                  {checkingDuplicates ? (
                    <div className="flex items-center gap-1.5">
                      <ArrowPathIcon className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
                      <span className="text-neutral-500 text-sm">…</span>
                    </div>
                  ) : (
                    <p className={`font-semibold text-xl tracking-tight tabular-nums ${importSummary.duplicateCount > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
                      {importSummary.duplicateCount}
                    </p>
                  )}
                </div>
                <div className="bg-neutral-950 p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Neu</p>
                  <p className="text-emerald-400 font-semibold text-xl tracking-tight tabular-nums">{importSummary.newTransactions}</p>
                </div>
              </div>

              {/* Reset-Option (nur wenn Portfolio schon Daten hat) */}
              {existingDataCount && (existingDataCount.transactions > 0 || existingDataCount.holdings > 0) && (
                <button
                  onClick={() => setResetBeforeImport(!resetBeforeImport)}
                  className={`w-full mb-3 p-3.5 rounded-xl border text-left transition-all ${
                    resetBeforeImport
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-neutral-800/80 bg-neutral-900/50 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      resetBeforeImport
                        ? 'border-red-500 bg-red-500'
                        : 'border-neutral-600'
                    }`}>
                      {resetBeforeImport && <CheckIcon className="w-3 h-3 text-neutral-950" strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-white">
                        Bestehende Daten vor Import löschen
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                        Dieses Depot enthält bereits <span className="text-neutral-300 tabular-nums">{existingDataCount.transactions}</span> Transaktionen und <span className="text-neutral-300 tabular-nums">{existingDataCount.holdings}</span> Positionen
                        {resetBeforeImport
                          ? <span className="text-red-400"> — werden komplett gelöscht und durch den neuen Import ersetzt (inkl. Cash-Position).</span>
                          : ' — bleiben erhalten, Duplikate werden automatisch übersprungen.'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Cash-Mode Info */}
              <div className="mb-3 p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 flex items-start gap-2.5">
                {importSummary.cashIncluded
                  ? <BanknotesIcon className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                  : <NoSymbolIcon className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-white">
                    {importSummary.cashIncluded ? 'Cash-Bewegungen werden übernommen' : 'Cash wird ignoriert'}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                    {importSummary.cashIncluded
                      ? `${importSummary.cashTxCount} Ein-/Auszahlungen + Zinsen werden importiert, Cash-Position neu berechnet.`
                      : `${importSummary.cashTxCount} Cash-Bewegungen werden übersprungen.`}
                  </p>
                </div>
              </div>

              {/* Stock Splits & Renames Info */}
              {(importSummary.stockSplits.length > 0 || importSummary.tickerRenames.length > 0) && (
                <div className="mb-3 p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <p className="text-[12px] font-medium text-white mb-1.5">
                    Corporate Actions automatisch verarbeitet
                  </p>
                  <ul className="space-y-1 text-[11px] text-neutral-500 leading-relaxed">
                    {importSummary.stockSplits.map((s, i) => (
                      <li key={`split-${i}`} className="flex gap-1.5">
                        <span className="text-neutral-600">·</span>
                        Aktiensplit {s.ratio.toFixed(2).replace(/\.?0+$/, '')}:1 am {s.date} ({s.isin}) — vorherige Trades rückwirkend umgerechnet
                      </li>
                    ))}
                    {importSummary.tickerRenames.map((r, i) => (
                      <li key={`rename-${i}`} className="flex gap-1.5">
                        <span className="text-neutral-600">·</span>
                        Ticker-Umstellung {r.date}: {r.fromIsin} → {r.toIsin} (Ratio {r.ratio.toFixed(4)}) — Einstandskurs übertragen
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transfer-Holdings Warnung */}
              {importSummary.transferHoldings.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-amber-300 mb-1">
                        {importSummary.transferHoldings.length} Position{importSummary.transferHoldings.length !== 1 ? 'en' : ''} via Depotübertrag
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed mb-2">
                        Einstandskurs = Transferkurs (der echte Original-Kaufpreis liegt nicht in der CSV vor). Performance «seit Kauf» ist dadurch oft zu niedrig — du kannst die Einstandskurse nach dem Import manuell korrigieren.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {importSummary.transferHoldings.slice(0, 12).map(h => (
                          <span key={h.symbol} className="text-[10px] font-medium px-1.5 py-0.5 bg-neutral-900 text-neutral-300 border border-neutral-800 rounded">
                            {h.symbol}
                          </span>
                        ))}
                        {importSummary.transferHoldings.length > 12 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-neutral-500">
                            +{importSummary.transferHoldings.length - 12}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Corp-Action-Holdings Warnung (Spin-off ohne klare Kostenbasis) */}
              {importSummary.corpActionHoldings.filter(h => !importSummary.transferHoldings.find(t => t.symbol === h.symbol)).length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80">
                  <div className="flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-white mb-1">
                        Positionen aus Corporate Action
                      </p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                        Aus Splits/Umstellungen/Spin-offs. Bei Spin-offs ist der Einstandskurs nicht eindeutig rekonstruierbar.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {importSummary.corpActionHoldings
                          .filter(h => !importSummary.transferHoldings.find(t => t.symbol === h.symbol))
                          .map(h => (
                          <span key={h.symbol} className="text-[10px] font-medium px-1.5 py-0.5 bg-neutral-900 text-neutral-300 border border-neutral-800 rounded">
                            {h.symbol}{h.avgPrice === 0 ? ' · EK 0' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Duplikat-Warnung */}
              {duplicateCheckDone && importSummary.duplicateCount > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                    <div className="text-[11px] text-neutral-400 flex-1 leading-relaxed">
                      <button
                        onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                        className="flex items-center gap-1 text-[12px] font-medium text-amber-300 mb-0.5 hover:text-amber-200 transition-colors"
                      >
                        {importSummary.duplicateCount} Duplikat{importSummary.duplicateCount !== 1 ? 'e' : ''} erkannt
                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${showDuplicateDetails ? 'rotate-180' : ''}`} />
                      </button>
                      <p>
                        Existieren bereits im Depot und werden übersprungen — nur {importSummary.newTransactions} neue Transaktionen werden importiert.
                      </p>

                      {showDuplicateDetails && duplicateTransactions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-500/10">
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {duplicateTransactions.map((tx, i) => {
                              const typeConfig = TYPE_LABELS[tx.type]
                              return (
                                <div key={i} className="flex items-center justify-between py-1 px-2 bg-neutral-900/50 rounded text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-neutral-600 shrink-0">{tx.date}</span>
                                    <span className={`shrink-0 ${typeConfig?.color || 'text-neutral-400'}`}>{typeConfig?.label || tx.type}</span>
                                    <span className="text-white font-medium shrink-0">{tx.symbol}</span>
                                    <span className="text-neutral-500 truncate">{tx.name}</span>
                                  </div>
                                  <span className="text-neutral-400 shrink-0 ml-2">
                                    {tx.quantity > 0 ? `${tx.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.` : ''}
                                    {tx.totalValue > 0 ? ` ${tx.totalValue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}` : ''}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Typ-Verteilung */}
              <div className="mb-4">
                <h5 className="text-[11px] font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Nach Typ</h5>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(importSummary.byType).map(([type, count]) => {
                    const config = TYPE_LABELS[type]
                    return (
                      <span key={type} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-900 border border-neutral-800 text-neutral-300">
                        {config?.label || type} <span className="text-neutral-500 ml-0.5 tabular-nums">{count}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Holdings Vorschau */}
              {previewHoldings.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-[11px] font-semibold text-neutral-500 mb-2 uppercase tracking-wider">
                    Resultierende Positionen <span className="text-neutral-600 ml-0.5 tabular-nums">({previewHoldings.length})</span>
                  </h5>
                  <div className="max-h-60 overflow-y-auto border border-neutral-800/80 rounded-xl overflow-hidden">
                    {previewHoldings.sort((a, b) => (b.quantity * b.avgPrice) - (a.quantity * a.avgPrice)).map(h => (
                      <div key={h.symbol} className="flex items-center justify-between py-2.5 px-3.5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white text-[13px]">{h.symbol}</span>
                            {h.fromTransfer && (
                              <span className="text-[9px] font-medium px-1 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded" title="Einstandskurs basiert auf Depotübertrag">
                                Transfer
                              </span>
                            )}
                            {h.fromCorpAction && !h.fromTransfer && (
                              <span className="text-[9px] font-medium px-1 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded" title="Aus Corporate Action">
                                Corp. Act.
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate max-w-[320px] mt-0.5">{h.name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[13px] text-white tabular-nums">{h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 3 })}</p>
                          <p className="text-[11px] text-neutral-500 tabular-nums">Ø {formatCurrency(h.avgPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-[12px] text-red-400">{importError}</p>
                </div>
              )}
            </div>
          )}

          {/* === STEP: IMPORTING === */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-neutral-400 animate-spin mx-auto mb-4" />
              <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Import läuft…</h3>
              <p className="text-[13px] text-neutral-500 tabular-nums">
                {importProgress.current} / {importProgress.total} Transaktionen
              </p>
              <div className="mt-4 max-w-xs mx-auto bg-neutral-800/60 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-white h-1 rounded-full transition-all duration-300"
                  style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* === STEP 7: DONE === */}
          {step === 'done' && importResult && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <CheckIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Import abgeschlossen</h3>
                <p className="text-[13px] text-neutral-500">
                  Dein Depot wurde erfolgreich aktualisiert.
                </p>
              </div>

              {/* Ergebnis-Breakdown */}
              <div className="rounded-xl border border-neutral-800/80 overflow-hidden mb-4">
                <div className="flex items-center justify-between py-2.5 px-4 bg-neutral-900/40">
                  <span className="text-[13px] text-neutral-400">Transaktionen gespeichert</span>
                  <span className="text-[13px] font-semibold text-white tabular-nums">
                    {importResult.transactionsSaved} <span className="text-neutral-500 font-normal">/ {importResult.transactionsAttempted}</span>
                  </span>
                </div>

                {importResult.duplicatesSkipped > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-neutral-800/80">
                    <span className="text-[13px] text-neutral-400">Duplikate übersprungen</span>
                    <span className="text-[13px] font-semibold text-amber-400 tabular-nums">{importResult.duplicatesSkipped}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5 px-4 border-t border-neutral-800/80">
                  <span className="text-[13px] text-neutral-400">Positionen neu erstellt</span>
                  <span className="text-[13px] font-semibold text-white tabular-nums">{importResult.holdingsCreated}</span>
                </div>

                {importResult.holdingsUpdated > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-neutral-800/80">
                    <span className="text-[13px] text-neutral-400">Positionen aufgestockt</span>
                    <span className="text-[13px] font-semibold text-white tabular-nums">{importResult.holdingsUpdated}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5 px-4 border-t border-neutral-800/80">
                  <span className="text-[13px] text-neutral-400">
                    {importResult.cashMode === 'include' ? 'Cash-Bewegungen' : 'Cash ignoriert'}
                  </span>
                  <span className={`text-[13px] font-semibold tabular-nums ${importResult.cashMode === 'include' ? 'text-white' : 'text-neutral-500'}`}>
                    {importResult.cashMode === 'include' ? importResult.cashTransactionsImported : '—'}
                  </span>
                </div>

                {importResult.unresolvedSymbols > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-neutral-800/80">
                    <span className="text-[13px] text-amber-400">Nicht zugeordnet</span>
                    <span className="text-[13px] font-semibold text-amber-400 tabular-nums">{importResult.unresolvedSymbols}</span>
                  </div>
                )}
              </div>

              {/* Status-Hinweis */}
              {importResult.transactionsSaved < importResult.transactionsAttempted - importResult.duplicatesSkipped ? (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-neutral-400 leading-relaxed">
                    Nicht alle Transaktionen konnten gespeichert werden. Prüfe dein Depot und wiederhole ggf. den Import.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 flex gap-2.5">
                  <CheckIcon className="w-4 h-4 text-neutral-300 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-neutral-400 leading-relaxed">
                    Alle Transaktionen erfolgreich importiert. Dein Depot ist jetzt bereit.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-neutral-800 flex-shrink-0">
          <div>
            {step === 'instructions' && (
              <button
                onClick={() => setStep('broker')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            {step === 'upload' && (
              <button
                onClick={() => setStep('instructions')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            {step === 'resolve' && (
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            {step === 'cash' && (
              <button
                onClick={() => setStep(unresolvedISINs.length > 0 ? 'resolve' : 'upload')}
                className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            {step === 'preview' && (
              <button
                onClick={() => setStep('cash')}
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

            {/* Step 2 → Step 3 */}
            {step === 'instructions' && (
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                Datei hochladen
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Step Resolve → Cash */}
            {step === 'resolve' && (
              <button
                onClick={() => { setStep('cash') }}
                disabled={resolving}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                Weiter
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Step Cash → Preview */}
            {step === 'cash' && (
              <button
                onClick={() => { setStep('preview'); setPendingDuplicateCheck(true) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                Vorschau
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Step Preview → Import */}
            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={importing || !importSummary || importSummary.totalTransactions === 0 || checkingDuplicates}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                {importing ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                )}
                Jetzt importieren
              </button>
            )}

            {/* Step Done */}
            {step === 'done' && (
              <button
                onClick={() => { handleClose(); onImportComplete() }}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Fertig
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
