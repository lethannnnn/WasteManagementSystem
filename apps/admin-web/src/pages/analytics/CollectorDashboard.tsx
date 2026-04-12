import type { CollectorPerformance } from '../../types'

interface Props {
  perf: CollectorPerformance | null
}

export default function CollectorDashboard({ perf }: Props) {
  return (
    <>
      <div className="chart-header">
        <h3>Collector Performance Dashboard</h3>
        <span className="chart-subtitle">Route efficiency and performance metrics</span>
      </div>
      <div className="collector-dashboard">
        <div className="collector-metrics">
          <div className="metric-card">
            <div className="metric-icon">&#x26A1;</div>
            <div className="metric-content">
              <h4>Average Efficiency</h4>
              <span className="metric-value">{(perf?.averageEfficiency ?? 0).toFixed(1)}%</span>
              <span className="metric-change positive">+5.2%</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">&#x1F5FA;</div>
            <div className="metric-content">
              <h4>Routes Optimized</h4>
              <span className="metric-value">{perf?.routesOptimized ?? 0}</span>
              <span className="metric-change positive">+12</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">&#x23F1;</div>
            <div className="metric-content">
              <h4>Avg. Pickup Time</h4>
              <span className="metric-value">{(perf?.avgPickupTime ?? 0).toFixed(1)} min</span>
              <span className="metric-change positive">-1.2 min</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">&#x2705;</div>
            <div className="metric-content">
              <h4>Success Rate</h4>
              <span className="metric-value">{(perf?.successRate ?? 0).toFixed(1)}%</span>
              <span className="metric-change positive">+2.1%</span>
            </div>
          </div>
        </div>

        <div className="collector-leaderboard">
          <h4>Top Performers This Month</h4>
          <div className="collector-list">
            {perf && perf.topPerformers.length > 0 ? (
              perf.topPerformers.map((p, i) => (
                <div key={i} className="collector-item">
                  <div className="collector-rank">{i + 1}</div>
                  <div className="collector-info">
                    <span className="name">{p.name}</span>
                    <span className="stats">{p.pickups ?? 0} pickups &bull; {(p.successRate ?? 0).toFixed(1)}% success</span>
                  </div>
                  <div className="collector-score">{(p.efficiency ?? 0).toFixed(1)}</div>
                </div>
              ))
            ) : (
              <div className="collector-item">
                <div className="collector-info">
                  <span className="name">No collector data available</span>
                  <span className="stats">Complete some pickups to see performance metrics</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
