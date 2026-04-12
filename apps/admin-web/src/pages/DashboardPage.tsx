import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { SkeletonCard } from '../components/Skeleton'
import type { DashboardMetrics } from '../types'

interface MetricsWithTrend extends DashboardMetrics {
  pickupsTrend:    number
  weightTrend:     number
  usersTrend:      number
  redeemTrend:     number
}

async function fetchMetrics(): Promise<MetricsWithTrend> {
  const now          = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [usersRes, pickupsRes, rewardsRes, redemptionsRes, lastMonthUsersRes, lastMonthRedeemRes] =
    await Promise.all([
      supabase.from('users').select('user_id', { count: 'exact', head: true }),
      supabase.from('pickups').select('total_weight_kg, status, created_at'),
      supabase.from('rewards').select('reward_id', { count: 'exact', head: true }),
      supabase.from('redemptions').select('redemption_id, created_at', { count: 'exact' }),
      supabase.from('users').select('user_id', { count: 'exact', head: true }).lt('created_at', thisMonthStart),
      supabase.from('redemptions').select('redemption_id', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd),
    ])

  const pickups   = pickupsRes.data ?? []
  const completed = pickups.filter(p => p.status === 'completed')
  const totalWeight = completed.reduce((sum, p) => sum + (p.total_weight_kg ?? 0), 0)

  const thisMonthPickups = completed.filter(p => p.created_at >= thisMonthStart)
  const lastMonthPickups = completed.filter(p => p.created_at >= lastMonthStart && p.created_at <= lastMonthEnd)
  const thisWeight = thisMonthPickups.reduce((s, p) => s + (p.total_weight_kg ?? 0), 0)
  const lastWeight = lastMonthPickups.reduce((s, p) => s + (p.total_weight_kg ?? 0), 0)

  const pctDiff = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100)

  const totalRedeemed   = redemptionsRes.count ?? 0
  const lastMonthRedeem = lastMonthRedeemRes.count ?? 0
  const thisMonthRedeem = totalRedeemed - (lastMonthRedeem)

  return {
    totalUsers:       usersRes.count ?? 0,
    totalWeightKg:    totalWeight,
    completedPickups: completed.length,
    totalPickups:     pickups.length,
    availableRewards: rewardsRes.count ?? 0,
    totalRedeemed,
    pickupsTrend: pctDiff(thisMonthPickups.length, lastMonthPickups.length),
    weightTrend:  pctDiff(thisWeight, lastWeight),
    usersTrend:   pctDiff(usersRes.count ?? 0, lastMonthUsersRes.count ?? 0),
    redeemTrend:  pctDiff(thisMonthRedeem, lastMonthRedeem),
  }
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="metric-change neutral">No change vs last month</span>
  return (
    <span className={`metric-change ${value > 0 ? 'positive' : 'negative'}`}>
      {value > 0 ? '↑' : '↓'} {Math.abs(value)}% vs last month
    </span>
  )
}

async function fetchPickupPipeline() {
  const { data } = await supabase.from('pickups').select('status')
  const counts = { pending: 0, confirmed: 0, in_progress: 0, completed: 0 }
  ;(data ?? []).forEach(p => {
    const s = p.status as keyof typeof counts
    if (s in counts) counts[s]++
  })
  return counts
}

async function fetchAlerts() {
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const [staleRes, lowStockRes] = await Promise.all([
    supabase.from('pickups').select('pickup_id', { count: 'exact', head: true })
      .eq('status', 'pending').lt('created_at', oneDayAgo),
    supabase.from('rewards').select('reward_id, reward_name, stock_quantity')
      .lte('stock_quantity', 5).eq('is_active', true),
  ])
  return {
    stalePending:    staleRes.count ?? 0,
    lowStockRewards: (lowStockRes.data ?? []).map(r => ({
      name:  r.reward_name,
      stock: r.stock_quantity ?? 0,
    })),
  }
}

async function fetchTopCollectors() {
  const { data } = await supabase
    .from('collectors')
    .select('collector_id, total_collections, rating, users(full_name)')
    .order('total_collections', { ascending: false })
    .limit(3)
  return (data ?? []).map(c => ({
    id:      c.collector_id,
    name:    (c.users as any)?.full_name ?? 'Unknown',
    pickups: c.total_collections ?? 0,
    rating:  c.rating ?? 0,
  }))
}

interface ActivityItem {
  id: string
  type: 'pickup' | 'redemption'
  user: string
  text: string
  time: string
}

async function fetchRecentActivity(): Promise<ActivityItem[]> {
  const [pickupsRes, redemptionsRes] = await Promise.all([
    supabase
      .from('pickups')
      .select('pickup_id, created_at, status, total_weight_kg, donors(users(full_name))')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('redemptions')
      .select('redemption_id, created_at, donors(users(full_name)), rewards(reward_name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const pickupItems: ActivityItem[] = (pickupsRes.data ?? []).map(p => ({
    id:   p.pickup_id,
    type: 'pickup',
    user: (p.donors as any)?.users?.full_name ?? 'Unknown user',
    text: p.status === 'completed'
      ? `completed pickup — ${(p.total_weight_kg ?? 0).toFixed(1)} kg recycled`
      : `scheduled a pickup request`,
    time: p.created_at,
  }))

  const redemptionItems: ActivityItem[] = (redemptionsRes.data ?? []).map(r => ({
    id:   r.redemption_id,
    type: 'redemption',
    user: (r.donors as any)?.users?.full_name ?? 'Unknown user',
    text: `redeemed ${(r.rewards as any)?.reward_name ?? 'a reward'}`,
    time: r.created_at,
  }))

  return [...pickupItems, ...redemptionItems]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard-metrics'], queryFn: fetchMetrics })
  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn:  fetchRecentActivity,
  })
  const { data: pipeline }      = useQuery({ queryKey: ['pickup-pipeline'],  queryFn: fetchPickupPipeline })
  const { data: alerts }        = useQuery({ queryKey: ['dashboard-alerts'], queryFn: fetchAlerts })
  const { data: topCollectors = [] } = useQuery({ queryKey: ['top-collectors'], queryFn: fetchTopCollectors })

  const tons    = ((data?.totalWeightKg ?? 0) / 1000).toFixed(1)
  const maxPickups = topCollectors.reduce((m, c) => Math.max(m, c.pickups), 1)

  return (
    <div className="dashboard-content">
      <section className="metrics-section">
        <div className="metrics-grid">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="metric-card"><SkeletonCard /></div>
            ))
          ) : (
            <>
              <div className="metric-card primary">
                <div className="metric-icon">&#x1F465;</div>
                <div className="metric-info">
                  <h3>Total Users</h3>
                  <p className="metric-number">{(data?.totalUsers ?? 0).toLocaleString()}</p>
                  <Trend value={data?.usersTrend ?? 0} />
                </div>
              </div>
              <div className="metric-card success">
                <div className="metric-icon">&#x267B;</div>
                <div className="metric-info">
                  <h3>Total Recycled</h3>
                  <p className="metric-number">{tons} tons</p>
                  <Trend value={data?.weightTrend ?? 0} />
                </div>
              </div>
              <div className="metric-card warning">
                <div className="metric-icon">&#x1F381;</div>
                <div className="metric-info">
                  <h3>Available Rewards</h3>
                  <p className="metric-number">{(data?.availableRewards ?? 0).toLocaleString()}</p>
                  <span className="metric-change neutral">{data?.totalRedeemed ?? 0} total redeemed</span>
                </div>
              </div>
              <div className="metric-card info">
                <div className="metric-icon">&#x1F4CA;</div>
                <div className="metric-info">
                  <h3>Completed Pickups</h3>
                  <p className="metric-number">{(data?.completedPickups ?? 0).toLocaleString()}</p>
                  <Trend value={data?.pickupsTrend ?? 0} />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="dashboard-widgets">
        {/* Pickup Pipeline */}
        <div className="widget pipeline-widget">
          <h3>Pickup Pipeline</h3>
          <div className="pipeline-stages">
            {[
              { key: 'pending',     label: 'Pending',     color: '#f59e0b' },
              { key: 'confirmed',   label: 'Confirmed',   color: '#3b82f6' },
              { key: 'in_progress', label: 'In Progress', color: '#8b5cf6' },
              { key: 'completed',   label: 'Completed',   color: '#22c55e' },
            ].map(({ key, label, color }) => {
              const count = pipeline?.[key as keyof typeof pipeline] ?? 0
              return (
                <div key={key} className="pipeline-stage">
                  <div className="pipeline-count" style={{ color }}>{count}</div>
                  <div className="pipeline-bar-wrap">
                    <div
                      className="pipeline-bar"
                      style={{ background: color, width: `${Math.min(100, (count / Math.max(pipeline?.completed ?? 1, 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="pipeline-label">{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* System Alerts */}
        <div className="widget alerts-widget">
          <h3>System Alerts</h3>
          {!alerts || (alerts.stalePending === 0 && alerts.lowStockRewards.length === 0) ? (
            <div className="alert-ok">
              <span className="alert-ok-icon">✓</span> All systems normal
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.stalePending > 0 && (
                <div className="alert-item warning">
                  <span className="alert-dot warning" />
                  <span>{alerts.stalePending} pickup{alerts.stalePending > 1 ? 's' : ''} pending &gt;24 hours</span>
                </div>
              )}
              {alerts.lowStockRewards.map(r => (
                <div key={r.name} className="alert-item danger">
                  <span className="alert-dot danger" />
                  <span>
                    <strong>{r.name}</strong> — {r.stock === 0 ? 'out of stock' : `only ${r.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Collectors */}
        <div className="widget top-collectors-widget">
          <h3>Top Collectors</h3>
          {topCollectors.length === 0 ? (
            <p className="widget-empty">No collector data yet</p>
          ) : (
            <div className="top-collectors-list">
              {topCollectors.map((c, i) => (
                <div key={c.id} className="top-collector-row">
                  <span className="top-rank">{['🥇','🥈','🥉'][i]}</span>
                  <div className="top-collector-info">
                    <span className="top-name">{c.name}</span>
                    <div className="top-bar-wrap">
                      <div
                        className="top-bar"
                        style={{ width: `${(c.pickups / maxPickups) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="top-pickups">{c.pickups} pickups</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {activityLoading ? (
            <div className="activity-item">
              <div className="activity-content"><p>Loading activity...</p></div>
            </div>
          ) : activity.length === 0 ? (
            <div className="activity-item">
              <div className="activity-content"><p>No recent activity.</p></div>
            </div>
          ) : (
            activity.map(item => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon">
                  {item.type === 'pickup' ? '\u267B' : '\uD83C\uDF81'}
                </div>
                <div className="activity-content">
                  <p><strong>{item.user}</strong> {item.text}</p>
                  <span className="activity-time">{timeAgo(item.time)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
