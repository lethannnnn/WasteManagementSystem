import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import CollectorContactModal from '../components/CollectorContactModal'
import LeafletMap from '../components/LeafletMap'
import type { MapMarker } from '../components/LeafletMap'

async function fetchCollectorOverview() {
  const [collectorsRes, routesRes, pickupsRes] = await Promise.all([
    supabase.from('collectors').select('collector_id, rating, total_collections'),
    supabase.from('routes').select('status'),
    supabase.from('pickups').select('status'),
  ])

  const collectors      = collectorsRes.data ?? []
  const routes          = routesRes.data ?? []
  const pickups         = pickupsRes.data ?? []
  const routesCompleted = routes.filter(r => r.status === 'completed').length
  const totalPickups    = pickups.length
  const donePickups     = pickups.filter(p => p.status === 'completed').length
  const avgPerf         = totalPickups > 0 ? (donePickups / totalPickups) * 100 : 0
  const avgRating       = collectors.length > 0
    ? collectors.reduce((s, c) => s + (c.rating ?? 0), 0) / collectors.length
    : 0

  return { activeCollectors: collectors.length, avgPerformance: avgPerf, routesCompleted, avgRating }
}

async function fetchLiveCollectors() {
  const { data } = await supabase
    .from('collectors')
    .select(`
      collector_id, current_lat, current_lng, rating, total_collections,
      users(full_name, email, phone),
      routes(route_id, route_name, status)
    `)
    .limit(20)

  return (data ?? []).map(c => ({
    id:        c.collector_id,
    name:      (c.users as any)?.full_name ?? 'Unknown',
    email:     (c.users as any)?.email     ?? '',
    phone:     (c.users as any)?.phone     ?? '',
    status:    ((c.routes as any)?.[0]?.status === 'active' ? 'active' : 'idle') as 'active' | 'idle',
    routeInfo: (c.routes as any)?.[0]?.route_name ?? 'No route assigned',
    lat:       c.current_lat,
    lng:       c.current_lng,
    rating:    c.rating ?? 0,
    pickups:   c.total_collections ?? 0,
  }))
}

const CRITERIA = [
  { id: 'perf',  label: 'Collector Performance', default: true  },
  { id: 'geo',   label: 'Geographic Proximity',  default: true  },
  { id: 'load',  label: 'Workload Balance',       default: true  },
  { id: 'pref',  label: 'Collector Preferences', default: false },
]

export default function CollectorsPage() {
  const [contactCollector, setContactCollector]   = useState<{ name: string; email: string; phone: string } | null>(null)
  const [autoRefresh, setAutoRefresh]             = useState(false)
  const [showAssignPanel, setShowAssignPanel]     = useState(false)

  const { data: overview } = useQuery({ queryKey: ['collector-overview'], queryFn: fetchCollectorOverview })
  const { data: collectors = [], isLoading, refetch } = useQuery({
    queryKey: ['live-collectors'],
    queryFn:  fetchLiveCollectors,
    refetchInterval: autoRefresh ? 30_000 : false,
  })

  const mapMarkers: MapMarker[] = collectors
    .filter(c => c.lat != null && c.lng != null)
    .map(c => ({
      lat:      c.lat!,
      lng:      c.lng!,
      label:    c.name,
      sublabel: c.routeInfo,
      color:    c.status === 'active' ? 'green' : 'blue',
    }))

  return (
    <div className="collectors-content">

      {/* ── Compact stat bar ── */}
      <div className="collectors-stat-bar">
        <div className="cstat">
          <span className="cstat-value">{overview?.activeCollectors ?? '—'}</span>
          <span className="cstat-label">Collectors</span>
        </div>
        <div className="cstat-divider" />
        <div className="cstat">
          <span className="cstat-value">{(overview?.avgPerformance ?? 0).toFixed(1)}%</span>
          <span className="cstat-label">Avg Performance</span>
        </div>
        <div className="cstat-divider" />
        <div className="cstat">
          <span className="cstat-value">{overview?.routesCompleted ?? '—'}</span>
          <span className="cstat-label">Routes Completed</span>
        </div>
        <div className="cstat-divider" />
        <div className="cstat">
          <span className="cstat-value">{(overview?.avgRating ?? 0).toFixed(1)}/5</span>
          <span className="cstat-label">Avg Rating</span>
        </div>
        <div className="cstat-actions">
          <button
            className={`auto-refresh-btn ${autoRefresh ? 'on' : 'off'}`}
            onClick={() => setAutoRefresh(v => !v)}
          >
            {autoRefresh ? '⏸ Live' : '▶ Live'}
          </button>
          <button className="refresh-tracking-btn" onClick={() => refetch()}>Refresh</button>
          <button className="assign-routes-btn" onClick={() => setShowAssignPanel(true)}>Smart Assign</button>
          <button className="add-collector-btn">+ Add Collector</button>
        </div>
      </div>

      {/* ── Main body: Table + Map ── */}
      <div className="collectors-body">

        {/* LEFT — Collector table */}
        <div className="collectors-table-panel">
          <table className="collectors-table">
            <thead>
              <tr>
                <th>Collector</th>
                <th>Current Route</th>
                <th>Status</th>
                <th>Pickups</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="table-msg">Loading...</td></tr>
              ) : collectors.length === 0 ? (
                <tr><td colSpan={6} className="table-msg">No collectors found</td></tr>
              ) : (
                collectors.map(c => (
                  <tr key={c.id}>
                    <td className="collector-info">
                      <div className="collector-avatar">{c.name.charAt(0)}</div>
                      <div className="collector-details">
                        <span className="collector-name">{c.name}</span>
                        <span className="collector-id">#{c.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="route-cell">{c.routeInfo}</td>
                    <td>
                      <span className={`status ${c.status}`}>
                        {c.status === 'active' && <span className="pulse-dot" />}
                        {c.status}
                      </span>
                    </td>
                    <td>{c.pickups}</td>
                    <td>{c.rating.toFixed(1)}/5</td>
                    <td>
                      <div className="action-buttons">
                        <button className="reassign-btn">Reassign</button>
                        <button
                          className="contact-btn"
                          onClick={() => setContactCollector({ name: c.name, email: c.email, phone: c.phone })}
                        >
                          Contact
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* RIGHT — Sticky map */}
        <div className="collectors-map-panel">
          <div className="collectors-map-header">
            <span>Live Locations</span>
            <div className="map-legend" style={{ flexDirection: 'row', gap: '0.75rem' }}>
              <span><span className="legend-dot green" /> Active</span>
              <span><span className="legend-dot blue" /> Idle</span>
            </div>
          </div>
          <div className="map-live-container" style={{ height: '100%' }}>
            <LeafletMap markers={mapMarkers} height="100%" />
            {mapMarkers.length === 0 && !isLoading && (
              <div className="map-no-location">No GPS data available</div>
            )}
          </div>
        </div>

      </div>

      {/* ── Smart Assignment slide panel ── */}
      {showAssignPanel && (
        <div className="assign-panel-overlay" onClick={() => setShowAssignPanel(false)}>
          <div className="assign-panel" onClick={e => e.stopPropagation()}>
            <div className="assign-panel-header">
              <h3>Smart Route Assignment</h3>
              <button className="panel-close-btn" onClick={() => setShowAssignPanel(false)}>✕</button>
            </div>
            <div className="assign-panel-body">
              <div className="setting-group">
                <label>Assignment Criteria:</label>
                <div className="criteria-options">
                  {CRITERIA.map(c => (
                    <label key={c.id}>
                      <input type="checkbox" defaultChecked={c.default} /> {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="setting-group">
                <label>Priority Mode:</label>
                <select className="priority-mode-select">
                  <option value="efficiency">Maximize Efficiency</option>
                  <option value="balance">Balance Workload</option>
                  <option value="speed">Minimize Response Time</option>
                  <option value="cost">Minimize Operational Cost</option>
                </select>
              </div>
            </div>
            <div className="assign-panel-footer">
              <button className="confirm-cancel-btn" onClick={() => setShowAssignPanel(false)}>Cancel</button>
              <button className="run-assignment-btn">Run Assignment</button>
            </div>
          </div>
        </div>
      )}

      {contactCollector && (
        <CollectorContactModal
          name={contactCollector.name}
          email={contactCollector.email}
          phone={contactCollector.phone}
          onClose={() => setContactCollector(null)}
        />
      )}
    </div>
  )
}
