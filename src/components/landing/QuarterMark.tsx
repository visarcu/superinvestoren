// Das Motiv aus dem Finclue-Logo: vier Felder. `filled` füllt die ersten n
// (Schritt 1, 2, 3 …), `only` hebt genau ein Feld hervor (z. B. das Quartal).

export default function QuarterMark({
  filled = 0,
  only,
  size = 12,
  light = false,
}: {
  filled?: number
  only?: number
  size?: number
  light?: boolean
}) {
  const cell = (size - 2) / 2
  const on = light ? '#111210' : '#ECEDE8'
  const off = light ? '#D9DBD2' : '#3A3D36'
  const positions = [
    [0, 0],
    [cell + 2, 0],
    [0, cell + 2],
    [cell + 2, cell + 2],
  ]
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      {positions.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={cell}
          height={cell}
          rx={size > 20 ? 2.5 : 1.5}
          fill={(only ? i + 1 === only : i < filled) ? on : off}
        />
      ))}
    </svg>
  )
}
