import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Analytics, CollectorPerformance } from '../types'
import { useState } from 'react'
import VolumeChart from './analytics/VolumeChart'
import EnvironmentalImpact from './analytics/EnvironmentalImpact'
import CollectorDashboard from './analytics/CollectorDashboard'
import RewardsRanking from './analytics/RewardsRanking'
import MaterialDonut from './analytics/MaterialDonut'

const MATERIALS = ['plastic', 'paper', 'metal', 'glass', 'electronics', 'textiles']

const PERIOD_OPTIONS = [
  { label: 'Last 7 days',   value: 7   },
  { label: 'Last 30 days',  value: 30  },
  { label: 'Last 3 months', value: 90  },
  { label: 'Last 6 months', value: 180 },
  { label: 'This year',     value: 365 },
]

function exportCSV(analytics: Analytics) {
  const rows = [
    ['Month', 'Total Weight (kg)', 'Pickups', 'Unique Donors'],
    ...analytics.monthlyData.map(m => [m.month, m.totalWeight ?? 0, m.pickups ?? 0, m.uniqueDonors ?? 0]),
    [],
    ['Material', 'Weight (kg)'],
    ...Object.entries(analytics.materialBreakdown ?? {}).map(([k, v]) => [k, v]),
  ]
  const csv  = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `mycycle-analytics-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function fetchAnalytics(daysBack: number): Promise<Analytics> {
  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const { data: pickups } = await supabase
    .from('pickups')
    .select('total_weight_kg, status, created_at, pickup_items(weight_kg, item_categories(category_name))')
    .gte('created_at', since.toISOString())

  const all       = pickups ?? []
  const completed = all.filter(p => p.status === 'completed')
  const totalWeight = completed.reduce((s, p) => s + (p.total_weight_kg ?? 0), 0)

  const materialBreakdown: Record<string, number> = {}
  completed.forEach(p => {
    (p.pickup_items as any[])?.forEach((item: any) => {
      const cat = item.item_categories?.category_name?.toLowerCase() ?? 'other'
      materialBreakdown[cat] = (materialBreakdown[cat] ?? 0) + (item.weight_kg ?? 0)
    })
  })

  const currentDate = new Date()
  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - (3 - i), 1)
    const monthPickups = completed.filter(p => {
      const pd = new Date(p.created_at)
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
    })
    const monthWeight = monthPickups.reduce((s, p) => s + (p.total_weight_kg ?? 0), 0)
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      totalWeight: monthWeight,
      pickups: monthPickups.length,
      uniqueDonors: new Set(monthPickups.map(p => p as any)).size,
    }
  })

  return {
    totalWeight,
    totalPickups: all.length,
    completedPickups: completed.length,
    materialBreakdown,
    monthlyData,
    environmentalImpact: {
      co2Saved:         parseFloat((totalWeight * 2.5).toFixed(1)),
      energySaved:      Math.round(totalWeight * 1.8),
      waterSaved:       Math.round(totalWeight * 6.5),
      treesSaved:       Math.round(totalWeight * 0.017),
      landfillDiverted: parseFloat((totalWeight / 1000).toFixed(1)),
    },
  }
}

async function fetchCollectorPerf(): Promise<CollectorPerformance> {
  const { data: collectors } = await supabase
    .from('collectors')
    .select('collector_id, total_collections, rating, users(full_name)')
    .order('total_collections', { ascending: false })
    .limit(4)

  const top = (collectors ?? []).map(c => ({
    id:          c.collector_id,
    name:        (c.users as any)?.full_name ?? 'Unknown',
    status:      'active' as const,
    routeInfo:   `${c.total_collections ?? 0} pickups completed`,
    efficiency:  Math.min(99, 80 + (c.total_collections ?? 0)),
    pickups:     c.total_collections ?? 0,
    successRate: c.rating ? c.rating * 20 : 85,
  }))

  return {
    averageEfficiency: top.length > 0 ? top.reduce((s, p) => s + p.efficiency, 0) / top.length : 0,
    routesOptimized:   0,
    avgPickupTime:     0,
    successRate:       top.length > 0 ? top.reduce((s, p) => s + p.successRate, 0) / top.length : 0,
    topPerformers:     top,
  }
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(90)

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn:  () => fetchAnalytics(period),
  })
  const { data: collectorPerf } = useQuery({ queryKey: ['collector-perf'], queryFn: fetchCollectorPerf })

  const completionRate = analytics && analytics.totalPickups > 0
    ? ((analytics.completedPickups / analytics.totalPickups) * 100).toFixed(1)
    : '0.0'

  const KPI_ITEMS = [
    { label: 'Total Recycled',   value: isLoading ? '—' : `${((analytics?.totalWeight ?? 0) / 1000).toFixed(2)} tons`, sub: 'by weight'         },
    { label: 'Total Pickups',    value: isLoading ? '—' : (analytics?.totalPickups ?? 0).toString(),                    sub: 'all time'          },
    { label: 'Completion Rate',  value: isLoading ? '—' : `${completionRate}%`,                                         sub: 'completed/total'   },
    { label: 'CO₂ Saved',        value: isLoading ? '—' : `${analytics?.environmentalImpact?.co2Saved ?? 0} kg`,        sub: 'carbon offset'     },
  ]

  return (
    <div className="analytics-content">

      {/* ── Top bar: filter + export ── */}
      <div className="analytics-topbar">
        <div className="analytics-period-tabs">
          {PERIOD_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`period-tab${period === o.value ? ' active' : ''}`}
              onClick={() => setPeriod(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button
          className="export-btn"
          onClick={() => analytics && exportCSV(analytics)}
          disabled={!analytics}
        >
          Export CSV
        </button>
      </div>

      {/* ── KPI bar ── */}
      <div className="analytics-kpi-bar">
        {KPI_ITEMS.map(k => (
          <div key={k.label} className="kpi-item">
            <span className="kpi-value">{k.value}</span>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Volume chart — full width ── */}
      <div className="analytics-section chart-card-full">
        <VolumeChart analytics={analytics ?? null} isLoading={isLoading} materials={MATERIALS} />
      </div>

      {/* ── Row 2: Material Donut + Environmental Impact ── */}
      <div className="analytics-row-2">
        <div className="chart-card">
          <MaterialDonut breakdown={analytics?.materialBreakdown} />
        </div>
        <div className="chart-card">
          <EnvironmentalImpact impact={analytics?.environmentalImpact} />
        </div>
      </div>

      {/* ── Row 3: Rewards Ranking + Collector Performance ── */}
      <div className="analytics-row-2">
        <div className="chart-card">
          <RewardsRanking />
        </div>
        <div className="chart-card">
          <CollectorDashboard perf={collectorPerf ?? null} />
        </div>
      </div>

    </div>
  )
}
