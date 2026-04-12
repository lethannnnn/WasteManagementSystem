import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Route } from '../types'
import LeafletMap from '../components/LeafletMap'
import type { MapMarker } from '../components/LeafletMap'

async function fetchRoutes(): Promise<Route[]> {
  const { data, error } = await supabase
    .from('routes')
    .select(`
      route_id, route_name, status, total_stops, completed_stops,
      total_distance_km, estimated_duration,
      collectors(collector_id, users(full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return (data ?? []).map(r => {
    const collectorName = (r.collectors as any)?.users?.full_name ?? 'Unassigned'
    const durationHrs = r.estimated_duration
      ? (typeof r.estimated_duration === 'number' ? r.estimated_duration / 3600 : 0).toFixed(1)
      : '—'

    return {
      id:            r.route_id,
      name:          r.route_name ?? collectorName,
      status:        (r.status ?? 'pending') as Route['status'],
      collector:     collectorName,
      pickups:       r.total_stops ?? 0,
      efficiency:    r.completed_stops && r.total_stops
                       ? Math.round((r.completed_stops / r.total_stops) * 100)
                       : 0,
      estimatedTime: durationHrs,
    }
  })
}

async function fetchPickupLocations(): Promise<MapMarker[]> {
  const { data } = await supabase
    .from('pickups')
    .select('pickup_id, status, pickup_lat, pickup_lng, users(full_name)')
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .limit(50)

  return (data ?? [])
    .filter((p: any) => p.pickup_lat != null && p.pickup_lng != null)
    .map((p: any) => ({
      lat:      p.pickup_lat,
      lng:      p.pickup_lng,
      label:    (p.users as any)?.full_name ?? 'Pickup',
      sublabel: p.status,
      color:    (p.status === 'in_progress' ? 'orange' : p.status === 'confirmed' ? 'green' : 'blue') as MapMarker['color'],
    }))
}

async function fetchRouteStats() {
  const { data } = await supabase.from('routes').select('status, total_distance_km, estimated_duration')
  const routes    = data ?? []
  const active    = routes.filter(r => r.status === 'active').length
  const completed = routes.filter(r => r.status === 'completed').length
  const total     = routes.length
  const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0
  const avgTime    = routes.length > 0
    ? routes.reduce((s, r) => s + (typeof r.estimated_duration === 'number' ? r.estimated_duration : 0), 0) / routes.length / 3600
    : 0

  return { efficiency, active, avgTime, costSavings: completed * 52 }
}

export default function RoutesPage() {
  const [showOptimize, setShowOptimize] = useState(false)

  const { data: routes = [], isLoading } = useQuery({ queryKey: ['routes'],            queryFn: fetchRoutes })
  const { data: stats }                  = useQuery({ queryKey: ['route-stats'],        queryFn: fetchRouteStats })
  const { data: pickupMarkers = [] }     = useQuery({ queryKey: ['pickup-locations'],   queryFn: fetchPickupLocations })

  return (
    <div className="routes-content">

      {/* ── Split layout ── */}
      <div className="routes-split">

        {/* LEFT — Map */}
        <div className="routes-map-panel">
          <div className="routes-map-header">
            <span className="routes-map-title">Pickup Locations</span>
            <div className="routes-map-legend-inline">
              <span><span className="legend-dot blue" /> Pending</span>
              <span><span className="legend-dot green" /> Confirmed</span>
              <span><span className="legend-dot orange" /> In Progress</span>
            </div>
          </div>
          <div className="routes-map-body">
            <LeafletMap markers={pickupMarkers} height="100%" />
            {pickupMarkers.length === 0 && (
              <div className="map-no-location">No active pickup locations</div>
            )}
          </div>
        </div>

        {/* RIGHT — Sidebar */}
        <div className="routes-sidebar">

          {/* Header actions */}
          <div className="routes-sidebar-header">
            <button className="optimize-btn">Optimize All</button>
            <button className="create-route-btn">+ New Route</button>
          </div>

          {/* Compact stats 2×2 */}
          <div className="routes-stats-grid">
            <div className="route-stat-cell">
              <span className="route-stat-value">{stats?.efficiency ?? 0}%</span>
              <span className="route-stat-label">Efficiency</span>
            </div>
            <div className="route-stat-cell">
              <span className="route-stat-value">{stats?.active ?? 0}</span>
              <span className="route-stat-label">Active</span>
            </div>
            <div className="route-stat-cell">
              <span className="route-stat-value">{(stats?.avgTime ?? 0).toFixed(1)}h</span>
              <span className="route-stat-label">Avg Time</span>
            </div>
            <div className="route-stat-cell">
              <span className="route-stat-value">RM {(stats?.costSavings ?? 0).toLocaleString()}</span>
              <span className="route-stat-label">Cost Saved</span>
            </div>
          </div>

          {/* Route list — scrollable */}
          <div className="routes-sidebar-list">
            <p className="routes-list-title">Routes ({routes.length})</p>
            {isLoading ? (
              <div className="routes-list-loading">Loading...</div>
            ) : routes.length === 0 ? (
              <div className="routes-list-empty">No routes available</div>
            ) : (
              routes.map(route => (
                <div key={route.id} className="route-list-row">
                  <div className="route-list-main">
                    <span className="route-list-name">{route.name}</span>
                    <span className="route-list-collector">{route.collector}</span>
                  </div>
                  <div className="route-list-meta">
                    <span className={`status ${route.status}`}>{route.status}</span>
                    <span className="route-list-stops">{route.pickups} stops</span>
                  </div>
                  <div className="route-list-actions">
                    <button className="optimize-route-btn">Optimize</button>
                    <button className="view-route-btn">View</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Optimization accordion */}
          <div className="optimize-accordion">
            <button
              className="optimize-accordion-toggle"
              onClick={() => setShowOptimize(v => !v)}
            >
              <span>Route Optimization Settings</span>
              <span className="accordion-chevron">{showOptimize ? '▲' : '▼'}</span>
            </button>
            {showOptimize && (
              <div className="optimize-accordion-body">
                <div className="setting-group">
                  <label>Algorithm:</label>
                  <select className="algorithm-select">
                    <option value="hybrid-drl-ga">Hybrid DRL-GA (Recommended)</option>
                    <option value="genetic-algorithm">Genetic Algorithm</option>
                    <option value="deep-reinforcement">Deep Reinforcement Learning</option>
                  </select>
                </div>
                <div className="setting-group">
                  <label>Priority:</label>
                  <select className="priority-select">
                    <option value="time">Minimize Time</option>
                    <option value="distance">Minimize Distance</option>
                    <option value="fuel">Minimize Fuel Cost</option>
                    <option value="balanced">Balanced Optimization</option>
                  </select>
                </div>
                <div className="setting-group setting-group-row">
                  <input type="checkbox" id="traffic" defaultChecked />
                  <label htmlFor="traffic">Include real-time traffic</label>
                </div>
                <div className="optimize-results-mini">
                  <span>Last run: <strong>−18 min</strong>, <strong>−12.4 km</strong>, <strong>+8.3%</strong> efficiency</span>
                </div>
                <button className="run-optimization-btn">Run Optimization</button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
