interface Props {
  breakdown?: Record<string, number>
}

const COLORS = ['#6366f1','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6']
const LABELS: Record<string, string> = {
  plastic: 'Plastic', paper: 'Paper', metal: 'Metal',
  glass: 'Glass', electronics: 'Electronics', textiles: 'Textiles',
}

export default function MaterialDonut({ breakdown }: Props) {
  const entries = Object.entries(breakdown ?? {}).filter(([, v]) => v > 0)
  const total   = entries.reduce((s, [, v]) => s + v, 0)

  if (!entries.length || total === 0) {
    return (
      <div className="donut-empty">
        <p>No material data yet</p>
      </div>
    )
  }

  const R = 70
  const cx = 90
  const cy = 90
  const circ = 2 * Math.PI * R

  let offset = 0
  const segments = entries.map(([key, val], i) => {
    const pct   = val / total
    const dash  = pct * circ
    const seg   = { key, val, color: COLORS[i % COLORS.length], dash, offset }
    offset += dash
    return seg
  })

  return (
    <>
      <div className="chart-header">
        <h3>Material Breakdown</h3>
        <span className="chart-subtitle">By weight (kg)</span>
      </div>
      <div className="donut-container">
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth="22" />
          {segments.map(s => (
            <circle
              key={s.key}
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeDasharray={`${s.dash} ${circ - s.dash}`}
              strokeDashoffset={-s.offset + circ * 0.25}
              strokeLinecap="butt"
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">
            {total.toFixed(1)}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="10" fill="#64748b">kg total</text>
        </svg>

        <div className="donut-legend">
          {segments.map(s => (
            <div key={s.key} className="donut-legend-item">
              <span className="donut-dot" style={{ background: s.color }} />
              <span className="donut-label">{LABELS[s.key] ?? s.key}</span>
              <span className="donut-pct">{((s.val / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
