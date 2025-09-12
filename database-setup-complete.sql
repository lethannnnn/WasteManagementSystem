-- =================================================================
-- COMPLETE MYCYCLE+ DATABASE SETUP
-- Run this script in your Supabase SQL Editor to set up all tables, policies, and triggers
-- =================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- 1. CREATE TABLES
-- =================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'donor', 'collector', 'sponsor')),
  full_name TEXT,
  phone TEXT,
  address TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: donors table will be created in the RLS section to ensure proper structure

-- Collectors table
CREATE TABLE IF NOT EXISTS collectors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  vehicle_type TEXT,
  license_plate TEXT,
  service_area JSONB, -- GeoJSON for service boundaries
  max_capacity_kg DECIMAL(10,2),
  current_load_kg DECIMAL(10,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_collections INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sponsors table
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  total_contribution DECIMAL(10,2) DEFAULT 0,
  active_campaigns INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- =================================================================

-- First, safely drop existing tables that might have incorrect structure
DO $$
BEGIN
    -- Drop existing policies and tables safely
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'donors') THEN
        DROP TABLE donors CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collectors') THEN
        DROP POLICY IF EXISTS "Collectors can view own record" ON collectors;
        DROP POLICY IF EXISTS "Collectors can update own record" ON collectors;
        DROP POLICY IF EXISTS "Collectors can insert own record" ON collectors;
        DROP POLICY IF EXISTS "Admins can view all collectors" ON collectors;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sponsors') THEN
        DROP POLICY IF EXISTS "Sponsors can view own record" ON sponsors;
        DROP POLICY IF EXISTS "Sponsors can update own record" ON sponsors;
        DROP POLICY IF EXISTS "Sponsors can insert own record" ON sponsors;
        DROP POLICY IF EXISTS "Admins can view all sponsors" ON sponsors;
    END IF;
END $$;

-- Recreate donors table with proper structure
CREATE TABLE donors (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  reward_points INTEGER DEFAULT 0,
  membership_tier TEXT DEFAULT 'Bronze' CHECK (membership_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
  total_donations INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10,2) DEFAULT 0,
  last_donation TIMESTAMP WITH TIME ZONE,
  preferred_pickup_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view admin records" ON admins;
DROP POLICY IF EXISTS "Admins can insert own admin record" ON admins;

-- Admins policies
CREATE POLICY "Admins can view admin records" ON admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can insert own admin record" ON admins
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Donors policies (table was recreated above, so no need to drop policies)
CREATE POLICY "Donors can view own record" ON donors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Donors can update own record" ON donors
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Donors can insert own record" ON donors
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all donors" ON donors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Collectors policies
CREATE POLICY "Collectors can view own record" ON collectors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Collectors can update own record" ON collectors
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Collectors can insert own record" ON collectors
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all collectors" ON collectors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Sponsors policies
CREATE POLICY "Sponsors can view own record" ON sponsors
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Sponsors can update own record" ON sponsors
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sponsors can insert own record" ON sponsors
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all sponsors" ON sponsors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- =================================================================
-- 3. FUNCTIONS AND TRIGGERS
-- =================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at
  BEFORE UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collectors_updated_at
  BEFORE UPDATE ON collectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================================================
-- 4. CREATE DEFAULT ADMIN ACCOUNT
-- =================================================================

-- Insert default admin profile (run this after creating auth user)
-- Note: Replace the UUID with the actual auth.users UUID after creating the admin user
DO $$
DECLARE
  admin_uuid UUID;
BEGIN
  -- Check if admin already exists
  SELECT id INTO admin_uuid FROM profiles WHERE user_type = 'admin' LIMIT 1;
  
  IF admin_uuid IS NULL THEN
    -- Create a placeholder profile that can be updated later
    -- You'll need to update this with the actual UUID from auth.users
    INSERT INTO profiles (id, user_type, full_name, verification_status, is_active)
    VALUES (
      '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Placeholder UUID - UPDATE THIS
      'admin',
      'System Administrator',
      'verified',
      true
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO admins (id, role)
    VALUES (
      '5f48c5d8-31fd-459c-81e8-4c75347e7b57', -- Same UUID as above
      'super_admin'
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =================================================================
-- 5. HELPER VIEWS (OPTIONAL)
-- =================================================================

-- View for complete user information
CREATE OR REPLACE VIEW user_details AS
SELECT 
  p.id,
  p.user_type,
  p.full_name,
  p.phone,
  p.address,
  p.verification_status,
  p.is_active,
  p.created_at,
  CASE 
    WHEN p.user_type = 'donor' THEN d.reward_points
    WHEN p.user_type = 'collector' THEN c.total_collections
    ELSE NULL
  END as activity_score
FROM profiles p
LEFT JOIN donors d ON p.id = d.id
LEFT JOIN collectors c ON p.id = c.id
LEFT JOIN sponsors s ON p.id = s.id;

-- =================================================================
-- SETUP COMPLETE
-- =================================================================

-- Summary of what was created:
-- ✅ profiles table with proper RLS policies
-- ✅ donors table with id column and RLS policies  
-- ✅ collectors, admins, sponsors tables with RLS policies
-- ✅ Updated_at triggers for all tables
-- ✅ Default admin account placeholder
-- ✅ Helper views for user management

-- Next steps:
-- 1. Create admin user via Supabase Auth Dashboard or API
-- 2. Update the admin UUID in this script and re-run the admin creation section
-- 3. Test donor signup process
