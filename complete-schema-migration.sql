-- MyCycle+ Complete Database Schema Implementation
-- Based on the comprehensive ERD provided by the user

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.leaderboards CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.redemptions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.point_transactions CASCADE;
DROP TABLE IF EXISTS public.qr_codes CASCADE;
DROP TABLE IF EXISTS public.pickup_items CASCADE;
DROP TABLE IF EXISTS public.item_categories CASCADE;
DROP TABLE IF EXISTS public.pickups CASCADE;
DROP TABLE IF EXISTS public.route_assignments CASCADE;
DROP TABLE IF EXISTS public.routes CASCADE;
DROP TABLE IF EXISTS public.addresses CASCADE;
DROP TABLE IF EXISTS public.sponsors CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.collectors CASCADE;
DROP TABLE IF EXISTS public.donors CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create sequences for ID generation
CREATE SEQUENCE IF NOT EXISTS user_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS donor_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS collector_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS admin_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sponsor_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS address_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS route_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS pickup_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS category_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS qr_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS transaction_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS reward_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS redemption_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS badge_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS leaderboard_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS notification_id_seq START 1;

-- Function to generate custom IDs
CREATE OR REPLACE FUNCTION generate_custom_id(prefix TEXT, sequence_name TEXT)
RETURNS VARCHAR(20) AS $$
DECLARE
    next_val INTEGER;
    custom_id VARCHAR(20);
BEGIN
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_val;
    custom_id := prefix || LPAD(next_val::TEXT, 3, '0');
    RETURN custom_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create complete user with role-specific profile
CREATE OR REPLACE FUNCTION create_complete_user(
    p_user_type TEXT,
    p_email TEXT,
    p_password_hash TEXT,
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_user_id VARCHAR(20);
    v_donor_id VARCHAR(20);
    v_collector_id VARCHAR(20);
    v_admin_id VARCHAR(20);
    v_sponsor_id VARCHAR(20);
BEGIN
    -- Generate user ID
    v_user_id := generate_custom_id('U', 'user_id_seq');
    
    -- Insert into users table
    INSERT INTO users (user_id, email, password_hash, full_name, phone_number)
    VALUES (v_user_id, p_email, p_password_hash, p_full_name, p_phone);
    
    -- Create role-specific profile
    CASE p_user_type
        WHEN 'donor' THEN
            v_donor_id := generate_custom_id('D', 'donor_id_seq');
            INSERT INTO donors (donor_id, user_id) VALUES (v_donor_id, v_user_id);
        WHEN 'collector' THEN
            v_collector_id := generate_custom_id('C', 'collector_id_seq');
            INSERT INTO collectors (collector_id, user_id) VALUES (v_collector_id, v_user_id);
        WHEN 'admin' THEN
            v_admin_id := generate_custom_id('A', 'admin_id_seq');
            INSERT INTO admins (admin_id, user_id) VALUES (v_admin_id, v_user_id);
        WHEN 'sponsor' THEN
            v_sponsor_id := generate_custom_id('S', 'sponsor_id_seq');
            INSERT INTO sponsors (sponsor_id, user_id) VALUES (v_sponsor_id, v_user_id);
        ELSE
            RAISE EXCEPTION 'Invalid user type: %', p_user_type;
    END CASE;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for automatic ID generation
CREATE OR REPLACE FUNCTION auto_generate_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate IDs for different tables based on table name
    CASE TG_TABLE_NAME
        WHEN 'addresses' THEN
            NEW.address_id := generate_custom_id('ADDR', 'address_id_seq');
        WHEN 'routes' THEN
            NEW.route_id := generate_custom_id('R', 'route_id_seq');
        WHEN 'pickups' THEN
            NEW.pickup_id := generate_custom_id('P', 'pickup_id_seq');
        WHEN 'qr_codes' THEN
            NEW.qr_id := generate_custom_id('QR', 'qr_id_seq');
        WHEN 'point_transactions' THEN
            NEW.transaction_id := generate_custom_id('T', 'transaction_id_seq');
        WHEN 'redemptions' THEN
            NEW.redemption_id := generate_custom_id('RED', 'redemption_id_seq');
        WHEN 'user_badges' THEN
            NEW.user_badge_id := generate_custom_id('UB', 'badge_id_seq');
        WHEN 'leaderboards' THEN
            NEW.leaderboard_id := generate_custom_id('LB', 'leaderboard_id_seq');
        WHEN 'notifications' THEN
            NEW.notification_id := generate_custom_id('N', 'notification_id_seq');
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CORE TABLES

-- Users table (main authentication)
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    profile_picture TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_pin VARCHAR(6),
    pin_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_phone_format CHECK (phone_number ~* '^\+?[1-9]\d{1,14}$')
);

-- Donors table
CREATE TABLE donors (
    donor_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    total_donations INTEGER DEFAULT 0 CHECK (total_donations >= 0),
    membership_tier VARCHAR(20) DEFAULT 'Bronze' CHECK (membership_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Collectors table
CREATE TABLE collectors (
    collector_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50),
    license_plate VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'On Route', 'Off Duty')),
    current_route_id VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Admin' CHECK (role IN ('Admin', 'Super Admin', 'Manager')),
    permissions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sponsors table
CREATE TABLE sponsors (
    sponsor_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    sponsorship_tier VARCHAR(20) DEFAULT 'Bronze' CHECK (sponsorship_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    total_contribution DECIMAL(10,2) DEFAULT 0.00 CHECK (total_contribution >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LOCATION & ROUTING TABLES

-- Addresses table
CREATE TABLE addresses (
    address_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'Malaysia',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Routes table
CREATE TABLE routes (
    route_id VARCHAR(20) PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_location VARCHAR(255),
    end_location VARCHAR(255),
    estimated_duration INTEGER, -- in minutes
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Route assignments table
CREATE TABLE route_assignments (
    assignment_id VARCHAR(20) PRIMARY KEY,
    route_id VARCHAR(20) NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
    collector_id VARCHAR(20) NOT NULL REFERENCES collectors(collector_id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PICKUP & ITEM MANAGEMENT

-- Item categories table
CREATE TABLE item_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    points_per_kg INTEGER DEFAULT 10 CHECK (points_per_kg > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pickups table
CREATE TABLE pickups (
    pickup_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    collector_id VARCHAR(20) REFERENCES collectors(collector_id) ON DELETE SET NULL,
    address_id VARCHAR(20) NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')),
    total_weight DECIMAL(5,2) CHECK (total_weight >= 0),
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    notes TEXT,
    completion_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Pickup items table
CREATE TABLE pickup_items (
    item_id VARCHAR(20) PRIMARY KEY,
    pickup_id VARCHAR(20) NOT NULL REFERENCES pickups(pickup_id) ON DELETE CASCADE,
    category_id VARCHAR(20) NOT NULL REFERENCES item_categories(category_id) ON DELETE RESTRICT,
    weight DECIMAL(5,2) NOT NULL CHECK (weight > 0),
    points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QR codes table
CREATE TABLE qr_codes (
    qr_id VARCHAR(20) PRIMARY KEY,
    pickup_id VARCHAR(20) UNIQUE NOT NULL REFERENCES pickups(pickup_id) ON DELETE CASCADE,
    qr_code_data TEXT UNIQUE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- POINTS & REWARDS SYSTEM

-- Point transactions table
CREATE TABLE point_transactions (
    transaction_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    pickup_id VARCHAR(20) REFERENCES pickups(pickup_id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Earned', 'Redeemed', 'Bonus', 'Penalty')),
    points INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rewards table
CREATE TABLE rewards (
    reward_id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL CHECK (points_required > 0),
    category VARCHAR(100),
    image_url TEXT,
    terms_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Redemptions table
CREATE TABLE redemptions (
    redemption_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    reward_id VARCHAR(20) NOT NULL REFERENCES rewards(reward_id) ON DELETE RESTRICT,
    points_used INTEGER NOT NULL CHECK (points_used > 0),
    redemption_code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Used', 'Expired', 'Cancelled')),
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- GAMIFICATION SYSTEM

-- Badges table
CREATE TABLE badges (
    badge_id VARCHAR(20) PRIMARY KEY,
    badge_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    badge_icon TEXT,
    criteria TEXT NOT NULL,
    points_reward INTEGER DEFAULT 0 CHECK (points_reward >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User badges table
CREATE TABLE user_badges (
    user_badge_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    badge_id VARCHAR(20) NOT NULL REFERENCES badges(badge_id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(donor_id, badge_id)
);

-- Leaderboards table
CREATE TABLE leaderboards (
    leaderboard_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) NOT NULL REFERENCES donors(donor_id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL CHECK (period IN ('Weekly', 'Monthly', 'Yearly', 'All Time')),
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    total_donations INTEGER NOT NULL DEFAULT 0 CHECK (total_donations >= 0),
    rank_position INTEGER,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(donor_id, period, period_start)
);

-- COMMUNICATION SYSTEM

-- Notifications table
CREATE TABLE notifications (
    notification_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Pickup', 'Reward', 'Badge', 'System', 'Promotional')),
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_donors_points ON donors(points);
CREATE INDEX idx_donors_membership_tier ON donors(membership_tier);
CREATE INDEX idx_collectors_status ON collectors(status);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_is_primary ON addresses(is_primary);
CREATE INDEX idx_pickups_donor_id ON pickups(donor_id);
CREATE INDEX idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX idx_pickups_status ON pickups(status);
CREATE INDEX idx_pickups_scheduled_date ON pickups(scheduled_date);
CREATE INDEX idx_point_transactions_donor_id ON point_transactions(donor_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_redemptions_donor_id ON redemptions(donor_id);
CREATE INDEX idx_redemptions_status ON redemptions(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- CREATE TRIGGERS FOR AUTOMATIC ID GENERATION
CREATE TRIGGER trigger_auto_generate_address_id
    BEFORE INSERT ON addresses
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_route_id
    BEFORE INSERT ON routes
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_pickup_id
    BEFORE INSERT ON pickups
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_qr_id
    BEFORE INSERT ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_transaction_id
    BEFORE INSERT ON point_transactions
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_redemption_id
    BEFORE INSERT ON redemptions
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_user_badge_id
    BEFORE INSERT ON user_badges
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_leaderboard_id
    BEFORE INSERT ON leaderboards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

CREATE TRIGGER trigger_auto_generate_notification_id
    BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION auto_generate_id();

-- SAMPLE DATA INSERTION

-- Insert default item categories
INSERT INTO item_categories (category_id, category_name, description, points_per_kg) VALUES
('CAT001', 'Paper', 'Newspapers, magazines, office paper', 5),
('CAT002', 'Plastic', 'Bottles, containers, packaging', 8),
('CAT003', 'Metal', 'Aluminum cans, steel containers', 12),
('CAT004', 'Glass', 'Bottles, jars', 6),
('CAT005', 'Electronics', 'Old phones, computers, cables', 20),
('CAT006', 'Textiles', 'Clothes, fabric, shoes', 4);

-- Insert default badges
INSERT INTO badges (badge_id, badge_name, description, criteria, points_reward) VALUES
('BDG001', 'First Donation', 'Complete your first recycling pickup', 'Complete 1 pickup', 50),
('BDG002', 'Eco Warrior', 'Complete 10 recycling pickups', 'Complete 10 pickups', 100),
('BDG003', 'Green Champion', 'Earn 1000 points', 'Accumulate 1000 points', 200),
('BDG004', 'Plastic Fighter', 'Recycle 50kg of plastic', 'Recycle 50kg plastic', 150),
('BDG005', 'Metal Master', 'Recycle 25kg of metal', 'Recycle 25kg metal', 180);

-- Insert default rewards
INSERT INTO rewards (reward_id, title, description, points_required, category, stock_quantity) VALUES
('RWD001', 'RM5 Grab Voucher', 'RM5 discount for Grab rides', 100, 'Transportation', 100),
('RWD002', 'RM10 Shopee Voucher', 'RM10 discount for Shopee purchases', 200, 'Shopping', 50),
('RWD003', 'Eco-Friendly Tote Bag', 'Reusable canvas tote bag', 150, 'Merchandise', 25),
('RWD004', 'RM20 Restaurant Voucher', 'RM20 dining voucher at partner restaurants', 400, 'Food & Beverage', 30),
('RWD005', 'Premium Membership (1 Month)', 'One month of premium features', 500, 'Digital', 20);

-- Create default admin user
DO $$
DECLARE
    admin_user_id VARCHAR(20);
    admin_id VARCHAR(20);
BEGIN
    admin_user_id := generate_custom_id('U', 'user_id_seq');
    admin_id := generate_custom_id('A', 'admin_id_seq');
    
    -- Insert admin user
    INSERT INTO users (user_id, email, password_hash, full_name, phone_number, email_verified)
    VALUES (admin_user_id, 'admin@mycycleplus.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+60123456789', TRUE);
    
    -- Insert admin profile
    INSERT INTO admins (admin_id, user_id, role, permissions)
    VALUES (admin_id, admin_user_id, 'Super Admin', ARRAY['all']);
    
    RAISE NOTICE 'Default admin created with User ID: % and Admin ID: %', admin_user_id, admin_id;
END $$;