// =================================================================
// ADMIN ACCOUNT SETUP SCRIPT
// Run this in your browser console while on your Supabase dashboard
// =================================================================

// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // NOT the anon key!

// Function to create admin account
async function createAdminAccount() {
  try {
    // First, create the auth user via fetch (since we're in browser)
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: 'admin@mycycle.com',
        password: 'Admin123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'System Administrator',
          user_type: 'admin'
        }
      })
    });

    const userData = await response.json();
    
    if (userData.error) {
      throw new Error(userData.error.message);
    }

    console.log('✅ Admin user created:', userData);
    const userId = userData.id;

    // Now create the profile
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
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
      throw new Error(`Profile creation failed: ${profileError}`);
    }

    console.log('✅ Admin profile created');

    // Create admin record
    const adminResponse = await fetch(`${SUPABASE_URL}/rest/v1/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
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
      throw new Error(`Admin record creation failed: ${adminError}`);
    }

    console.log('✅ Admin record created');
    console.log('🎉 Admin account setup complete!');
    console.log('📧 Email: admin@mycycle.com');
    console.log('🔑 Password: Admin123!');
    
    return {
      success: true,
      message: 'Admin account created successfully',
      credentials: {
        email: 'admin@mycycle.com',
        password: 'Admin123!'
      }
    };

  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Instructions
console.log('='.repeat(50));
console.log('🚀 MyCycle+ Admin Account Setup');
console.log('='.repeat(50));
console.log('1. Update SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY above');
console.log('2. Run: createAdminAccount()');
console.log('='.repeat(50));

// Uncomment the line below to run automatically (after updating credentials)
// createAdminAccount();
