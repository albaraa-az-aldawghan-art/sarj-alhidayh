interface Props {
  value: number
  max: number
  label?: string
  showPercent?: boolean
  color?: 'gold' | 'green' | 'blue'
}

export default function ProgressBar({ value, max, label, showPercent = true, color = 'gold' }: Props) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  const bg = color === 'gold' ? 'bg-gold' : color === 'green' ? 'bg-green-500' : 'bg-blue-500'

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-brown font-medium">{label}</span>}
          {showPercent && <span className="text-xs text-brown-dark font-bold">{pct}%</span>}
        </div>
      )}
      <div className="w-full bg-sand-light rounded-full h-3 overflow-hidden">
        <div
          className={`${bg} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-brown-light">{value}</span>
        <span className="text-xs text-brown-light">{max}</span>
      </div>
    </div>
  )
}
