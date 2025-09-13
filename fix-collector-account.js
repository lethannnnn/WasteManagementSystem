const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabaseUrl = 'https://okycddtfijycafmidlid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixCollectorAccount() {
  console.log('Fixing collector account...');
  
  try {
    // Generate new password hash for 'collector1'
    const newPasswordHash = await bcrypt.hash('collector1', 10);
    console.log('New password hash:', newPasswordHash);
    
    // Update the user record to set email_verified = true and new password hash
    const { data, error } = await supabase
      .from('users')
      .update({ 
        email_verified: true,
        password_hash: newPasswordHash
      })
      .eq('email', 'collector1@mycycle.com');
    
    if (error) {
      console.error('Error updating user:', error);
      return;
    }
    
    console.log('User updated successfully:', data);
    
    // Verify the update
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'collector1@mycycle.com')
      .single();
    
    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return;
    }
    
    console.log('Updated user:', {
      email: user.email,
      email_verified: user.email_verified,
      password_hash: user.password_hash.substring(0, 20) + '...'
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCollectorAccount();