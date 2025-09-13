const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://okycddtfijycafmidlid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAuthUser() {
  console.log('Creating auth user for collector...');
  
  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: 'collector1@mycycle.com',
      password: 'collector1',
      options: {
        data: {
          full_name: 'Demo Collector User',
          phone: '+60123456790'
        }
      }
    });
    
    if (error) {
      console.error('Error creating auth user:', error);
      return;
    }
    
    console.log('Auth user created successfully:', {
      user_id: data.user?.id,
      email: data.user?.email,
      email_confirmed_at: data.user?.email_confirmed_at
    });
    
    // Now test login
    console.log('\nTesting login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'collector1@mycycle.com',
      password: 'collector1'
    });
    
    if (loginError) {
      console.error('Login failed:', loginError);
    } else {
      console.log('Login successful!', {
        user_id: loginData.user?.id,
        email: loginData.user?.email
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createAuthUser();