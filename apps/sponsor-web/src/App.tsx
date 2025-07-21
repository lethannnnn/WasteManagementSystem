import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>MyCycle+ Sponsor Portal</h1>
          <p>Partner Engagement & Reward Management</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Partnership Overview */}
        <section className="overview-section">
          <h2>Partnership Overview</h2>
          <div className="cards-grid">
            <div className="stat-card">
              <h3>Active Campaigns</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">Running Now</span>
            </div>
            <div className="stat-card">
              <h3>Rewards Redeemed</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">This Month</span>
            </div>
            <div className="stat-card">
              <h3>User Engagement</h3>
              <p className="stat-number">0</p>
              <span className="stat-label">Active Participants</span>
            </div>
            <div className="stat-card">
              <h3>Environmental Impact</h3>
              <p className="stat-number">0 kg</p>
              <span className="stat-label">CO2 Offset</span>
            </div>
          </div>
        </section>

        {/* Sponsor Actions */}
        <section className="actions-section">
          <h2>Sponsor Actions</h2>
          <div className="actions-grid">
            <button className="action-btn">🎁 Create Rewards</button>
            <button className="action-btn">📊 View Analytics</button>
            <button className="action-btn">🎯 Manage Campaigns</button>
            <button className="action-btn">👥 User Insights</button>
            <button className="action-btn">💳 Billing & Credits</button>
            <button className="action-btn">🌱 Impact Reports</button>
          </div>
        </section>

        {/* Campaign Performance */}
        <section className="performance-section">
          <h2>Campaign Performance</h2>
          <div className="performance-grid">
            <div className="performance-card">
              <h3>Top Performing Rewards</h3>
              <div className="performance-list">
                <div className="performance-item">
                  <span>No active rewards yet</span>
                  <span className="performance-value">-</span>
                </div>
              </div>
            </div>
            <div className="performance-card">
              <h3>Recent Activity</h3>
              <div className="performance-list">
                <div className="performance-item">
                  <span>System ready for partner integration</span>
                  <span className="performance-time">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
