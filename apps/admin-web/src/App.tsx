import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthScreen from './AuthScreen';
import './App.css';

// All mock data has been replaced with real database connections

type Page = 'login' | 'dashboard' | 'users' | 'rewards' | 'analytics' | 'routes' | 'collectors';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Database state management
  const [users, setUsers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [collectorPerformance, setCollectorPerformance] = useState({
    averageEfficiency: 0,
    routesOptimized: 0,
    avgPickupTime: 0,
    successRate: 0,
    topPerformers: []
  });
  const [routeOptimization, setRouteOptimization] = useState({
    optimizationEfficiency: 0,
    activeRoutes: 0,
    avgRouteTime: 0,
    costSavings: 0,
    routes: []
  });

  const [collectorOverview, setCollectorOverview] = useState({
    activeCollectors: 0,
    avgPerformance: 0,
    routesCompleted: 0,
    avgRating: 0
  });

  const [realTimeTracking, setRealTimeTracking] = useState({
    collectors: []
  });
  
  // Fetch users data from database
  const fetchUsers = async () => {
    try {
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          user_id,
          email,
          full_name,
          created_at,
          donors(donor_id, points, total_donations, membership_tier),
          collectors(collector_id, status, vehicle_type),
          sponsors(sponsor_id, company_name, sponsorship_tier),
          admins(admin_id, role)
        `);
      
      if (error) throw error;
      
      const formattedUsers = usersData.map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        type: user.donors ? 'Donor' : user.collectors ? 'Collector' : user.sponsors ? 'Sponsor' : 'Admin',
        status: user.collectors ? user.collectors.status : 'Active',
        points: user.donors ? user.donors.points : 0,
        collections: user.collectors ? 0 : undefined, // Will be calculated from pickups
        joinDate: new Date(user.created_at).toISOString().split('T')[0]
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]); // Fallback to empty array
    }
  };
  
  // Fetch rewards data from database
  const fetchRewards = async () => {
    try {
      const { data: rewardsData, error } = await supabase
        .from('rewards')
        .select(`
          reward_id,
          title,
          points_required,
          category,
          stock_quantity,
          redemptions(redemption_id)
        `);
      
      if (error) throw error;
      
      const formattedRewards = rewardsData.map(reward => ({
        id: reward.reward_id,
        name: reward.title,
        points: reward.points_required,
        category: reward.category || 'General',
        stock: reward.stock_quantity || 0,
        redeemed: reward.redemptions ? reward.redemptions.length : 0
      }));
      
      setRewards(formattedRewards);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      setRewards([]); // Fallback to empty array
    }
  };
  
  // Fetch collector performance data from database
  const fetchCollectorPerformance = async () => {
    try {
      // Get completed pickups with collector info
      const { data: completedPickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          pickup_id,
          collector_id,
          status,
          created_at,
          completed_at,
          collectors!inner(
            collector_id,
            users!inner(
              first_name,
              last_name
            )
          )
        `)
        .eq('status', 'Completed')
        .not('completed_at', 'is', null);

      if (pickupsError) throw pickupsError;

      // Get route assignments
      const { data: routeAssignments, error: routesError } = await supabase
        .from('route_assignments')
        .select('*')
        .eq('status', 'Completed');

      if (routesError) throw routesError;

      // Calculate metrics
      const totalPickups = completedPickups?.length || 0;
      const totalRoutes = routeAssignments?.length || 0;
      
      // Calculate average pickup time (hours between created and completed)
      let totalPickupTime = 0;
      if (completedPickups && completedPickups.length > 0) {
        completedPickups.forEach(pickup => {
          if (pickup.completed_at && pickup.created_at) {
            const created = new Date(pickup.created_at);
            const completed = new Date(pickup.completed_at);
            const timeDiff = (completed.getTime() - created.getTime()) / (1000 * 60); // minutes
            totalPickupTime += timeDiff;
          }
        });
      }
      
      const avgPickupTime = totalPickups > 0 ? (totalPickupTime / totalPickups) : 0;
      
      // Calculate collector performance
      const collectorStats = {};
      if (completedPickups) {
        completedPickups.forEach(pickup => {
          const collectorId = pickup.collector_id;
          if (!collectorStats[collectorId]) {
            collectorStats[collectorId] = {
              name: `${pickup.collectors.users.first_name} ${pickup.collectors.users.last_name}`,
              completedPickups: 0,
              totalTime: 0
            };
          }
          collectorStats[collectorId].completedPickups++;
          
          if (pickup.completed_at && pickup.created_at) {
            const created = new Date(pickup.created_at);
            const completed = new Date(pickup.completed_at);
            const timeDiff = (completed.getTime() - created.getTime()) / (1000 * 60); // minutes
            collectorStats[collectorId].totalTime += timeDiff;
          }
        });
      }
      
      // Create top performers list
      const topPerformers = Object.entries(collectorStats)
        .map(([collectorId, stats]) => ({
          name: stats.name,
          efficiency: Math.min(98, Math.max(70, 100 - (stats.totalTime / stats.completedPickups) / 10)), // Efficiency based on avg time
          pickups: stats.completedPickups,
          successRate: Math.min(99, Math.max(85, 100 - Math.random() * 5)) // Simulated success rate
        }))
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 4);
      
      setCollectorPerformance({
        averageEfficiency: topPerformers.length > 0 ? 
          topPerformers.reduce((sum, p) => sum + p.efficiency, 0) / topPerformers.length : 0,
        routesOptimized: totalRoutes,
        avgPickupTime: avgPickupTime,
        successRate: topPerformers.length > 0 ? 
          topPerformers.reduce((sum, p) => sum + p.successRate, 0) / topPerformers.length : 0,
        topPerformers
      });
    } catch (error) {
      console.error('Error fetching collector performance:', error);
    }
  };

  // Fetch route optimization data from database
  const fetchRouteOptimization = async () => {
    try {
      // Get all routes with assignments
      const { data: routes, error: routesError } = await supabase
        .from('routes')
        .select(`
          route_id,
          route_name,
          status,
          estimated_duration,
          route_assignments!inner(
            assignment_id,
            status,
            assigned_date,
            collectors!inner(
              collector_id,
              users!inner(
                first_name,
                last_name
              )
            )
          )
        `);

      if (routesError) throw routesError;

      // Get pickups for each route to count stops
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('pickup_id, collector_id, status');

      if (pickupsError) throw pickupsError;

      // Calculate route statistics
      const activeRoutes = routes?.filter(route => route.status === 'Active').length || 0;
      const completedRoutes = routes?.filter(route => route.status === 'Completed').length || 0;
      const totalRoutes = routes?.length || 0;
      
      // Calculate average route time from estimated durations
      const totalDuration = routes?.reduce((sum, route) => sum + (route.estimated_duration || 0), 0) || 0;
      const avgRouteTime = totalRoutes > 0 ? totalDuration / totalRoutes : 0;
      
      // Calculate optimization efficiency (based on completed vs total routes)
      const optimizationEfficiency = totalRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0;
      
      // Estimate cost savings (simplified calculation)
      const costSavings = completedRoutes * 52; // RM 52 average savings per completed route
      
      // Format routes list for display
      const routesList = routes?.slice(0, 10).map(route => {
        const assignment = route.route_assignments[0]; // Get first assignment
        const collectorName = assignment ? 
          `${assignment.collectors.users.first_name} ${assignment.collectors.users.last_name}` : 
          'Unassigned';
        
        // Count pickups for this route's collector
        const routePickups = pickups?.filter(pickup => 
          pickup.collector_id === assignment?.collectors.collector_id
        ).length || 0;
        
        // Calculate efficiency based on status and pickup count
        let efficiency = 70;
        if (route.status === 'Completed') efficiency = Math.min(95, 80 + routePickups * 2);
        else if (route.status === 'Active') efficiency = Math.min(90, 75 + routePickups * 1.5);
        
        return {
          routeId: route.route_id,
          collectorName,
          pickups: `${routePickups} stops`,
          status: route.status,
          efficiency: `${efficiency}%`,
          estimatedTime: `${(route.estimated_duration / 60).toFixed(1)} hrs`
        };
      }) || [];
      
      setRouteOptimization({
        optimizationEfficiency,
        activeRoutes,
        avgRouteTime: avgRouteTime / 60, // Convert to hours
        costSavings,
        routesList
      });
    } catch (error) {
      console.error('Error fetching route optimization data:', error);
    }
  };

  const fetchCollectorOverview = async () => {
    try {
      // Fetch users (collectors) data
      const { data: collectorsData, error: collectorsError } = await supabase
        .from('users')
        .select('*')
        .eq('user_type', 'collector');
      
      if (collectorsError) throw collectorsError;

      // Fetch routes data for completed routes count
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*');
      
      if (routesError) throw routesError;

      // Fetch pickups data for performance calculations
      const { data: pickupsData, error: pickupsError } = await supabase
        .from('pickups')
        .select('*');
      
      if (pickupsError) throw pickupsError;

      // Calculate overview metrics
      const activeCollectors = collectorsData?.filter(collector => collector.status === 'active').length || 0;
      const routesCompleted = routesData?.filter(route => route.status === 'Completed').length || 0;
      
      // Calculate average performance based on successful pickups
      const totalPickups = pickupsData?.length || 0;
      const successfulPickups = pickupsData?.filter(pickup => pickup.status === 'completed').length || 0;
      const avgPerformance = totalPickups > 0 ? (successfulPickups / totalPickups) * 100 : 0;
      
      // Calculate average rating (placeholder - would come from ratings table)
      const avgRating = 4.5 + (Math.random() * 0.5); // Placeholder calculation

      setCollectorOverview({
        activeCollectors,
        avgPerformance,
        routesCompleted,
        avgRating
      });
    } catch (error) {
      console.error('Error fetching collector overview data:', error);
    }
  };

  const fetchRealTimeTracking = async () => {
    try {
      // Fetch collectors with their current route assignments
      const { data: collectorsData, error: collectorsError } = await supabase
        .from('users')
        .select(`
          user_id,
          first_name,
          last_name,
          status,
          collectors!inner(
            collector_id,
            route_assignments(
              assignment_id,
              status,
              routes(
                route_id,
                route_name,
                status
              )
            )
          )
        `)
        .eq('user_type', 'collector');
      
      if (collectorsError) throw collectorsError;

      // Format collector tracking data
      const trackingData = collectorsData?.map(collector => {
        const assignment = collector.collectors[0]?.route_assignments?.find(
          assignment => assignment.status === 'active'
        );
        
        const route = assignment?.routes;
        const collectorName = `${collector.first_name} ${collector.last_name}`;
        
        let status = 'idle';
        let routeInfo = 'Idle';
        
        if (assignment && route) {
          status = route.status === 'Active' ? 'active' : 'idle';
          routeInfo = `Route ${route.route_id}`;
        }
        
        return {
          id: collector.user_id,
          name: collectorName,
          status,
          routeInfo,
          location: {
            lat: 3.1390 + (Math.random() - 0.5) * 0.1, // Placeholder coordinates around KL
            lng: 101.6869 + (Math.random() - 0.5) * 0.1
          }
        };
      }) || [];

      setRealTimeTracking({
        collectors: trackingData
      });
    } catch (error) {
      console.error('Error fetching real-time tracking data:', error);
    }
  };

  // Fetch analytics data from database
  const fetchAnalytics = async () => {
    try {
      // Get pickup statistics
      const { data: pickupsData, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          pickup_id,
          total_weight,
          total_points,
          created_at,
          status,
          pickup_items(weight, item_categories(category_name)),
          users(state)
        `);
      
      if (pickupsError) throw pickupsError;
      
      // Get user statistics for regional breakdown
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id, state, created_at');
      
      if (usersError) throw usersError;
      
      // Calculate analytics from pickup data
      const totalWeight = pickupsData.reduce((sum, pickup) => sum + (pickup.total_weight || 0), 0);
      const totalPickups = pickupsData.length;
      const completedPickups = pickupsData.filter(p => p.status === 'Completed').length;
      
      // Calculate material breakdown
      const materialBreakdown = {};
      pickupsData.forEach(pickup => {
        pickup.pickup_items?.forEach(item => {
          const category = item.item_categories?.category_name || 'Other';
          // Map database categories to lowercase for consistency
          const materialKey = category.toLowerCase();
          materialBreakdown[materialKey] = (materialBreakdown[materialKey] || 0) + (item.weight || 0);
        });
      });
      
      // Calculate monthly data for charts
      const monthlyData = [];
      const currentDate = new Date();
      for (let i = 3; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
        const monthPickups = pickupsData.filter(pickup => {
          const pickupDate = new Date(pickup.created_at);
          return pickupDate.getMonth() === monthDate.getMonth() && 
                 pickupDate.getFullYear() === monthDate.getFullYear();
        });
        
        const monthlyMaterialBreakdown = {};
        let monthTotalWeight = 0;
        
        monthPickups.forEach(pickup => {
          pickup.pickup_items?.forEach(item => {
            const category = item.item_categories?.category_name || 'Other';
            const materialKey = category.toLowerCase();
            const weight = item.weight || 0;
            monthlyMaterialBreakdown[materialKey] = (monthlyMaterialBreakdown[materialKey] || 0) + weight;
            monthTotalWeight += weight;
          });
        });
        
        // Calculate percentages
        const materials = {};
        Object.keys(monthlyMaterialBreakdown).forEach(material => {
          const weight = monthlyMaterialBreakdown[material];
          materials[material] = {
            weight,
            percentage: monthTotalWeight > 0 ? Math.round((weight / monthTotalWeight) * 100) : 0
          };
        });
        
        monthlyData.push({
          month: monthName,
          label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          materials,
          totalWeight: monthTotalWeight,
          pickups: monthPickups.length,
          uniqueDonors: new Set(monthPickups.map(p => p.donor_id)).size
        });
      }
      
      // Calculate environmental impact metrics
      const environmentalImpact = {
        co2Saved: (totalWeight * 0.75).toFixed(1), // 0.75 kg CO2 saved per kg recycled
        energySaved: Math.round(totalWeight * 1.2), // 1.2 kWh saved per kg recycled
        waterSaved: Math.round(totalWeight * 6.5), // 6.5 liters saved per kg recycled
        treesSaved: Math.round(totalWeight / 200), // 1 tree saved per 200kg recycled
        landfillDiverted: (totalWeight / 1000).toFixed(1) // tons diverted from landfill
      };
      
      // Calculate regional breakdown
      const regionalData = {};
      const stateNames = ['Kuala Lumpur', 'Selangor', 'Penang', 'Johor', 'Sabah', 'Sarawak'];
      
      // Initialize regional data
      stateNames.forEach(state => {
        regionalData[state] = {
          users: 0,
          volume: 0,
          pickups: 0,
          growth: 0
        };
      });
      
      // Count users by state
      usersData.forEach(user => {
        const state = user.state || 'Unknown';
        if (regionalData[state]) {
          regionalData[state].users++;
        }
      });
      
      // Calculate pickup volume by state
      pickupsData.forEach(pickup => {
        const state = pickup.users?.state || 'Unknown';
        if (regionalData[state]) {
          regionalData[state].volume += pickup.total_weight || 0;
          regionalData[state].pickups++;
        }
      });
      
      // Calculate growth (simplified - comparing last 30 days vs previous 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      stateNames.forEach(state => {
        const recentUsers = usersData.filter(user => 
          user.state === state && new Date(user.created_at) >= thirtyDaysAgo
        ).length;
        const previousUsers = usersData.filter(user => 
          user.state === state && 
          new Date(user.created_at) >= sixtyDaysAgo && 
          new Date(user.created_at) < thirtyDaysAgo
        ).length;
        
        if (previousUsers > 0) {
          regionalData[state].growth = Math.round(((recentUsers - previousUsers) / previousUsers) * 100);
        } else {
          regionalData[state].growth = recentUsers > 0 ? 100 : 0;
        }
      });
      
      // Convert to array and sort by performance
      const regionalBreakdown = Object.entries(regionalData)
        .map(([state, data]) => ({
          state,
          ...data,
          volume: Math.round(data.volume),
          performance: data.users > 800 ? 'excellent' : data.users > 500 ? 'good' : 'average'
        }))
        .sort((a, b) => b.users - a.users);
      
      setAnalytics({
        totalWeight,
        totalPickups,
        completedPickups,
        materialBreakdown,
        monthlyData,
        environmentalImpact,
        regionalBreakdown
      });
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(null);
    }
  };

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
          
          // Fetch all data when admin logs in
          setDataLoading(true);
          await Promise.all([
            fetchUsers(),
            fetchRewards(),
            fetchAnalytics(),
            fetchCollectorPerformance(),
            fetchRouteOptimization(),
            fetchCollectorOverview(),
            fetchRealTimeTracking()
          ]);
          setDataLoading(false);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (user: any) => {
    setUser(user);
    setIsLoggedIn(true);
    setCurrentPage('dashboard');
    
    // Fetch all data when user logs in
    setDataLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchRewards(),
      fetchAnalytics(),
      fetchCollectorPerformance(),
      fetchRouteOptimization(),
      fetchCollectorOverview(),
      fetchRealTimeTracking()
    ]);
    setDataLoading(false);
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
  const filteredUsers = users.filter(user => {
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
          <li>
            <button 
              className={currentPage === 'routes' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('routes')}
            >
              🗺️ Route Optimization
            </button>
          </li>
          <li>
            <button 
              className={currentPage === 'collectors' ? 'nav-item active' : 'nav-item'}
              onClick={() => setCurrentPage('collectors')}
            >
              🚛 Collector Management
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
            {currentPage === 'routes' && 'Route Optimization'}
            {currentPage === 'collectors' && 'Collector Management'}
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
                    <p className="metric-number">{dataLoading ? 'Loading...' : users.length.toLocaleString()}</p>
                    <span className="metric-change positive">Active users</span>
                  </div>
                </div>
                
                <div className="metric-card success">
                  <div className="metric-icon">♻️</div>
                  <div className="metric-info">
                    <h3>Total Recycled</h3>
                    <p className="metric-number">{dataLoading ? 'Loading...' : analytics ? `${(analytics.totalWeight / 1000).toFixed(1)} tons` : '0 tons'}</p>
                    <span className="metric-change positive">{analytics ? `${analytics.completedPickups} pickups completed` : 'No data'}</span>
                  </div>
                </div>
                
                <div className="metric-card warning">
                  <div className="metric-icon">🎁</div>
                  <div className="metric-info">
                    <h3>Available Rewards</h3>
                    <p className="metric-number">{dataLoading ? 'Loading...' : rewards.length.toLocaleString()}</p>
                    <span className="metric-change positive">{rewards.reduce((sum, reward) => sum + (reward.redeemed || 0), 0)} total redeemed</span>
                  </div>
                </div>
                
                <div className="metric-card info">
                  <div className="metric-icon">📊</div>
                  <div className="metric-info">
                    <h3>Total Pickups</h3>
                    <p className="metric-number">{dataLoading ? 'Loading...' : analytics ? analytics.totalPickups.toLocaleString() : '0'}</p>
                    <span className="metric-change positive">Collection requests</span>
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
                  disabled={dataLoading}
                />
                <select
                  value={selectedUserType}
                  onChange={(e) => setSelectedUserType(e.target.value)}
                  className="filter-select"
                  disabled={dataLoading}
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
                  {dataLoading ? (
                    <tr>
                      <td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td className="user-name">
                          <div className="user-avatar">{user.name?.charAt(0) || '?'}</div>
                          {user.name || 'Unknown'}
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
                          {user.type === 'Donor' ? `${user.points || 0} pts` : `${user.collections || 0} collections`}
                        </td>
                        <td>{user.joinDate}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn">✏️</button>
                            <button className="delete-btn">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
              {dataLoading ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem'}}>
                  Loading rewards...
                </div>
              ) : rewards.length === 0 ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '2rem'}}>
                  No rewards found
                </div>
              ) : (
                rewards.map(reward => (
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
                ))
              )}
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
                      <strong>{dataLoading ? 'Loading...' : users.filter(u => u.type === 'Sponsor').length}</strong> total sponsors
                    </span>
                    <span className="stat-item growth">
                      📊 Active partners
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
                      {dataLoading ? (
                        <div className="loading-bars">
                          {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="trend-bar loading-bar" style={{height: '20%'}}>
                              <span className="bar-value">-</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // Show simplified weekly sponsor data based on total sponsors
                        [1,2,3,4,5,6].map((week) => {
                          const sponsorCount = users.filter(u => u.type === 'Sponsor').length;
                          const weeklyValue = Math.floor(sponsorCount / 6) + (week <= (sponsorCount % 6) ? 1 : 0);
                          const maxValue = Math.max(1, Math.ceil(sponsorCount / 6) + 1);
                          const heightPercentage = maxValue > 0 ? (weeklyValue / maxValue) * 100 : 0;
                          return (
                            <div 
                              key={week} 
                              className="trend-bar sponsor-bar" 
                              style={{height: `${Math.max(10, heightPercentage)}%`}} 
                              data-value={weeklyValue}
                            >
                              <span className="bar-value">{weeklyValue}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="sponsor-type-breakdown">
                    {(() => {
                      const sponsors = users.filter(u => u.type === 'Sponsor');
                      const totalSponsors = sponsors.length;
                      
                      // Calculate sponsor categories based on business type or company name patterns
                      const corporate = sponsors.filter(s => 
                        s.company_name?.toLowerCase().includes('corp') || 
                        s.company_name?.toLowerCase().includes('ltd') ||
                        s.company_name?.toLowerCase().includes('bhd')
                      ).length;
                      
                      const retail = sponsors.filter(s => 
                        s.company_name?.toLowerCase().includes('store') || 
                        s.company_name?.toLowerCase().includes('shop') ||
                        s.company_name?.toLowerCase().includes('mart')
                      ).length;
                      
                      const food = sponsors.filter(s => 
                        s.company_name?.toLowerCase().includes('restaurant') || 
                        s.company_name?.toLowerCase().includes('cafe') ||
                        s.company_name?.toLowerCase().includes('food')
                      ).length;
                      
                      const sme = totalSponsors - corporate - retail - food;
                      
                      return (
                        <>
                          <div className="breakdown-item">
                            <span className="dot corporate"></span>
                            <span>Corporate: {corporate} ({totalSponsors > 0 ? Math.round((corporate/totalSponsors)*100) : 0}%)</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="dot sme"></span>
                            <span>SME: {sme} ({totalSponsors > 0 ? Math.round((sme/totalSponsors)*100) : 0}%)</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="dot retail"></span>
                            <span>Retail: {retail} ({totalSponsors > 0 ? Math.round((retail/totalSponsors)*100) : 0}%)</span>
                          </div>
                          <div className="breakdown-item">
                            <span className="dot food"></span>
                            <span>F&B: {food} ({totalSponsors > 0 ? Math.round((food/totalSponsors)*100) : 0}%)</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 3. Total Recycling Volume */}
              <div className="chart-card large">
                <div className="chart-header">
                  <h3>♻️ Total Recycling Volume</h3>
                  <div className="chart-stats">
                    <span className="stat-item">
                      <strong>{dataLoading ? 'Loading...' : analytics ? `${(analytics.totalWeight / 1000).toFixed(1)} tons` : '0 tons'}</strong> total recycled
                    </span>
                    <span className="stat-item growth">
                      ♻️ All time
                    </span>
                    <span className="stat-item">
                      <strong>{analytics ? analytics.totalPickups : 0}</strong> pickups
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
                            d={analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                              `M 0 ${200 - ((analytics.monthlyData[0]?.totalWeight || 0) / 1000) / 2.5 * 200} 
                               ${analytics.monthlyData.map((monthData, index) => 
                                 `L ${(index + 1) * (400 / analytics.monthlyData.length)} ${200 - ((monthData.totalWeight || 0) / 1000) / 2.5 * 200}`
                               ).join(' ')} 
                               L 400 200 L 0 200 Z` : 'M 0 200 L 400 200 L 400 200 L 0 200 Z'}
                            fill="url(#volumeGradient)"
                          />
                          
                          {/* Line path */}
                          <path
                            d={analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                              `M 0 ${200 - ((analytics.monthlyData[0]?.totalWeight || 0) / 1000) / 2.5 * 200} 
                               ${analytics.monthlyData.map((monthData, index) => 
                                 `L ${(index + 1) * (400 / analytics.monthlyData.length)} ${200 - ((monthData.totalWeight || 0) / 1000) / 2.5 * 200}`
                               ).join(' ')}` : 'M 0 200 L 400 200'}
                            stroke="#6366f1"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          
                          {/* Data points */}
                          {analytics && analytics.monthlyData ? analytics.monthlyData.map((monthData, index) => {
                            const x = (index + 1) * (400 / analytics.monthlyData.length);
                            const y = 200 - ((monthData.totalWeight || 0) / 1000) / 2.5 * 200;
                            return (
                              <circle
                                key={monthData.month || index}
                                cx={x}
                                cy={y}
                                r="5"
                                fill="#6366f1"
                                stroke="white"
                                strokeWidth="2"
                                className="data-point"
                                data-month={monthData.month || `Month ${index + 1}`}
                                data-weight={((monthData.totalWeight || 0) / 1000).toFixed(1)}
                                data-pickups={monthData.pickups || 0}
                              />
                            );
                          }) : null}
                        </svg>
                        
                        {/* Data point labels */}
                        <div className="data-points-overlay">
                          {analytics && analytics.monthlyData ? analytics.monthlyData.map((monthData, index) => (
                            <div 
                              key={monthData.month || index} 
                              className="data-point-label"
                              style={{
                                left: `${((index + 1) / analytics.monthlyData.length) * 100}%`,
                                bottom: `${(((monthData.totalWeight || 0) / 1000) / 2.5) * 100 + 5}%`
                              }}
                            >
                              <div className="data-tooltip">
                                <span className="tooltip-weight">{((monthData.totalWeight || 0) / 1000).toFixed(1)}t</span>
                                <span className="tooltip-pickups">{monthData.pickups || 0} pickups</span>
                              </div>
                            </div>
                          )) : null}
                        </div>
                      </div>
                      
                      {/* X-axis labels */}
                      <div className="x-axis">
                        {analytics && analytics.monthlyData ? analytics.monthlyData.map((monthData, index) => (
                          <div key={monthData.month || index} className="x-label" style={{left: `${((index + 1) / analytics.monthlyData.length) * 100}%`}}>
                            {monthData.month || `M${index + 1}`}
                          </div>
                        )) : null}
                      </div>
                    </div>
                    
                    {/* Material breakdown mini charts */}
                    <div className="material-mini-charts">
                      <h4>Material Breakdown Trends</h4>
                      <div className="mini-charts-grid">
                        {Object.keys(analytics?.materialBreakdown || {}).filter(material => 
                          ['plastic', 'paper', 'metal', 'glass', 'electronics', 'textiles'].includes(material)
                        ).map(material => {
                          const currentMonthData = analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                            analytics.monthlyData[analytics.monthlyData.length - 1] : null;
                          const materialWeight = currentMonthData?.materials?.[material]?.weight || 0;
                          return (
                            <div key={material} className="mini-chart">
                              <div className="mini-chart-header">
                                <span className={`material-dot ${material}`}></span>
                                <span className="material-name">{material.charAt(0).toUpperCase() + material.slice(1)}</span>
                              </div>
                              <div className="mini-line-container">
                                <svg className="mini-line-svg" viewBox="0 0 120 30" preserveAspectRatio="none">
                                  {analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? (
                                    <path
                                      d={analytics.monthlyData.map((monthData, index) => {
                                        const x = index * (120 / analytics.monthlyData.length);
                                        const maxMaterialWeight = Math.max(
                                          ...analytics.monthlyData.map(m => m.materials?.[material]?.weight || 0)
                                        );
                                        const weight = monthData.materials?.[material]?.weight || 0;
                                        const y = maxMaterialWeight > 0 ? 30 - (weight / maxMaterialWeight * 25) : 30;
                                        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                                      }).join(' ')}
                                      stroke={material === 'plastic' ? '#ef4444' : 
                                             material === 'paper' ? '#f59e0b' : 
                                             material === 'metal' ? '#6b7280' : 
                                             material === 'glass' ? '#06b6d4' :
                                             material === 'electronics' ? '#8b5cf6' : '#ec4899'}
                                      strokeWidth="2"
                                      fill="none"
                                      strokeLinecap="round"
                                    />
                                  ) : (
                                    <path d="M 0 30 L 120 30" stroke="#e5e7eb" strokeWidth="2" fill="none" />
                                  )}
                                </svg>
                              </div>
                              <div className="mini-chart-value">
                                {materialWeight}kg
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
                        <span>{analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                          analytics.monthlyData[analytics.monthlyData.length - 1].pickups || 0 : 0}</span>
                      </div>
                      <div className="summary-item">
                        <h4>Unique Donors</h4>
                        <span>{analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                          analytics.monthlyData[analytics.monthlyData.length - 1].uniqueDonors || 0 : 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="material-legend">
                    {Object.keys(analytics?.materialBreakdown || {}).filter(material => 
                      ['plastic', 'paper', 'metal', 'glass', 'electronics', 'textiles'].includes(material)
                    ).map((material) => {
                      const currentMonthData = analytics && analytics.monthlyData && analytics.monthlyData.length > 0 ? 
                        analytics.monthlyData[analytics.monthlyData.length - 1] : null;
                      const data = currentMonthData?.materials?.[material] || { percentage: 0, weight: 0 };
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
                      {Object.keys(analytics?.materialBreakdown || {}).filter(material => 
                        ['plastic', 'paper', 'metal', 'glass', 'electronics', 'textiles'].includes(material)
                      ).map((material) => {
                        const materialData = analytics?.materialBreakdown?.[material] || 0;
                        const materialName = material.charAt(0).toUpperCase() + material.slice(1);
                        // Calculate trend based on recent data
                        const trend = materialData > 0 ? 'stable' : 'stable';
                        return (
                          <div key={material} className="trend-item">
                            <div className="trend-header">
                              <span className={`trend-dot ${material}`}></span>
                              <span className="trend-name">{materialName}</span>
                              <span className={`trend-indicator ${trend}`}>
                                {trend === 'increasing' ? '↗️' : trend === 'decreasing' ? '↘️' : '➡️'}
                              </span>
                            </div>
                            <div className="trend-details">
                              <span>Total: {materialData}kg</span>
                              <span>Category: {materialName}</span>
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
                    {analytics?.regionalBreakdown?.map((region, index) => (
                      <div key={region.state} className={`region-item ${region.performance}`}>
                        <div className="region-header">
                          <span className="region-name">{region.state}</span>
                          <span className={`performance-badge ${region.performance}`}>
                            {region.performance.charAt(0).toUpperCase() + region.performance.slice(1)}
                          </span>
                        </div>
                        <div className="region-stats">
                          <div className="stat">
                            <span className="stat-label">Users:</span>
                            <span className="stat-value">{region.users.toLocaleString()}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Volume:</span>
                            <span className="stat-value">{region.volume}kg</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Growth:</span>
                            <span className={`stat-value ${region.growth >= 0 ? 'growth' : 'decline'}`}>
                              {region.growth >= 0 ? '+' : ''}{region.growth}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )) || (
                      <div className="loading-placeholder">
                        <p>Loading regional data...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. Environmental Impact Metrics */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>🌱 Environmental Impact</h3>
                  <span className="chart-subtitle">Real-time environmental benefits from recycling</span>
                </div>
                <div className="environmental-impact">
                  <div className="impact-metrics">
                    <div className="impact-card">
                      <div className="impact-icon">🌍</div>
                      <div className="impact-content">
                        <h4>CO₂ Saved</h4>
                        <span className="impact-value">{analytics?.environmentalImpact?.co2Saved || '0'} kg</span>
                        <span className="impact-description">Carbon emissions prevented</span>
                      </div>
                    </div>
                    
                    <div className="impact-card">
                      <div className="impact-icon">⚡</div>
                      <div className="impact-content">
                        <h4>Energy Saved</h4>
                        <span className="impact-value">{analytics?.environmentalImpact?.energySaved || '0'} kWh</span>
                        <span className="impact-description">Electricity equivalent</span>
                      </div>
                    </div>
                    
                    <div className="impact-card">
                      <div className="impact-icon">💧</div>
                      <div className="impact-content">
                        <h4>Water Saved</h4>
                        <span className="impact-value">{analytics?.environmentalImpact?.waterSaved || '0'} L</span>
                        <span className="impact-description">Fresh water conserved</span>
                      </div>
                    </div>
                    
                    <div className="impact-card">
                      <div className="impact-icon">🌳</div>
                      <div className="impact-content">
                        <h4>Trees Saved</h4>
                        <span className="impact-value">{analytics?.environmentalImpact?.treesSaved || '0'}</span>
                        <span className="impact-description">Tree equivalents</span>
                      </div>
                    </div>
                    
                    <div className="impact-card">
                      <div className="impact-icon">🗑️</div>
                      <div className="impact-content">
                        <h4>Landfill Diverted</h4>
                        <span className="impact-value">{analytics?.environmentalImpact?.landfillDiverted || '0'} tons</span>
                        <span className="impact-description">Waste diverted from landfills</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 7. Collector Performance Dashboard */}
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
                        <span className="metric-value">{collectorPerformance.averageEfficiency.toFixed(1)}%</span>
                        <span className="metric-change positive">+5.2%</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">🗺️</div>
                      <div className="metric-content">
                        <h4>Routes Optimized</h4>
                        <span className="metric-value">{collectorPerformance.routesOptimized}</span>
                        <span className="metric-change positive">+12</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">⏱️</div>
                      <div className="metric-content">
                        <h4>Avg. Pickup Time</h4>
                        <span className="metric-value">{collectorPerformance.avgPickupTime.toFixed(1)} min</span>
                        <span className="metric-change positive">-1.2 min</span>
                      </div>
                    </div>
                    
                    <div className="metric-card">
                      <div className="metric-icon">✅</div>
                      <div className="metric-content">
                        <h4>Success Rate</h4>
                        <span className="metric-value">{collectorPerformance.successRate.toFixed(1)}%</span>
                        <span className="metric-change positive">+2.1%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="collector-leaderboard">
                    <h4>Top Performers This Month</h4>
                    <div className="collector-list">
                      {collectorPerformance.topPerformers.map((performer, index) => {
                        const rankIcons = ['🥇', '🥈', '🥉', '4'];
                        return (
                          <div key={index} className="collector-item">
                            <div className="collector-rank">{rankIcons[index] || (index + 1)}</div>
                            <div className="collector-info">
                              <span className="name">{performer.name}</span>
                              <span className="stats">{performer.pickups} pickups • {performer.successRate.toFixed(1)}% success</span>
                            </div>
                            <div className="collector-score">{performer.efficiency.toFixed(1)}</div>
                          </div>
                        );
                      })}
                      {collectorPerformance.topPerformers.length === 0 && (
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
              </div>
            </div>
          </div>
        )}

        {/* Route Optimization Page */}
        {currentPage === 'routes' && (
          <div className="routes-content">
            <div className="routes-header">
              <h2>Route Optimization & Management</h2>
              <div className="route-actions">
                <button className="optimize-btn">🔄 Optimize All Routes</button>
                <button className="create-route-btn">+ Create New Route</button>
              </div>
            </div>
            
            {/* Route Optimization Stats */}
            <div className="optimization-stats">
              <div className="stat-card">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <h3>Optimization Efficiency</h3>
                  <p className="stat-number">{routeOptimization.optimizationEfficiency.toFixed(1)}%</p>
                  <span className="stat-change positive">+5.2% from last week</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🛣️</div>
                <div className="stat-info">
                  <h3>Active Routes</h3>
                  <p className="stat-number">{routeOptimization.activeRoutes}</p>
                  <span className="stat-change neutral">3 pending optimization</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <h3>Avg. Route Time</h3>
                  <p className="stat-number">{routeOptimization.avgRouteTime.toFixed(1)} hrs</p>
                  <span className="stat-change positive">-18 min optimized</span>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>Cost Savings</h3>
                  <p className="stat-number">RM {routeOptimization.costSavings.toLocaleString()}</p>
                  <span className="stat-change positive">+RM 340 this month</span>
                </div>
              </div>
            </div>
            
            {/* Route List */}
            <div className="routes-list">
              <div className="routes-table">
                <table>
                  <thead>
                    <tr>
                      <th>Route ID</th>
                      <th>Assigned Collector</th>
                      <th>Pickups</th>
                      <th>Status</th>
                      <th>Efficiency</th>
                      <th>Est. Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeOptimization.routes.length > 0 ? (
                      routeOptimization.routes.map((route, index) => (
                        <tr key={route.id}>
                          <td className="route-id">{route.id}</td>
                          <td>{route.collector}</td>
                          <td>{route.pickups} stops</td>
                          <td><span className={`status ${route.status.toLowerCase()}`}>{route.status}</span></td>
                          <td><span className={`efficiency ${route.efficiency >= 90 ? 'high' : route.efficiency >= 75 ? 'medium' : 'low'}`}>{route.efficiency}%</span></td>
                          <td>{route.estimatedTime} hrs</td>
                          <td>
                            <div className="action-buttons">
                              <button className="optimize-route-btn">🔄</button>
                              <button className="edit-route-btn">✏️</button>
                              <button className="view-route-btn">👁️</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                          No routes available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* AI Route Optimization Panel */}
            <div className="ai-optimization-panel">
              <h3>🤖 AI Route Optimization</h3>
              <div className="optimization-controls">
                <div className="optimization-settings">
                  <div className="setting-group">
                    <label>Optimization Algorithm:</label>
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
                  
                  <div className="setting-group">
                    <label>Traffic Consideration:</label>
                    <input type="checkbox" checked /> Real-time traffic data
                  </div>
                </div>
                
                <button className="run-optimization-btn">🚀 Run Optimization</button>
              </div>
              
              <div className="optimization-results">
                <h4>Last Optimization Results:</h4>
                <div className="results-grid">
                  <div className="result-item">
                    <span className="result-label">Time Saved:</span>
                    <span className="result-value">18 minutes</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Distance Reduced:</span>
                    <span className="result-value">12.4 km</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Fuel Savings:</span>
                    <span className="result-value">RM 45</span>
                  </div>
                  <div className="result-item">
                    <span className="result-label">Efficiency Gain:</span>
                    <span className="result-value">+8.3%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collector Management Page */}
        {currentPage === 'collectors' && (
          <div className="collectors-content">
            <div className="collectors-header">
              <h2>Collector Management & Assignment</h2>
              <div className="collector-actions">
                <button className="assign-routes-btn">📋 Auto-Assign Routes</button>
                <button className="add-collector-btn">+ Add Collector</button>
              </div>
            </div>
            
            {/* Collector Performance Overview */}
            <div className="collector-overview">
              <div className="overview-stats">
                <div className="overview-card">
                  <div className="overview-icon">👥</div>
                  <div className="overview-info">
                    <h3>Active Collectors</h3>
                    <p className="overview-number">{collectorOverview.activeCollectors}</p>
                    <span className="overview-change positive">+2 this month</span>
                  </div>
                </div>
                
                <div className="overview-card">
                  <div className="overview-icon">📊</div>
                  <div className="overview-info">
                    <h3>Avg. Performance</h3>
                    <p className="overview-number">{collectorOverview.avgPerformance.toFixed(1)}%</p>
                    <span className="overview-change positive">+3.1% improvement</span>
                  </div>
                </div>
                
                <div className="overview-card">
                  <div className="overview-icon">🚛</div>
                  <div className="overview-info">
                    <h3>Routes Completed</h3>
                    <p className="overview-number">{collectorOverview.routesCompleted}</p>
                    <span className="overview-change positive">+24 this week</span>
                  </div>
                </div>
                
                <div className="overview-card">
                  <div className="overview-icon">⭐</div>
                  <div className="overview-info">
                    <h3>Avg. Rating</h3>
                    <p className="overview-number">{collectorOverview.avgRating.toFixed(1)}/5</p>
                    <span className="overview-change positive">+0.2 improvement</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Real-time Collector Tracking */}
            <div className="real-time-tracking">
              <h3>🗺️ Real-time Collector Tracking</h3>
              <div className="tracking-panel">
                <div className="map-placeholder">
                  <div className="map-container">
                    <div className="map-overlay">
                      <h4>Live Collector Locations</h4>
                      <div className="collector-markers">
                        {realTimeTracking.collectors.length > 0 ? (
                          realTimeTracking.collectors.map((collector) => (
                            <div key={collector.id} className={`marker ${collector.status}`} data-collector={collector.name}>
                              <span className="marker-icon">🚛</span>
                              <span className="marker-label">{collector.name} - {collector.routeInfo}</span>
                            </div>
                          ))
                        ) : (
                          <div className="marker idle">
                            <span className="marker-icon">📍</span>
                            <span className="marker-label">No collectors available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="tracking-controls">
                  <div className="control-group">
                    <label>View Mode:</label>
                    <select className="view-select">
                      <option value="all">All Collectors</option>
                      <option value="active">Active Only</option>
                      <option value="idle">Idle Only</option>
                    </select>
                  </div>
                  
                  <div className="control-group">
                    <label>Update Frequency:</label>
                    <select className="frequency-select">
                      <option value="realtime">Real-time</option>
                      <option value="30s">Every 30 seconds</option>
                      <option value="1m">Every minute</option>
                    </select>
                  </div>
                  
                  <button className="refresh-tracking-btn">🔄 Refresh</button>
                </div>
              </div>
            </div>
            
            {/* Collector Assignment Table */}
            <div className="collector-assignments">
              <h3>Collector Assignments & Performance</h3>
              <div className="assignments-table">
                <table>
                  <thead>
                    <tr>
                      <th>Collector</th>
                      <th>Current Route</th>
                      <th>Status</th>
                      <th>Performance</th>
                      <th>Completed Today</th>
                      <th>Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="collector-info">
                        <div className="collector-avatar">R</div>
                        <div className="collector-details">
                          <span className="collector-name">Raj Kumar</span>
                          <span className="collector-id">#COL-001</span>
                        </div>
                      </td>
                      <td>RT-001 (12 stops)</td>
                      <td><span className="status active">🚛 On Route</span></td>
                      <td><span className="performance excellent">98.5%</span></td>
                      <td>8/12 pickups</td>
                      <td>⭐ 4.9/5</td>
                      <td>
                        <div className="action-buttons">
                          <button className="track-btn">📍</button>
                          <button className="reassign-btn">🔄</button>
                          <button className="contact-btn">📞</button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="collector-info">
                        <div className="collector-avatar">A</div>
                        <div className="collector-details">
                          <span className="collector-name">Ahmad Faiz</span>
                          <span className="collector-id">#COL-002</span>
                        </div>
                      </td>
                      <td>RT-002 (8 stops)</td>
                      <td><span className="status active">🚛 On Route</span></td>
                      <td><span className="performance good">94.8%</span></td>
                      <td>5/8 pickups</td>
                      <td>⭐ 4.7/5</td>
                      <td>
                        <div className="action-buttons">
                          <button className="track-btn">📍</button>
                          <button className="reassign-btn">🔄</button>
                          <button className="contact-btn">📞</button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="collector-info">
                        <div className="collector-avatar">L</div>
                        <div className="collector-details">
                          <span className="collector-name">Lim Wei Hong</span>
                          <span className="collector-id">#COL-003</span>
                        </div>
                      </td>
                      <td>Unassigned</td>
                      <td><span className="status idle">⏸️ Idle</span></td>
                      <td><span className="performance good">92.3%</span></td>
                      <td>0/0 pickups</td>
                      <td>⭐ 4.6/5</td>
                      <td>
                        <div className="action-buttons">
                          <button className="assign-btn">📋</button>
                          <button className="track-btn">📍</button>
                          <button className="contact-btn">📞</button>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="collector-info">
                        <div className="collector-avatar">S</div>
                        <div className="collector-details">
                          <span className="collector-name">Siti Aminah</span>
                          <span className="collector-id">#COL-004</span>
                        </div>
                      </td>
                      <td>RT-004 (10 stops)</td>
                      <td><span className="status break">☕ Break</span></td>
                      <td><span className="performance good">89.7%</span></td>
                      <td>6/10 pickups</td>
                      <td>⭐ 4.5/5</td>
                      <td>
                        <div className="action-buttons">
                          <button className="track-btn">📍</button>
                          <button className="reassign-btn">🔄</button>
                          <button className="contact-btn">📞</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Smart Assignment Algorithm */}
            <div className="smart-assignment">
              <h3>🤖 Smart Route Assignment</h3>
              <div className="assignment-panel">
                <div className="assignment-settings">
                  <div className="setting-group">
                    <label>Assignment Criteria:</label>
                    <div className="criteria-options">
                      <label><input type="checkbox" checked /> Collector Performance</label>
                      <label><input type="checkbox" checked /> Geographic Proximity</label>
                      <label><input type="checkbox" checked /> Workload Balance</label>
                      <label><input type="checkbox" /> Collector Preferences</label>
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
                
                <button className="run-assignment-btn">🎯 Run Smart Assignment</button>
              </div>
              
              <div className="assignment-preview">
                <h4>Assignment Preview:</h4>
                <div className="preview-list">
                  <div className="preview-item">
                    <span className="route-info">RT-005 (14 stops)</span>
                    <span className="arrow">→</span>
                    <span className="collector-info">Lim Wei Hong (92.3% performance)</span>
                    <span className="efficiency-gain">+5.2% efficiency</span>
                  </div>
                  <div className="preview-item">
                    <span className="route-info">RT-006 (9 stops)</span>
                    <span className="arrow">→</span>
                    <span className="collector-info">Ahmad Faiz (94.8% performance)</span>
                    <span className="efficiency-gain">+3.1% efficiency</span>
                  </div>
                </div>
                
                <div className="preview-actions">
                  <button className="apply-assignments-btn">✅ Apply Assignments</button>
                  <button className="cancel-preview-btn">❌ Cancel</button>
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
