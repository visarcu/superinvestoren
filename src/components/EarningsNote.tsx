'use client'

// Hinweis auf der Bewertungsseite, wenn der Gewinn der letzten zwölf Monate von
// Sondereinflüssen geprägt ist. Ohne Auffälligkeit rendert die Karte nichts.

import { useEarningsQuality } from '@/hooks/useEarningsQuality'
import { describeEarnings, isSolid } from '@/lib/earningsQualityRules'

export default function EarningsNote({ ticker }: { ticker: string }) {
  const quality = useEarningsQuality(ticker)
  if (!quality) return null
  const text = describeEarnings(quality)

  return (
    <section className="bg-theme-card rounded-xl border border-theme px-6 py-4">
      <h3 className="text-sm font-semibold text-theme-primary">
        {quality.amount > 0 ? 'Gewinn enthält hohe Sondererträge' : 'Gewinn durch Sonderbelastungen gedrückt'}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-theme-secondary">{text.long}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-theme-muted">
        {isSolid(quality)
          ? 'Das bereinigte KGV ist überschlägig, die Steuer ist anteilig herausgerechnet. '
          : ''}
        Betroffen sind auch PEG, Nettomarge und Eigenkapitalrendite der letzten zwölf Monate. Nicht betroffen: KUV, Cashflow und EV/EBIT.
      </p>
    </section>
  )
}
