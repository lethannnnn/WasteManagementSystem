import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface RankedReward {
  rank: number
  rewardId: string
  name: string
  category: string
  points: number
  count: number
  pct: number
}

async function fetchRewardsRanking(): Promise<RankedReward[]> {
  const { data } = await supabase
    .from('redemptions')
    .select('reward_id, rewards(reward_name, category, points_required)')

  const counts: Record<string, { name: string; category: string; points: number; count: number }> = {}
  for (const r of data ?? []) {
    const id = r.reward_id
    if (!counts[id]) {
      counts[id] = {
        name:     (r.rewards as any)?.reward_name ?? 'Unknown',
        category: (r.rewards as any)?.category ?? 'General',
        points:   (r.rewards as any)?.points_required ?? 0,
        count:    0,
      }
    }
    counts[id].count++
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)

  const max = sorted[0]?.[1]?.count ?? 1

  return sorted.map(([id, v], i) => ({
    rank:     i + 1,
    rewardId: id,
    name:     v.name,
    category: v.category,
    points:   v.points,
    count:    v.count,
    pct:      Math.round((v.count / max) * 100),
  }))
}

const RANK_CLASS = ['gold', 'silver', 'bronze', '', '']

export default function RewardsRanking() {
  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ['rewards-ranking'],
    queryFn:  fetchRewardsRanking,
  })

  return (
    <>
      <div className="chart-header">
        <h3>Popular Rewards Ranking</h3>
        <span className="chart-subtitle">Most redeemed — all time</span>
      </div>
      <div className="rewards-ranking">
        {isLoading ? (
          <p style={{ padding: '1rem', color: '#64748b' }}>Loading...</p>
        ) : ranking.length === 0 ? (
          <p style={{ padding: '1rem', color: '#64748b' }}>No redemptions yet.</p>
        ) : (
          ranking.map(r => (
            <div key={r.rewardId} className="reward-rank-item">
              <div className={`rank-badge ${RANK_CLASS[r.rank - 1]}`}>{r.rank}</div>
              <div className="reward-info">
                <h4>{r.name}</h4>
                <p>{r.category} &bull; {r.points} points</p>
              </div>
              <div className="reward-metrics">
                <span className="redeemed-count">{r.count}</span>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
