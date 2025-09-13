// Test script to verify collector account exists
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://okycddtfijycafmidlid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCollectorLogin() {
  try {
    console.log('Testing collector login...');
    
    // Try to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'collector1@mycycle.com',
      password: 'collector1',
    });

    if (authError) {
      console.error('Authentication failed:', authError.message);
      
      // Check if user exists
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'collector1@mycycle.com');
      
      if (userError) {
        console.error('Error checking users table:', userError.message);
      } else {
        console.log('Users found:', users);
      }
      
      return;
    }

    console.log('Authentication successful!');
    console.log('User ID:', authData.user.id);
    
    // Check collector profile
    const { data: collector, error: collectorError } = await supabase
      .from('collectors')
      .select(`
        collector_id,
        user_id,
        vehicle_type,
        license_plate,
        status,
        users!inner(
          full_name,
          email,
          phone_number
        )
      `)
      .eq('user_id', authData.user.id)
      .single();
    
    if (collectorError) {
      console.error('Collector profile error:', collectorError.message);
    } else {
      console.log('Collector profile found:', collector);
    }
    
    // Sign out
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testCollectorLogin();