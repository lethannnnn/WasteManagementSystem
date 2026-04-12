import type { Analytics } from '../../types'

const MATERIAL_COLORS: Record<string, string> = {
  plastic:     '#ef4444',
  paper:       '#f59e0b',
  metal:       '#6b7280',
  glass:       '#06b6d4',
  electronics: '#8b5cf6',
  textiles:    '#ec4899',
}

interface Props {
  analytics: Analytics | null
  isLoading: boolean
  materials: string[]
}

export default function VolumeChart({ analytics, isLoading, materials }: Props) {
  const monthlyData  = analytics?.monthlyData ?? []
  const maxWeight    = Math.max(...monthlyData.map(m => (m.totalWeight ?? 0) / 1000), 0.001)

  return (
    <>
      <div className="chart-header">
        <h3>Total Recycling Volume</h3>
        <div className="chart-stats">
          <span className="stat-item">
            <strong>{isLoading ? '—' : `${((analytics?.totalWeight ?? 0) / 1000).toFixed(1)} tons`}</strong> total recycled
          </span>
          <span className="stat-item">
            <strong>{analytics?.totalPickups ?? 0}</strong> pickups
          </span>
        </div>
      </div>

      <div className="chart-content">
        <div className="volume-chart">
          <div className="line-graph-container">
            <div className="y-axis">
              {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map(v => (
                <div key={v} className="y-axis-line">
                  <span className="y-label">{v}t</span>
                  <div className="grid-line"></div>
                </div>
              ))}
            </div>

            <div className="graph-area">
              <svg className="line-graph-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {monthlyData.length > 0 && (
                  <>
                    <path
                      d={`M 0 ${200 - ((monthlyData[0]?.totalWeight ?? 0) / 1000) / maxWeight * 180}
                        ${monthlyData.map((m, i) =>
                          `L ${(i + 1) * (400 / monthlyData.length)} ${200 - ((m.totalWeight ?? 0) / 1000) / maxWeight * 180}`
                        ).join(' ')} L 400 200 L 0 200 Z`}
                      fill="url(#volumeGradient)"
                    />
                    <path
                      d={`M 0 ${200 - ((monthlyData[0]?.totalWeight ?? 0) / 1000) / maxWeight * 180}
                        ${monthlyData.map((m, i) =>
                          `L ${(i + 1) * (400 / monthlyData.length)} ${200 - ((m.totalWeight ?? 0) / 1000) / maxWeight * 180}`
                        ).join(' ')}`}
                      stroke="#6366f1" strokeWidth="3" fill="none"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                    {monthlyData.map((m, i) => (
                      <circle
                        key={i}
                        cx={(i + 1) * (400 / monthlyData.length)}
                        cy={200 - ((m.totalWeight ?? 0) / 1000) / maxWeight * 180}
                        r="5" fill="#6366f1" stroke="white" strokeWidth="2"
                        data-month={m.month} data-weight={((m.totalWeight ?? 0) / 1000).toFixed(1)}
                      />
                    ))}
                  </>
                )}
              </svg>
            </div>

            <div className="x-axis">
              {monthlyData.map((m, i) => (
                <div key={i} className="x-label" style={{ left: `${((i + 1) / monthlyData.length) * 100}%` }}>
                  {m.month}
                </div>
              ))}
            </div>
          </div>

          <div className="material-legend">
            {materials.filter(mat => (analytics?.materialBreakdown?.[mat] ?? 0) > 0).map(mat => (
              <div key={mat} className="legend-item">
                <span className="legend-dot" style={{ background: MATERIAL_COLORS[mat] }}></span>
                <span className="legend-text">
                  {mat.charAt(0).toUpperCase() + mat.slice(1)}
                  <span className="legend-stats"> ({(analytics?.materialBreakdown?.[mat] ?? 0).toFixed(1)} kg)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
