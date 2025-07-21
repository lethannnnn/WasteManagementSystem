import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>MyCycle+ Admin Dashboard</h1>
          <p>Operations Management & Analytics</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Overview Cards */}
        <section className="overview-section">
          <h2>System Overview</h2>
          <div className="cards-grid">
            <div className="stat-card">
              <h3>Active Users</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">Registered Donors</span>
            </div>
            <div className="stat-card">
              <h3>Active Collectors</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">Available Now</span>
            </div>
            <div className="stat-card">
              <h3>Pending Pickups</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">Scheduled Today</span>
            </div>
            <div className="stat-card">
              <h3>Total Recycled</h3>
              <p className="stat-number">0 kg</p>
              <span className="stat-label">This Month</span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-btn">👥 Manage Users</button>
            <button className="action-btn">🚛 Manage Collectors</button>
            <button className="action-btn">📊 View Analytics</button>
            <button className="action-btn">🎁 Manage Rewards</button>
            <button className="action-btn">🏢 Sponsor Settings</button>
            <button className="action-btn">⚙️ System Settings</button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="activity-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">No recent activity</span>
              <span className="activity-text">System is ready for operations</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
