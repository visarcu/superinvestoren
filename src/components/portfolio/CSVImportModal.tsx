// src/components/portfolio/CSVImportModal.tsx
// Multi-Step Import Wizard nach Parqet-Stil:
//   Broker auswählen → Anleitung → Upload → Cash-Handling → Vorschau → Import → Fertig
// Unterstützt: Scalable Capital / Trade Republic / finanzen.net zero / Trading 212 (CSV),
//              Trade Republic / Flatex / Smartbroker+ (PDF), Freedom24 (XLSX)
'use client'

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { reconstructHoldings, type ParsedTransaction, type CSVParseResult, type StockSplit, type TickerRename } from '@/lib/scalableCSVParser'
import { POSITION_TX_TYPES, loadAllRows, reconcileHoldings } from '@/lib/portfolioReconcile'
import { resolveISINsLocally } from '@/lib/isinResolver'
import { compareWithDepot, type DepotComparison } from '@/lib/duplicateCheck'
import { adoptSplits, summarizeDepotSplits, type DepotSplitSummary } from '@/lib/depotSplits'
import { hasSplitApplied, appendSplitNote } from '@/lib/splitAdjustment'
import { findDepotSymbols, type DepotSymbol, type StoredTransaction } from '@/lib/depotSymbols'
import { applyIsinChanges, planIsinChanges } from '@/lib/isinChange'
import {
  NAME_MAX_LENGTH,
  describeValidationIssues,
  validateImportRows,
  validateManualSymbol,
} from '@/lib/importValidation'
import {
  detectSpinoffEvents,
  hasSpinoffBasisTaken,
  isSpinoffChildTransfer,
  planSpinoffCostSplit,
  valueBeforeSpinoff,
  type SpinoffEvent,
} from '@/lib/spinoffAdjustment'
import type { FlatexParsedTransaction } from '@/lib/flatexPDFParser'
import {
  COLUMN_FIELDS,
  COLUMN_IMPORT_FORMAT,
  KIND_LABELS,
  KIND_TYPES,
  guessKindAssignments,
  kindsFromAssignments,
  splitKindWords,
  validateColumnMapping,
  type ColumnField,
  type ColumnKindType,
  type ColumnKinds,
  type ColumnMapping,
  type ColumnTablePreview,
} from '@/lib/columnImport'
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
  | 'columns'
  | 'resolve'
  | 'cash'
  | 'preview'
  | 'importing'
  | 'done'

type CashMode = 'include' | 'ignore'

// Schlusskurs am Übertragstag aus /api/portfolio/historical-prices: eur ist
// der Einstandskurs, close/currency der Börsenkurs dahinter (für die Note).
interface TransferPrice {
  eur: number
  close: number
  currency: string
}

// Transaktion nach ISIN-Auflösung. estimatedTransferPrice: Der Preis stammt
// nicht aus der Datei, sondern ist der geschätzte Schlusskurs (siehe oben).
type ResolvedTransaction = ParsedTransaction & { estimatedTransferPrice?: boolean }

function splitTitle({ ratio, date, symbol }: { ratio: number; date: string; symbol: string }): string {
  return `Aktiensplit ${ratio.toFixed(2).replace(/\.?0+$/, '')}:1 am ${date} (${symbol})`
}

function adoptedSplitText(split: DepotSplitSummary): string {
  return [
    `${splitTitle(split)}: ${split.redundant > 0
      ? 'in den Buchungen davor verrechnet, die Split-Buchung der Datei entfällt'
      : 'in der Datei nicht genannt'}`,
    split.adopted > 0 &&
      `${split.adopted === 1 ? '1 neue Buchung davor wird' : `${split.adopted} neue Buchungen davor werden`} umgerechnet, der Betrag bleibt`,
  ].filter(Boolean).join('. ')
}

function unclearSplitText(split: DepotSplitSummary): string {
  const rows = split.unclear === 1 ? '1 neue Buchung bleibt' : `${split.unclear} neue Buchungen bleiben`
  return `${splitTitle(split)}: Die Datei nennt den Split nicht, und ob sie schon die neue Stückzahl enthält, ist nicht erkennbar. ${rows} unverändert. Bitte die Stückzahl prüfen.`
}

const SPLITS_INCOMPLETE_TEXT =
  'Aktiensplits ließen sich nicht für alle Papiere prüfen. Nennt die Datei einen Split nicht, bleiben Buchungen davor auf der alten Stückzahl.'

const NOT_SIGNED_IN_TEXT = 'Nicht angemeldet. Bitte neu einloggen.'

/**
 * ISIN-Auflösung auf dem Server. Ohne gültige Sitzung null: Dann muss der Import
 * das melden und darf nicht still auf die lokalen Tabellen ausweichen, die zu
 * einer ISIN nur den deutschen Ticker kennen.
 */
async function requestIsinResolution(body: {
  isins: string[]
  tickers?: Record<string, string>
  renames?: { fromIsin: string; toIsin: string }[]
}): Promise<Response | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  const response = await fetch('/api/portfolio/resolve-isins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  })
  return response.status === 401 ? null : response
}

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
  { key: ['upload', 'processing', 'columns', 'resolve'], label: 'Upload' },
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
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({})
  // Alte ISINs ohne handelbares Kürzel, deren Nachfolger dasselbe Papier ist
  const [confirmedIsinChanges, setConfirmedIsinChanges] = useState<string[]>([])
  // Gespeicherte Buchungen des Depots, geladen sobald die Datei ISINs enthält.
  // null = noch nicht geladen.
  const [storedTransactions, setStoredTransactions] = useState<StoredTransaction[] | null>(null)
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfErrors, setPdfErrors] = useState<string[]>([])
  // Was die Datei nicht hergibt (z.B. Ausschüttungsbeträge bei Flatex)
  const [importNotices, setImportNotices] = useState<string[]>([])
  // Wo vermutlich Buchungen fehlen (z.B. Flatex-Export an der Zeilengrenze)
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  // Historische Schlusskurse für transfer_in/out-Transaktionen (Key: "SYMBOL|YYYY-MM-DD")
  // ING-Depotüberträge haben keinen Einstandskurs — hier ziehen wir den Tagesschlusskurs.
  const [transferPrices, setTransferPrices] = useState<Record<string, TransferPrice>>({})
  const [fetchingTransferPrices, setFetchingTransferPrices] = useState(false)

  // === Spalten-Import (Tabelle ohne eigenen Parser) ===
  // Kopf und Beispielzeilen vom Server; die Datei bleibt für den zweiten Upload
  // mit der Zuordnung hier liegen.
  const [columnTable, setColumnTable] = useState<ColumnTablePreview | null>(null)
  const [columnFile, setColumnFile] = useState<File | null>(null)
  const [columnAssignments, setColumnAssignments] = useState<Partial<Record<ColumnField, number>>>({})
  // Je Wert der Art-Spalte: Kauf, Verkauf, Dividende oder überspringen
  const [kindAssignments, setKindAssignments] = useState<Record<string, ColumnKindType | 'ignore'>>({})
  // Freitext, wenn die Art-Spalte zu viele verschiedene Werte hat
  const [kindWordText, setKindWordText] = useState<Record<ColumnKindType, string>>({ buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende' })
  const [columnBusy, setColumnBusy] = useState(false)
  const [columnError, setColumnError] = useState<string | null>(null)
  // KI-Vorschlag: nur sichtbar, wenn der Server ihn für diesen Nutzer freigibt,
  // und nur auf ausdrücklichen Wunsch (Opt-in). Datenschutzerklärung ergänzen,
  // bevor er für alle sichtbar wird (siehe lib/ai/columnMapping.ts).
  const [aiSuggestAvailable, setAiSuggestAvailable] = useState(false)
  const [aiOptIn, setAiOptIn] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiSuggested, setAiSuggested] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

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
    corpActionWarnings: string[]
    holdingWarnings: string[]
    estimatedCosts: { symbol: string; date: string; price: number }[]
  } | null>(null)

  // === Duplikate ===
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set())
  // Splits, die den Buchungen der Datei fehlen. `source`: die geprüften Buchungen,
  // auf deren Reihenfolge sich `comparison` bezieht.
  const [splitCheck, setSplitCheck] = useState<{
    source: ResolvedTransaction[]
    comparison: DepotComparison
    summary: DepotSplitSummary[]
  } | null>(null)
  const duplicateCheckRun = useRef(0)
  const [duplicateCheckDone, setDuplicateCheckDone] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [pendingDuplicateCheck, setPendingDuplicateCheck] = useState(false)

  // === UI State ===
  const [showSkippedDetails, setShowSkippedDetails] = useState(false)
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const autoInputRef = useRef<HTMLInputElement>(null)
  // Buchungen gespeichert, aber Bestände und Cash noch nicht abgeschlossen
  const unfinishedImportRef = useRef(false)

  // === Reset-Feature: existierende Portfolio-Daten ===
  const [existingDataCount, setExistingDataCount] = useState<{ transactions: number; holdings: number } | null>(null)
  const [resetBeforeImport, setResetBeforeImport] = useState(false)

  // Prüfe existierende Daten im Portfolio (beim Öffnen des Modals und nach
  // einem gescheiterten Import, der schon etwas geschrieben haben kann)
  const [existingDataVersion, setExistingDataVersion] = useState(0)
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
  }, [isOpen, portfolioId, existingDataVersion])

  // Unter welchem Kürzel das Depot die Papiere der Datei schon führt, zeigt erst
  // ein Blick in seine Buchungen (depotSymbols.ts, isinChange.ts).
  const loadStoredTransactions = useCallback(async (): Promise<StoredTransaction[]> => {
    const { data, error } = await loadAllRows<StoredTransaction>((from, to) =>
      supabase
        .from('portfolio_transactions')
        .select('type, symbol, date, quantity, price, notes')
        .eq('portfolio_id', portfolioId)
        .order('id', { ascending: true })
        .range(from, to)
    )
    if (error) throw new Error(`Buchungen des Depots nicht lesbar (${error.message})`)
    return data
  }, [portfolioId])

  // Zeilen mit eigenem Kürzel (Trading 212, CASH) brauchen keine Zuordnung
  const needsDepotSymbols = useMemo(
    () => !!parseResult?.transactions.some(tx => tx.isin && !tx.symbol),
    [parseResult]
  )
  React.useEffect(() => {
    if (!isOpen || !portfolioId || !parseResult || !needsDepotSymbols) return
    let cancelled = false
    setStoredTransactions(null)
    loadStoredTransactions()
      .then(rows => {
        if (cancelled) return
        setStoredTransactions(rows)
        setPendingDuplicateCheck(true)
      })
      // Ohne diese Daten bricht handleImport ab, bevor es etwas schreibt
      .catch(error => console.error('Kürzel des Depots:', error))
    return () => { cancelled = true }
  }, [isOpen, portfolioId, parseResult, needsDepotSymbols, existingDataVersion, loadStoredTransactions])

  // Papiere, die das Depot unter einem anderen Kürzel führt als heute aufgelöst.
  // Nach einem Löschen gibt es nichts, woran sich der Import halten müsste.
  const depotSymbols = useMemo(() => {
    if (!parseResult || !storedTransactions || resetBeforeImport) return new Map<string, DepotSymbol>()
    return findDepotSymbols({
      transactions: parseResult.transactions,
      symbolOf: isin => isinMap.get(isin),
      stored: storedTransactions,
      renames: parseResult.tickerRenames,
    })
  }, [parseResult, storedTransactions, resetBeforeImport, isinMap])

  const symbolOfIsin = useCallback(
    (isin: string): { symbol: string; name: string } | undefined => {
      const resolved = isinMap.get(isin)
      const stored = depotSymbols.get(isin)?.stored
      return resolved && stored ? { ...resolved, symbol: stored } : resolved
    },
    [isinMap, depotSymbols]
  )

  const isinChangePlans = useMemo(() => {
    if (!parseResult?.tickerRenames?.length) return []
    if (!resetBeforeImport && storedTransactions === null) return []
    return planIsinChanges({
      transactions: parseResult.transactions,
      renames: parseResult.tickerRenames,
      splits: parseResult.stockSplits,
      symbolOf: symbolOfIsin,
      confirmed: new Set(confirmedIsinChanges),
      stored: resetBeforeImport ? [] : storedTransactions || [],
    })
  }, [parseResult, symbolOfIsin, confirmedIsinChanges, storedTransactions, resetBeforeImport])

  /** Kürzel einer ISIN, unter dem ihre Buchungen im Depot laufen. */
  const symbolForIsin = useCallback(
    (isin: string): string | undefined =>
      isinChangePlans.find(p => p.rename.fromIsin === isin)?.symbol ?? symbolOfIsin(isin)?.symbol,
    [isinChangePlans, symbolOfIsin]
  )

  // Buchungen der Datei mit Kürzel, ISIN-Umstellungen umgesetzt
  const symbolTransactions = useMemo((): ParsedTransaction[] => {
    if (!parseResult) return []
    const withSymbols = parseResult.transactions.map(tx => {
      if (tx.symbol) return tx
      const res = symbolOfIsin(tx.isin)
      return res ? { ...tx, symbol: res.symbol, name: res.name || tx.name } : tx
    })
    return applyIsinChanges(withSymbols, isinChangePlans, parseResult.stockSplits)
  }, [parseResult, symbolOfIsin, isinChangePlans])

  // Nach ISIN-Resolution: historische Schlusskurse für Transfer-Transaktionen
  // (ohne Einstandspreis) fetchen. Pro Symbol ein FMP-Call mit Range.
  React.useEffect(() => {
    if (!parseResult || isinMap.size === 0) return
    // Alle Transfer-Transaktionen finden, die noch keinen Preis haben
    const needsPrice: Array<{ symbol: string; date: string }> = []
    const seen = new Set<string>()
    for (const tx of symbolTransactions) {
      if (!tx.isFromTransfer) continue
      if (tx.price > 0) continue
      if (!tx.date) continue
      const symbol = tx.symbol
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
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const resp = await fetch('/api/portfolio/historical-prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ items: needsPrice }),
        })
        if (!resp.ok) return
        const { results, details } = await resp.json() as {
          results: Record<string, number>
          details?: Record<string, { close: number; currency: string }>
        }
        if (cancelled || !results) return
        const fetched: Record<string, TransferPrice> = {}
        for (const [key, eur] of Object.entries(results)) {
          fetched[key] = { eur, close: details?.[key]?.close ?? eur, currency: details?.[key]?.currency ?? 'EUR' }
        }
        setTransferPrices(prev => ({ ...prev, ...fetched }))
      } finally {
        if (!cancelled) setFetchingTransferPrices(false)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseResult, isinMap, symbolTransactions])

  // === Reset ===
  const resetState = useCallback(() => {
    setStep('broker')
    setSelectedBroker(null)
    setCashMode('include')
    setParseResult(null)
    setIsinMap(new Map())
    setUnresolvedISINs([])
    setResolving(false)
    setResolveError(null)
    setTransferPrices({})
    setFetchingTransferPrices(false)
    setImporting(false)
    setImportProgress({ current: 0, total: 0 })
    setImportError(null)
    setImportResult(null)
    setManualMappings({})
    setConfirmedIsinChanges([])
    setStoredTransactions(null)
    setDuplicateIndices(new Set())
    setSplitCheck(null)
    setDuplicateCheckDone(false)
    setCheckingDuplicates(false)
    setShowSkippedDetails(false)
    setShowDuplicateDetails(false)
    setPdfParsing(false)
    setPdfErrors([])
    setImportNotices([])
    setImportWarnings([])
    setDetectedFormat(null)
    setIsDragOver(false)
    setPendingDuplicateCheck(false)
    setResetBeforeImport(false)
    setColumnTable(null)
    setColumnFile(null)
    setColumnAssignments({})
    setKindAssignments({})
    setKindWordText({ buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende' })
    setColumnBusy(false)
    setColumnError(null)
    setAiSuggestAvailable(false)
    setAiOptIn(false)
    setAiSuggesting(false)
    setAiSuggested(false)
    setAiNote(null)
    setAiError(null)
    unfinishedImportRef.current = false
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
    brokerTickers: Record<string, string> = {},
    renames: TickerRename[] = [],
  ) => {
    setConfirmedIsinChanges([])
    if (uniqueISINs.length === 0) {
      // Keine ISINs → direkt zu Cash-Step
      setStep('cash')
      setPendingDuplicateCheck(true)
      return
    }

    const newMap = new Map<string, { symbol: string; name: string; source: string }>()

    // Zuerst der Instrumenten-Stammsatz auf dem Server: Er kennt zu jeder ISIN
    // alle Notierungen und wählt anhand des Broker-Tickers die richtige.
    // Die lokalen Tabellen liefen früher zuerst — und die kennen zu einer ISIN
    // nur den deutschen Ticker. Genau daher kam CEBJ.DE statt CSKR.EU.
    setMap(newMap)
    setResolving(true)
    setResolveError(null)
    try {
      const resp = await requestIsinResolution({
        isins: uniqueISINs,
        tickers: brokerTickers,
        renames: renames.map(({ fromIsin, toIsin }) => ({ fromIsin, toIsin })),
      })
      if (!resp) {
        setImportError(NOT_SIGNED_IN_TEXT)
        setStep('upload')
        return
      }
      if (resp.ok) {
        const { results, isinChanges } = await resp.json()
        setConfirmedIsinChanges(Array.isArray(isinChanges) ? isinChanges : [])
        const stillUnresolved: string[] = []
        for (const isin of uniqueISINs) {
          if (results[isin]) {
            newMap.set(isin, { symbol: results[isin].symbol, name: results[isin].name, source: results[isin].source || 'openfigi' })
          } else {
            stillUnresolved.push(isin)
          }
        }

        // Rest über die lokalen Tabellen — besser ein deutscher Ticker als keiner.
        const { resolved } = resolveISINsLocally(stillUnresolved)
        const unresolvedAfterLocal: string[] = []
        for (const isin of stillUnresolved) {
          const local = resolved.get(isin)
          if (local) newMap.set(isin, { symbol: local.symbol, name: local.name, source: local.source })
          else unresolvedAfterLocal.push(isin)
        }

        setMap(new Map(newMap))
        setUnresolvedISINs(unresolvedAfterLocal)
        if (unresolvedAfterLocal.length === 0) {
          setStep('cash')
          setPendingDuplicateCheck(true)
        } else {
          setStep('resolve')
        }
      } else {
        throw new Error(`Auflösung fehlgeschlagen (${resp.status})`)
      }
    } catch {
      // Server nicht erreichbar → lokale Tabellen als Notnagel.
      const { resolved, unresolved } = resolveISINsLocally(uniqueISINs)
      resolved.forEach((value, key) => {
        newMap.set(key, { symbol: value.symbol, name: value.name, source: value.source })
      })
      setMap(new Map(newMap))
      setUnresolvedISINs(unresolved)
      if (unresolved.length === 0) {
        setStep('cash')
        setPendingDuplicateCheck(true)
      } else {
        setStep('resolve')
      }
    } finally {
      setResolving(false)
    }
  }, [])

  // Antwort eines Parsers (import-auto oder import-columns) in den Wizard
  // übernehmen: Transaktionen vereinheitlichen, ISINs auflösen, weiter zu Cash
  // und Vorschau. Der Spalten-Import nutzt denselben Weg wie jede andere Datei.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adoptServerResult = useCallback(async (data: any) => {
    if (data.errors?.length > 0) setPdfErrors(data.errors)
    setImportNotices((data.notices as string[] | undefined) || [])
    setImportWarnings((data.warnings as string[] | undefined) || [])

    if (!data.transactions || data.transactions.length === 0) {
      setImportError('Keine Transaktionen erkannt. Bitte prüfe Dateiformat und Inhalt.')
      return
    }

    setDetectedFormat(data.formatLabel)

    // Warnung wenn Broker-Format nicht zur Auswahl passt
    if (selectedBroker && selectedBroker.id !== 'other' && data.format !== COLUMN_IMPORT_FORMAT) {
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

    if (
      data.format === 'scalable' ||
      data.format === 'zero' ||
      data.format === 'trading212' ||
      data.format === 'traderepublic_csv'
    ) {
      // Alle CSV-Parser liefern bereits ParsedTransaction[]
      parsedTransactions = data.transactions as ParsedTransaction[]
      uniqueISINs = (data.uniqueISINs as string[]) || []
    } else {
      // Typ-Erweiterung für PDF/XLSX-Parser die auch Transfer- und Cash-Typen
      // liefern (z.B. ING-Überträge, Freedom24 Spin-offs + Banküberweisungen)
      const txs = data.transactions as (Omit<FlatexParsedTransaction, 'type'> & {
        type: FlatexParsedTransaction['type'] | 'transfer_in' | 'transfer_out' | 'cash_deposit' | 'cash_withdrawal'
        isFromTransfer?: boolean
        corpActionType?: 'spinoff'
        fromIsin?: string
      })[]
      // Spalten-Import ohne ISIN: WKN oder Name sind der Schlüssel, unter dem der
      // Nutzer das Papier im Schritt "Wertpapiere zuordnen" einem Kürzel zuordnet.
      const keyOf = (tx: { isin: string; wkn: string; name: string }): string =>
        tx.isin || (data.format === COLUMN_IMPORT_FORMAT ? tx.wkn || tx.name : '')
      // Split-ISINs mit auflösen: bei einem Split ohne Trades in derselben
      // Datei (z.B. Freedom24-Report nur mit Corpactions) brauchen wir das
      // Symbol trotzdem, um Alt-Transaktionen in der DB anzupassen.
      const splitIsins = ((data.stockSplits as StockSplit[] | undefined) || []).map(s => s.isin)
      // Quell-ISINs von Spin-offs ebenfalls auflösen — für die anteilige
      // Übertragung der Kostenbasis von der Mutterposition
      const spinoffFromIsins = txs.map(t => t.fromIsin).filter((v): v is string => !!v)
      uniqueISINs = [...new Set([...txs.map(keyOf), ...splitIsins, ...spinoffFromIsins].filter(Boolean))]
      parsedTransactions = txs.map(tx => {
        const isCash = tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
        const key = keyOf(tx)
        return {
          date: tx.date,
          type: tx.type,
          isin: isCash ? '' : key,
          // Cash-Bewegungen laufen unter dem Pseudo-Symbol CASH; sonst:
          // wenn keine ISIN vorhanden (z.B. Freedom24 Trades), Ticker als Symbol
          symbol: isCash ? 'CASH' : key ? '' : tx.name,
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
          corpActionType: tx.corpActionType,
          fromIsin: tx.fromIsin,
        }
      })
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
      // Erkannte Corporate Actions (TR/Scalable CSV + Freedom24 Handelsbericht):
      // In-File-Transaktionen sind bereits angepasst; beim Import werden die
      // Splits zusätzlich auf bereits gespeicherte DB-Daten angewendet.
      stockSplits: (data.stockSplits as StockSplit[] | undefined) || [],
      tickerRenames: (data.tickerRenames as TickerRename[] | undefined) || [],
    })

    setStep('processing')

    // Broker-Ticker je ISIN mitgeben. Die Handelsberichte tragen ihn im
    // Namensfeld ('IREN.US', 'CSKR.EU') — daran erkennt der Stammsatz, welche
    // Notierung gemeint ist. Ohne ihn bliebe nur Raten.
    const brokerTickers: Record<string, string> = {}
    for (const tx of parsedTransactions) {
      const isin = tx.isin
      const candidate = String(tx.name || '').trim()
      if (!isin || brokerTickers[isin]) continue
      // Nur echte Ticker übernehmen, keine Firmennamen ("IREN LTD").
      if (/^[A-Z0-9]{1,8}(\.[A-Z]{1,4})?$/.test(candidate)) {
        brokerTickers[isin] = candidate
      }
    }

    await runISINResolve(
      uniqueISINs,
      setIsinMap,
      brokerTickers,
      (data.tickerRenames as TickerRename[] | undefined) || []
    )
  }, [runISINResolve, selectedBroker])

  // Unbekanntes Format mit lesbarer Tabelle: in den Zuordnungsschritt wechseln,
  // Spalten nach den Kopfzeilen vorbelegen.
  const startColumnMapping = useCallback((table: ColumnTablePreview, file: File, aiAvailable: boolean) => {
    setColumnTable(table)
    setColumnFile(file)
    setAiSuggestAvailable(aiAvailable)
    setColumnAssignments(table.suggestedColumns)
    const kindColumn = table.suggestedColumns.kind
    const kindValues = kindColumn != null ? table.distinctValues[kindColumn] : undefined
    setKindAssignments(kindValues ? guessKindAssignments(kindValues) : {})
    setKindWordText({ buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende' })
    setColumnError(null)
    setAiOptIn(false)
    setAiSuggesting(false)
    setAiSuggested(false)
    setAiNote(null)
    setAiError(null)
    setStep('columns')
  }, [])

  const handleAutoUpload = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return

    setPdfParsing(true)
    setPdfErrors([])
    setImportNotices([])
    setImportWarnings([])
    setImportError(null)
    setDetectedFormat(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setImportError(NOT_SIGNED_IN_TEXT)
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

      // Unbekanntes Format, aber eine lesbare Tabelle: Der Nutzer ordnet die
      // Spalten selbst zu (Spalten-Import), danach läuft alles wie gewohnt.
      if ((!data.transactions || data.transactions.length === 0) && data.table) {
        startColumnMapping(data.table as ColumnTablePreview, fileArr[0], data.aiSuggestAvailable === true)
        return
      }

      await adoptServerResult(data)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      setImportError(`Upload fehlgeschlagen: ${msg}`)
    } finally {
      setPdfParsing(false)
      if (autoInputRef.current) autoInputRef.current.value = ''
    }
  }, [adoptServerResult, startColumnMapping])

  // ======================================================================
  // STEP 3b: Spalten zuordnen (Tabelle ohne eigenen Parser)
  // ======================================================================
  // Zuordnung, wie die Route sie erwartet: Spaltenindizes plus die Wörter der
  // Art-Spalte je Buchungsart
  const columnMapping = useMemo((): ColumnMapping | null => {
    if (!columnTable) return null
    const columns: ColumnMapping['columns'] = {}
    for (const [field, index] of Object.entries(columnAssignments) as [ColumnField, number | undefined][]) {
      if (index != null) columns[field] = index
    }
    const kindColumn = columns.kind
    const kindValues = kindColumn != null ? columnTable.distinctValues[kindColumn] : undefined
    let kinds: ColumnKinds = { buy: [], sell: [], dividend: [] }
    if (kindColumn != null) {
      kinds = kindValues
        ? kindsFromAssignments(kindAssignments)
        : { buy: splitKindWords(kindWordText.buy), sell: splitKindWords(kindWordText.sell), dividend: splitKindWords(kindWordText.dividend) }
    }
    return { columns, kinds }
  }, [columnTable, columnAssignments, kindAssignments, kindWordText])

  const columnMappingError = useMemo(
    () => (columnTable && columnMapping ? validateColumnMapping(columnMapping, columnTable.header.length) : null),
    [columnTable, columnMapping]
  )

  const assignColumn = useCallback((field: ColumnField, value: string) => {
    const index = value === '' ? undefined : Number(value)
    setColumnAssignments(prev => {
      const next = { ...prev }
      // Eine Spalte gehört zu höchstens einem Feld
      if (index != null) {
        for (const key of Object.keys(next) as ColumnField[]) {
          if (next[key] === index) delete next[key]
        }
        next[field] = index
      } else {
        delete next[field]
      }
      return next
    })
    if (field === 'kind') {
      const values = index != null ? columnTable?.distinctValues[index] : undefined
      setKindAssignments(values ? guessKindAssignments(values) : {})
    }
    setColumnError(null)
  }, [columnTable])

  // Vorschlag der KI holen. Der Nutzer hat zugestimmt (aiOptIn); gesendet werden
  // Kopfzeile, Beispielzeilen und Wertelisten, der Server bereinigt sie noch einmal.
  const requestAiSuggestion = useCallback(async () => {
    if (!columnTable || !aiOptIn) return
    setAiSuggesting(true)
    setAiError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setAiError('Nicht angemeldet. Bitte neu einloggen.')
        return
      }
      const response = await fetch('/api/portfolio/import-columns/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          header: columnTable.header,
          sampleRows: columnTable.sampleRows,
          distinctValues: columnTable.distinctValues,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setAiError(data.error || 'Der Vorschlag ist gerade nicht möglich.')
        return
      }
      const mapping = data.mapping as ColumnMapping
      setColumnAssignments(mapping.columns)
      const kindColumn = mapping.columns.kind
      const kindValues = kindColumn != null ? columnTable.distinctValues[kindColumn] : undefined
      if (kindValues) {
        const assignments: Record<string, ColumnKindType | 'ignore'> = {}
        for (const value of kindValues) {
          const type = KIND_TYPES.find(t => mapping.kinds[t].some(word => word.toLowerCase() === value.toLowerCase()))
          assignments[value] = type ?? 'ignore'
        }
        setKindAssignments(assignments)
      } else {
        setKindWordText({ buy: mapping.kinds.buy.join(', '), sell: mapping.kinds.sell.join(', '), dividend: mapping.kinds.dividend.join(', ') })
      }
      setAiNote(typeof data.note === 'string' && data.note ? data.note : null)
      setAiSuggested(true)
      setColumnError(null)
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : 'Der Vorschlag ist gerade nicht möglich.')
    } finally {
      setAiSuggesting(false)
    }
  }, [columnTable, aiOptIn])

  // Datei und Zuordnung an den Server, Antwort wie bei jedem anderen Parser übernehmen
  const handleColumnImport = useCallback(async () => {
    if (!columnFile || !columnMapping || columnMappingError) return
    setColumnBusy(true)
    setColumnError(null)
    setImportError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setColumnError('Nicht angemeldet. Bitte neu einloggen.')
        return
      }
      const formData = new FormData()
      formData.append('file', columnFile)
      formData.append('mapping', JSON.stringify(columnMapping))
      const response = await fetch('/api/portfolio/import-columns', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setColumnError(data.error || 'Die Datei konnte nicht gelesen werden.')
        return
      }
      if (!data.transactions || data.transactions.length === 0) {
        const reasons = [...((data.errors as string[] | undefined) || []), ...((data.notices as string[] | undefined) || [])]
        setColumnError(reasons.length > 0 ? reasons.join(' ') : 'Mit dieser Zuordnung ergibt sich keine Buchung. Bitte prüfe Datum, Stückzahl und Kurs.')
        return
      }
      await adoptServerResult(data)
    } catch (error: unknown) {
      setColumnError(`Lesen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    } finally {
      setColumnBusy(false)
    }
  }, [columnFile, columnMapping, columnMappingError, adoptServerResult])

  // ======================================================================
  // STEP 4: ISIN Resolution
  // ======================================================================
  const resolveViaAPI = useCallback(async () => {
    if (unresolvedISINs.length === 0) return

    setResolving(true)
    setResolveError(null)
    try {
      const response = await requestIsinResolution({ isins: unresolvedISINs })
      if (!response) {
        setResolveError(NOT_SIGNED_IN_TEXT)
        return
      }

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
      // Ungültige Eingaben (ISIN, > 10 Zeichen) nicht übernehmen: Das Symbol
      // landet in portfolio_transactions.symbol (varchar(10)). Am 09.08. brach
      // daran ein TR-Import nach 550 von 710 Buchungen ab.
      if (manual && manual.trim() && !validateManualSymbol(manual)) {
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
  const resolvedTransactions = useMemo((): ResolvedTransaction[] => {
    return symbolTransactions.map(tx => {
      let resolved: ResolvedTransaction = tx

      // Transfer ohne Einstandskurs → historischen Schlusskurs einsetzen (falls gefetcht).
      // Der Kurs kommt in EUR; bei Fremdwährung nennt die Note den Börsenkurs dahinter.
      if (resolved.isFromTransfer && resolved.price === 0 && resolved.symbol && resolved.date) {
        const key = `${resolved.symbol}|${resolved.date}`
        const hist = transferPrices[key]
        if (hist && hist.eur > 0) {
          const source = hist.currency === 'EUR' ? '' : ` aus ${hist.close.toFixed(2)} ${hist.currency}`
          resolved = {
            ...resolved,
            price: hist.eur,
            totalValue: hist.eur * resolved.quantity,
            notes: `${resolved.notes} · Einstandskurs: Schlusskurs am Übertragsdatum (${hist.eur.toFixed(2)}€${source})`,
            estimatedTransferPrice: true,
          }
        }
      }
      return resolved
    })
  }, [symbolTransactions, transferPrices])

  // Nach Cash-Mode gefilterte Transaktionen
  const cashFilteredTransactions = useMemo(() => {
    if (cashMode === 'include') return resolvedTransactions
    // cashMode === 'ignore': Cash-Transaktionen rausfiltern
    return resolvedTransactions.filter(t => t.type !== 'cash_deposit' && t.type !== 'cash_withdrawal')
  }, [resolvedTransactions, cashMode])

  // Positionen der Datei, auf der Stückzahl, mit der sie im Depot ankommen
  const previewHoldings = useMemo(() => {
    const { openSplits, splits } =
      splitCheck?.source === cashFilteredTransactions ? splitCheck.comparison : { openSplits: null, splits: null }
    const txWithSymbols = cashFilteredTransactions
      .filter(t => t.symbol)
      .map((tx, i) => (openSplits?.has(i) ? adoptSplits(tx, openSplits.get(i)!) : tx))
      .filter((tx, i) => tx.symbol !== 'CASH' && !splits?.redundant.has(i))
    return reconstructHoldings(txWithSymbols)
  }, [cashFilteredTransactions, splitCheck])

  // Indizes der schon gespeicherten Transaktionen. Überträge mit geschätztem
  // Einstand vergleicht der Abgleich ohne Preis: Der Preis stammt nicht aus der
  // Datei, und frühere Importe haben einen anderen gespeichert — bis Oktober
  // 2026 den Börsenkurs in Fremdwährung als Euro (MBGL 19,80 statt 17,32 €).
  // Mit Preisvergleich käme derselbe Übertrag beim Re-Upload ein zweites Mal
  // ins Depot.
  // Die Notizen sagen, welche Splits der Parser an der Zeile schon verrechnet hat.
  const compareTransactions = useCallback((txs: ResolvedTransaction[]): Promise<DepotComparison> =>
    compareWithDepot(
      portfolioId,
      txs.map(tx => ({
        type: tx.type,
        symbol: tx.symbol!,
        date: tx.date,
        quantity: tx.quantity,
        price: tx.price,
        notes: tx.notes,
        ignorePrice: tx.estimatedTransferPrice && (tx.type === 'transfer_in' || tx.type === 'transfer_out'),
      })),
      { emptyDepot: resetBeforeImport }
    ),
  [portfolioId, resetBeforeImport])

  // Duplikat-Prüfung
  const runDuplicateCheck = useCallback(async () => {
    const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol)
    if (txWithSymbols.length === 0) return

    // Nur der letzte Lauf zählt, etwa nach zweimaligem Klick auf die Löschen-Option
    const run = ++duplicateCheckRun.current
    setCheckingDuplicates(true)
    try {
      const comparison = await compareTransactions(txWithSymbols)
      if (run !== duplicateCheckRun.current) return
      setDuplicateIndices(comparison.duplicates)
      setSplitCheck({
        source: cashFilteredTransactions,
        comparison,
        summary: summarizeDepotSplits(comparison.splits, txWithSymbols.map(tx => ({ ...tx, symbol: tx.symbol! }))),
      })
    } catch (error) {
      console.error('Duplikat-Prüfung fehlgeschlagen:', error)
    } finally {
      if (run === duplicateCheckRun.current) {
        setDuplicateCheckDone(true)
        setCheckingDuplicates(false)
      }
    }
  }, [cashFilteredTransactions, compareTransactions])

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

  // Alle Zeilen, die geschrieben würden, vorab gegen die Tabellengrenzen
  // prüfen. Ein Fehler blockiert den ganzen Import — kein Teilimport.
  const importValidationIssues = useMemo(
    () => validateImportRows(cashFilteredTransactions.filter(t => t.symbol)),
    [cashFilteredTransactions]
  )

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
      adoptedSplits: (splitCheck?.summary ?? []).filter(s => s.adopted + s.redundant > 0),
      unclearSplits: (splitCheck?.summary ?? []).filter(s => s.unclear > 0),
      splitsIncomplete: !!splitCheck?.comparison.splitsIncomplete,
    }
  }, [parseResult, resolvedTransactions, cashFilteredTransactions, previewHoldings, duplicateIndices, splitCheck, cashMode, resetBeforeImport])

  // ======================================================================
  // STEP 7: Import
  // ======================================================================
  const handleImport = useCallback(async () => {
    if (!parseResult) return

    setStep('importing')
    setImporting(true)
    setImportError(null)

    try {
      // Vor jedem Schreibzugriff (auch vor Reset und Split-Anpassung) prüfen:
      // Eine einzige ungültige Zeile würde sonst mitten im Import ihren Batch
      // scheitern lassen.
      if (importValidationIssues.length > 0) {
        throw new Error(
          `Import abgebrochen, nichts gespeichert: ${describeValidationIssues(importValidationIssues)}`
        )
      }

      // Ohne die gespeicherten Buchungen ist offen, unter welchem Kürzel das
      // Depot die Papiere führt; sie könnten ein zweites Mal ankommen.
      if (needsDepotSymbols && !resetBeforeImport && storedTransactions === null) {
        throw new Error('Import abgebrochen, nichts gespeichert: Die Buchungen dieses Depots sind noch nicht geladen. Bitte gleich noch einmal versuchen.')
      }

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

      // === Aktiensplits auf bereits gespeicherte Daten anwenden ===
      // Die Kurshistorie (FMP/Yahoo) ist rückwirkend split-bereinigt — Alt-
      // Transaktionen aus früheren Imports müssen deshalb auf die neue
      // Stückzahl-Basis (quantity × ratio, price ÷ ratio, total_value bleibt).
      // Idempotent über Marker-Note: bereits verrechnete Zeilen werden
      // übersprungen, ein Re-Import derselben Datei ändert nichts doppelt.
      // ISIN-Umstellungen zählen mit, wenn das Depot die alten Buchungen schon
      // unter dem heutigen Kürzel führt (isinChange.ts, rescaleStored).
      let dbSplitAdjustments = 0
      const storedSplits = [
        ...(parseResult.stockSplits || []).map(s => ({ symbol: symbolForIsin(s.isin), date: s.date, ratio: s.ratio })),
        ...isinChangePlans
          .filter(p => p.rescaleStored)
          .map(p => ({ symbol: p.symbol, date: p.rename.date, ratio: p.rename.ratio })),
      ]
      if (!resetBeforeImport && storedSplits.length > 0) {
        for (const split of storedSplits) {
          const { symbol } = split
          if (!symbol || !(split.ratio > 0) || split.ratio === 1) continue

          const { data: existingTxs, error: splitLoadError } = await supabase
            .from('portfolio_transactions')
            .select('id, quantity, price, notes')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol)
            .lt('date', split.date)
            .in('type', ['buy', 'sell', 'transfer_in', 'transfer_out'])

          if (splitLoadError || !existingTxs) continue
          const toAdjust = existingTxs.filter(tx => !hasSplitApplied(tx.notes, split.date, split.ratio))
          if (toAdjust.length === 0) continue

          for (const tx of toAdjust) {
            const qty = Number(tx.quantity) || 0
            const price = Number(tx.price) || 0
            const { error: adjustError } = await supabase
              .from('portfolio_transactions')
              .update({
                quantity: parseFloat((qty * split.ratio).toFixed(8)),
                price: price > 0 ? parseFloat((price / split.ratio).toFixed(4)) : price,
                notes: appendSplitNote(tx.notes, split.ratio, split.date),
              })
              .eq('id', tx.id)
            if (adjustError) throw new Error(`Split-Anpassung für ${symbol} fehlgeschlagen: ${adjustError.message}`)
            dbSplitAdjustments++
          }

          // Holding auf neue Stückzahl-Basis bringen. Nur wenn tatsächlich
          // Alt-Transaktionen angepasst wurden — sonst wurde sie in einem
          // früheren Import bereits umgestellt.
          const { data: holdingRows } = await supabase
            .from('portfolio_holdings')
            .select('id, quantity, purchase_price')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', symbol)
          for (const holding of holdingRows || []) {
            await supabase
              .from('portfolio_holdings')
              .update({
                quantity: parseFloat(((Number(holding.quantity) || 0) * split.ratio).toFixed(8)),
                purchase_price: parseFloat(((Number(holding.purchase_price) || 0) / split.ratio).toFixed(4)),
              })
              .eq('id', holding.id)
          }
        }
      }

      const txWithSymbols = cashFilteredTransactions.filter(t => t.symbol)

      // Immer frisch prüfen, das Ergebnis der Vorschau kann veraltet sein:
      //  - Gerade wurden DB-Zeilen split-verrechnet, die (bereits angepassten)
      //    Datei-Zeilen matchen erst jetzt.
      //  - Ein früherer Versuch hat die Buchungen gespeichert und ist danach
      //    gescheitert. Mit dem alten Ergebnis legte der zweite Klick auf
      //    "Jetzt importieren" alle Buchungen noch einmal an.
      // Schlägt die Prüfung fehl, bricht der Import ab, bevor er schreibt.
      // Bei Reset gibt es keine Duplikate, das Depot ist schon geleert.
      const comparison = await compareTransactions(txWithSymbols)
      const effectiveDuplicates = comparison.duplicates

      // Nennt die Datei einen Split nicht, kommen neue Buchungen von davor auf die
      // Stückzahl danach.
      const txToImport = txWithSymbols
        .map((tx, i) => {
          const splits = comparison.splits.adopt.get(i)
          return splits ? adoptSplits(tx, splits) : tx
        })
        .filter((_, i) => !effectiveDuplicates.has(i))
      setImportProgress({ current: 0, total: txToImport.length })

      // Wenn nichts Neues zu importieren ist, aber Splits verrechnet wurden,
      // ist das ein gültiges Ergebnis (Bestand wurde angepasst) — kein Abbruch.
      // Ebenso, wenn die Bestände hinter den gespeicherten Transaktionen
      // zurücklagen (z.B. ein Verkauf aus einem früheren Import nie verrechnet):
      // Ein erneuter Upload derselben Datei repariert das, statt nur
      // "alles Duplikate" zu melden.
      const splitWarnings = summarizeDepotSplits(comparison.splits, txWithSymbols.map(tx => ({ ...tx, symbol: tx.symbol! })))
        .filter(s => s.unclear > 0)
        .map(unclearSplitText)
      if (comparison.splitsIncomplete) splitWarnings.push(SPLITS_INCOMPLETE_TEXT)
      const spinoffWarnings: string[] = []
      const holdingWarnings: string[] = []

      // Schlusskurse in EUR je "SYMBOL|Datum"; nicht gefundene Paare fehlen
      const fetchEurCloses = async (items: { symbol: string; date: string }[]): Promise<Record<string, number>> => {
        const { data: { session } } = await supabase.auth.getSession()
        const resp = await fetch('/api/portfolio/historical-prices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ items }),
        })
        if (!resp.ok) return {}
        return ((await resp.json()) as { results?: Record<string, number> }).results || {}
      }

      // === Spin-off-Kostenbasis anteilig übertragen ===
      // Ohne Übertragung behält die Mutterposition ihre volle Kostenbasis und
      // zeigt nach der Abspaltung einen Schein-Verlust (z.B. Honeywell −50 %),
      // während die Spin-off-Position mit Marktwert-Basis bei 0 % startet.
      // Aufteilung im Verhältnis der Marktwerte am Spin-off-Tag; idempotent
      // über Marker-Note an der Spin-off-Einbuchung (greift auch nachträglich,
      // wenn der Spin-off bereits in einem früheren Import gelandet ist).
      //
      // Die Mutter nennen nur Freedom24 und Scalable (Quell-ISIN, Notes).
      // Trading 212 ("Spin off") und Trade Republic ("Abspaltung /
      // Unbundling") nicht — dann bestimmt sie detectSpinoffEvents aus dem
      // Zuteilungsverhältnis zum Bestand am Vortag (SPGI 2,235 → MBGL 2,235;
      // K 2,544 → KLG 0,636). Beide Kurse kommen in EUR vom selben Tag, die
      // Zeilen schreibt applySpinoffCostSplit mit denselben Markern, die die
      // portfolio-history-Route als "schon aufgeteilt" erkennt.
      // Gibt die Zahl der aufgeteilten Spin-offs zurück.
      const splitSpinoffCostBasis = async (): Promise<number> => {
        const fileSpinoffs = resolvedTransactions.filter(t =>
          t.symbol && t.date && (t.corpActionType === 'spinoff' || isSpinoffChildTransfer(t))
        )
        if (fileSpinoffs.length === 0) return 0

        // Seitenweise: Der Plan schreibt Transaktionen um und braucht dafür
        // jede Buchung, nicht nur die ersten 1000.
        const { data: stored, error: loadError } = await loadAllRows((from, to) =>
          supabase
            .from('portfolio_transactions')
            .select('id, type, symbol, date, quantity, price, total_value, fee, notes')
            .eq('portfolio_id', portfolioId)
            .in('type', [...POSITION_TX_TYPES])
            .order('id', { ascending: true })
            .range(from, to)
        )
        if (loadError) throw new Error(`Spin-offs: Buchungen nicht lesbar (${loadError.message})`)
        const depotTxs = stored.map(t => ({
          ...t,
          quantity: Number(t.quantity) || 0,
          price: Number(t.price) || 0,
          total_value: Number(t.total_value) || 0,
          fee: Number(t.fee) || 0,
        }))
        type DepotTx = typeof depotTxs[number]
        const detected = detectSpinoffEvents(depotTxs)

        let applied = 0
        const handled = new Set<string>()
        for (const spinoff of fileSpinoffs) {
          const childSymbol = spinoff.symbol!
          const date = spinoff.date
          if (handled.has(`${childSymbol}|${date}`)) continue
          handled.add(`${childSymbol}|${date}`)
          try {
            // Spin-off-Einbuchung(en) in der DB (frisch importiert oder alt)
            const childTxs = depotTxs.filter(t =>
              t.type === 'transfer_in' && t.symbol === childSymbol && t.date === date && isSpinoffChildTransfer(t)
            )
            // Kostenbasis-Übertragung nur wenn noch nicht geschehen (idempotent).
            // Die Holdings-Rekonstruktion läuft in JEDEM Fall — sonst fehlt die
            // Kind-Position, wenn ihre Buchung beim Re-Import ein Duplikat war.
            if (childTxs.length === 0 || childTxs.some(t => hasSpinoffBasisTaken(t.notes))) continue

            // Mutter-Symbol: über aufgelöste Quell-ISIN, Ticker aus den Notes
            // ("Spin-off aus HON.US (US4385162056)"), sonst die Erkennung
            let parentSymbol = spinoff.fromIsin ? symbolForIsin(spinoff.fromIsin) : undefined
            if (!parentSymbol) parentSymbol = spinoff.notes?.match(/aus\s+([A-Z0-9]+)\.[A-Z]{2}\s*\(/)?.[1]
            if (!parentSymbol) {
              parentSymbol = detected.find(e => e.childSymbol === childSymbol && e.date === date)?.parentSymbol
            }
            if (!parentSymbol || parentSymbol === childSymbol) {
              spinoffWarnings.push(`Spin-off ${childSymbol} (${date}): Mutterposition nicht eindeutig, Kostenbasis nicht aufgeteilt`)
              continue
            }

            const parentTxs = depotTxs.filter(t => t.symbol === parentSymbol)
            const event: SpinoffEvent<DepotTx> = {
              portfolioId, parentSymbol, childSymbol, date, costSplit: false, childTxs,
            }

            // Schlusskurse beider Papiere am Buchungstag, in EUR. Der Preis
            // der Datei dient nur als Ersatz, wenn FMP die Tochter nicht führt
            // — ein geschätzter Übertragskurs kommt aus derselben Quelle.
            const closes = await fetchEurCloses([{ symbol: parentSymbol, date }, { symbol: childSymbol, date }])
            const plan = planSpinoffCostSplit({
              event,
              parentTxs,
              parentPrice: closes[`${parentSymbol}|${date}`] || 0,
              childPrice: closes[`${childSymbol}|${date}`] || (spinoff.estimatedTransferPrice ? 0 : spinoff.price),
            })
            if (!plan) {
              spinoffWarnings.push(`Spin-off ${childSymbol} aus ${parentSymbol} (${date}): Kurse oder Mutterbestand fehlen, Kostenbasis nicht aufgeteilt`)
              continue
            }

            // In Plan-Reihenfolge schreiben (Mutter zuerst): Ein Abbruch vor
            // dem Übernahme-Marker der Tochter wird beim nächsten Import
            // fortgesetzt, schon entlastete Käufe überspringt ihr Marker.
            for (const { id, ...update } of plan.updates) {
              const { error: updateError } = await supabase
                .from('portfolio_transactions')
                .update(update)
                .eq('id', id)
              if (updateError) throw new Error(`Spin-off ${childSymbol}: ${updateError.message}`)
            }
            applied++
          } catch (spinoffError) {
            console.warn('Spin-off-Verarbeitung fehlgeschlagen:', spinoffError)
            spinoffWarnings.push(
              spinoffError instanceof Error ? spinoffError.message : String(spinoffError)
            )
          }
        }
        return applied
      }

      // Ein früherer Versuch hat die Buchungen gespeichert und ist vor den
      // Beständen gescheitert (in diesem Fenster, oder das Depot hat Buchungen,
      // aber keine einzige Position). Dann führt dieser Lauf ihn zu Ende.
      const isUnfinishedImport = async (): Promise<boolean> => {
        if (unfinishedImportRef.current) return true
        if (previewHoldings.length === 0) return false
        const { count, error } = await supabase
          .from('portfolio_holdings')
          .select('id', { count: 'exact', head: true })
          .eq('portfolio_id', portfolioId)
        return !error && count === 0
      }

      let earlyReconcile: Awaited<ReturnType<typeof reconcileHoldings>> | null = null
      let spinoffSplits: number | null = null
      if (txToImport.length === 0 && dbSplitAdjustments === 0) {
        // Die Spin-off-Aufteilung zuerst: Ein Re-Upload derselben Datei holt
        // sie nach, auch wenn jede Zeile schon gespeichert ist.
        spinoffSplits = await splitSpinoffCostBasis()
        if (spinoffSplits === 0 && !(await isUnfinishedImport())) {
          earlyReconcile = await reconcileHoldings(supabase, portfolioId, { staleOnly: true })
          if (earlyReconcile.errors.length > 0) {
            throw new Error(`Bestände konnten nicht abgeglichen werden: ${earlyReconcile.errors.join(' · ')}`)
          }
          if (earlyReconcile.created + earlyReconcile.updated + earlyReconcile.deleted === 0) {
            setImportError('Keine neuen Transaktionen zum Importieren (alle sind Duplikate).')
            setStep('preview')
            setImporting(false)
            return
          }
        }
      }

      let savedCount = 0

      // Batch-Import. Die IDs vergeben wir selbst: Scheitert ein späterer
      // Batch, entfernt der Rollback alle Zeilen dieses Laufs wieder — auch
      // die des gescheiterten Batches, falls der Server ihn doch geschrieben
      // hat und nur die Antwort verloren ging. Früher blieb ein halber Import
      // stehen (TR-Depot e8ff32b0: 550 von 710 Buchungen, alle Verkäufe fehlten).
      const batchSize = 50
      const attemptedIds: string[] = []
      for (let i = 0; i < txToImport.length; i += batchSize) {
        const batch = txToImport.slice(i, i + batchSize)

        const rows = batch.map(tx => ({
          id: crypto.randomUUID(),
          portfolio_id: portfolioId,
          type: tx.type,
          symbol: tx.symbol!,
          name: tx.name ? tx.name.slice(0, NAME_MAX_LENGTH) : tx.name,
          quantity: parseFloat(tx.quantity.toFixed(8)),
          price: parseFloat(tx.price.toFixed(4)),
          total_value: parseFloat(tx.totalValue.toFixed(2)),
          fee: parseFloat((tx.fee || 0).toFixed(4)),
          date: tx.date,
          notes: tx.notes,
        }))
        attemptedIds.push(...rows.map(r => r.id))

        const { error } = await supabase
          .from('portfolio_transactions')
          .insert(rows)

        if (error) {
          let removed = 0
          let notRemoved = 0
          for (let j = 0; j < attemptedIds.length; j += 100) {
            const chunk = attemptedIds.slice(j, j + 100)
            const { error: deleteError, count } = await supabase
              .from('portfolio_transactions')
              .delete({ count: 'exact' })
              .eq('portfolio_id', portfolioId)
              .in('id', chunk)
            if (deleteError) notRemoved += chunk.length
            else removed += count ?? 0
          }
          const range = `${i + 1}–${i + batch.length} von ${txToImport.length}`
          const outcome = notRemoved > 0
            ? `${removed} Buchungen dieses Laufs wurden wieder entfernt, bis zu ${notRemoved} weitere nicht. Bitte Depot prüfen.`
            : `Die ${removed} bereits gespeicherten Buchungen dieses Laufs wurden wieder entfernt.`
          const sideEffects = [
            resetBeforeImport ? 'Das Depot wurde vor dem Import geleert.' : '',
            dbSplitAdjustments > 0 ? `Die Split-Anpassung von ${dbSplitAdjustments} älteren Buchungen bleibt bestehen.` : '',
          ].filter(Boolean).join(' ')
          throw new Error(
            `Import abgebrochen bei Buchung ${range}: ${error.message}. ${outcome}${sideEffects ? ` ${sideEffects}` : ''}`
          )
        }

        savedCount += rows.length
        setImportProgress({ current: Math.min(i + batchSize, txToImport.length), total: txToImport.length })
      }

      if (savedCount > 0) unfinishedImportRef.current = true

      // Die Bestände entstehen weiter unten in einem Rutsch aus allen
      // Transaktionen des Depots — erst nach Split- und Spin-off-Korrektur.
      // Der frühere Aufbau an dieser Stelle addierte nur den gerade
      // importierten Stapel auf den Altbestand und lief damit vor den
      // Korrekturen: genau daher kam die doppelte Kostenbasis bei Honeywell.
      let holdingsCreated = earlyReconcile?.created ?? 0
      let holdingsUpdated = (earlyReconcile?.updated ?? 0) + (earlyReconcile?.deleted ?? 0)

      // Spin-off-Aufteilung (splitSpinoffCostBasis oben), sofern sie nicht
      // schon vor dem Duplikat-Abbruch gelaufen ist. Die Bestände baut der
      // Abgleich unten neu auf — für alle Symbole, nicht nur die aufgeteilten.
      if (spinoffSplits === null) spinoffSplits = await splitSpinoffCostBasis()

      // === Bestände aus den Transaktionen ableiten ===
      // Muss nach allen Korrekturen laufen (Split, Spin-off) und für JEDES
      // Symbol des Depots: Der frühere Aufbau schrieb die Bestände vor diesen
      // Korrekturen und reparierte sie nur innerhalb der Spin-off-Behandlung.
      // Schlug die fehl, blieb z.B. Honeywell mit doppelter Kostenbasis stehen
      // und die abgespaltene Position fehlte ganz.
      const reconcile = await reconcileHoldings(supabase, portfolioId, {
        entryPrice: async (symbol, date) => {
          try {
            return (await fetchEurCloses([{ symbol, date }]))[`${symbol}|${date}`] ?? null
          } catch {
            return null
          }
        },
      })
      holdingsCreated += reconcile.created
      holdingsUpdated += reconcile.updated + reconcile.deleted
      // Nicht verschlucken: ein stiller Fehlschlag hier bedeutet falsche
      // Renditen im Depot. Aber auch nicht abbrechen: Die Buchungen sind schon
      // gespeichert, und wegen einer einzigen Position fehlte früher auch das
      // Cash des ganzen Depots.
      holdingWarnings.push(
        ...reconcile.errors,
        ...reconcile.missingCosts.map(symbol =>
          `${symbol}: Einstand unbekannt und kein Kurs verfügbar, Position nicht angelegt. Die Buchung steht unter Transaktionen.`
        )
      )

      // Cash-Position aktualisieren — nur bei cashMode === 'include'
      let cashTransactionsImported = 0
      if (cashMode === 'include') {
        // Seitenweise, sonst fehlt großen Depots ein Teil der Geldflüsse. Bei
        // einem Ladefehler bleibt die Cash-Position wie bisher unverändert.
        const { data: allPortfolioTx } = await loadAllRows((from, to) =>
          supabase
            .from('portfolio_transactions')
            .select('type, total_value, fee, notes')
            .eq('portfolio_id', portfolioId)
            .order('id', { ascending: true })
            .range(from, to)
        )

        if (allPortfolioTx.length > 0) {
          const hasCashFlowData = allPortfolioTx.some(
            tx => tx.type === 'cash_deposit' || tx.type === 'cash_withdrawal'
          )

          if (hasCashFlowData) {
            // Gebühren mit einrechnen: total_value ist bei Käufen/Verkäufen ohne
            // Gebühr gespeichert, das Konto wird aber inkl. Gebühr belastet.
            // Käufe, die bei einem Spin-off Kostenbasis abgegeben haben, mit
            // ihrem ursprünglichen Betrag: Die Aufteilung verschiebt nur den
            // Einstand zwischen Mutter und Tochter — vom Konto ging der volle
            // Kaufpreis ab.
            const totalCash = allPortfolioTx.reduce((sum, tx) => {
              const val = Number(tx.total_value) || 0
              const fee = Math.abs(Number(tx.fee) || 0)
              switch (tx.type) {
                case 'cash_deposit':   return sum + val
                case 'cash_withdrawal': return sum - val
                case 'buy':            return sum - valueBeforeSpinoff(val, tx.notes) - fee
                case 'sell':           return sum + val - fee
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

      unfinishedImportRef.current = false
      setImportResult({
        transactionsAttempted: cashFilteredTransactions.filter(t => t.symbol).length,
        transactionsSaved: savedCount,
        duplicatesSkipped: resetBeforeImport ? 0 : effectiveDuplicates.size,
        holdingsCreated,
        holdingsUpdated,
        cashMode,
        cashTransactionsImported,
        unresolvedSymbols: resolvedTransactions.filter(t => !t.symbol && t.isin).length,
        corpActionWarnings: [...splitWarnings, ...spinoffWarnings],
        holdingWarnings,
        estimatedCosts: reconcile.estimatedCosts,
      })
      setStep('done')
    } catch (error: any) {
      console.error('Import error:', error)
      setImportError(error.message || 'Fehler beim Import')
      setStep('preview')
      // Der Versuch kann schon Buchungen gespeichert haben
      setPendingDuplicateCheck(true)
      setExistingDataVersion(v => v + 1)
    } finally {
      setImporting(false)
    }
  }, [parseResult, cashFilteredTransactions, resolvedTransactions, previewHoldings, portfolioId, cashMode, resetBeforeImport, isinChangePlans, symbolForIsin, needsDepotSymbols, storedTransactions, compareTransactions, importValidationIssues])

  // Kürzel wie im Depot (Vorschau); umgestellte ISINs stehen schon bei den
  // Corporate Actions
  const keptDepotSymbols = [...depotSymbols.values()].filter(
    d => !isinChangePlans.some(p => p.rename.fromIsin === d.isin)
  )

  // Was der Import mit einer Ticker-Umstellung macht (Vorschau)
  const renameOutcome = (rename: TickerRename): string => {
    const plan = isinChangePlans.find(p => p.rename === rename)
    if (!plan) return 'Einstandskurs übertragen'
    return plan.mode === 'adjust'
      ? `frühere Buchungen laufen umgerechnet unter ${plan.symbol}`
      : `dieses Depot führt die alten Buchungen unter ${plan.symbol}, sie bleiben unverändert. Mit "Bestehende Daten vor Import löschen" laufen sie unter ${plan.successorSymbol}`
  }

  // Format helpers
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

  if (!isOpen) return null

  // ======================================================================
  // Step-Indikator
  // ======================================================================
  const currentMainStepIndex = MAIN_STEPS.findIndex(s => s.key.includes(step))

  // Spalten-Import: Art-Spalte und ihre Werte, Feld je Spalte für die Kopfzeile
  const kindColumn = columnAssignments.kind
  const kindValues = columnTable && kindColumn != null ? columnTable.distinctValues[kindColumn] : undefined
  const fieldLabel = (field: ColumnField): string => COLUMN_FIELDS.find(f => f.field === field)?.label ?? field
  const fieldOfColumn = (index: number): ColumnField | undefined =>
    (Object.entries(columnAssignments) as [ColumnField, number | undefined][]).find(([, i]) => i === index)?.[0]

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5 px-6 py-3 border-b border-white/[0.05] flex-shrink-0 overflow-x-auto">
      {MAIN_STEPS.map((s, i) => {
        const isActive = i === currentMainStepIndex
        const isDone = i < currentMainStepIndex
        return (
          <React.Fragment key={i}>
            {i > 0 && <div className={`w-4 h-px ${isDone ? 'bg-neutral-600' : 'bg-white/[0.08]'}`} />}
            <div className={`flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap tracking-tight ${
              isActive ? 'text-white' : isDone ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              {isDone ? (
                <CheckIcon className="w-3 h-3 text-neutral-400" />
              ) : (
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${
                  isActive ? 'border-white text-white' : 'border-white/[0.14] text-neutral-600'
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
      <div className="bg-white/[0.04] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] flex-shrink-0">
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
            className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors flex-shrink-0"
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
                  Wähle deinen Broker, wir zeigen dir dann, wo genau du die Export-Datei findest.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {IMPORT_BROKERS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBroker(b)}
                    className="group p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all text-left"
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
                  <li key={i} className="flex gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-colors">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.08] text-[11px] font-semibold text-neutral-300 flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-neutral-200 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Hinweis */}
              {selectedBroker.instructions.hint && (
                <div className="mb-5 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.06] text-[13px] text-neutral-200 transition-colors"
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
                    ? 'pointer-events-none opacity-50 border-white/[0.08] bg-white/[0.04]'
                    : isDragOver
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-white/[0.08] hover:border-white/[0.14] bg-white/[0.02] hover:bg-white/[0.05]'
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
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-emerald-500/10' : 'bg-white/[0.05] border border-white/[0.08]'}`}>
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

              {pdfErrors.length + importWarnings.length + importNotices.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs font-medium text-amber-400 mb-1">Hinweise:</p>
                  <ul className="space-y-0.5">
                    {[...pdfErrors, ...importWarnings, ...importNotices].map((err, i) => (
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

          {/* === STEP 3b: SPALTEN ZUORDNEN (Tabelle ohne eigenen Parser) === */}
          {step === 'columns' && columnTable && (
            <div>
              <div className="mb-5">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Spalten zuordnen</h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">
                  Das Format von „{columnTable.fileName}“ kennen wir nicht
                  {columnTable.sheet ? ` (Tabellenblatt „${columnTable.sheet}“)` : ''}. Sag uns, was in welcher Spalte steht,
                  dann lesen wir die {columnTable.rowCount} Zeilen daraus. Zahlen und Daten werden so übernommen, wie sie in der Datei stehen.
                </p>
              </div>

              {/* Kopfzeile und Beispielzeilen */}
              <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr>
                      {columnTable.header.map((name, i) => {
                        const field = fieldOfColumn(i)
                        return (
                          <th key={i} className="px-2.5 py-2 text-left align-top font-medium text-neutral-300 whitespace-nowrap border-b border-white/[0.06]">
                            <div>{name}</div>
                            <div className={`mt-1 text-[10px] font-medium ${field ? 'text-emerald-400' : 'text-neutral-600'}`}>
                              {field ? fieldLabel(field) : 'nicht zugeordnet'}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {columnTable.sampleRows.map((row, r) => (
                      <tr key={r} className="border-b border-white/[0.04] last:border-0">
                        {columnTable.header.map((_, i) => (
                          <td key={i} className="px-2.5 py-1.5 text-neutral-400 whitespace-nowrap tabular-nums">
                            {row[i] || <span className="text-neutral-700">·</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* KI-Vorschlag, nur mit Zustimmung. Die Datenschutzerklärung muss die
                  Übertragung nennen, bevor der Schalter für alle sichtbar wird
                  (lib/ai/columnMapping.ts); bis dahin gibt ihn der Server nur für
                  die Finclue-AI-Allowlist frei. */}
              {aiSuggestAvailable && (
                <div className={`mb-5 p-3.5 rounded-xl border transition-colors ${aiOptIn ? 'border-white/[0.14] bg-white/[0.05]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiOptIn}
                      onChange={e => { setAiOptIn(e.target.checked); setAiError(null) }}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white">Zuordnung von der KI vorschlagen lassen</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                        Nur wenn du zustimmst, schicken wir die Kopfzeile und die Beispielzeilen oben an Anthropic (Claude).
                        Namen, IBANs und Depotnummern werden vorher entfernt. Zurück kommt nur die Zuordnung der Spalten, keine Zahlen.
                        Du prüfst den Vorschlag und bestätigst ihn.
                      </p>
                    </div>
                  </label>
                  {aiOptIn && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={requestAiSuggestion}
                        disabled={aiSuggesting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        {aiSuggesting ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <LightBulbIcon className="w-3.5 h-3.5" />}
                        {aiSuggesting ? 'Vorschlag wird geholt…' : aiSuggested ? 'Noch einmal vorschlagen' : 'Vorschlag holen'}
                      </button>
                      {aiError && <p className="text-[11px] text-red-400">{aiError}</p>}
                    </div>
                  )}
                  {aiSuggested && !aiSuggesting && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <p className="text-[11px] text-amber-300 leading-relaxed">
                        KI-Vorschlag eingetragen. Prüfe jede Zuordnung unten, bevor du sie bestätigst.{aiNote ? ` ${aiNote}` : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Felder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                {COLUMN_FIELDS.map(({ field, label, hint }) => {
                  const index = columnAssignments[field]
                  return (
                    <label
                      key={field}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border ${index != null ? 'border-white/[0.1] bg-white/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}
                    >
                      <div className="w-24 flex-shrink-0">
                        <p className="text-[12px] text-white">
                          {label}
                          {field === 'date' && <span className="text-emerald-400"> *</span>}
                        </p>
                        <p className="text-[10px] text-neutral-500 leading-tight">{hint}</p>
                      </div>
                      <select
                        value={index ?? ''}
                        onChange={e => assignColumn(field, e.target.value)}
                        className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/[0.3]"
                      >
                        <option value="">nicht in der Datei</option>
                        {columnTable.header.map((name, i) => (
                          <option key={i} value={i}>
                            {name}{columnTable.sampleRows[0]?.[i] ? ` · ${columnTable.sampleRows[0][i]}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                })}
              </div>

              {/* Art-Spalte: Was bedeuten die Werte? */}
              {kindColumn != null && kindValues && (
                <div className="mb-5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <p className="text-[12px] font-medium text-white mb-1">Was bedeuten die Werte in „{columnTable.header[kindColumn]}“?</p>
                  <p className="text-[11px] text-neutral-500 mb-3">Zeilen mit „Überspringen“ werden nicht übernommen, zum Beispiel Zinsen oder Einzahlungen.</p>
                  <div className="space-y-1.5">
                    {kindValues.map(value => {
                      const current = kindAssignments[value] ?? 'ignore'
                      return (
                        <div key={value} className="flex items-center justify-between gap-3">
                          <span className="text-[12px] text-neutral-200 truncate min-w-0" title={value}>{value}</span>
                          <div className="flex gap-1 flex-shrink-0">
                            {([...KIND_TYPES, 'ignore'] as (ColumnKindType | 'ignore')[]).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setKindAssignments(prev => ({ ...prev, [value]: type }))}
                                className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                  current !== type
                                    ? 'border-white/[0.08] text-neutral-500 hover:text-neutral-300 hover:border-white/[0.16]'
                                    : type === 'buy'
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                    : type === 'sell'
                                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                                    : type === 'dividend'
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-white/[0.12] border-white/[0.2] text-white'
                                }`}
                              >
                                {KIND_LABELS[type]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {kindColumn != null && !kindValues && (
                <div className="mb-5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <p className="text-[12px] font-medium text-white mb-1">
                    Welche Wörter in „{columnTable.header[kindColumn]}“ bedeuten Kauf, Verkauf und Dividende?
                  </p>
                  <p className="text-[11px] text-neutral-500 mb-3">
                    Die Spalte hat viele verschiedene Werte. Mehrere Wörter mit Komma trennen, Zeilen ohne Treffer werden übersprungen.
                  </p>
                  <div className="space-y-2">
                    {KIND_TYPES.map(type => (
                      <label key={type} className="flex items-center gap-3">
                        <span className="w-20 text-[12px] text-neutral-300">{KIND_LABELS[type]}</span>
                        <input
                          type="text"
                          value={kindWordText[type]}
                          onChange={e => setKindWordText(prev => ({ ...prev, [type]: e.target.value }))}
                          className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/[0.3]"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {kindColumn == null && (
                <p className="mb-5 text-[11px] text-neutral-500 leading-relaxed">
                  Ohne Art-Spalte gilt jede Zeile als Kauf, Zeilen mit negativer Stückzahl als Verkauf.
                </p>
              )}

              {columnMappingError && <p className="text-[12px] text-amber-400">{columnMappingError}</p>}
              {columnError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{columnError}</p>
                </div>
              )}
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
                <div className="flex items-center gap-3 p-4 bg-white/[0.04] rounded-xl mb-4">
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
                      // Kein maxLength am Feld: Eine eingefügte ISIN würde sonst
                      // still auf 10 Zeichen gekürzt und als Unsinns-Ticker übernommen.
                      const mappingError = validateManualSymbol(manualMappings[isin] || '')
                      return (
                        <div key={isin} className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono text-neutral-400">{isin}</span>
                            {/* Beim Spalten-Import ohne ISIN ist der Name selbst der Schlüssel */}
                            {tx && tx.name !== isin && <span className="text-xs text-neutral-500 ml-2">{tx.name}</span>}
                            {mappingError && <p className="text-[11px] text-red-400 mt-0.5">{mappingError}</p>}
                          </div>
                          <input
                            type="text"
                            placeholder="Symbol"
                            value={manualMappings[isin] || ''}
                            onChange={(e) => handleManualMapping(isin, e.target.value)}
                            aria-invalid={!!mappingError}
                            className={`w-24 px-2 py-1 bg-white/[0.08] border rounded text-white text-xs uppercase ${
                              mappingError ? 'border-red-500/60' : 'border-white/[0.14]'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={resolveViaAPI}
                      disabled={resolving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-50 text-white rounded-lg transition-colors"
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

                  {resolveError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{resolveError}</p>
                    </div>
                  )}
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
                  {resolvedTransactions.filter(t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal').length} Ein-/Auszahlungen in deiner Datei. Wie sollen wir damit umgehen?
                </p>
              </div>

              <div className="space-y-2">
                {/* Option A: include */}
                <button
                  onClick={() => setCashMode('include')}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    cashMode === 'include'
                      ? 'border-white/[0.18] bg-white/[0.05]'
                      : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                      cashMode === 'include' ? 'border-white bg-white' : 'border-white/[0.18]'
                    }`}>
                      {cashMode === 'include' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white/[0.04]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-[13px] text-white">Cash übernehmen</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          Empfohlen
                        </span>
                      </div>
                      <p className="text-[12px] text-neutral-400 leading-relaxed">
                        Ein-/Auszahlungen und Zinsen werden importiert, Cash-Position wird automatisch berechnet, so wie im Broker-Depot.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option B: ignore */}
                <button
                  onClick={() => setCashMode('ignore')}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    cashMode === 'ignore'
                      ? 'border-white/[0.18] bg-white/[0.05]'
                      : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                      cashMode === 'ignore' ? 'border-white bg-white' : 'border-white/[0.18]'
                    }`}>
                      {cashMode === 'ignore' && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white/[0.04]" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5">
                        <span className="font-medium text-[13px] text-white">Cash ignorieren</span>
                      </div>
                      <p className="text-[12px] text-neutral-400 leading-relaxed">
                        Nur Käufe, Verkäufe und Dividenden. Cash-Position bleibt unverändert. Sinnvoll, wenn du Cash separat verwaltest.
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Transaktionen</p>
                  <p className="text-white font-semibold text-xl tracking-tight tabular-nums">{importSummary.totalTransactions}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Positionen</p>
                  <p className="text-white font-semibold text-xl tracking-tight tabular-nums">{importSummary.holdings}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
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
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Neu</p>
                  <p className="text-emerald-400 font-semibold text-xl tracking-tight tabular-nums">{importSummary.newTransactions}</p>
                </div>
              </div>

              {/* Wo vermutlich Buchungen fehlen. Steht über der Reset-Option: Wer dort löscht,
                  verliert sonst auch, was der Export nicht mehr enthält. */}
              {importWarnings.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-amber-300 mb-1">Export vermutlich unvollständig</p>
                    <ul className="space-y-1 text-[11px] text-neutral-400 leading-relaxed break-words">
                      {importWarnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Reset-Option (nur wenn Portfolio schon Daten hat) */}
              {existingDataCount && (existingDataCount.transactions > 0 || existingDataCount.holdings > 0) && (
                <button
                  onClick={() => {
                    setResetBeforeImport(!resetBeforeImport)
                    // Ein geleertes Depot kennt weder Duplikate noch verrechnete Splits
                    setPendingDuplicateCheck(true)
                  }}
                  className={`w-full mb-3 p-3.5 rounded-xl border text-left transition-all ${
                    resetBeforeImport
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-white/[0.06] bg-white/[0.04] hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      resetBeforeImport
                        ? 'border-red-500 bg-red-500'
                        : 'border-white/[0.18]'
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
                          ? <span className="text-red-400">. Sie werden komplett gelöscht und durch den neuen Import ersetzt (inkl. Cash-Position).</span>
                          : '. Sie bleiben erhalten, Duplikate werden automatisch übersprungen.'}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Cash-Mode Info */}
              <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-start gap-2.5">
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
              {importSummary.stockSplits.length + importSummary.tickerRenames.length + importSummary.adoptedSplits.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[12px] font-medium text-white mb-1.5">
                    Corporate Actions automatisch verarbeitet
                  </p>
                  <ul className="space-y-1 text-[11px] text-neutral-500 leading-relaxed">
                    {importSummary.stockSplits.map((s, i) => (
                      <li key={`split-${i}`} className="flex gap-1.5">
                        <span className="text-neutral-600">·</span>
                        Aktiensplit {s.ratio.toFixed(2).replace(/\.?0+$/, '')}:1 am {s.date} ({s.isin}): frühere Käufe/Verkäufe (auch bereits importierte) werden rückwirkend umgerechnet
                      </li>
                    ))}
                    {importSummary.adoptedSplits.map(s => (
                      <li key={`depot-split-${s.symbol}-${s.date}`} className="flex gap-1.5">
                        <span className="text-neutral-600">·</span>
                        {adoptedSplitText(s)}
                      </li>
                    ))}
                    {importSummary.tickerRenames.map((r, i) => (
                      <li key={`rename-${i}`} className="flex gap-1.5">
                        <span className="text-neutral-600">·</span>
                        Ticker-Umstellung {r.date}: {r.fromIsin} → {r.toIsin} (Ratio {r.ratio.toFixed(4)}), {renameOutcome(r)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Neue Buchungen vor einem Split, deren Stückzahl-Basis offen bleibt */}
              {(importSummary.unclearSplits.length > 0 || importSummary.splitsIncomplete) && (
                <div className="mb-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-amber-300 mb-1">Stückzahl nach Aktiensplit prüfen</p>
                    <ul className="space-y-1 text-[11px] text-neutral-400 leading-relaxed">
                      {importSummary.unclearSplits.map(s => (
                        <li key={`${s.symbol}-${s.date}`}>{unclearSplitText(s)}</li>
                      ))}
                      {importSummary.splitsIncomplete && <li>{SPLITS_INCOMPLETE_TEXT}</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Papiere, die das Depot unter einem anderen Kürzel führt */}
              {keptDepotSymbols.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[12px] font-medium text-white mb-1">
                    {keptDepotSymbols.length} {keptDepotSymbols.length === 1 ? 'Papier behält sein Kürzel' : 'Papiere behalten ihr Kürzel'} aus diesem Depot
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                    Neue Buchungen laufen unter dem Kürzel, das dieses Depot schon verwendet. So entstehen keine doppelten Buchungen.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {keptDepotSymbols.slice(0, 12).map(d => (
                      <span key={d.isin} className="text-[10px] font-medium px-1.5 py-0.5 bg-white/[0.05] text-neutral-300 border border-white/[0.08] rounded">
                        {d.stored} statt {d.resolved}
                      </span>
                    ))}
                    {keptDepotSymbols.length > 12 && (
                      <span className="text-[10px] px-1.5 py-0.5 text-neutral-500">
                        +{keptDepotSymbols.length - 12}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Was die Datei nicht hergibt */}
              {importNotices.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[12px] font-medium text-white mb-1">Nicht in der Datei enthalten</p>
                  <ul className="space-y-1 text-[11px] text-neutral-500 leading-relaxed">
                    {importNotices.map((notice, i) => (
                      <li key={i}>{notice}</li>
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
                        Einstandskurs = Transferkurs (der echte Original-Kaufpreis liegt nicht in der CSV vor). Performance «seit Kauf» ist dadurch oft zu niedrig. Du kannst die Einstandskurse nach dem Import manuell korrigieren.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {importSummary.transferHoldings.slice(0, 12).map(h => (
                          <span key={h.symbol} className="text-[10px] font-medium px-1.5 py-0.5 bg-white/[0.05] text-neutral-300 border border-white/[0.08] rounded">
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
                <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="flex items-start gap-2.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-[12px] font-medium text-white mb-1">
                        Positionen aus Corporate Action
                      </p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mb-2">
                        Aus Splits, Umstellungen und Spin-offs. Steht kein Einstand in der Datei, teilen wir ihn mit der Mutteraktie auf oder nehmen den Kurs vom Tag der Einbuchung.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {importSummary.corpActionHoldings
                          .filter(h => !importSummary.transferHoldings.find(t => t.symbol === h.symbol))
                          .map(h => (
                          <span key={h.symbol} className="text-[10px] font-medium px-1.5 py-0.5 bg-white/[0.05] text-neutral-300 border border-white/[0.08] rounded">
                            {h.symbol}{h.avgPrice === 0 ? ' · Einstand offen' : ''}
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
                        Existieren bereits im Depot und werden übersprungen. Nur {importSummary.newTransactions} neue Transaktionen werden importiert.
                      </p>

                      {showDuplicateDetails && duplicateTransactions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-amber-500/10">
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {duplicateTransactions.map((tx, i) => {
                              const typeConfig = TYPE_LABELS[tx.type]
                              return (
                                <div key={i} className="flex items-center justify-between py-1 px-2 bg-white/[0.04] rounded text-xs">
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
                      <span key={type} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.05] border border-white/[0.08] text-neutral-300">
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
                  <div className="max-h-60 overflow-y-auto border border-white/[0.06] rounded-xl overflow-hidden">
                    {previewHoldings.sort((a, b) => (b.quantity * b.avgPrice) - (a.quantity * a.avgPrice)).map(h => (
                      <div key={h.symbol} className="flex items-center justify-between py-2.5 px-3.5 border-b border-white/[0.05] last:border-b-0 hover:bg-white/[0.04] transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-white text-[13px]">{h.symbol}</span>
                            {h.fromTransfer && (
                              <span className="text-[9px] font-medium px-1 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded" title="Einstandskurs basiert auf Depotübertrag">
                                Transfer
                              </span>
                            )}
                            {h.fromCorpAction && !h.fromTransfer && (
                              <span className="text-[9px] font-medium px-1 py-0.5 bg-white/[0.08] text-neutral-300 border border-white/[0.14] rounded" title="Aus Corporate Action">
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

              {/* Ungültige Zeilen blockieren den ganzen Import — lieber gar
                  nichts schreiben als einen halben Import stehen lassen. */}
              {importValidationIssues.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-[12px] font-medium text-red-400 mb-1">
                    Import nicht möglich: {importValidationIssues.reduce((n, i) => n + i.count, 0)} Buchungen lassen sich so nicht speichern
                  </p>
                  <p className="text-[11px] text-neutral-400 mb-2">
                    Es wird nichts geschrieben, solange diese Zeilen in der Datei bzw. Zuordnung stehen.
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {importValidationIssues.map(issue => (
                      <li key={`${issue.key}|${issue.message}`} className="text-[11px] text-neutral-300">
                        <span className="font-mono text-neutral-400">{issue.isin || issue.key}</span>
                        {issue.name && issue.isin && <span className="text-neutral-500 ml-1.5">{issue.name}</span>}
                        <span className="block text-red-400/90">
                          {issue.message} · {issue.count} Buchung{issue.count === 1 ? '' : 'en'}
                          {issue.firstDate ? ` ab ${issue.firstDate}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
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
              <div className="mt-4 max-w-xs mx-auto bg-white/[0.06] rounded-full h-1 overflow-hidden">
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
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                  <CheckIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight">Import abgeschlossen</h3>
                <p className="text-[13px] text-neutral-500">
                  Dein Depot wurde erfolgreich aktualisiert.
                </p>
              </div>

              {/* Ergebnis-Breakdown */}
              <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-4">
                <div className="flex items-center justify-between py-2.5 px-4 bg-white/[0.03]">
                  <span className="text-[13px] text-neutral-400">Transaktionen gespeichert</span>
                  <span className="text-[13px] font-semibold text-white tabular-nums">
                    {importResult.transactionsSaved} <span className="text-neutral-500 font-normal">/ {importResult.transactionsAttempted}</span>
                  </span>
                </div>

                {importResult.duplicatesSkipped > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-white/[0.06]">
                    <span className="text-[13px] text-neutral-400">Duplikate übersprungen</span>
                    <span className="text-[13px] font-semibold text-amber-400 tabular-nums">{importResult.duplicatesSkipped}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5 px-4 border-t border-white/[0.06]">
                  <span className="text-[13px] text-neutral-400">Positionen neu erstellt</span>
                  <span className="text-[13px] font-semibold text-white tabular-nums">{importResult.holdingsCreated}</span>
                </div>

                {importResult.holdingsUpdated > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-white/[0.06]">
                    <span className="text-[13px] text-neutral-400">Positionen aufgestockt</span>
                    <span className="text-[13px] font-semibold text-white tabular-nums">{importResult.holdingsUpdated}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2.5 px-4 border-t border-white/[0.06]">
                  <span className="text-[13px] text-neutral-400">
                    {importResult.cashMode === 'include' ? 'Cash-Bewegungen' : 'Cash ignoriert'}
                  </span>
                  <span className={`text-[13px] font-semibold tabular-nums ${importResult.cashMode === 'include' ? 'text-white' : 'text-neutral-500'}`}>
                    {importResult.cashMode === 'include' ? importResult.cashTransactionsImported : '—'}
                  </span>
                </div>

                {importResult.unresolvedSymbols > 0 && (
                  <div className="flex items-center justify-between py-2.5 px-4 border-t border-white/[0.06]">
                    <span className="text-[13px] text-amber-400">Nicht zugeordnet</span>
                    <span className="text-[13px] font-semibold text-amber-400 tabular-nums">{importResult.unresolvedSymbols}</span>
                  </div>
                )}

              </div>

              {/* Eine fehlgeschlagene Kapitalmaßnahme oder fehlende Position
                  verzerrt die Rendite — das darf nicht nur in der Konsole stehen. */}
              {(importResult.holdingWarnings.length > 0 || importResult.corpActionWarnings.length > 0) && (
                <div className="mb-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-amber-300 mb-1">Bitte prüfen</p>
                    <ul className="space-y-1 text-[11px] text-neutral-400 leading-relaxed">
                      {[...importResult.holdingWarnings, ...importResult.corpActionWarnings].map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {importResult.estimatedCosts.length > 0 && (
                <div className="mb-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-[12px] font-medium text-white mb-1">Einstand geschätzt</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mb-1.5">
                    Die Datei nennt keinen Einstand, deshalb steht dort der Kurs vom Tag der Einbuchung. Du kannst ihn in der Position ändern.
                  </p>
                  <ul className="space-y-0.5 text-[11px] text-neutral-400">
                    {importResult.estimatedCosts.map(c => (
                      <li key={c.symbol}>
                        {c.symbol}: {formatCurrency(c.price)} ({new Date(`${c.date}T00:00:00`).toLocaleDateString('de-DE')})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status-Hinweis */}
              {importResult.transactionsSaved < importResult.transactionsAttempted - importResult.duplicatesSkipped ? (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-400/90 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-neutral-400 leading-relaxed">
                    Nicht alle Transaktionen konnten gespeichert werden. Prüfe dein Depot und wiederhole ggf. den Import.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex gap-2.5">
                  <CheckIcon className="w-4 h-4 text-neutral-300 flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] text-neutral-400 leading-relaxed">
                    {importResult.holdingWarnings.length > 0
                      ? 'Alle Transaktionen gespeichert. Bei den Positionen oben fehlt noch etwas.'
                      : 'Alle Transaktionen erfolgreich importiert. Dein Depot ist jetzt bereit.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-white/[0.08] flex-shrink-0">
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
            {step === 'columns' && (
              <button
                onClick={() => { setColumnError(null); setStep('upload') }}
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

            {/* Step Spalten → Datei mit Zuordnung lesen */}
            {step === 'columns' && (
              <button
                onClick={handleColumnImport}
                disabled={columnBusy || !!columnMappingError}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:bg-white/[0.08] disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
              >
                {columnBusy && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                {columnBusy ? 'Datei wird gelesen…' : aiSuggested ? 'Zuordnung bestätigen' : 'Weiter'}
                {!columnBusy && <ArrowRightIcon className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Step Resolve → Cash */}
            {step === 'resolve' && (
              <button
                onClick={() => { setStep('cash') }}
                disabled={resolving}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-neutral-100 disabled:bg-white/[0.08] disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
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
                disabled={importing || !importSummary || importSummary.totalTransactions === 0 || checkingDuplicates || importValidationIssues.length > 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/[0.08] disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[13px] font-semibold rounded-lg transition-colors"
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
