import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

interface Metrics {
  activeRewards:     number
  totalRewards:      number
  redemptionsMonth:  number
  pointsDistributed: number
  stockRemaining:    number
}

interface RecentRedemption {
  id:          string
  reward_name: string
  points:      number
  redeemed_at: string
}

export default function DashboardPage() {
  const { sponsor }               = useAuth()
  const [metrics, setMetrics]     = useState<Metrics | null>(null)
  const [recent,  setRecent]      = useState<RecentRedemption[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => { if (sponsor?.id) load() }, [sponsor?.id])

  async function load() {
    setLoading(true)

    const { data: rewards } = await supabase
      .from('rewards')
      .select('reward_id, is_active, stock_quantity, redeemed_count')
      .eq('sponsor_id', sponsor!.id)

    const allRewards    = rewards ?? []
    const rewardIds     = allRewards.map((r: any) => r.reward_id)
    const activeCount   = allRewards.filter((r: any) => r.is_active).length
    const stockRemaining = allRewards
      .filter((r: any) => r.is_active)
      .reduce((s: number, r: any) => s + Math.max(0, (r.stock_quantity ?? 0) - (r.redeemed_count ?? 0)), 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    let redemptionsMonth  = 0
    let pointsDistributed = 0
    let recentRows: RecentRedemption[] = []

    if (rewardIds.length > 0) {
      const [{ count }, { data: points }, { data: recentData }] = await Promise.all([
        supabase.from('redemptions')
          .select('redemption_id', { count: 'exact', head: true })
          .in('reward_id', rewardIds)
          .gte('redeemed_at', monthStart.toISOString()),
        supabase.from('redemptions')
          .select('points_spent')
          .in('reward_id', rewardIds),
        supabase.from('redemptions')
          .select('redemption_id, points_spent, redeemed_at, rewards(reward_name)')
          .in('reward_id', rewardIds)
          .order('redeemed_at', { ascending: false })
          .limit(5),
      ])
      redemptionsMonth  = count ?? 0
      pointsDistributed = (points ?? []).reduce((s: number, r: any) => s + (r.points_spent ?? 0), 0)
      recentRows = (recentData ?? []).map((r: any) => ({
        id:          r.redemption_id,
        reward_name: r.rewards?.reward_name ?? '—',
        points:      r.points_spent,
        redeemed_at: r.redeemed_at,
      }))
    }

    setMetrics({ activeRewards: activeCount, totalRewards: allRewards.length, redemptionsMonth, pointsDistributed, stockRemaining })
    setRecent(recentRows)
    setLoading(false)
  }

  const CARDS = metrics ? [
    { label: 'Active Rewards',      value: metrics.activeRewards,                         sub: `of ${metrics.totalRewards} total` },
    { label: 'Redemptions (Month)', value: metrics.redemptionsMonth,                      sub: 'this calendar month' },
    { label: 'Points Distributed',  value: metrics.pointsDistributed.toLocaleString(),    sub: 'total across all rewards' },
    { label: 'Stock Remaining',     value: metrics.stockRemaining.toLocaleString(),        sub: 'units across active rewards' },
  ] : []

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <h1>Campaign Overview</h1>
        <p>Welcome back, <strong>{sponsor?.company_name}</strong></p>
      </div>

      {loading ? (
        <div className="sp-loading-state">Loading…</div>
      ) : (
        <>
          <div className="sp-metric-cards sp-metric-cards-4">
            {CARDS.map(c => (
              <div key={c.label} className="sp-metric-card">
                <div className="sp-metric-value">{c.value}</div>
                <div className="sp-metric-label">{c.label}</div>
                <div className="sp-metric-sub">{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="sp-section">
            <div className="sp-section-head">
              <h2>Recent Redemptions</h2>
              <Link to="/dashboard/analytics" className="sp-link">View all →</Link>
            </div>
            {recent.length === 0 ? (
              <div className="sp-empty-state">No redemptions yet. <Link to="/dashboard/rewards">Create a reward</Link> to get started.</div>
            ) : (
              <table className="sp-table">
                <thead>
                  <tr><th>Reward</th><th>Points</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.reward_name}</td>
                      <td>{r.points.toLocaleString()} pts</td>
                      <td>{new Date(r.redeemed_at).toLocaleDateString('en-MY')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
