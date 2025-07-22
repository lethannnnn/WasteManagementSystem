import React, { useState } from 'react';
import './App.css';

// Mock data for demonstration
const mockUsers = [
  { id: 1, name: 'Ahmad Rahman', email: 'ahmad@email.com', type: 'Donor', status: 'Active', points: 250, joinDate: '2024-01-15' },
  { id: 2, name: 'Siti Nurhaliza', email: 'siti@email.com', type: 'Donor', status: 'Active', points: 180, joinDate: '2024-01-20' },
  { id: 3, name: 'Raj Kumar', email: 'raj@email.com', type: 'Collector', status: 'Active', collections: 45, joinDate: '2024-01-10' },
  { id: 4, name: 'Lim Wei Ming', email: 'lim@email.com', type: 'Donor', status: 'Inactive', points: 90, joinDate: '2024-02-01' },
];

const mockRewards = [
  { id: 1, name: 'RM10 Grab Voucher', points: 100, category: 'Transport', stock: 50, redeemed: 25 },
  { id: 2, name: 'Starbucks Coffee', points: 80, category: 'Food & Beverage', stock: 30, redeemed: 15 },
  { id: 3, name: 'Eco Water Bottle', points: 150, category: 'Lifestyle', stock: 20, redeemed: 8 },
  { id: 4, name: 'Movie Ticket', points: 120, category: 'Entertainment', stock: 40, redeemed: 22 },
];

type Page = 'login' | 'dashboard' | 'users' | 'rewards' | 'analytics';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('all');

  // Login functionality
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email && loginForm.password) {
      setIsLoggedIn(true);
      setCurrentPage('dashboard');
    } else {
      alert('Please enter email and password');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('login');
    setLoginForm({ email: '', password: '' });
  };

  // Filter users based on search and type
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedUserType === 'all' || user.type.toLowerCase() === selectedUserType;
    return matchesSearch && matchesType;
  });

  // Login Page Component
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>MyCycle+ Admin</h1>
            <p>Administrator Dashboard Access</p>
          </div>
          
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@mycycle.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button type="submit" className="login-btn">
              Sign In to Dashboard
            </button>
          </form>
          
          <div className="login-footer">
            <p>Demo credentials: admin@mycycle.com / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-app">
      {/* Navigation Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>MyCycle+</h2>
          <span className="admin-badge">Admin</span>
        </div>
        
        <ul className="nav-menu">
          <li>
            <button 
              className={currentPage === 'dashboard' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
          <li>
            <button 
              className={currentPage === 'users' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('users')}
            >
              👥 Manage Users
            </button>
          </li>
          <li>
            <button 
              className={currentPage === 'rewards' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('rewards')}
            >
              🎁 Manage Rewards
            </button>
          </li>
          <li>
            <button 
              className={currentPage === 'analytics' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('analytics')}
            >
              📈 Analytics
            </button>
          </li>
        </ul>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <h1>
            {currentPage === 'dashboard' && 'Dashboard Overview'}
            {currentPage === 'users' && 'User Management'}
            {currentPage === 'rewards' && 'Rewards Management'}
            {currentPage === 'analytics' && 'Analytics & Reports'}
          </h1>
          <div className="header-actions">
            <span className="admin-info">Welcome, Admin</span>
            <button className="profile-btn">👤</button>
          </div>
        </header>

        {/* Dashboard Page */}
        {currentPage === 'dashboard' && (
          <div className="dashboard-content">
            {/* Key Metrics */}
            <section className="metrics-section">
              <div className="metrics-grid">
                <div className="metric-card primary">
                  <div className="metric-icon">👥</div>
                  <div className="metric-info">
                    <h3>Total Users</h3>
                    <p className="metric-number">2,847</p>
                    <span className="metric-change positive">+12% from last month</span>
                  </div>
                </div>
                
                <div className="metric-card success">
                  <div className="metric-icon">♻️</div>
                  <div className="metric-info">
                    <h3>Total Recycled</h3>
                    <p className="metric-number">15.2 tons</p>
                    <span className="metric-change positive">+8% from last month</span>
                  </div>
                </div>
                
                <div className="metric-card warning">
                  <div className="metric-icon">🎁</div>
                  <div className="metric-info">
                    <h3>Rewards Redeemed</h3>
                    <p className="metric-number">1,234</p>
                    <span className="metric-change positive">+15% from last month</span>
                  </div>
                </div>
                
                <div className="metric-card info">
                  <div className="metric-icon">💰</div>
                  <div className="metric-info">
                    <h3>Revenue</h3>
                    <p className="metric-number">RM 45,890</p>
                    <span className="metric-change positive">+20% from last month</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <button className="action-card" onClick={() => setCurrentPage('users')}>
                  <span className="action-icon">👥</span>
                  <span className="action-text">Manage Users</span>
                </button>
                <button className="action-card" onClick={() => setCurrentPage('rewards')}>
                  <span className="action-icon">🎁</span>
                  <span className="action-text">Add Reward</span>
                </button>
                <button className="action-card">
                  <span className="action-icon">📧</span>
                  <span className="action-text">Send Notification</span>
                </button>
                <button className="action-card">
                  <span className="action-icon">⚙️</span>
                  <span className="action-text">System Settings</span>
                </button>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon">👤</div>
                  <div className="activity-content">
                    <p><strong>Ahmad Rahman</strong> redeemed RM10 Grab Voucher</p>
                    <span className="activity-time">2 minutes ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">♻️</div>
                  <div className="activity-content">
                    <p><strong>Collection completed</strong> - 5.2kg plastic recycled</p>
                    <span className="activity-time">15 minutes ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🚛</div>
                  <div className="activity-content">
                    <p><strong>Raj Kumar</strong> started new collection route</p>
                    <span className="activity-time">1 hour ago</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">🎁</div>
                  <div className="activity-content">
                    <p><strong>New reward added:</strong> Eco Water Bottle</p>
                    <span className="activity-time">3 hours ago</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Users Management Page */}
        {currentPage === 'users' && (
          <div className="users-content">
            <div className="users-header">
              <div className="search-filters">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select
                  value={selectedUserType}
                  onChange={(e) => setSelectedUserType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Users</option>
                  <option value="donor">Donors</option>
                  <option value="collector">Collectors</option>
                </select>
              </div>
              <button className="add-user-btn">+ Add User</button>
            </div>
            
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Points/Collections</th>
                    <th>Join Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="user-name">
                        <div className="user-avatar">{user.name.charAt(0)}</div>
                        {user.name}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`user-type ${user.type.toLowerCase()}`}>
                          {user.type}
                        </span>
                      </td>
                      <td>
                        <span className={`status ${user.status.toLowerCase()}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        {user.type === 'Donor' ? `${user.points} pts` : `${user.collections} collections`}
                      </td>
                      <td>{user.joinDate}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-btn">✏️</button>
                          <button className="delete-btn">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rewards Management Page */}
        {currentPage === 'rewards' && (
          <div className="rewards-content">
            <div className="rewards-header">
              <h2>Manage Rewards</h2>
              <button className="add-reward-btn">+ Add New Reward</button>
            </div>
            
            <div className="rewards-grid">
              {mockRewards.map(reward => (
                <div key={reward.id} className="reward-card">
                  <div className="reward-header">
                    <h3>{reward.name}</h3>
                    <span className="reward-category">{reward.category}</span>
                  </div>
                  <div className="reward-details">
                    <div className="reward-points">
                      <span className="points-value">{reward.points}</span>
                      <span className="points-label">points</span>
                    </div>
                    <div className="reward-stats">
                      <div className="stat">
                        <span className="stat-label">Stock:</span>
                        <span className="stat-value">{reward.stock}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Redeemed:</span>
                        <span className="stat-value">{reward.redeemed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="reward-actions">
                    <button className="edit-reward-btn">Edit</button>
                    <button className="delete-reward-btn">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Page */}
        {currentPage === 'analytics' && (
          <div className="analytics-content">
            <div className="analytics-grid">
              <div className="chart-card">
                <h3>User Growth</h3>
                <div className="chart-placeholder">
                  <p>📈 User registration trend over time</p>
                  <div className="mock-chart">
                    <div className="chart-bar" style={{height: '20%'}}></div>
                    <div className="chart-bar" style={{height: '40%'}}></div>
                    <div className="chart-bar" style={{height: '60%'}}></div>
                    <div className="chart-bar" style={{height: '80%'}}></div>
                    <div className="chart-bar" style={{height: '100%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h3>Recycling Volume</h3>
                <div className="chart-placeholder">
                  <p>♻️ Monthly recycling statistics</p>
                  <div className="mock-chart">
                    <div className="chart-bar" style={{height: '70%'}}></div>
                    <div className="chart-bar" style={{height: '50%'}}></div>
                    <div className="chart-bar" style={{height: '90%'}}></div>
                    <div className="chart-bar" style={{height: '60%'}}></div>
                    <div className="chart-bar" style={{height: '80%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h3>Popular Rewards</h3>
                <div className="chart-placeholder">
                  <p>🎁 Most redeemed rewards</p>
                  <div className="popular-rewards-list">
                    <div className="reward-item">
                      <span>RM10 Grab Voucher</span>
                      <span className="reward-count">45 redeemed</span>
                    </div>
                    <div className="reward-item">
                      <span>Movie Ticket</span>
                      <span className="reward-count">32 redeemed</span>
                    </div>
                    <div className="reward-item">
                      <span>Starbucks Coffee</span>
                      <span className="reward-count">28 redeemed</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h3>Regional Performance</h3>
                <div className="chart-placeholder">
                  <p>🗺️ Performance by Malaysian states</p>
                  <div className="region-stats">
                    <div className="region-item">
                      <span>Kuala Lumpur</span>
                      <span className="region-percentage">35%</span>
                    </div>
                    <div className="region-item">
                      <span>Selangor</span>
                      <span className="region-percentage">28%</span>
                    </div>
                    <div className="region-item">
                      <span>Penang</span>
                      <span className="region-percentage">18%</span>
                    </div>
                    <div className="region-item">
                      <span>Johor</span>
                      <span className="region-percentage">19%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
