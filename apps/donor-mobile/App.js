import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { supabase, getDashboardStats, getLeaderboardData, getAvailableRewards, redeemReward, getRedemptionHistory } from './supabaseClient';
import AuthScreen from './AuthScreen';
import CustomMapComponent from './CustomMapComponent';

const { width, height } = Dimensions.get('window');

// All mock data has been replaced with real database connections

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupItems, setPickupItems] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Enhanced pickup scheduling state
  const [selectedTime, setSelectedTime] = useState('morning');
  const [estimatedWeight, setEstimatedWeight] = useState(5.0);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Pickup history state
  const [pickupHistory, setPickupHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Rewards system state
  const [rewardsData, setRewardsData] = useState([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [isLoadingRedemptions, setIsLoadingRedemptions] = useState(false);

  // App initialization - Show startup banner
  console.log('========================================');
  console.log('🚀 MyCycle+ Donor App Starting Up');
  console.log('========================================');
  console.log('⚡ Environment:', process.env.NODE_ENV || 'development');
  console.log('📱 App Version: 1.0.0');
  console.log('🏠 Supabase URL:', 'https://okycddtfijycafmidlid.supabase.co');
  console.log('========================================');

  // Splash screen effect and session check
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // Test Supabase connection and check if user is already logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Supabase connection failed:', error.message);
        } else {
          console.log('✅ Supabase connected successfully!');
          console.log('📡 Supabase URL:', supabase.supabaseUrl);
          
          if (session) {
            console.log('👤 User session found - auto-login');
            console.log('📧 User email:', session.user.email);
            setCurrentUser(session.user);
            setIsLoggedIn(true);
            setCurrentScreen('home');
            // Load dashboard stats
            loadDashboardStats(session.user.id);
          } else {
            console.log('🔐 No active session - showing auth screen');
            setCurrentScreen('auth');
          }
        }
      } catch (error) {
        console.error('❌ Supabase connection error:', error);
        setCurrentScreen('auth');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    console.log('🔔 Setting up Supabase auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in:', session?.user?.email);
        
        // Check if user has a profile, if not create one
        if (session?.user) {
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it (for users who signed up and verified email)
            console.log('🆕 Creating profile for verified user...');
            
            const { error: createProfileError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: session.user.id,
                  user_type: 'donor',
                  full_name: session.user.user_metadata?.full_name || 'New User',
                  phone: session.user.user_metadata?.phone || '',
                  verification_status: 'verified',
                  is_active: true,
                }
              ]);

            if (createProfileError) {
              console.error('❌ Profile creation error:', createProfileError);
            }

            // Create donor record
            const { error: createDonorError } = await supabase
              .from('donors')
              .insert([
                {
                  id: session.user.id, // Use 'id' to match database schema
                  reward_points: 0, // Use correct column name from schema
                  total_donations: 0, // Use correct column name from schema
                  membership_tier: 'Bronze', // Use correct column name from schema
                }
              ]);

            if (createDonorError) {
              console.error('❌ Donor record creation error:', createDonorError);
            }
          }
        }
        
        setCurrentUser(session.user);
        setIsLoggedIn(true);
        setCurrentScreen('home');
        // Load dashboard stats and rewards
        loadDashboardStats(session.user.id);
        loadRewardsData();
        
        // Load redemption history for the user
        const { data: donorData } = await supabase
          .from('donors')
          .select('donor_id')
          .eq('user_id', session.user.id)
          .single();
        
        if (donorData) {
          loadRedemptionHistory(donorData.donor_id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setIsLoggedIn(false);
        setCurrentScreen('auth');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Auth token refreshed');
      } else {
        console.log('📝 Auth event:', event);
      }
    });

    return () => {
      console.log('🔇 Unsubscribing from auth state listener');
      subscription.unsubscribe();
    };
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = async (user) => {
    console.log('✅ Authentication successful:', user.email);
    setIsLoggedIn(true);
    setCurrentScreen('home');
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return 'Email is required';
    }
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return '';
  };

  // Handle login with validation
  const handleLogin = async () => {
    console.log('🔐 Attempting login for:', loginForm.email);
    
    const emailError = validateEmail(loginForm.email);
    const passwordError = validatePassword(loginForm.password);

    setLoginErrors({
      email: emailError,
      password: passwordError
    });

    if (!emailError && !passwordError) {
      // Clear any previous errors
      setLoginErrors({ email: '', password: '' });
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginForm.email,
          password: loginForm.password,
        });

        if (error) {
          console.error('❌ Login failed:', error.message);
          Alert.alert('Login Error', error.message);
        } else {
          console.log('✅ Login successful for:', data.user.email);
          setIsLoggedIn(true);
          setCurrentScreen('home');
        }
      } catch (error) {
        console.error('❌ Login error:', error);
        Alert.alert('Login Error', 'An unexpected error occurred');
      }
    } else {
      console.log('❌ Login validation failed:', { emailError, passwordError });
    }
  };

  // Clear validation errors when user starts typing
  const handleEmailChange = (text) => {
    setLoginForm(prev => ({ ...prev, email: text }));
    if (loginErrors.email) {
      setLoginErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (text) => {
    setLoginForm(prev => ({ ...prev, password: text }));
    if (loginErrors.password) {
      setLoginErrors(prev => ({ ...prev, password: '' }));
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    console.log('🔑 Attempting password reset for:', forgotPasswordEmail);
    
    const emailError = validateEmail(forgotPasswordEmail);
    
    if (emailError) {
      console.log('❌ Password reset validation failed:', emailError);
      setForgotPasswordError(emailError);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail);
      
      if (error) {
        console.error('❌ Password reset failed:', error.message);
        setForgotPasswordError(error.message);
      } else {
        console.log('✅ Password reset email sent to:', forgotPasswordEmail);
        setForgotPasswordError('');
        setForgotPasswordSuccess(true);
        
        // Auto redirect after 3 seconds
        setTimeout(() => {
          setCurrentScreen('auth');
          setForgotPasswordEmail('');
          setForgotPasswordSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setForgotPasswordError('An unexpected error occurred');
    }
  };

  // Handle forgot password email change
  const handleForgotPasswordEmailChange = (text) => {
    setForgotPasswordEmail(text);
    if (forgotPasswordError) {
      setForgotPasswordError('');
    }
    if (forgotPasswordSuccess) {
      setForgotPasswordSuccess(false);
    }
  };

  // Handle signup
  const handleSignup = async () => {
    console.log('📝 Attempting signup for:', signupForm.email);
    
    if (signupForm.name && signupForm.email && signupForm.password && signupForm.confirmPassword) {
      if (signupForm.password !== signupForm.confirmPassword) {
        console.log('❌ Signup failed: Passwords do not match');
        Alert.alert('Error', 'Passwords do not match');
        return;
      }

      // Validate email and password
      const emailError = validateEmail(signupForm.email);
      const passwordError = validatePassword(signupForm.password);

      if (emailError || passwordError) {
        console.log('❌ Signup validation failed:', { emailError, passwordError });
        Alert.alert('Validation Error', emailError || passwordError);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: signupForm.email,
          password: signupForm.password,
          options: {
            data: {
              full_name: signupForm.name,
              phone: signupForm.phone,
            }
          }
        });

        if (error) {
          console.error('❌ Signup failed:', error.message);
          Alert.alert('Signup Error', error.message);
        } else {
          if (!data.session) {
            console.log('✅ Signup successful! Verification email sent to:', signupForm.email);
            console.log('📧 User needs to verify email before login');
            Alert.alert(
              'Account Created!', 
              'Please check your email inbox for a verification link to complete your registration.',
              [{ text: 'OK', onPress: () => setCurrentScreen('auth') }]
            );
          } else {
            console.log('✅ Signup successful with auto-login:', data.user.email);
            setIsLoggedIn(true);
            setCurrentScreen('home');
          }
        }
      } catch (error) {
        console.error('❌ Signup error:', error);
        Alert.alert('Signup Error', 'An unexpected error occurred');
      }
    } else {
      console.log('❌ Signup failed: Missing required fields');
      Alert.alert('Error', 'Please fill all required fields');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('👋 Attempting logout...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout failed:', error.message);
        Alert.alert('Logout Error', error.message);
      } else {
        console.log('✅ Logout successful');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Continue with logout even if Supabase call fails
    }
    
    setIsLoggedIn(false);
    setCurrentScreen('auth');
    setLoginForm({ email: '', password: '' });
    setLoginErrors({ email: '', password: '' });
    setSignupForm({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
    setForgotPasswordEmail('');
    setForgotPasswordError('');
    setForgotPasswordSuccess(false);
    console.log('🔄 User state cleared');
  };

  // Get current authenticated user
  const getCurrentUser = () => {
    // Get current user from authentication context
    return currentUser ? {
      userId: currentUser.user_id,
      email: currentUser.email,
      name: currentUser.full_name || currentUser.name
    } : null;
  };

  // Handle location selection from map
  const handleLocationSelect = (location) => {
    const address = `${location.name} - ${location.description}`;
    setPickupAddress(address);
    setSelectedLocation(location);
    setShowMapModal(false);
    
    // Save to recent addresses
    const newAddress = {
      id: Date.now(),
      address: address,
      name: location.name,
      type: location.type,
      coordinates: location.coordinates || { x: location.mapX, y: location.mapY }
    };
    
    setSavedAddresses(prev => {
      const exists = prev.find(addr => addr.address === address);
      if (!exists) {
        return [newAddress, ...prev.slice(0, 4)]; // Keep max 5 recent addresses
      }
      return prev;
    });
  };

  // Schedule pickup with enhanced database integration
  const handleSchedulePickup = async () => {
    if (!pickupAddress || pickupItems.length === 0) {
      Alert.alert('Validation Error', 'Please enter a pickup address and select at least one item to recycle.');
      return;
    }

    try {
      console.log('🔄 Creating pickup request...');
      
      // Get current user information
      const currentUser = getCurrentUser();
      const userId = currentUser?.userId || 'U005'; // Fallback for testing
      
      // Query the donors table to get the correct donor_id for this user_id
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('donor_id')
        .eq('user_id', userId)
        .single();
      
      if (donorError || !donorData) {
        console.error('❌ Failed to get donor ID:', donorError);
        Alert.alert('Error', 'Unable to find donor profile. Please try again.');
        return;
      }
      
      const donorId = donorData.donor_id;
      
      // Prepare pickup data
      const pickupData = {
        pickup_id: `P${Date.now()}`, // Generate unique pickup ID
        donor_id: donorId, // Use donor_id instead of user_id
        scheduled_date: selectedDate.toISOString().split('T')[0], // YYYY-MM-DD format
        scheduled_time: selectedTime === 'morning' ? '09:00:00' : selectedTime === 'afternoon' ? '14:00:00' : '09:00:00', // Convert to TIME format
        address_id: 'ADDR001', // Temporary address ID - you may want to create a proper address entry
        total_weight: estimatedWeight || 5.0, // Changed from estimated_weight to total_weight
        notes: specialInstructions || null, // Changed from special_instructions to notes
        status: 'Pending' // Changed from 'scheduled' to 'Pending' as per database schema
      };

      console.log('📦 Pickup data:', pickupData);

      // Create pickup request in database
      const { data: pickupResult, error: pickupError } = await supabase
        .from('pickups')
        .insert([pickupData])
        .select('pickup_id')
        .single();

      if (pickupError) {
        console.error('❌ Pickup creation failed:', pickupError);
        Alert.alert('Error', 'Failed to schedule pickup. Please try again.');
        return;
      }

      console.log('✅ Pickup created successfully:', pickupResult.pickup_id);

      // Award points for scheduling pickup (10 points)
      try {
        const { error: pointsError } = await supabase
          .from('point_transactions')
          .insert([{
            user_id: userId,
            transaction_type: 'earned',
            points_amount: 10,
            description: 'Pickup scheduled',
            related_pickup_id: pickupResult.pickup_id
          }]);

        if (!pointsError) {
          console.log('✅ Points awarded for scheduling pickup');
        }
      } catch (pointsError) {
        console.log('⚠️ Could not award points:', pointsError);
      }

      // Show success confirmation
      Alert.alert(
        '🎉 Pickup Scheduled Successfully!',
        `Your pickup has been scheduled for ${selectedDate.toDateString()} in the ${selectedTime || 'morning'}.\n\nPickup ID: ${pickupResult.pickup_id}\nAddress: ${pickupAddress}\nItems: ${pickupItems.join(', ')}\n\n+10 points earned! 🌟`,
        [
          {
            text: 'View My Pickups',
            onPress: () => setCurrentScreen('history') // Navigate to pickup history
          },
          {
            text: 'Schedule Another',
            onPress: () => {
              // Reset form for new pickup
              setPickupAddress('');
              setPickupItems([]);
              setEstimatedWeight(5.0);
              setSpecialInstructions('');
              setSelectedDate(new Date());
              setSelectedTime('morning');
            }
          },
          {
            text: 'Back to Home',
            onPress: () => setCurrentScreen('home'),
            style: 'default'
          }
        ]
      );

    } catch (error) {
      console.error('❌ Pickup scheduling error:', error);
      Alert.alert(
        'Scheduling Error',
        'An unexpected error occurred while scheduling your pickup. Please check your internet connection and try again.'
      );
    }
  };

  // Fetch pickup history for current user
  const fetchPickupHistory = async () => {
    setHistoryLoading(true);
    try {
      // Get current user information
      const currentUser = getCurrentUser();
      const userId = currentUser?.userId || 'U005'; // Fallback for testing
      
      // Query the donors table to get the correct donor_id for this user_id
      const { data: donorData, error: donorError } = await supabase
        .from('donors')
        .select('donor_id')
        .eq('user_id', userId)
        .single();
      
      if (donorError || !donorData) {
        console.error('❌ Failed to get donor ID:', donorError);
        setHistoryLoading(false);
        return;
      }
      
      const donorId = donorData.donor_id;
      
      // Fetch pickup history with address details
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          pickup_id,
          scheduled_date,
          scheduled_time,
          status,
          total_weight,
          total_points,
          notes,
          created_at,
          completed_at,
          addresses (
            street_address,
            city,
            state,
            postal_code
          )
        `)
        .eq('donor_id', donorId)
        .order('created_at', { ascending: false });
      
      if (pickupsError) {
        console.error('❌ Failed to fetch pickup history:', pickupsError);
        Alert.alert('Error', 'Unable to load pickup history. Please try again.');
      } else {
        console.log('✅ Pickup history loaded:', pickups?.length || 0, 'items');
        setPickupHistory(pickups || []);
      }
    } catch (error) {
      console.error('❌ Pickup history fetch error:', error);
      Alert.alert('Error', 'An unexpected error occurred while loading pickup history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load pickup history when navigating to history screen
  useEffect(() => {
    if (currentScreen === 'history' && isLoggedIn) {
      fetchPickupHistory();
    }
  }, [currentScreen, isLoggedIn]);

  // Helper functions for pickup status styling
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { backgroundColor: '#FFF3CD' };
      case 'Confirmed':
        return { backgroundColor: '#D1ECF1' };
      case 'In Progress':
        return { backgroundColor: '#FCF8E3' };
      case 'Completed':
        return { backgroundColor: '#D4EDDA' };
      case 'Cancelled':
        return { backgroundColor: '#F8D7DA' };
      default:
        return { backgroundColor: '#E2E3E5' };
    }
  };

  const getStatusTextStyle = (status) => {
    switch (status) {
      case 'Pending':
        return { color: '#856404' };
      case 'Confirmed':
        return { color: '#0C5460' };
      case 'In Progress':
        return { color: '#533F03' };
      case 'Completed':
        return { color: '#155724' };
      case 'Cancelled':
        return { color: '#721C24' };
      default:
        return { color: '#383D41' };
    }
  };

  // Load rewards data from database
  const loadRewardsData = async () => {
    setIsLoadingRewards(true);
    try {
      const { data, error } = await getAvailableRewards();
      
      if (error) {
        console.error('❌ Failed to load rewards:', error);
        Alert.alert('Error', 'Failed to load rewards. Please try again.');
        return;
      }
      
      // Transform database rewards to match UI format
      const transformedRewards = data.map(reward => ({
        id: reward.reward_id,
        name: reward.title,
        points: reward.points_required,
        category: reward.category || 'General',
        image: getRewardEmoji(reward.category),
        stock: reward.stock_quantity || 0,
        description: reward.description
      }));
      
      setRewardsData(transformedRewards);
    } catch (error) {
      console.error('❌ Load rewards error:', error);
      Alert.alert('Error', 'Failed to load rewards. Please try again.');
    } finally {
      setIsLoadingRewards(false);
    }
  };
  
  // Get emoji for reward category
  const getRewardEmoji = (category) => {
    const categoryEmojis = {
      'Transport': '🚗',
      'Food & Beverage': '☕',
      'Entertainment': '🎬',
      'Lifestyle': '🌱',
      'Education': '📚',
      'Shopping': '🛍️',
      'Health': '💊',
      'Technology': '📱'
    };
    return categoryEmojis[category] || '🎁';
  };
  
  // Load redemption history
  const loadRedemptionHistory = async (donorId) => {
    setIsLoadingRedemptions(true);
    try {
      const { data, error } = await getRedemptionHistory(donorId);
      
      if (error) {
        console.error('❌ Failed to load redemption history:', error);
        return;
      }
      
      setRedemptionHistory(data || []);
    } catch (error) {
      console.error('❌ Load redemption history error:', error);
    } finally {
      setIsLoadingRedemptions(false);
    }
  };
  
  // Handle reward redemption
  const handleRedeemReward = async (reward) => {
    const currentUserPoints = dashboardStats?.points || 0;
    
    if (currentUserPoints < reward.points) {
      Alert.alert('Insufficient Points', `You need ${reward.points - currentUserPoints} more points to redeem this reward.`);
      return;
    }
    
    if (reward.stock <= 0) {
      Alert.alert('Out of Stock', 'This reward is currently out of stock.');
      return;
    }
    
    Alert.alert(
      'Confirm Redemption',
      `Redeem ${reward.name} for ${reward.points} points?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Redeem', 
          onPress: async () => {
            try {
              // Get current user donor ID
              const currentUser = getCurrentUser();
              const userId = currentUser?.userId || 'U005';
              
              // Get donor_id from user_id
              const { data: donorData, error: donorError } = await supabase
                .from('donors')
                .select('donor_id')
                .eq('user_id', userId)
                .single();
              
              if (donorError || !donorData) {
                Alert.alert('Error', 'Unable to find donor profile. Please try again.');
                return;
              }
              
              const result = await redeemReward(donorData.donor_id, reward.id, reward.points);
              
              if (result.success) {
                Alert.alert(
                  'Reward Redeemed!',
                  `Successfully redeemed ${reward.name}!\n\nRedemption Code: ${result.redemptionCode}\n\nPlease save this code for your records.`,
                  [{ text: 'OK' }]
                );
                
                // Refresh data
                loadRewardsData();
                loadDashboardStats(userId);
                loadRedemptionHistory(donorData.donor_id);
              } else {
                Alert.alert('Redemption Failed', result.error || 'Please try again.');
              }
            } catch (error) {
              console.error('❌ Redemption error:', error);
              Alert.alert('Error', 'Redemption failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Load dashboard stats from database
  const loadDashboardStats = async (userId) => {
    try {
      setIsLoadingStats(true);
      console.log('📊 Loading dashboard stats for user:', userId);
      
      const stats = await getDashboardStats(userId);
      if (stats) {
        console.log('✅ Dashboard stats loaded:', stats);
        setDashboardStats(stats);
      } else {
        console.log('⚠️ No dashboard stats found, using defaults');
        setDashboardStats({
          points: 0,
          totalRecycled: '0 kg',
          rank: 'N/A',
          pickupsCompleted: 0,
          membershipTier: 'Bronze'
        });
      }
      
      // Also load leaderboard data
      const leaderboard = await getLeaderboardData();
      if (leaderboard) {
        console.log('✅ Leaderboard data loaded:', leaderboard.length, 'entries');
        setLeaderboardData(leaderboard);
      }
    } catch (error) {
      console.error('❌ Failed to load dashboard stats:', error);
      Alert.alert('Error', 'Unable to load dashboard statistics. Please try again.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Calendar component
  const renderCalendar = () => {
    const days = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    for (let i = 1; i <= 31; i++) {
      const date = new Date(currentYear, currentMonth, i);
      if (date.getMonth() === currentMonth) {
        days.push(
          <TouchableOpacity
            key={i}
            style={[
              styles.calendarDay,
              selectedDate.getDate() === i && styles.selectedDay
            ]}
            onPress={() => {
              setSelectedDate(new Date(currentYear, currentMonth, i));
              setShowCalendar(false);
            }}
          >
            <Text style={[
              styles.calendarDayText,
              selectedDate.getDate() === i && styles.selectedDayText
            ]}>
              {i}
            </Text>
          </TouchableOpacity>
        );
      }
    }
    return days;
  };

  // Splash Screen
  if (currentScreen === 'splash') {
  return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
        <View style={styles.splashContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>♻️</Text>
            <Text style={styles.appName}>MyCycle+</Text>
          </View>
          <Text style={styles.tagline}>Recycle. Earn. Repeat.</Text>
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
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Signup Screen
  if (currentScreen === 'signup') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authHeader}>
            <Text style={styles.authLogo}>♻️ MyCycle+</Text>
            <Text style={styles.authSubtitle}>Create Your Eco Account</Text>
          </View>

          <View style={styles.authTabs}>
            <TouchableOpacity
              style={styles.authTab}
              onPress={() => setCurrentScreen('auth')}
            >
              <Text style={styles.authTabText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.authTab, styles.activeAuthTab]}
              onPress={() => setCurrentScreen('signup')}
            >
              <Text style={[styles.authTabText, styles.activeAuthTabText]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.authForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                value={signupForm.name}
                onChangeText={(text) => setSignupForm(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                value={signupForm.email}
                onChangeText={(text) => setSignupForm(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+60123456789"
                value={signupForm.phone}
                onChangeText={(text) => setSignupForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Create a password"
                value={signupForm.password}
                onChangeText={(text) => setSignupForm(prev => ({ ...prev, password: text }))}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Confirm your password"
                value={signupForm.confirmPassword}
                onChangeText={(text) => setSignupForm(prev => ({ ...prev, confirmPassword: text }))}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup}>
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentScreen('auth')}
            >
              <Text style={styles.secondaryButtonText}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Forgot Password Screen
  if (currentScreen === 'forgotPassword') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ScrollView contentContainerStyle={styles.authContent}>
          <View style={styles.authHeader}>
            <Text style={styles.authLogo}>♻️ MyCycle+</Text>
            <Text style={styles.authSubtitle}>Reset Your Password</Text>
            <Text style={styles.forgotPasswordDescription}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          <View style={styles.authForm}>
            {!forgotPasswordSuccess ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={[styles.textInput, forgotPasswordError ? styles.textInputError : null]}
                    placeholder="Enter your email address"
                    value={forgotPasswordEmail}
                    onChangeText={handleForgotPasswordEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {forgotPasswordError ? (
                    <Text style={styles.errorText}>{forgotPasswordError}</Text>
                  ) : null}
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPassword}>
                  <Text style={styles.primaryButtonText}>Send Reset Instructions</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Check Your Email!</Text>
                <Text style={styles.successMessage}>
                  We've sent password reset instructions to {forgotPasswordEmail}
                </Text>
                <Text style={styles.successNote}>
                  Redirecting you back to login...
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setCurrentScreen('auth');
                setForgotPasswordEmail('');
                setForgotPasswordError('');
                setForgotPasswordSuccess(false);
              }}
            >
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main App Navigation
  if (isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
        
        {/* Home Dashboard */}
        {currentScreen === 'home' && (
    <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.headerGreeting}>Hello, {currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}! 👋</Text>
                  <Text style={styles.headerSubtitle}>Ready to make a difference today?</Text>
    </View>
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={() => setCurrentScreen('profile')}
                >
                  <Text style={styles.profileButtonText}>{(currentUser?.user_metadata?.full_name || currentUser?.email || 'U').charAt(0)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.mainContent}>
              {/* Points Summary */}
              <View style={styles.pointsCard}>
                <View style={styles.pointsHeader}>
                  <Text style={styles.pointsTitle}>Your Eco Points</Text>
                  <Text style={styles.pointsValue}>{isLoadingStats ? '...' : (dashboardStats?.points || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.pointsStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{isLoadingStats ? '...' : (dashboardStats?.total_recycled_weight ? `${dashboardStats.total_recycled_weight} kg` : '0 kg')}</Text>
                    <Text style={styles.statLabel}>Total Recycled</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>#{isLoadingStats ? '...' : (dashboardStats?.rank || 'N/A')}</Text>
                    <Text style={styles.statLabel}>Your Rank</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{isLoadingStats ? '...' : (dashboardStats?.pickups_completed || 0)}</Text>
                    <Text style={styles.statLabel}>Pickups Done</Text>
                  </View>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.quickActions}>
                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('schedule')}
                  >
                    <Text style={styles.actionIcon}>📅</Text>
                    <Text style={styles.actionTitle}>Schedule Pickup</Text>
                    <Text style={styles.actionSubtitle}>Book a collection</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('rewards')}
                  >
                    <Text style={styles.actionIcon}>🎁</Text>
                    <Text style={styles.actionTitle}>Redeem Rewards</Text>
                    <Text style={styles.actionSubtitle}>Use your points</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('leaderboard')}
                  >
                    <Text style={styles.actionIcon}>🏆</Text>
                    <Text style={styles.actionTitle}>Leaderboard</Text>
                    <Text style={styles.actionSubtitle}>See rankings</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionCard}
                    onPress={() => setCurrentScreen('history')}
                  >
                    <Text style={styles.actionIcon}>📦</Text>
                    <Text style={styles.actionTitle}>My Pickups</Text>
                    <Text style={styles.actionSubtitle}>View history</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <View style={styles.activityList}>
                  {(dashboardStats?.recent_activity || []).map(activity => (
                    <View key={activity.id} style={styles.activityItem}>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityAction}>{activity.action}</Text>
                        <Text style={styles.activityDate}>{activity.date}</Text>
                      </View>
                      <Text style={[
                        styles.activityPoints,
                        activity.points.startsWith('+') ? styles.positivePoints : styles.negativePoints
                      ]}>
                        {activity.points}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
              <TouchableOpacity 
                style={[styles.navItem, currentScreen === 'home' && styles.activeNavItem]}
                onPress={() => setCurrentScreen('home')}
              >
                <Text style={styles.navIcon}>🏠</Text>
                <Text style={styles.navLabel}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('schedule')}
              >
                <Text style={styles.navIcon}>📅</Text>
                <Text style={styles.navLabel}>Schedule</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('rewards')}
              >
                <Text style={styles.navIcon}>🎁</Text>
                <Text style={styles.navLabel}>Rewards</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navItem}
                onPress={() => setCurrentScreen('leaderboard')}
              >
                <Text style={styles.navIcon}>🏆</Text>
                <Text style={styles.navLabel}>Ranking</Text>
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

        {/* Schedule Pickup Screen */}
        {currentScreen === 'schedule' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Schedule Pickup</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.mainContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Date</Text>
                <TouchableOpacity 
                  style={styles.dateSelector}
                  onPress={() => setShowCalendar(true)}
                >
                  <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Address</Text>
                <View style={styles.addressContainer}>
                  <TextInput
                    style={styles.addressInput}
                    placeholder="Enter your pickup address or select from map"
                    value={pickupAddress}
                    onChangeText={setPickupAddress}
                    multiline
                  />
                  <TouchableOpacity 
                    style={styles.mapButton} 
                    onPress={() => setShowMapModal(true)}
                  >
                    <Text style={styles.mapButtonIcon}>🗺️</Text>
                    <Text style={styles.mapButtonText}>Select on Map</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Recent Addresses */}
                {savedAddresses.length > 0 && (
                  <View style={styles.recentAddresses}>
                    <Text style={styles.recentAddressesTitle}>Recent Addresses</Text>
                    {savedAddresses.slice(0, 3).map((addr) => (
                      <TouchableOpacity
                        key={addr.id}
                        style={styles.recentAddressItem}
                        onPress={() => setPickupAddress(addr.address)}
                      >
                        <Text style={styles.recentAddressIcon}>
                          {addr.type === 'university' ? '🏫' : 
                           addr.type === 'residential' ? '🏠' : 
                           addr.type === 'commercial' ? '🏢' : '📍'}
                        </Text>
                        <View style={styles.recentAddressInfo}>
                          <Text style={styles.recentAddressName}>{addr.name}</Text>
                          <Text style={styles.recentAddressText}>{addr.address}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Interactive Location Preview */}
              {selectedLocation && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Selected Location</Text>
                  <View style={styles.locationPreview}>
                    <View style={styles.locationHeader}>
                      <Text style={styles.locationIcon}>
                        {selectedLocation.type === 'university' ? '🏫' : 
                         selectedLocation.type === 'residential' ? '🏠' : 
                         selectedLocation.type === 'commercial' ? '🏢' : 
                         selectedLocation.type === 'sports' ? '🏟️' : '📍'}
                      </Text>
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName}>{selectedLocation.name}</Text>
                        <Text style={styles.locationType}>{selectedLocation.type}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.editLocationButton}
                        onPress={() => setShowMapModal(true)}
                      >
                        <Text style={styles.editLocationText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.locationAddress}>{pickupAddress}</Text>
                    <View style={styles.locationCoords}>
                      <Text style={styles.coordsText}>
                        📍 Coordinates: ({selectedLocation.x}, {selectedLocation.y})
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Items to Recycle</Text>
                <View style={styles.itemSelector}>
                  {['Plastic Bottles', 'Paper', 'Cardboard', 'Glass', 'Metal Cans', 'Electronics'].map(item => (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.itemOption,
                        pickupItems.includes(item) && styles.selectedItem
                      ]}
                      onPress={() => {
                        if (pickupItems.includes(item)) {
                          setPickupItems(prev => prev.filter(i => i !== item));
                        } else {
                          setPickupItems(prev => [...prev, item]);
                        }
                      }}
                    >
                      <Text style={[
                        styles.itemOptionText,
                        pickupItems.includes(item) && styles.selectedItemText
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Slot Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferred Time Slot</Text>
                <View style={styles.timeSlotContainer}>
                  {[
                    { key: 'morning', label: 'Morning', icon: '🌅', time: '8:00 AM - 12:00 PM' },
                    { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '12:00 PM - 5:00 PM' },
                    { key: 'evening', label: 'Evening', icon: '🌇', time: '5:00 PM - 8:00 PM' }
                  ].map(slot => (
                    <TouchableOpacity
                      key={slot.key}
                      style={[
                        styles.timeSlot,
                        selectedTime === slot.key && styles.selectedTimeSlot
                      ]}
                      onPress={() => setSelectedTime(slot.key)}
                    >
                      <Text style={styles.timeSlotIcon}>{slot.icon}</Text>
                      <Text style={[
                        styles.timeSlotLabel,
                        selectedTime === slot.key && styles.selectedTimeSlotText
                      ]}>
                        {slot.label}
                      </Text>
                      <Text style={[
                        styles.timeSlotTime,
                        selectedTime === slot.key && styles.selectedTimeSlotText
                      ]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Estimated Weight */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estimated Weight</Text>
                <View style={styles.weightContainer}>
                  <View style={styles.weightInputContainer}>
                    <TextInput
                      style={styles.weightInput}
                      value={estimatedWeight.toString()}
                      onChangeText={(text) => {
                        const weight = parseFloat(text) || 0;
                        setEstimatedWeight(Math.max(0.1, Math.min(100, weight))); // Min 0.1kg, Max 100kg
                      }}
                      keyboardType="numeric"
                      placeholder="5.0"
                    />
                    <Text style={styles.weightUnit}>kg</Text>
                  </View>
                  <View style={styles.weightSliderContainer}>
                    <View style={styles.weightPresets}>
                      {[1, 5, 10, 20].map(weight => (
                        <TouchableOpacity
                          key={weight}
                          style={[
                            styles.weightPreset,
                            estimatedWeight === weight && styles.selectedWeightPreset
                          ]}
                          onPress={() => setEstimatedWeight(weight)}
                        >
                          <Text style={[
                            styles.weightPresetText,
                            estimatedWeight === weight && styles.selectedWeightPresetText
                          ]}>
                            {weight}kg
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <Text style={styles.weightHint}>💡 More accurate weight estimates help optimize collection routes</Text>
                </View>
              </View>

              {/* Special Instructions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Special Instructions (Optional)</Text>
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="e.g., Items are in the garage, Ring doorbell twice, Fragile electronics..."
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                <Text style={styles.characterCount}>{specialInstructions.length}/200</Text>
              </View>

              {/* Pickup Summary */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickup Summary</Text>
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>📅 Date:</Text>
                    <Text style={styles.summaryValue}>{selectedDate.toDateString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>⏰ Time:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedTime === 'morning' ? '8:00 AM - 12:00 PM' :
                       selectedTime === 'afternoon' ? '12:00 PM - 5:00 PM' :
                       '5:00 PM - 8:00 PM'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>📍 Address:</Text>
                    <Text style={styles.summaryValue}>{pickupAddress || 'Not specified'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>♻️ Items:</Text>
                    <Text style={styles.summaryValue}>{pickupItems.length > 0 ? pickupItems.join(', ') : 'None selected'}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>⚖️ Weight:</Text>
                    <Text style={styles.summaryValue}>{estimatedWeight} kg (estimated)</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>🌟 Points:</Text>
                    <Text style={styles.summaryValue}>+10 points for scheduling</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.scheduleButton} onPress={handleSchedulePickup}>
                <Text style={styles.scheduleButtonText}>Schedule Pickup</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Calendar Modal */}
            <Modal visible={showCalendar} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.calendarModal}>
                  <View style={styles.calendarHeader}>
                    <Text style={styles.calendarTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowCalendar(false)}>
                      <Text style={styles.calendarClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calendarGrid}>
                    {renderCalendar()}
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        )}

        {/* Rewards Screen */}
        {currentScreen === 'rewards' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Rewards</Text>
              <View style={{ width: 50 }} />
            </View>

            <View style={styles.pointsHeader}>
              <Text style={styles.availablePoints}>Available Points: {isLoadingStats ? '...' : (dashboardStats?.points || 0).toLocaleString()}</Text>
            </View>

            {isLoadingRewards ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading rewards...</Text>
              </View>
            ) : rewardsData.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>🎁</Text>
                <Text style={styles.emptyStateTitle}>No Rewards Available</Text>
                <Text style={styles.emptyStateMessage}>Check back later for new rewards!</Text>
                <TouchableOpacity 
                  style={styles.scheduleFirstPickupButton}
                  onPress={loadRewardsData}
                >
                  <Text style={styles.scheduleFirstPickupButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={rewardsData}
                keyExtractor={(item) => item.id.toString()}
                style={styles.rewardsList}
                contentContainerStyle={styles.rewardsContent}
                renderItem={({ item }) => (
                  <View style={styles.rewardCard}>
                    <View style={styles.rewardImage}>
                      <Text style={styles.rewardEmoji}>{item.image}</Text>
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text style={styles.rewardName}>{item.name}</Text>
                      <Text style={styles.rewardCategory}>{item.category}</Text>
                      <View style={styles.rewardDetails}>
                        <Text style={styles.rewardPoints}>{item.points} points</Text>
                        <Text style={styles.rewardStock}>{item.stock} left</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.redeemButton,
                        ((dashboardStats?.points || 0) < item.points || item.stock <= 0) && styles.disabledButton
                      ]}
                      onPress={() => handleRedeemReward(item)}
                      disabled={(dashboardStats?.points || 0) < item.points || item.stock <= 0}
                    >
                      <Text style={[
                        styles.redeemButtonText,
                        ((dashboardStats?.points || 0) < item.points || item.stock <= 0) && styles.disabledButtonText
                      ]}>
                        {item.stock <= 0 ? 'Out of Stock' : (dashboardStats?.points || 0) >= item.points ? 'Redeem' : 'Insufficient'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                refreshing={isLoadingRewards}
                onRefresh={loadRewardsData}
              />
            )}
          </View>
        )}

        {/* Leaderboard Screen */}
        {currentScreen === 'leaderboard' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Leaderboard</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.mainContent}>
              <View style={styles.userRankCard}>
                <Text style={styles.userRankTitle}>Your Current Position</Text>
                <View style={styles.userRankInfo}>
                  <Text style={styles.userRankNumber}>#{isLoadingStats ? '...' : (dashboardStats?.rank || 'N/A')}</Text>
                  <View>
                    <Text style={styles.userRankName}>{currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}</Text>
                    <Text style={styles.userRankBadge}>{dashboardStats?.membership_tier || 'Member'}</Text>
                  </View>
                  <Text style={styles.userRankPoints}>{isLoadingStats ? '...' : (dashboardStats?.points || 0).toLocaleString()} pts</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Eco Warriors</Text>
                {isLoadingStats ? (
                  <Text style={styles.loadingText}>Loading leaderboard...</Text>
                ) : (
                  (leaderboardData || []).map((user, index) => (
                    <View key={user.id || index} style={[
                      styles.leaderboardItem,
                      (user.name === (currentUser?.user_metadata?.full_name || currentUser?.email)) && styles.currentUserItem
                    ]}>
                      <View style={styles.rankContainer}>
                        <Text style={[
                          styles.rankNumber,
                          index < 3 && styles.topRank
                        ]}>
                          {index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${user.rank || (index + 1)}`}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.name}</Text>
                        <Text style={styles.userBadge}>{user.badge || user.membership_tier || 'Eco Warrior'}</Text>
                      </View>
                      <Text style={styles.userPoints}>{(user.points || 0).toLocaleString()}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Badges</Text>
                <View style={styles.badgesGrid}>
                  {(dashboardStats?.badges || []).map((badge, index) => (
                    <View key={index} style={styles.badgeItem}>
                      <Text style={styles.badgeIcon}>🏆</Text>
                      <Text style={styles.badgeTitle}>{badge}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Profile Screen */}
        {currentScreen === 'profile' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>Profile</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.mainContent}>
              <View style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {currentUser?.user_metadata?.full_name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                  </Text>
                </View>
                <Text style={styles.profileName}>
                  {currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}
                </Text>
                <Text style={styles.profileLevel}>
                  {dashboardStats?.membership_tier || 'Member'}
                </Text>
                <View style={styles.profileStats}>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>
                      {dashboardStats?.points?.toLocaleString() || '0'}
                    </Text>
                    <Text style={styles.profileStatLabel}>Points Earned</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>
                      {dashboardStats?.total_recycled_weight ? `${dashboardStats.total_recycled_weight} kg` : '0 kg'}
                    </Text>
                    <Text style={styles.profileStatLabel}>Recycled</Text>
                  </View>
                  <View style={styles.profileStat}>
                    <Text style={styles.profileStatValue}>
                      #{dashboardStats?.rank || 'N/A'}
                    </Text>
                    <Text style={styles.profileStatLabel}>Global Rank</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{currentUser?.email || 'Not available'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{currentUser?.user_metadata?.phone || 'Not available'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>January 2024</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.settingsCard}>
                  <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>🔔</Text>
                    <Text style={styles.settingLabel}>Notifications</Text>
                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>🔒</Text>
                    <Text style={styles.settingLabel}>Privacy Settings</Text>
                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>💬</Text>
                    <Text style={styles.settingLabel}>Help & Support</Text>
                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.settingItem}>
                    <Text style={styles.settingIcon}>ℹ️</Text>
                    <Text style={styles.settingLabel}>About MyCycle+</Text>
                    <Text style={styles.settingArrow}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Pickup History Screen */}
        {currentScreen === 'history' && (
          <View style={styles.container}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => setCurrentScreen('home')}>
                <Text style={styles.backButton}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.screenTitle}>My Pickups</Text>
              <TouchableOpacity onPress={fetchPickupHistory}>
                <Text style={styles.refreshButton}>🔄</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mainContent}>
              {historyLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading pickup history...</Text>
                </View>
              ) : pickupHistory.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateIcon}>📦</Text>
                  <Text style={styles.emptyStateTitle}>No Pickups Yet</Text>
                  <Text style={styles.emptyStateMessage}>
                    You haven't scheduled any pickups yet. Start recycling to see your pickup history here!
                  </Text>
                  <TouchableOpacity 
                    style={styles.scheduleFirstPickupButton}
                    onPress={() => setCurrentScreen('schedule')}
                  >
                    <Text style={styles.scheduleFirstPickupButtonText}>Schedule Your First Pickup</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.historyList}>
                  <Text style={styles.historyHeader}>
                    Your Pickup History ({pickupHistory.length} total)
                  </Text>
                  
                  {pickupHistory.map((pickup) => (
                    <View key={pickup.pickup_id} style={styles.pickupCard}>
                      <View style={styles.pickupCardHeader}>
                        <Text style={styles.pickupId}>#{pickup.pickup_id}</Text>
                        <View style={[styles.statusBadge, getStatusBadgeStyle(pickup.status)]}>
                          <Text style={[styles.statusText, getStatusTextStyle(pickup.status)]}>
                            {pickup.status}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.pickupDetails}>
                        <View style={styles.pickupDetailRow}>
                          <Text style={styles.pickupDetailIcon}>📅</Text>
                          <Text style={styles.pickupDetailText}>
                            {new Date(pickup.scheduled_date).toLocaleDateString()} at {pickup.scheduled_time}
                          </Text>
                        </View>
                        
                        <View style={styles.pickupDetailRow}>
                          <Text style={styles.pickupDetailIcon}>📍</Text>
                          <Text style={styles.pickupDetailText}>
                            {pickup.addresses?.street_address || 'Address not available'}
                            {pickup.addresses?.city && `, ${pickup.addresses.city}`}
                          </Text>
                        </View>
                        
                        {pickup.total_weight && (
                          <View style={styles.pickupDetailRow}>
                            <Text style={styles.pickupDetailIcon}>⚖️</Text>
                            <Text style={styles.pickupDetailText}>
                              {pickup.total_weight} kg
                            </Text>
                          </View>
                        )}
                        
                        {pickup.total_points > 0 && (
                          <View style={styles.pickupDetailRow}>
                            <Text style={styles.pickupDetailIcon}>⭐</Text>
                            <Text style={styles.pickupDetailText}>
                              +{pickup.total_points} points earned
                            </Text>
                          </View>
                        )}
                        
                        {pickup.notes && (
                          <View style={styles.pickupDetailRow}>
                            <Text style={styles.pickupDetailIcon}>📝</Text>
                            <Text style={styles.pickupDetailText}>
                              {pickup.notes}
                            </Text>
                          </View>
                        )}
                        
                        <View style={styles.pickupDetailRow}>
                          <Text style={styles.pickupDetailIcon}>🕒</Text>
                          <Text style={styles.pickupDetailText}>
                            Created: {new Date(pickup.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        
                        {pickup.completed_at && (
                          <View style={styles.pickupDetailRow}>
                            <Text style={styles.pickupDetailIcon}>✅</Text>
                            <Text style={styles.pickupDetailText}>
                              Completed: {new Date(pickup.completed_at).toLocaleDateString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Custom Map Modal */}
        <CustomMapComponent
          isVisible={showMapModal}
          onClose={() => setShowMapModal(false)}
          onLocationSelect={handleLocationSelect}
        />
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashContent: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 1,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 1,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
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
    color: '#2E7D32',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  authTabs: {
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    padding: 4,
  },
  authTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeAuthTab: {
    backgroundColor: '#2E7D32',
  },
  authTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeAuthTabText: {
    color: 'white',
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
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },

  // Main App
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2E7D32',
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
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#2E7D32',
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

  // Main Content
  mainContent: {
    flex: 1,
    padding: 20,
  },

  // Points Card
  pointsCard: {
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
  pointsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pointsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  // Sections
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 15,
  },
  
  // Time Slot Styles
  timeSlotContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTimeSlot: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  timeSlotIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  timeSlotLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeSlotTime: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeSlotText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  
  // Weight Estimation Styles
  weightContainer: {
    gap: 15,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  weightInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginLeft: 10,
  },
  weightSliderContainer: {
    gap: 10,
  },
  weightPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  weightPreset: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedWeightPreset: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  weightPresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedWeightPresetText: {
    color: '#4A90E2',
  },
  weightHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  
  // Special Instructions Styles
  instructionsInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },
  
  // Summary Styles
  summaryContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '48%',
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

  // Activity List
  activityList: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positivePoints: {
    color: '#2E7D32',
  },
  negativePoints: {
    color: '#d32f2f',
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
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
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

  // Schedule Pickup
  dateSelector: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  dateIcon: {
    fontSize: 20,
  },
  addressInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    flex: 1,
    marginBottom: 10,
  },
  
  // Enhanced Address Styles
  addressContainer: {
    gap: 10,
  },
  mapButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonIcon: {
    fontSize: 18,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recentAddresses: {
    marginTop: 15,
    gap: 8,
  },
  recentAddressesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  recentAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recentAddressIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  recentAddressInfo: {
    flex: 1,
  },
  recentAddressName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  recentAddressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  // Location Preview Styles
  locationPreview: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  locationType: {
    fontSize: 12,
    color: '#4A90E2',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  editLocationButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editLocationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  locationCoords: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  mapContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e3f2fd',
    borderStyle: 'dashed',
    position: 'relative',
  },
  mapPlaceholder: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  mapMarker: {
    position: 'absolute',
    top: 50,
    right: 50,
  },
  mapMarkerText: {
    fontSize: 24,
  },
  itemSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemOption: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedItem: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  itemOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedItemText: {
    color: 'white',
  },
  scheduleButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  scheduleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarClose: {
    fontSize: 20,
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  selectedDay: {
    backgroundColor: '#2E7D32',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Rewards
  pointsHeader: {
    backgroundColor: 'white',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  availablePoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  rewardsList: {
    flex: 1,
  },
  rewardsContent: {
    padding: 20,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  rewardCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  rewardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  rewardStock: {
    fontSize: 12,
    color: '#666',
  },
  redeemButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  redeemButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#666',
  },

  // Leaderboard
  userRankCard: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  userRankTitle: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  userRankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRankNumber: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userRankName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRankBadge: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  userRankPoints: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leaderboardItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserItem: {
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  topRank: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userBadge: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  userPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: (width - 64) / 2,
  },
  badgeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },

  // Profile
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
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
  profileLevel: {
    fontSize: 16,
    color: '#2E7D32',
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
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
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
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 20,
    color: '#ccc',
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

  // Validation Error Styles
  textInputError: {
    borderColor: '#d32f2f',
    borderWidth: 2,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Forgot Password Styles
  forgotPasswordButton: {
    marginVertical: 10,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  forgotPasswordDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Pickup History Styles
  refreshButton: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  scheduleFirstPickupButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scheduleFirstPickupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    paddingBottom: 20,
  },
  historyHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickupId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pickupDetails: {
    gap: 8,
  },
  pickupDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  pickupDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
    width: 20,
  },
  pickupDetailText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
