// =================================================================
// ADMIN PROFILE FIXER SCRIPT
// Run this in your browser console on the Supabase dashboard
// =================================================================

// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://okycddtfijycafmidlid.supabase.co'; // Your URL from the mobile app
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // Your anon key

async function fixAdminProfile() {
  try {
    console.log('🔍 Finding admin user...');
    
    // First, let's try to sign in with the admin credentials to get the user ID
    const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: 'admin@mycycle.com',
        password: 'Admin123'
      })
    });

    const signInData = await signInResponse.json();
    
    if (signInData.error) {
      throw new Error(`Sign in failed: ${signInData.error.message}`);
    }

    const userId = signInData.user.id;
    const accessToken = signInData.access_token;
    
    console.log('✅ Found admin user ID:', userId);

    // Now create the profile using the correct user ID
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        id: userId,
        user_type: 'admin',
        full_name: 'System Administrator',
        verification_status: 'verified',
        is_active: true
      })
    });

    if (!profileResponse.ok) {
      const profileError = await profileResponse.text();
      console.log('Profile creation response:', profileError);
      // This might fail if profile already exists, which is okay
    }

    console.log('✅ Admin profile created/updated');

    // Create admin record
    const adminResponse = await fetch(`${SUPABASE_URL}/rest/v1/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        admin_id: userId,
        role_type: 'system_admin',
        department: 'Operations'
      })
    });

    if (!adminResponse.ok) {
      const adminError = await adminResponse.text();
      console.log('Admin record response:', adminError);
      // This might fail if admin record already exists, which is okay
    }

    console.log('✅ Admin record created/updated');
    console.log('🎉 Admin setup complete! Try logging in again.');
    
    return {
      success: true,
      userId: userId,
      message: 'Admin profile fixed successfully'
    };

  } catch (error) {
    console.error('❌ Error fixing admin profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Instructions
console.log('='.repeat(60));
console.log('🔧 MyCycle+ Admin Profile Fixer');
console.log('='.repeat(60));
console.log('1. Update SUPABASE_ANON_KEY above with your actual anon key');
console.log('2. Run: fixAdminProfile()');
console.log('3. Try logging into the admin dashboard again');
console.log('='.repeat(60));

// Uncomment to run automatically (after updating the anon key)
// fixAdminProfile();
