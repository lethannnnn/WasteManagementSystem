const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://okycddtfijycafmidlid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function confirmCollectorEmail() {
  try {
    console.log('Confirming collector email...');
    
    // Get the user by email
    const { data: users, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      console.error('Error getting users:', getUserError);
      return;
    }
    
    const collectorUser = users.users.find(user => user.email === 'collector1@mycycle.com');
    
    if (!collectorUser) {
      console.log('Collector user not found in auth system');
      return;
    }
    
    console.log('Found collector user:', collectorUser.id);
    console.log('Current email confirmed status:', collectorUser.email_confirmed_at);
    
    // Update user to confirm email
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      collectorUser.id,
      {
        email_confirm: true
      }
    );
    
    if (updateError) {
      console.error('Error confirming email:', updateError);
      return;
    }
    
    console.log('Email confirmed successfully!');
    console.log('Updated user:', updatedUser.user);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

confirmCollectorEmail();