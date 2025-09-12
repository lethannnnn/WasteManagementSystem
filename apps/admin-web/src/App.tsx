import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthScreen from './AuthScreen';
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

// Mock recycling volume data
const mockRecyclingData = {
  totalVolume: {
    currentMonth: 2.4, // tons
    previousMonth: 2.03, // tons
    growthPercentage: 18.2,
    yearToDate: 8.7 // tons
  },
  monthlyData: [
    {
      month: 'Jan',
      label: 'January 2024',
      materials: {
        plastic: { weight: 450, percentage: 42 }, // kg
        paper: { weight: 320, percentage: 30 },
        metal: { weight: 180, percentage: 17 },
        glass: { weight: 120, percentage: 11 }
      },
      totalWeight: 1070, // kg
      pickups: 156,
      uniqueDonors: 89
    },
    {
      month: 'Feb',
      label: 'February 2024',
      materials: {
        plastic: { weight: 580, percentage: 44 },
        paper: { weight: 390, percentage: 29 },
        metal: { weight: 220, percentage: 17 },
        glass: { weight: 130, percentage: 10 }
      },
      totalWeight: 1320, // kg
      pickups: 187,
      uniqueDonors: 112
    },
    {
      month: 'Mar',
      label: 'March 2024',
      materials: {
        plastic: { weight: 720, percentage: 43 },
        paper: { weight: 520, percentage: 31 },
        metal: { weight: 280, percentage: 17 },
        glass: { weight: 150, percentage: 9 }
      },
      totalWeight: 1670, // kg
      pickups: 234,
      uniqueDonors: 145
    },
    {
      month: 'Apr',
      label: 'April 2024',
      materials: {
        plastic: { weight: 1080, percentage: 45 },
        paper: { weight: 720, percentage: 30 },
        metal: { weight: 360, percentage: 15 },
        glass: { weight: 240, percentage: 10 }
      },
      totalWeight: 2400, // kg (current month)
      pickups: 298,
      uniqueDonors: 187
    }
  ],
  materialTrends: {
    plastic: {
      trend: 'increasing',
      averageWeight: 707.5, // kg per month
      topItems: ['Plastic bottles', 'Food containers', 'Shopping bags', 'Electronic packaging']
    },
    paper: {
      trend: 'stable',
      averageWeight: 487.5, // kg per month
      topItems: ['Newspapers', 'Cardboard boxes', 'Office paper', 'Magazines']
    },
    metal: {
      trend: 'stable',
      averageWeight: 260, // kg per month
      topItems: ['Aluminum cans', 'Steel cans', 'Copper wire', 'Metal scraps']
    },
    glass: {
      trend: 'increasing',
      averageWeight: 160, // kg per month
      topItems: ['Glass bottles', 'Jars', 'Broken glass', 'Window glass']
    }
  },
  regionalBreakdown: [
    { region: 'Kuala Lumpur', weight: 850, percentage: 35.4, growth: 22 },
    { region: 'Selangor', weight: 672, percentage: 28.0, growth: 15 },
    { region: 'Penang', weight: 432, percentage: 18.0, growth: 12 },
    { region: 'Johor', weight: 446, percentage: 18.6, growth: 19 }
  ],
  environmentalImpact: {
    co2Saved: 1.8, // tons
    energySaved: 2400, // kWh
    waterSaved: 15600, // liters
    treesSaved: 12,
    landfillDiverted: 2.4 // tons
  },
  weeklyProgress: [
    { week: 'Week 1', weight: 480, pickups: 68 },
    { week: 'Week 2', weight: 520, pickups: 72 },
    { week: 'Week 3', weight: 650, pickups: 89 },
    { week: 'Week 4', weight: 750, pickups: 95 }
  ]
};

// Mock sponsor partner registration data
const mockSponsorData = {
  totalSponsors: {
    currentMonth: 8, // new sponsors this month
    previousMonth: 6, // previous month
    growthPercentage: 33.3,
    totalActive: 34, // total active sponsors
    yearToDate: 24 // new sponsors this year
  },
  weeklyRegistrations: [
    { week: 'Week 1', sponsors: 1, investment: 8000 },
    { week: 'Week 2', sponsors: 2, investment: 12000 },
    { week: 'Week 3', sponsors: 3, investment: 15000 },
    { week: 'Week 4', sponsors: 2, investment: 7000 },
    { week: 'Week 5', sponsors: 0, investment: 0 },
    { week: 'Week 6', sponsors: 0, investment: 0 }
  ],
  sponsorCategories: {
    corporate: {
      count: 15,
      percentage: 44.1,
      trend: 'increasing',
      examples: ['Petronas', 'Maybank', 'Genting Group']
    },
    sme: {
      count: 12,
      percentage: 35.3,
      trend: 'stable',
      examples: ['Tech startups', 'Local manufacturers']
    },
    retail: {
      count: 4,
      percentage: 11.8,
      trend: 'increasing',
      examples: ['Convenience stores', 'Supermarkets']
    },
    food: {
      count: 3,
      percentage: 8.8,
      trend: 'stable',
      examples: ['Restaurant chains', 'Food courts']
    }
  }
};

type Page = 'login' | 'dashboard' | 'users' | 'rewards' | 'analytics';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('all');
  const [loading, setLoading] = useState(true);

  // Check for existing session on app load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Verify user is an admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', session.user.id)
          .single();

        if (profile?.user_type === 'admin') {
          setUser(session.user);
          setIsLoggedIn(true);
          setCurrentPage('dashboard');
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (user: any) => {
    setUser(user);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsLoggedIn(false);
    setCurrentPage('login');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Filter users based on search and type
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedUserType === 'all' || user.type.toLowerCase() === selectedUserType;
    return matchesSearch && matchesType;
  });

  // Login Page Component
  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
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
            {/* Analytics Filter Controls */}
            <div className="analytics-filters">
              <div className="filter-group">
                <label>Time Period:</label>
                <select className="filter-select">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last 6 months</option>
                  <option>This year</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Region:</label>
                <select className="filter-select">
                  <option>All States</option>
                  <option>Kuala Lumpur</option>
                  <option>Selangor</option>
                  <option>Penang</option>
                  <option>Johor</option>
                </select>
              </div>
              <button className="export-btn">📊 Export Report</button>
            </div>

            <div className="analytics-grid">
              {/* 1. User Registration Trend */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>📈 User Registration Trend</h3>
                  <div className="chart-stats">
                    <span className="stat-item">
                      <strong>+187</strong> this month
                    </span>
                    <span className="stat-item growth">
                      ↗️ +23.5%
                    </span>
                  </div>
                </div>
                <div className="chart-content">
                  <div className="trend-chart">
                    <div className="chart-labels">
                      <span>Week 1</span>
                      <span>Week 2</span>
                      <span>Week 3</span>
                      <span>Week 4</span>
                      <span>Week 5</span>
                      <span>Week 6</span>
                    </div>
                    <div className="trend-bars">
                      <div className="trend-bar" style={{height: '45%'}} data-value="23">
                        <span className="bar-value">23</span>
                      </div>
                      <div className="trend-bar" style={{height: '65%'}} data-value="32">
                        <span className="bar-value">32</span>
                      </div>
                      <div className="trend-bar" style={{height: '80%'}} data-value="41">
                        <span className="bar-value">41</span>
                      </div>
                      <div className="trend-bar" style={{height: '70%'}} data-value="35">
                        <span className="bar-value">35</span>
                      </div>
                      <div className="trend-bar" style={{height: '90%'}} data-value="47">
                        <span className="bar-value">47</span>
                      </div>
                      <div className="trend-bar" style={{height: '100%'}} data-value="52">
                        <span className="bar-value">52</span>
                      </div>
                    </div>
                  </div>
                  <div className="user-type-breakdown">
                    <div className="breakdown-item">
                      <span className="dot donor"></span>
                      <span>Donors: 145 (77%)</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="dot collector"></span>
                      <span>Collectors: 42 (23%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Sponsor Partner Registration Trend */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>🤝 Sponsor Partner Registration Trend</h3>
                  <div className="chart-stats">
                    <span className="stat-item">
                      <strong>+{mockSponsorData.totalSponsors.currentMonth}</strong> this month
                    </span>
                    <span className="stat-item growth">
                      ↗️ +{mockSponsorData.totalSponsors.growthPercentage}%
                    </span>
                  </div>
                </div>
                <div className="chart-content">
                  <div className="trend-chart">
                    <div className="chart-labels">
                      <span>Week 1</span>
                      <span>Week 2</span>
                      <span>Week 3</span>
                      <span>Week 4</span>
                      <span>Week 5</span>
                      <span>Week 6</span>
                    </div>
                    <div className="trend-bars">
                      {mockSponsorData.weeklyRegistrations.map((weekData) => {
                        const maxSponsors = Math.max(...mockSponsorData.weeklyRegistrations.map(w => w.sponsors));
                        const heightPercentage = maxSponsors > 0 ? (weekData.sponsors / maxSponsors) * 100 : 0;
                        return (
                          <div 
                            key={weekData.week} 
                            className="trend-bar sponsor-bar" 
                            style={{height: `${heightPercentage}%`}} 
                            data-value={weekData.sponsors}
                          >
                            <span className="bar-value">{weekData.sponsors}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sponsor-type-breakdown">
                    <div className="breakdown-item">
                      <span className="dot corporate"></span>
                      <span>Corporate: {mockSponsorData.sponsorCategories.corporate.count} ({mockSponsorData.sponsorCategories.corporate.percentage}%)</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="dot sme"></span>
                      <span>SME: {mockSponsorData.sponsorCategories.sme.count} ({mockSponsorData.sponsorCategories.sme.percentage}%)</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="dot retail"></span>
                      <span>Retail: {mockSponsorData.sponsorCategories.retail.count} ({mockSponsorData.sponsorCategories.retail.percentage}%)</span>
                    </div>
                    <div className="breakdown-item">
                      <span className="dot food"></span>
                      <span>F&B: {mockSponsorData.sponsorCategories.food.count} ({mockSponsorData.sponsorCategories.food.percentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Total Recycling Volume */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>♻️ Total Recycling Volume</h3>
                  <div className="chart-stats">
                    <span className="stat-item">
                      <strong>{mockRecyclingData.totalVolume.currentMonth} tons</strong> this month
                    </span>
                    <span className="stat-item growth">
                      ↗️ +{mockRecyclingData.totalVolume.growthPercentage}%
                    </span>
                    <span className="stat-item">
                      <strong>{mockRecyclingData.totalVolume.yearToDate} tons</strong> YTD
                    </span>
                  </div>
                </div>
                <div className="chart-content">
                  <div className="volume-chart">
                    <div className="line-graph-container">
                      {/* Y-axis grid lines and labels */}
                      <div className="y-axis">
                        {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map(value => (
                          <div key={value} className="y-axis-line">
                            <span className="y-label">{value}t</span>
                            <div className="grid-line"></div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Graph area */}
                      <div className="graph-area">
                        {/* Total volume line */}
                        <svg className="line-graph-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                          {/* Area fill */}
                          <defs>
                            <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3"/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05"/>
                            </linearGradient>
                          </defs>
                          
                          {/* Area path */}
                          <path
                            d={`M 0 ${200 - ((mockRecyclingData.monthlyData[0].totalWeight / 1000) / 2.5 * 200)} 
                               L ${400/3} ${200 - ((mockRecyclingData.monthlyData[1].totalWeight / 1000) / 2.5 * 200)} 
                               L ${400*2/3} ${200 - ((mockRecyclingData.monthlyData[2].totalWeight / 1000) / 2.5 * 200)} 
                               L 400 ${200 - ((mockRecyclingData.monthlyData[3].totalWeight / 1000) / 2.5 * 200)} 
                               L 400 200 L 0 200 Z`}
                            fill="url(#volumeGradient)"
                          />
                          
                          {/* Line path */}
                          <path
                            d={`M 0 ${200 - ((mockRecyclingData.monthlyData[0].totalWeight / 1000) / 2.5 * 200)} 
                               L ${400/3} ${200 - ((mockRecyclingData.monthlyData[1].totalWeight / 1000) / 2.5 * 200)} 
                               L ${400*2/3} ${200 - ((mockRecyclingData.monthlyData[2].totalWeight / 1000) / 2.5 * 200)} 
                               L 400 ${200 - ((mockRecyclingData.monthlyData[3].totalWeight / 1000) / 2.5 * 200)}`}
                            stroke="#6366f1"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          {mockRecyclingData.monthlyData.map((monthData, index) => {
                            const x = index * (400 / 3);
                            const y = 200 - ((monthData.totalWeight / 1000) / 2.5 * 200);
                            return (
                              <circle
                                key={monthData.month}
                                cx={x}
                                cy={y}
                                r="5"
                                fill="#6366f1"
                                stroke="white"
                                strokeWidth="2"
                                className="data-point"
                                data-month={monthData.month}
                                data-weight={(monthData.totalWeight / 1000).toFixed(1)}
                                data-pickups={monthData.pickups}
                              />
                            );
                          })}
                        </svg>
                        
                        {/* Data point labels */}
                        <div className="data-points-overlay">
                          {mockRecyclingData.monthlyData.map((monthData, index) => (
                            <div 
                              key={monthData.month} 
                              className="data-point-label"
                              style={{
                                left: `${(index / 3) * 100}%`,
                                bottom: `${((monthData.totalWeight / 1000) / 2.5) * 100 + 5}%`
                              }}
                            >
                              <div className="data-tooltip">
                                <span className="tooltip-weight">{(monthData.totalWeight / 1000).toFixed(1)}t</span>
                                <span className="tooltip-pickups">{monthData.pickups} pickups</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="x-axis">
                        {mockRecyclingData.monthlyData.map((monthData, index) => (
                          <div key={monthData.month} className="x-label" style={{left: `${(index / 3) * 100}%`}}>
                            {monthData.month}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Material breakdown mini charts */}
                    <div className="material-mini-charts">
                      <h4>Material Breakdown Trends</h4>
                      <div className="mini-charts-grid">
                        {(['plastic', 'paper', 'metal', 'glass'] as const).map(material => {
                          const currentMonthData = mockRecyclingData.monthlyData[mockRecyclingData.monthlyData.length - 1];
                          return (
                            <div key={material} className="mini-chart">
                              <div className="mini-chart-header">
                                <span className={`material-dot ${material}`}></span>
                                <span className="material-name">{material.charAt(0).toUpperCase() + material.slice(1)}</span>
                              </div>
                              <div className="mini-line-container">
                                <svg className="mini-line-svg" viewBox="0 0 120 30" preserveAspectRatio="none">
                                  <path
                                    d={mockRecyclingData.monthlyData.map((monthData, index) => {
                                      const x = index * 40;
                                      const maxMaterialWeight = Math.max(
                                        ...mockRecyclingData.monthlyData.map(m => m.materials[material].weight)
                                      );
                                      const y = 30 - (monthData.materials[material].weight / maxMaterialWeight * 25);
                                      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                                    }).join(' ')}
                                    stroke={material === 'plastic' ? '#ef4444' : 
                                           material === 'paper' ? '#f59e0b' : 
                                           material === 'metal' ? '#6b7280' : '#06b6d4'}
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </div>
                              <div className="mini-chart-value">
                                {currentMonthData.materials[material].weight}kg
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="volume-summary">
                    <div className="summary-stats">
                      <div className="summary-item">
                        <h4>Total Pickups</h4>
                        <span>{mockRecyclingData.monthlyData[mockRecyclingData.monthlyData.length - 1].pickups}</span>
                      </div>
                      <div className="summary-item">
                        <h4>Unique Donors</h4>
                        <span>{mockRecyclingData.monthlyData[mockRecyclingData.monthlyData.length - 1].uniqueDonors}</span>
                      </div>
                    </div>
                  </div>
                  <div className="material-legend">
                    {(['plastic', 'paper', 'metal', 'glass'] as const).map((material) => {
                      const currentMonthData = mockRecyclingData.monthlyData[mockRecyclingData.monthlyData.length - 1];
                      const data = currentMonthData.materials[material];
                      return (
                        <div key={material} className="legend-item">
                          <span className={`legend-dot ${material}`}></span>
                          <span className="legend-text">
                            {material.charAt(0).toUpperCase() + material.slice(1)} 
                            <span className="legend-stats">
                              ({data.percentage}% • {data.weight}kg)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="material-trends">
                    <h4>Material Trends</h4>
                    <div className="trends-grid">
                      {(['plastic', 'paper', 'metal', 'glass'] as const).map((material) => {
                        const trend = mockRecyclingData.materialTrends[material];
                        return (
                          <div key={material} className="trend-item">
                            <div className="trend-header">
                              <span className={`trend-dot ${material}`}></span>
                              <span className="trend-name">{material.charAt(0).toUpperCase() + material.slice(1)}</span>
                              <span className={`trend-indicator ${trend.trend}`}>
                                {trend.trend === 'increasing' ? '↗️' : trend.trend === 'decreasing' ? '↘️' : '➡️'}
                              </span>
                            </div>
                            <div className="trend-details">
                              <span>Avg: {trend.averageWeight}kg/month</span>
                              <span>Top: {trend.topItems[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Popular Rewards Ranking */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>🎁 Popular Rewards Ranking</h3>
                  <span className="chart-subtitle">Most redeemed this month</span>
                </div>
                <div className="rewards-ranking">
                  <div className="reward-rank-item">
                    <div className="rank-badge gold">1</div>
                    <div className="reward-info">
                      <h4>RM10 Grab Voucher</h4>
                      <p>Transport • 100 points</p>
                    </div>
                    <div className="reward-metrics">
                      <span className="redeemed-count">45</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '90%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="reward-rank-item">
                    <div className="rank-badge silver">2</div>
                    <div className="reward-info">
                      <h4>Movie Ticket</h4>
                      <p>Entertainment • 120 points</p>
                    </div>
                    <div className="reward-metrics">
                      <span className="redeemed-count">32</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '64%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="reward-rank-item">
                    <div className="rank-badge bronze">3</div>
                    <div className="reward-info">
                      <h4>Starbucks Coffee</h4>
                      <p>Food & Beverage • 80 points</p>
                    </div>
                    <div className="reward-metrics">
                      <span className="redeemed-count">28</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '56%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="reward-rank-item">
                    <div className="rank-badge">4</div>
                    <div className="reward-info">
                      <h4>Eco Water Bottle</h4>
                      <p>Lifestyle • 150 points</p>
                    </div>
                    <div className="reward-metrics">
                      <span className="redeemed-count">18</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '36%'}}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="reward-rank-item">
                    <div className="rank-badge">5</div>
                    <div className="reward-info">
                      <h4>RM5 Food Voucher</h4>
                      <p>Food & Beverage • 50 points</p>
                    </div>
                    <div className="reward-metrics">
                      <span className="redeemed-count">15</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{width: '30%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Regional Performance Map */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>🗺️ Regional Performance Map</h3>
                  <span className="chart-subtitle">Performance by Malaysian states</span>
                </div>
                <div className="regional-performance">
                  <div className="performance-map">
                    <div className="region-item excellent">
                      <div className="region-header">
                        <span className="region-name">Kuala Lumpur</span>
                        <span className="performance-badge excellent">Excellent</span>
                      </div>
                      <div className="region-stats">
                        <div className="stat">
                          <span className="stat-label">Users:</span>
                          <span className="stat-value">1,245</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Volume:</span>
                          <span className="stat-value">850kg</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Growth:</span>
                          <span className="stat-value growth">+35%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="region-item good">
                      <div className="region-header">
                        <span className="region-name">Selangor</span>
                        <span className="performance-badge good">Good</span>
                      </div>
                      <div className="region-stats">
                        <div className="stat">
                          <span className="stat-label">Users:</span>
                          <span className="stat-value">987</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Volume:</span>
                          <span className="stat-value">672kg</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Growth:</span>
                          <span className="stat-value growth">+28%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="region-item average">
                      <div className="region-header">
                        <span className="region-name">Penang</span>
                        <span className="performance-badge average">Average</span>
                      </div>
                      <div className="region-stats">
                        <div className="stat">
                          <span className="stat-label">Users:</span>
                          <span className="stat-value">543</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Volume:</span>
                          <span className="stat-value">432kg</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Growth:</span>
                          <span className="stat-value growth">+18%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="region-item average">
                      <div className="region-header">
                        <span className="region-name">Johor</span>
                        <span className="performance-badge average">Average</span>
                      </div>
                      <div className="region-stats">
                        <div className="stat">
                          <span className="stat-label">Users:</span>
                          <span className="stat-value">456</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Volume:</span>
                          <span className="stat-value">389kg</span>
                        </div>
                        <div className="stat">
                          <span className="stat-label">Growth:</span>
                          <span className="stat-value growth">+19%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Collector Performance Dashboard */}
              <div className="chart-card wide">
                <div className="chart-header">
                  <h3>🚛 Collector Performance Dashboard</h3>
                  <span className="chart-subtitle">Route efficiency and performance metrics</span>
                </div>
                <div className="collector-dashboard">
                  <div className="collector-metrics">
                    <div className="metric-card">
                      <div className="metric-icon">⚡</div>
                      <div className="metric-content">
                        <h4>Average Efficiency</h4>
                        <span className="metric-value">87.5%</span>
                        <span className="metric-change positive">+5.2%</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">🗺️</div>
                      <div className="metric-content">
                        <h4>Routes Optimized</h4>
                        <span className="metric-value">142</span>
                        <span className="metric-change positive">+12</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">⏱️</div>
                      <div className="metric-content">
                        <h4>Avg. Pickup Time</h4>
                        <span className="metric-value">8.5 min</span>
                        <span className="metric-change positive">-1.2 min</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">✅</div>
                      <div className="metric-content">
                        <h4>Success Rate</h4>
                        <span className="metric-value">94.2%</span>
                        <span className="metric-change positive">+2.1%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="collector-leaderboard">
                    <h4>Top Performers This Month</h4>
                    <div className="collector-list">
                      <div className="collector-item">
                        <div className="collector-rank">🥇</div>
                        <div className="collector-info">
                          <span className="name">Raj Kumar</span>
                          <span className="stats">142 pickups • 98.5% success</span>
                        </div>
                        <div className="collector-score">98.5</div>
                      </div>
                      
                      <div className="collector-item">
                        <div className="collector-rank">🥈</div>
                        <div className="collector-info">
                          <span className="name">Ahmad Faiz</span>
                          <span className="stats">128 pickups • 96.2% success</span>
                        </div>
                        <div className="collector-score">94.8</div>
                      </div>
                      
                      <div className="collector-item">
                        <div className="collector-rank">🥉</div>
                        <div className="collector-info">
                          <span className="name">Lim Wei Hong</span>
                          <span className="stats">115 pickups • 95.7% success</span>
                        </div>
                        <div className="collector-score">92.3</div>
                      </div>
                      
                      <div className="collector-item">
                        <div className="collector-rank">4</div>
                        <div className="collector-info">
                          <span className="name">Siti Aminah</span>
                          <span className="stats">108 pickups • 93.5% success</span>
                        </div>
                        <div className="collector-score">89.7</div>
                      </div>
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
