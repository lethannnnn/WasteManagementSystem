import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface RewardStat {
  reward_id:       string
  reward_name:     string
  redeemed_count:  number
  stock_quantity:  number
  points_required: number
}

interface DayStat { date: string; count: number }

export default function AnalyticsPage() {
  const { sponsor }       = useAuth()
  const [stats, setStats] = useState<RewardStat[]>([])
  const [daily, setDaily] = useState<DayStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (sponsor?.id) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)
    const { data: rewards } = await supabase
      .from('rewards')
      .select('reward_id, reward_name, redeemed_count, stock_quantity, points_required')
      .eq('sponsor_id', sponsor!.id)
      .order('redeemed_count', { ascending: false })

    setStats(rewards ?? [])

    const rewardIds = (rewards ?? []).map((r: any) => r.reward_id)
    if (rewardIds.length > 0) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('redeemed_at')
        .in('reward_id', rewardIds)
        .gte('redeemed_at', thirtyDaysAgo.toISOString())

      const grouped: Record<string, number> = {}
      for (const r of redemptions ?? []) {
        const date = r.redeemed_at.split('T')[0]
        grouped[date] = (grouped[date] ?? 0) + 1
      }

      setDaily(
        Object.entries(grouped)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date))
      )
    }
    setLoading(false)
  }

  const maxCount         = Math.max(...daily.map(d => d.count), 1)
  const totalRedeemed    = stats.reduce((s, r) => s + r.redeemed_count, 0)
  const totalPoints      = stats.reduce((s, r) => s + r.redeemed_count * r.points_required, 0)
  const topReward        = stats[0]?.reward_name ?? '—'
  const avgPts           = totalRedeemed > 0 ? Math.round(totalPoints / totalRedeemed) : 0

  const SUMMARY = [
    { label: 'Total Redemptions', value: totalRedeemed,              sub: 'all time' },
    { label: 'Points Distributed', value: totalPoints.toLocaleString(), sub: 'points given out' },
    { label: 'Avg Points / Redemption', value: avgPts.toLocaleString(), sub: topReward !== '—' ? `Top: ${topReward}` : 'no data yet' },
  ]

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1>Analytics</h1>
        <p>Last 30 days redemption activity</p>
      </div>

      {loading ? <div className="sp-loading-state">Loading…</div> : (
        <>
          {/* Summary cards */}
          <div className="sp-metric-cards">
            {SUMMARY.map(c => (
              <div key={c.label} className="sp-metric-card">
                <div className="sp-metric-value">{c.value}</div>
                <div className="sp-metric-label">{c.label}</div>
                <div className="sp-metric-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="sp-section">
            <h2>Redemptions Over Time</h2>
            {daily.length === 0 ? (
              <div className="sp-empty-state">No redemptions in the last 30 days.</div>
            ) : (
              <div className="sp-chart-wrap">
                <div className="sp-bar-chart">
                  {daily.map(d => (
                    <div key={d.date} className="sp-bar-col">
                      <div className="sp-bar-val">{d.count > 0 ? d.count : ''}</div>
                      <div className="sp-bar" style={{ height: `${(d.count / maxCount) * 100}%` }} />
                      <div className="sp-bar-label">{d.date.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Per-reward breakdown */}
          <div className="sp-section">
            <h2>Reward Breakdown</h2>
            {stats.length === 0 ? (
              <div className="sp-empty-state">No rewards found.</div>
            ) : (
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Reward</th>
                    <th>Points</th>
                    <th>Redeemed</th>
                    <th>Stock Left</th>
                    <th>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(r => {
                    const used = r.stock_quantity > 0
                      ? Math.min(100, Math.round((r.redeemed_count / r.stock_quantity) * 100))
                      : 0
                    return (
                      <tr key={r.reward_id}>
                        <td>{r.reward_name}</td>
                        <td>{r.points_required.toLocaleString()} pts</td>
                        <td>{r.redeemed_count}</td>
                        <td>{Math.max(0, r.stock_quantity - r.redeemed_count)}</td>
                        <td>
                          <div className="sp-usage-bar">
                            <div className="sp-usage-fill" style={{ width: `${used}%` }} />
                          </div>
                          <span className="sp-usage-pct">{used}%</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
