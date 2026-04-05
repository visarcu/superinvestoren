'use client'

// src/components/tour/ProductTour.tsx
// Interaktive Onboarding-Tour — navigiert den User durch alle Key-Features
// Status wird in Supabase (profiles.tour_completed) gespeichert.
// localStorage dient als schneller Cache um Supabase-Calls bei jedem Laden zu vermeiden.

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { TOUR_STEPS, TOUR_LS_COMPLETED, TOUR_LS_STEP, TOUR_LS_ACTIVE } from '@/lib/tourConfig'

const TOOLTIP_W = 320
const TOOLTIP_H = 200
const GAP = 14

interface SpotlightRect { top: number; left: number; width: number; height: number }
interface TooltipPos    { top: number; left: number }

export function ProductTour() {
  const router   = useRouter()
  const pathname = usePathname()

  const [active, setActive]       = useState(false)
  const [stepIdx, setStepIdx]     = useState(0)
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null)
  const [tooltip, setTooltip]     = useState<TooltipPos | null>(null)
  const [visible, setVisible]     = useState(false)
  const rafRef   = useRef<number | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = TOUR_STEPS[stepIdx]

  // ── Init: Supabase prüfen ob Tour bereits abgeschlossen ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Schneller Cache-Check — kein Supabase-Call nötig
    if (localStorage.getItem(TOUR_LS_COMPLETED)) return

    const init = async () => {
      // Eingeloggten User laden
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Supabase-Status prüfen
      const { data: profile } = await supabase
        .from('profiles')
        .select('tour_completed')
        .eq('user_id', user.id)
        .single()

      if (profile?.tour_completed) {
        // Tour schon abgeschlossen → localStorage cachen, nie wieder zeigen
        localStorage.setItem(TOUR_LS_COMPLETED, '1')
        return
      }

      // Tour noch nicht abgeschlossen → starten oder fortsetzen
      const isActive  = localStorage.getItem(TOUR_LS_ACTIVE)
      const savedStep = localStorage.getItem(TOUR_LS_STEP)

      if (isActive) {
        setStepIdx(savedStep ? parseInt(savedStep, 10) : 0)
        setActive(true)
      } else {
        setTimeout(() => {
          localStorage.setItem(TOUR_LS_ACTIVE, '1')
          localStorage.setItem(TOUR_LS_STEP, '0')
          setActive(true)
          setStepIdx(0)
        }, 1200)
      }
    }

    init()
  }, [])

  // ── Zur richtigen Route navigieren wenn Step sich ändert ───────────────────
  useEffect(() => {
    if (!active || !step) return
    if (pathname !== step.route) {
      setVisible(false)
      setSpotlight(null)
      setTooltip(null)
      router.push(step.route)
    }
  }, [active, stepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Element messen und Spotlight/Tooltip positionieren ────────────────────
  const measureAndPosition = useCallback(() => {
    if (!step || !active) return
    const el = document.querySelector<HTMLElement>(step.selector)
    if (!el) return

    const rect    = el.getBoundingClientRect()
    const PADDING = 6

    const spot: SpotlightRect = {
      top:    rect.top    - PADDING,
      left:   rect.left   - PADDING,
      width:  rect.width  + PADDING * 2,
      height: rect.height + PADDING * 2,
    }
    setSpotlight(spot)

    let top = 0, left = 0
    if (step.position === 'bottom') {
      top  = rect.bottom + GAP
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2
    } else if (step.position === 'top') {
      top  = rect.top - TOOLTIP_H - GAP
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2
    } else if (step.position === 'right') {
      top  = rect.top + rect.height / 2 - TOOLTIP_H / 2
      left = rect.right + GAP
    } else {
      top  = rect.top + rect.height / 2 - TOOLTIP_H / 2
      left = rect.left - TOOLTIP_W - GAP
    }

    left = Math.max(16, Math.min(left, window.innerWidth  - TOOLTIP_W - 16))
    top  = Math.max(16, Math.min(top,  window.innerHeight - TOOLTIP_H - 16))

    setTooltip({ top, left })
    setVisible(true)
  }, [step, active])

  // ── Element suchen mit Retry falls Seite noch lädt ────────────────────────
  useEffect(() => {
    if (!active || !step || pathname !== step.route) return

    setVisible(false)
    setSpotlight(null)

    const tryFind = () => {
      if (document.querySelector(step.selector)) {
        measureAndPosition()
      } else {
        retryRef.current = setTimeout(tryFind, 300)
      }
    }
    retryRef.current = setTimeout(tryFind, 400)

    return () => { if (retryRef.current) clearTimeout(retryRef.current) }
  }, [active, stepIdx, pathname, measureAndPosition, step])

  // ── Spotlight per RAF nachführen (Scroll/Resize) ───────────────────────────
  useEffect(() => {
    if (!active || !visible) return
    const track = () => {
      measureAndPosition()
      rafRef.current = requestAnimationFrame(track)
    }
    rafRef.current = requestAnimationFrame(track)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, visible, measureAndPosition])

  // ── Tour abschließen — in Supabase + localStorage speichern ───────────────
  const completeTour = useCallback(async () => {
    // Sofort UI schließen
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setActive(false)
    setSpotlight(null)
    setTooltip(null)

    // localStorage-Cache setzen
    localStorage.setItem(TOUR_LS_COMPLETED, '1')
    localStorage.removeItem(TOUR_LS_ACTIVE)
    localStorage.removeItem(TOUR_LS_STEP)

    // In Supabase persistieren
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed: true })
        .eq('user_id', user.id)
    }
  }, [])

  const goToStep = useCallback((next: number) => {
    setVisible(false)
    setSpotlight(null)
    setTooltip(null)
    localStorage.setItem(TOUR_LS_STEP, String(next))
    setStepIdx(next)
  }, [])

  const handleNext = useCallback(() => {
    if (stepIdx >= TOUR_STEPS.length - 1) completeTour()
    else goToStep(stepIdx + 1)
  }, [stepIdx, completeTour, goToStep])

  const handlePrev = useCallback(() => {
    if (stepIdx > 0) goToStep(stepIdx - 1)
  }, [stepIdx, goToStep])

  if (!active || !step) return null

  return (
    <>
      {/* Overlay mit Spotlight-Ausschnitt */}
      <div className="fixed inset-0 z-[9998] pointer-events-none">
        {spotlight && visible && (
          <svg className="absolute inset-0 w-full h-full" style={{ display: 'block' }}>
            <defs>
              <mask id="tour-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlight.left} y={spotlight.top}
                  width={spotlight.width} height={spotlight.height}
                  rx="8" fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-spotlight-mask)" />
          </svg>
        )}
      </div>

      {/* Highlight-Ring */}
      {spotlight && visible && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg"
          style={{
            top: spotlight.top, left: spotlight.left,
            width: spotlight.width, height: spotlight.height,
            boxShadow: '0 0 0 2px #4ade80, 0 0 0 4px rgba(74,222,128,0.2)',
            transition: 'top 0.15s, left 0.15s, width 0.15s, height 0.15s',
          }}
        />
      )}

      {/* Tooltip-Karte */}
      {tooltip && visible && (
        <div
          className="fixed z-[10000] bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/[0.08] rounded-2xl shadow-2xl"
          style={{ top: tooltip.top, left: tooltip.left, width: TOOLTIP_W, opacity: visible ? 1 : 0, transition: 'opacity 0.2s ease' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className="rounded-full transition-all duration-200 focus:outline-none"
                  style={{
                    width:      i === stepIdx ? 16 : 6,
                    height:     6,
                    background: i === stepIdx ? '#4ade80' : i < stepIdx ? 'rgba(74,222,128,0.35)' : 'rgba(156,163,175,0.3)',
                  }}
                />
              ))}
            </div>
            <button
              onClick={completeTour}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5"
              title="Tour beenden"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pt-3 pb-4">
            <p className="text-[11px] font-semibold text-brand-light uppercase tracking-widest mb-1">
              {stepIdx + 1} / {TOUR_STEPS.length}
            </p>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1.5 leading-snug">
              {step.title}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-4">
            <button
              onClick={completeTour}
              className="text-[12px] text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              Überspringen
            </button>
            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <button
                  onClick={handlePrev}
                  className="text-[13px] px-3 py-1.5 rounded-lg font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  ← Zurück
                </button>
              )}
              <button
                onClick={handleNext}
                className="text-[13px] px-4 py-1.5 rounded-lg font-semibold bg-brand hover:bg-green-400 text-black transition-colors"
              >
                {stepIdx === TOUR_STEPS.length - 1 ? 'Fertig 🎉' : 'Weiter →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
