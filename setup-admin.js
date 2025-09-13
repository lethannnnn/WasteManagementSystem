const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://okycddtfijycafmidlid.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reWNkZHRmaWp5Y2FmbWlkbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1ODUxNDksImV4cCI6MjA3MzE2MTE0OX0.u6vJs_jpX3j2HaYUgB5LtEn4krJ2RqBiE4KoOhj3HeM'
);

async function setupAdmin() {
  try {
    console.log('Setting up admin user...');
    
    // First, let's try to create the profiles table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        user_type TEXT CHECK (user_type IN ('donor', 'collector', 'admin', 'sponsor')) NOT NULL DEFAULT 'donor',
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        phone TEXT,
        profile_image_url TEXT,
        verification_status TEXT DEFAULT 'pending',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Enable RLS
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for profiles
      CREATE POLICY "Users can view own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);
      
      CREATE POLICY "Users can update own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);
    `;
    
    const { data: tableResult, error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });
    
    if (tableError) {
      console.log('Table creation result:', tableError);
    } else {
      console.log('Profiles table created successfully');
    }
    
    // Now insert the admin profile
    const { data: insertResult, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: 'e85b8980-bbba-4cb0-98f0-7a855a60e3ec', // The user ID from signup
        user_type: 'admin',
        email: 'admin1@mycycle.com',
        full_name: 'Demo Admin User',
        phone: '+60123456791',
        verification_status: 'verified',
        is_active: true
      });
    
    if (insertError) {
      console.log('Profile insert error:', insertError);
    } else {
      console.log('Admin profile created successfully:', insertResult);
    }
    
    // Verify the profile was created
    const { data: verifyResult, error: verifyError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin1@mycycle.com');
    
    console.log('Verification result:', { data: verifyResult, error: verifyError });
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

setupAdmin();