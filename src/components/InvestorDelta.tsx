
  // components/InvestorDelta.tsx
  export function InvestorDelta({
    name, delta, pct, positive
  }: { name: string; delta: number; pct: number; positive?: boolean }) {
    const sign = positive ? '+' : '−'
    const color = positive ? 'text-green-200' : 'text-red-200'
    const mono  = 'font-mono'
    return (
      <div className="flex-1">
        <p className="text-white font-medium">{name}</p>
        <p className={`${color} text-sm`}>
          {sign}{delta.toLocaleString('de-DE')} &nbsp;
          <span className={mono}>
            ({(pct * 100).toFixed(1).replace('.', ',')} %)
          </span>
        </p>
      </div>
    )
  }