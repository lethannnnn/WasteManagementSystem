-- =================================================================
-- ADMIN SETUP TROUBLESHOOTING SCRIPT
-- Run this in your Supabase SQL Editor to fix admin access issues
-- =================================================================

-- First, let's check if the admin user exists in auth.users
-- (This is just for verification - you can't directly query auth.users from SQL editor)

-- Check if admin profile exists
SELECT 'Checking admin profile...' as status;
SELECT * FROM profiles WHERE user_type = 'admin' AND full_name = 'System Administrator';

-- If no results above, the profile doesn't exist. Let's create it.
-- Replace the UUID below with your actual admin user UUID

-- Method 1: If you know the UUID, use it directly
INSERT INTO profiles (id, user_type, full_name, verification_status, is_active)
VALUES (
  '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Your admin UUID
  'admin',
  'System Administrator',
  'verified',
  true
) ON CONFLICT (id) DO UPDATE SET
  user_type = EXCLUDED.user_type,
  full_name = EXCLUDED.full_name,
  verification_status = EXCLUDED.verification_status,
  is_active = EXCLUDED.is_active;

-- Create admin record
INSERT INTO admins (admin_id, role_type, department)
VALUES (
  '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Same UUID
  'system_admin',
  'Operations'
) ON CONFLICT (admin_id) DO UPDATE SET
  role_type = EXCLUDED.role_type,
  department = EXCLUDED.department;

-- Verify the setup
SELECT 'Admin setup verification:' as status;
SELECT p.id, p.user_type, p.full_name, p.verification_status, p.is_active,
       a.role_type, a.department
FROM profiles p
LEFT JOIN admins a ON p.id = a.admin_id
WHERE p.user_type = 'admin';

-- =================================================================
-- If you're still getting the error, the UUID might be wrong.
-- Let's create a function to help find the correct UUID:
-- =================================================================

-- This won't work in SQL editor, but if you have access to your auth.users table,
-- you can run: SELECT id, email FROM auth.users WHERE email = 'admin@mycycle.com';
