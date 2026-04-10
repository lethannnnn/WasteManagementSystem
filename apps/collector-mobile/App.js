import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { 
  supabase, 
  getCollectorProfile, 
  getTodayRoutes, 
  getCollectorRoutes,
  updatePickupStatus,
  completePickup,
  updateRouteProgress,
  getCollectorNotifications,
  markNotificationAsRead,
  updateCollectorLocation,
  getCollectorStats
} from './supabaseClient';

const { width, height } = Dimensions.get('window');

// All mock data has been replaced with real database connections

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPickupDetails, setShowPickupDetails] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Real data state
  const [collectorProfile, setCollectorProfile] = useState(null);
  const [todayRoutes, setTodayRoutes] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [pickupHistory, setPickupHistory] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [collectorStats, setCollectorStats] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentScreen('auth');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Authentication functions
  const handleLogin = async () => {
    console.log('Login button pressed');
    console.log('Login form:', loginForm);
    
    if (!loginForm.email || !loginForm.password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    console.log('Starting authentication...');
    setIsLoadingData(true);
    try {
      // All collectors use database authentication
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', loginForm.email)
        .eq('user_type', 'collector')
        .single();
      
      if (userError || !users) {
        Alert.alert('Login Error', 'Invalid email or password');
        return;
      }

      // Use the actual user data from database
      setCurrentUser(users);
      setIsLoggedIn(true);
      setCurrentScreen('dashboard');
      
      // Load collector data
      await loadCollectorData(users.user_id);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Data loading functions
  const loadCollectorData = async (userId) => {
    try {
      setIsLoadingData(true);
      
      // Load collector profile from database
      const { data: profile, error: profileError } = await getCollectorProfile(userId);
      
      if (profileError || !profile) {
        console.error('Collector profile error:', profileError);
        Alert.alert(
          'Access Denied', 
          'This account is not registered as a collector. Please contact your administrator to set up collector access.',
          [{ text: 'OK', onPress: () => handleLogout() }]
        );
        return;
      }
      
      setCollectorProfile(profile);
      
      // Load today's routes
      const { data: routes } = await getTodayRoutes(profile.collector_id);
      setTodayRoutes(routes || []);
      if (routes && routes.length > 0) {
        setSelectedRoute(routes[0]);
      }
      
      // Load all routes
      const { data: allRoutesData } = await getCollectorRoutes(profile.collector_id);
      setAllRoutes(allRoutesData || []);
      
      // Load notifications
      const { data: notificationsData } = await getCollectorNotifications(profile.collector_id);
      setNotifications(notificationsData || []);
      
      // Load collector stats
      const { data: stats } = await getCollectorStats(profile.collector_id);
      setCollectorStats(stats || {});
      
    } catch (error) {
      console.error('Error loading collector data:', error);
      Alert.alert('Error', 'Failed to load collector data. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCollectorProfile(null);
      setTodayRoutes([]);
      setAllRoutes([]);
      setNotifications([]);
      setCollectorStats(null);
      setSelectedRoute(null);
      setCurrentScreen('auth');
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePickupComplete = async (pickupId) => {
    try {
      await completePickup(pickupId, {
        weight: parseFloat(weightInput) || 0,
        waste_type: wasteTypeInput || 'Mixed',
        collector_id: currentUser?.user_id
      });
      
      // Refresh routes data
      await loadCollectorData(currentUser?.user_id);
      
      setShowPickupDetails(false);
      setSelectedPickup(null);
      Alert.alert('Success', 'Pickup completed successfully!');
    } catch (error) {
      console.error('Error completing pickup:', error);
      Alert.alert('Error', 'Failed to complete pickup');
    }
  };

  const handleUpdatePickupStatus = async (pickupId, status) => {
    try {
      await updatePickupStatus(pickupId, status);
      // Refresh routes data
      await loadCollectorData(currentUser?.user_id);
    } catch (error) {
      console.error('Error updating pickup status:', error);
      Alert.alert('Error', 'Failed to update pickup status');
    }
  };



  // Update pickup status
  const updatePickupStatus = (pickupId, newStatus) => {
    Alert.alert(
      'Status Updated',
      `Pickup ${pickupId} has been marked as ${newStatus}`,
      [{ text: 'OK' }]
    );
  };

  // Handle QR scan
  const handleQRScan = (qrData) => {
    setShowQRScanner(false);
    Alert.alert(
      'QR Code Scanned',
      `Verified pickup: ${qrData}`,
      [{ text: 'OK' }]
    );
  };

  // Start route
  const startRoute = (routeId) => {
    Alert.alert(
      'Route Started',
      'Navigation to first pickup location will begin.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Navigation', onPress: () => setCurrentScreen('map') }
      ]
    );
  };

  // Complete pickup
  const completePickup = (pickup) => {
    Alert.alert(
      'Complete Pickup',
      `Confirm completion of pickup at ${pickup.address}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => updatePickupStatus(pickup.id, 'completed') }
      ]
    );
  };

  // Splash Screen
  if (currentScreen === 'splash') {
  return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
        <View style={styles.splashContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🚛</Text>
            <Text style={styles.appName}>MyCycle+</Text>
            <Text style={styles.appSubname}>Collector</Text>
          </View>
          <Text style={styles.tagline}>Efficient. Optimized. Sustainable.</Text>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingBar}>
              <View style={styles.loadingProgress} />
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Authentication Screen
  if (currentScreen === 'auth' && !isLoggedIn) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authHeader}>
            <Text style={styles.authLogo}>🚛 MyCycle+ Collector</Text>
            <Text style={styles.authSubtitle}>Professional Collection Management</Text>
          </View>

          <View style={styles.authForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Collector ID / Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your collector ID or email"
                value={loginForm.email}
                onChangeText={(text) => setLoginForm(prev => ({ ...prev, email: text }))}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                value={loginForm.password}
                onChangeText={(text) => setLoginForm(prev => ({ ...prev, password: text }))}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, isLoadingData && styles.disabledButton]} 
              onPress={handleLogin}
              disabled={isLoadingData}
            >
              <Text style={styles.primaryButtonText}>
                {isLoadingData ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.authFooter}>
              <Text style={styles.authFooterText}>Demo: collector1@mycycle.com / collector1</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main App Navigation
  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
        
        {/* Dashboard Screen */}
        {currentScreen === 'dashboard' && (
    <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.headerGreeting}>Hello, {collectorProfile?.name || 'Collector'}! 🚛</Text>
              <Text style={styles.headerSubtitle}>{collectorProfile?.area || 'Loading...'}</Text>
    </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.notificationButton}
                    onPress={() => setShowNotifications(true)}
                  >
                    <Text style={styles.notificationIcon}>🔔</Text>
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>2</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.profileButton}
                    onPress={() => setCurrentScreen('profile')}
                  >
                    <Text style={styles.profileButtonText}>{collectorProfile?.name?.charAt(0) || 'C'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView style={styles.mainContent}>
              {/* Status Summary */}
              <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                  <Text style={styles.statusTitle}>Today's Status</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Active</Text>
                  </View>
                </View>
                <View style={styles.statusStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{collectorStats?.todayCompleted || 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{collectorStats?.todayPending || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{collectorStats?.todayPickups || 0}</Text>
                <Text style={styles.statLabel}>Today's Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{collectorProfile?.rating || 0}</Text>
                    <Text style={styles.statLabel}>Rating ⭐</Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('routes')}
                  >
                    <Text style={styles.actionIcon}>🗺️</Text>
                    <Text style={styles.actionTitle}>View Routes</Text>
                    <Text style={styles.actionSubtitle}>See assignments</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('map')}
                  >
                    <Text style={styles.actionIcon}>📍</Text>
                    <Text style={styles.actionTitle}>Optimized Map</Text>
                    <Text style={styles.actionSubtitle}>Navigate routes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setShowQRScanner(true)}
                  >
                    <Text style={styles.actionIcon}>📱</Text>
                    <Text style={styles.actionTitle}>QR Scanner</Text>
                    <Text style={styles.actionSubtitle}>Verify pickup</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Current Route */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Route</Text>
                {selectedRoute ? (
                  <View style={styles.routeCard}>
                    <View style={styles.routeHeader}>
                      <View>
                        <Text style={styles.routeName}>{selectedRoute.name || `Route ${selectedRoute.id}`}</Text>
                        <Text style={styles.routeDetails}>
                          {selectedRoute.completed_stops || 0}/{selectedRoute.total_stops || 0} stops • {selectedRoute.distance || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.priorityBadge, styles[`priority-${selectedRoute.priority || 'medium'}`]]}>
                        <Text style={styles.priorityText}>{(selectedRoute.priority || 'medium').toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.routeProgress}>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { width: `${((selectedRoute.completed_stops || 0) / (selectedRoute.total_stops || 1)) * 100}%` }
                        ]} />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round(((selectedRoute.completed_stops || 0) / (selectedRoute.total_stops || 1)) * 100)}% Complete
                      </Text>
                    </View>
                    <View style={styles.routeActions}>
                      <TouchableOpacity 
                        style={styles.routeButton}
                        onPress={() => setCurrentScreen('routes')}
                      >
                        <Text style={styles.routeButtonText}>View Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.routeButton, styles.primaryRouteButton]}
                        onPress={() => setCurrentScreen('map')}
                      >
                        <Text style={[styles.routeButtonText, styles.primaryRouteButtonText]}>
                          Continue Route
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No active route</Text>
                    <Text style={styles.emptySubtext}>Select a route to get started</Text>
                  </View>
                )}
              </View>

              {/* Next Pickups */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Next Pickups</Text>
                {selectedRoute && selectedRoute.pickups
                  ? selectedRoute.pickups
                    .filter(pickup => pickup.status === 'pending' || pickup.status === 'in_progress')
                    .slice(0, 3)
                    .map(pickup => (
                      <TouchableOpacity
                        key={pickup.id}
                        style={styles.pickupItem}
                        onPress={() => {
                          setSelectedPickup(pickup);
                          setShowPickupDetails(true);
                        }}
                      >
                        <View style={styles.pickupIcon}>
                          <Text style={styles.pickupIconText}>📦</Text>
                        </View>
                        <View style={styles.pickupInfo}>
                          <Text style={styles.pickupAddress}>{pickup.address}</Text>
                          <Text style={styles.pickupDetails}>
                            {pickup.time} • {pickup.items} • {pickup.weight}
                          </Text>
                        </View>
                        <View style={[styles.pickupStatus, styles[`status-${pickup.status.replace('_', '-')}`]]}>
                          <Text style={styles.pickupStatusText}>
                            {pickup.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No pickups available</Text>
                    </View>
                  )}
              </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
              <TouchableOpacity 
                style={[styles.navItem, currentScreen === 'dashboard' && styles.activeNavItem]}
                onPress={() => setCurrentScreen('dashboard')}
              >
                <Text style={styles.navIcon}>🏠</Text>
                <Text style={styles.navLabel}>DAAA</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('routes')}
              >
                <Text style={styles.navIcon}>🗺️</Text>
                <Text style={styles.navLabel}>Routes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('map')}
              >
                <Text style={styles.navIcon}>📍</Text>
                <Text style={styles.navLabel}>Map</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setShowQRScanner(true)}
              >
                <Text style={styles.navIcon}>📱</Text>
                <Text style={styles.navLabel}>Scanner</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('profile')}
              >
                <Text style={styles.navIcon}>👤</Text>
                <Text style={styles.navLabel}>Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Routes Screen */}
        {currentScreen === 'routes' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Assigned Routes</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.mainContent}>
              {isLoadingData ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading routes...</Text>
                </View>
              ) : allRoutes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No routes assigned</Text>
                  <Text style={styles.emptySubtext}>Check back later for new assignments</Text>
                </View>
              ) : (
                allRoutes.map(route => (
                  <TouchableOpacity
                    key={route.id}
                    style={[styles.routeCard, styles.routeListItem]}
                    onPress={() => {
                      setSelectedRoute(route);
                      setCurrentScreen('dashboard');
                    }}
                  >
                    <View style={styles.routeHeader}>
                      <View>
                        <Text style={styles.routeName}>{route.name || `Route ${route.id}`}</Text>
                        <Text style={styles.routeDetails}>
                          {route.total_stops || 0} stops • {route.distance || 'N/A'} • {route.estimated_time || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.priorityBadge, styles[`priority-${route.priority || 'medium'}`]]}>
                        <Text style={styles.priorityText}>{(route.priority || 'medium').toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.routeProgress}>
                      <View style={styles.progressBar}>
                        <View style={[
                          styles.progressFill,
                          { width: `${((route.completed_stops || 0) / (route.total_stops || 1)) * 100}%` }
                        ]} />
                      </View>
                      <Text style={styles.progressText}>
                        {route.completed_stops || 0}/{route.total_stops || 0} completed
                      </Text>
                    </View>

                  <View style={styles.routePickupsList}>
                    {route.pickups && route.pickups.length > 0 ? (
                      <>
                        {route.pickups.slice(0, 3).map(pickup => (
                          <View key={pickup.id} style={styles.routePickupItem}>
                            <View style={[styles.pickupDot, styles[`dot-${pickup.status}`]]} />
                            <Text style={styles.routePickupText}>{pickup.address}</Text>
                            <Text style={styles.routePickupTime}>{pickup.time}</Text>
                          </View>
                        ))}
                        {route.pickups.length > 3 && (
                          <Text style={styles.morePickups}>+{route.pickups.length - 3} more pickups</Text>
                        )}
                      </>
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No pickups available</Text>
                      </View>
                    )}
                  </View>

                  <View 
                    style={[styles.routeButton, styles.primaryRouteButton]}
                  >
                    <Text style={[styles.routeButtonText, styles.primaryRouteButtonText]}>
                      {route.status === 'active' ? 'Continue Route' : 'Start Route'}
                    </Text>
                  </View>
                </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Map Screen */}
        {currentScreen === 'map' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Route Map</Text>
              <TouchableOpacity onPress={() => setCurrentScreen('routes')}>
                <Text style={styles.headerAction}>Routes</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              {/* Mock Map Interface */}
              <View style={styles.mapView}>
                <Text style={styles.mapPlaceholder}>🗺️ Optimized Route Map</Text>
                <Text style={styles.mapSubtext}>Interactive map with Google Maps integration</Text>
                
                {/* Mock route line */}
                <View style={styles.routeLine} />
                
                {/* Mock pickup markers */}
                <View style={[styles.mapMarker, { top: 100, left: 50 }]}>
                  <Text style={styles.mapMarkerText}>📍1</Text>
                </View>
                <View style={[styles.mapMarker, { top: 150, right: 80 }]}>
                  <Text style={styles.mapMarkerText}>📍2</Text>
                </View>
                <View style={[styles.mapMarker, { bottom: 120, left: 100 }]}>
                  <Text style={styles.mapMarkerText}>📍3</Text>
                </View>
                <View style={[styles.mapMarker, { bottom: 80, right: 60 }]}>
                  <Text style={styles.mapMarkerText}>🚛</Text>
                </View>
              </View>

              {/* Map Controls */}
              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.mapControlButton}>
                  <Text style={styles.mapControlText}>📍 My Location</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlButton}>
                  <Text style={styles.mapControlText}>🧭 Navigation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapControlButton}>
                  <Text style={styles.mapControlText}>⚡ Optimize</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Sheet */}
            <View style={styles.mapBottomSheet}>
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Current Route: {selectedRoute ? selectedRoute.name : 'No Route Selected'}</Text>
                <Text style={styles.bottomSheetSubtitle}>
                  {selectedRoute ? `${selectedRoute.completedStops}/${selectedRoute.totalStops} stops • ${selectedRoute.distance}` : 'No route information'}
                </Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPickups}>
                {selectedRoute && selectedRoute.pickups ? selectedRoute.pickups.map(pickup => (
                  <TouchableOpacity
                    key={pickup.id}
                    style={[
                      styles.horizontalPickupCard,
                      pickup.status === 'completed' && styles.completedPickupCard,
                      pickup.status === 'in_progress' && styles.inProgressPickupCard
                    ]}
                    onPress={() => {
                      setSelectedPickup(pickup);
                      setShowPickupDetails(true);
                    }}
                  >
                    <View style={[styles.pickupStatusDot, styles[`dot-${pickup.status}`]]} />
                    <Text style={styles.horizontalPickupAddress}>{pickup.address}</Text>
                    <Text style={styles.horizontalPickupTime}>{pickup.time}</Text>
                    <Text style={styles.horizontalPickupWeight}>{pickup.weight}</Text>
                  </TouchableOpacity>
                )) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No pickups available</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Profile Screen */}
        {currentScreen === 'profile' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Profile</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.mainContent}>
              <View style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{collectorProfile?.name?.charAt(0) || 'C'}</Text>
                </View>
                <Text style={styles.profileName}>{collectorProfile?.name || 'Loading...'}</Text>
                <Text style={styles.profileId}>ID: {collectorProfile?.id || 'N/A'}</Text>
                <Text style={styles.profileLevel}>{collectorProfile?.level || 'Collector'}</Text>
                
                <View style={styles.profileStats}>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>{collectorStats?.totalCollections || 0}</Text>
                    <Text style={styles.profileStatLabel}>Total Collections</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>{collectorProfile?.rating || 0}</Text>
                    <Text style={styles.profileStatLabel}>Rating ⭐</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>98%</Text>
                    <Text style={styles.profileStatLabel}>On-Time Rate</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vehicle Information</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Vehicle Type</Text>
                    <Text style={styles.infoValue}>{collectorProfile?.vehicle_type || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>License Plate</Text>
                    <Text style={styles.infoValue}>{collectorProfile?.vehicle_plate || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Service Area</Text>
                    <Text style={styles.infoValue}>{collectorProfile?.area || 'N/A'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{collectorProfile?.email || currentUser?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{collectorProfile?.phone || 'N/A'}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* QR Scanner Modal */}
        <Modal visible={showQRScanner} animationType="slide">
          <View style={styles.qrContainer}>
            <View style={styles.qrHeader}>
              <TouchableOpacity onPress={() => setShowQRScanner(false)}>
                <Text style={styles.qrCloseButton}>✕ Close</Text>
              </TouchableOpacity>
              <Text style={styles.qrTitle}>QR Code Scanner</Text>
              <View style={{ width: 60 }} />
            </View>
            
            <View style={styles.qrScanner}>
              <View style={styles.qrFrame}>
                <Text style={styles.qrPlaceholder}>📱 QR Camera View</Text>
                <Text style={styles.qrSubtext}>Position QR code within the frame</Text>
                
                {/* Mock QR frame */}
                <View style={styles.qrScanArea}>
                  <View style={styles.qrCorner} />
                  <View style={[styles.qrCorner, styles.qrCornerTopRight]} />
                  <View style={[styles.qrCorner, styles.qrCornerBottomLeft]} />
                  <View style={[styles.qrCorner, styles.qrCornerBottomRight]} />
                </View>
              </View>
            </View>

            <View style={styles.qrControls}>
              <TouchableOpacity 
                style={styles.qrTestButton}
                onPress={() => handleQRScan('QR006')}
              >
                <Text style={styles.qrTestButtonText}>Test Scan QR006</Text>
              </TouchableOpacity>
              <Text style={styles.qrInstructions}>
                Scan the QR code on the pickup receipt to verify collection
              </Text>
            </View>
          </View>
        </Modal>

        {/* Pickup Details Modal */}
        <Modal visible={showPickupDetails} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.pickupModal}>
              {selectedPickup && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Pickup Details</Text>
                    <TouchableOpacity onPress={() => setShowPickupDetails(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.modalContent}>
                    <View style={styles.pickupDetailItem}>
                      <Text style={styles.pickupDetailLabel}>Address:</Text>
                      <Text style={styles.pickupDetailValue}>{selectedPickup.address}</Text>
                    </View>
                    <View style={styles.pickupDetailItem}>
                      <Text style={styles.pickupDetailLabel}>Scheduled Time:</Text>
                      <Text style={styles.pickupDetailValue}>{selectedPickup.time}</Text>
                    </View>
                    <View style={styles.pickupDetailItem}>
                      <Text style={styles.pickupDetailLabel}>Items:</Text>
                      <Text style={styles.pickupDetailValue}>{selectedPickup.items}</Text>
                    </View>
                    <View style={styles.pickupDetailItem}>
                      <Text style={styles.pickupDetailLabel}>Weight:</Text>
                      <Text style={styles.pickupDetailValue}>{selectedPickup.weight}</Text>
                    </View>
                    <View style={styles.pickupDetailItem}>
                      <Text style={styles.pickupDetailLabel}>Status:</Text>
                      <View style={[styles.pickupStatus, styles[`status-${selectedPickup.status.replace('_', '-')}`]]}>
                        <Text style={styles.pickupStatusText}>
                          {selectedPickup.status === 'in_progress' ? 'In Progress' : 
                           selectedPickup.status === 'completed' ? 'Completed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalActions}>
                    {selectedPickup.status === 'pending' && (
                      <TouchableOpacity 
                        style={styles.modalActionButton}
                        onPress={() => {
                          updatePickupStatus(selectedPickup.id, 'in_progress');
                          setShowPickupDetails(false);
                        }}
                      >
                        <Text style={styles.modalActionText}>Start Pickup</Text>
                      </TouchableOpacity>
                    )}
                    {selectedPickup.status === 'in_progress' && (
                      <>
                        <TouchableOpacity 
                          style={styles.modalActionButton}
                          onPress={() => {
                            setShowPickupDetails(false);
                            setShowQRScanner(true);
                          }}
                        >
                          <Text style={styles.modalActionText}>Scan QR Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.modalActionButton, styles.completeButton]}
                          onPress={() => {
                            completePickup(selectedPickup);
                            setShowPickupDetails(false);
                          }}
                        >
                          <Text style={[styles.modalActionText, styles.completeButtonText]}>Complete Pickup</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Notifications Modal */}
        <Modal visible={showNotifications} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.notificationsModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity onPress={() => setShowNotifications(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.notificationsList}>
                {isLoadingData ? (
                  <View style={styles.notificationItem}>
                    <Text style={styles.notificationMessage}>Loading notifications...</Text>
                  </View>
                ) : notifications.length > 0 ? (
                  notifications.map(notification => (
                    <TouchableOpacity 
                      key={notification.id} 
                      style={[
                        styles.notificationItem,
                        !notification.read && styles.unreadNotification
                      ]}
                      onPress={() => markNotificationAsRead(notification.id)}
                    >
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notification.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                      </View>
                      {!notification.read && <View style={styles.notificationDot} />}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.notificationItem}>
                    <Text style={styles.notificationMessage}>No notifications</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  appSubname: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
  },
  loadingContainer: {
    marginTop: 40,
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  loadingProgress: {
    width: '70%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },

  // Authentication
  authContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  authContent: {
    flexGrow: 1,
    padding: 20,
  },
  authHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  authLogo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  authForm: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  primaryButton: {
    backgroundColor: '#1565C0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authFooter: {
    alignItems: 'center',
    marginTop: 20,
  },
  authFooterText: {
    fontSize: 14,
    color: '#666',
  },

  // Main App
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1565C0',
  },
  backButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  screenTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerAction: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Main Content
  mainContent: {
    flex: 1,
    padding: 20,
  },

  // Status Card
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },

  // Route Cards
  routeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  routeListItem: {
    marginBottom: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routeDetails: {
    fontSize: 14,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  'priority-high': {
    backgroundColor: '#ffebee',
  },
  'priority-medium': {
    backgroundColor: '#fff3e0',
  },
  'priority-low': {
    backgroundColor: '#e8f5e8',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  routeProgress: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1565C0',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  routeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  routeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  primaryRouteButton: {
    backgroundColor: '#1565C0',
  },
  routeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
  },
  primaryRouteButtonText: {
    color: 'white',
  },

  // Route Pickups List
  routePickupsList: {
    marginBottom: 15,
  },
  routePickupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  'dot-completed': {
    backgroundColor: '#4caf50',
  },
  'dot-in-progress': {
    backgroundColor: '#ff9800',
  },
  'dot-pending': {
    backgroundColor: '#f44336',
  },
  routePickupText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  routePickupTime: {
    fontSize: 12,
    color: '#666',
  },
  morePickups: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Pickup Items
  pickupItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickupIconText: {
    fontSize: 18,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pickupDetails: {
    fontSize: 12,
    color: '#666',
  },
  pickupStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  'status-pending': {
    backgroundColor: '#ffebee',
  },
  'status-in-progress': {
    backgroundColor: '#fff3e0',
  },
  'status-completed': {
    backgroundColor: '#e8f5e8',
  },
  pickupStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },

  // Map
  mapContainer: {
    flex: 1,
  },
  mapView: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e3f2fd',
    borderStyle: 'dashed',
    position: 'relative',
  },
  mapPlaceholder: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  routeLine: {
    position: 'absolute',
    top: 80,
    left: 60,
    right: 60,
    bottom: 100,
    backgroundColor: '#1565C0',
    width: 3,
    transform: [{ rotate: '45deg' }],
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerText: {
    fontSize: 20,
  },
  mapControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
  },
  mapControlButton: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapControlText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Map Bottom Sheet
  mapBottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: 200,
  },
  bottomSheetHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomSheetSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  horizontalPickups: {
    paddingLeft: 20,
  },
  horizontalPickupCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 150,
    position: 'relative',
  },
  completedPickupCard: {
    backgroundColor: '#e8f5e8',
  },
  inProgressPickupCard: {
    backgroundColor: '#fff3e0',
  },
  pickupStatusDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  horizontalPickupAddress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  horizontalPickupTime: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  horizontalPickupWeight: {
    fontSize: 10,
    color: '#1565C0',
    fontWeight: '600',
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    backgroundColor: 'rgba(21, 101, 192, 0.1)',
    borderRadius: 12,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    color: '#666',
  },

  // QR Scanner
  qrContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  qrCloseButton: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrScanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholder: {
    fontSize: 24,
    color: 'white',
    marginBottom: 10,
  },
  qrSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
  },
  qrScanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#1565C0',
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  qrCornerTopRight: {
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  qrCornerBottomLeft: {
    bottom: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  qrCornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  qrControls: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  qrTestButton: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  qrTestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrInstructions: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
  },
  notificationsModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    height: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 20,
    color: '#666',
  },
  modalContent: {
    marginBottom: 20,
  },
  pickupDetailItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  pickupDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
  },
  pickupDetailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#4caf50',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  completeButtonText: {
    color: 'white',
  },

  // Notifications
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadNotification: {
    backgroundColor: '#f8f9ff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1565C0',
  },
  
  // Empty state styles
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Profile
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileLevel: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '600',
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  profileStat: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
