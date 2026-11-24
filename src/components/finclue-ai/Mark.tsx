// Das Vier-Felder-Motiv aus dem Finclue-Logo als Anzeige der KI: in Ruhe zwei
// Felder wie im Logo, beim Arbeiten füllt es sich, fertig ist es voll.

import './finclue-ai.css'

export default function Mark({ size = 13, filled }: { size?: number; filled?: number }) {
  const on = (i: number) => (filled == null ? i === 0 || i === 3 : i < filled)
  return (
    <svg className="fai-mark" width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <rect className={on(0) ? 'on' : ''} x="0" y="0" width="5" height="5" rx="1.2" />
      <rect className={on(1) ? 'on' : ''} x="7" y="0" width="5" height="5" rx="1.2" />
      <rect className={on(2) ? 'on' : ''} x="0" y="7" width="5" height="5" rx="1.2" />
      <rect className={on(3) ? 'on' : ''} x="7" y="7" width="5" height="5" rx="1.2" />
    </svg>
  )
}
