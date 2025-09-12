-- =================================================================
-- DEFAULT ADMIN ACCOUNT SETUP
-- Run this script in your Supabase SQL Editor to create the default admin
-- =================================================================

-- Insert the default admin user into auth.users
-- NOTE: This approach creates the user directly in the auth schema
-- You'll need to run this via the Supabase Auth API or dashboard

-- Alternative approach: Create admin via Supabase Auth API
-- You can use the following JavaScript code in your browser console
-- while logged into your Supabase dashboard:

/*
// Run this in your browser console or use the Supabase CLI
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY' // Use service role key, not anon key

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create the admin user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@mycycle.com',
  password: 'Admin123',
  email_confirm: true
})

console.log('Admin user created:', data, error)
*/

-- After creating the user via the Auth API, you'll need to insert the profile and admin records
-- Replace 'USER_UUID_HERE' with the actual UUID from the created user

-- Insert admin profile (run this after creating the auth user)
INSERT INTO profiles (id, user_type, full_name, verification_status, is_active)
VALUES (
  '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Replace with actual user UUID
  'admin',
  'System Administrator',
  'verified',
  true
);

-- Insert admin record
INSERT INTO admins (admin_id, role_type, department)
VALUES (
  '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Same UUID as above
  'system_admin',
  'Operations'
);

-- =================================================================
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Authentication > Users
-- 3. Click "Add user" and create:
--    Email: admin@mycycle.com
--    Password: Admin123
--    Auto Confirm User: YES
-- 4. Copy the generated User ID (UUID)
-- 5. Run the INSERT statements above with the copied UUID
-- =================================================================
