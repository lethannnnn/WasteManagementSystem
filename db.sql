-- ============================================================================
-- MyCycle+ Reward-Based Recycling Management System - FIXED VERSION
-- Complete Database Schema for SQL Workbench ERD Generation
-- Fixed for MySQL syntax and dependency issues
-- ============================================================================

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS mycycle_plus;
CREATE DATABASE mycycle_plus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mycycle_plus;

-- ============================================================================
-- 1. CORE FOUNDATION TABLES (No Dependencies)
-- ============================================================================

-- Master Users Table
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    user_type ENUM('donor', 'collector', 'admin', 'sponsor') NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_image_url TEXT,
    verification_status ENUM('pending', 'verified', 'suspended') DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_type (user_type),
    INDEX idx_email (email),
    INDEX idx_verification_status (verification_status),
    INDEX idx_created_at (created_at)
);

-- Service Areas
CREATE TABLE service_areas (
    area_id INT PRIMARY KEY AUTO_INCREMENT,
    area_name VARCHAR(255) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postcode_range VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    service_fee DECIMAL(8,2) DEFAULT 0.00,
    max_collectors INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_area_name (area_name),
    INDEX idx_state (state),
    INDEX idx_is_active (is_active)
);

-- Vehicles
CREATE TABLE vehicles (
    vehicle_id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_type ENUM('Truck', 'Van', 'Motorcycle', 'Lorry') NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    make_model VARCHAR(255),
    year YEAR,
    capacity_kg DECIMAL(8,2),
    fuel_type ENUM('Petrol', 'Diesel', 'Electric', 'Hybrid'),
    status ENUM('active', 'maintenance', 'retired') DEFAULT 'active',
    last_maintenance DATE,
    next_maintenance_due DATE,
    insurance_expiry DATE,
    road_tax_expiry DATE,
    vehicle_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_license_plate (license_plate),
    INDEX idx_vehicle_type (vehicle_type),
    INDEX idx_status (status)
);

-- Item Categories
CREATE TABLE item_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    base_points_per_kg INT NOT NULL,
    icon_url TEXT,
    color_code VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    handling_instructions TEXT,
    environmental_impact JSON,
    sorting_priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_category_name (category_name),
    INDEX idx_is_active (is_active),
    INDEX idx_sorting_priority (sorting_priority)
);

-- Badges
CREATE TABLE badges (
    badge_id INT PRIMARY KEY AUTO_INCREMENT,
    badge_name VARCHAR(100) NOT NULL,
    description TEXT,
    criteria_text TEXT,
    icon_url TEXT,
    badge_color VARCHAR(7),
    rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common',
    points_required INT,
    category ENUM('milestone', 'achievement', 'streak', 'special') DEFAULT 'achievement',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_badge_name (badge_name),
    INDEX idx_rarity (rarity),
    INDEX idx_category (category),
    INDEX idx_is_active (is_active)
);

-- ============================================================================
-- 2. USER DEPENDENT TABLES (Depend on users table)
-- ============================================================================

-- Addresses
CREATE TABLE addresses (
    address_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postcode VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'Malaysia',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    address_type ENUM('home', 'office', 'commercial', 'other') DEFAULT 'home',
    is_primary BOOLEAN DEFAULT FALSE,
    access_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_postcode (postcode),
    INDEX idx_city_state (city, state),
    INDEX idx_coordinates (latitude, longitude)
);

-- Donors
CREATE TABLE donors (
    donor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    total_points INT DEFAULT 0,
    points_earned INT DEFAULT 0,
    points_spent INT DEFAULT 0,
    total_recycled_weight DECIMAL(10,2) DEFAULT 0.00,
    pickups_completed INT DEFAULT 0,
    current_rank INT,
    level_status ENUM('Beginner', 'Eco Warrior', 'Green Champion', 'Eco Legend') DEFAULT 'Beginner',
    preferred_pickup_time TIME,
    last_pickup_date DATE,
    notification_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_total_points (total_points),
    INDEX idx_current_rank (current_rank),
    INDEX idx_level_status (level_status),
    INDEX idx_last_pickup (last_pickup_date)
);

-- Collectors
CREATE TABLE collectors (
    collector_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    collector_code VARCHAR(10) UNIQUE NOT NULL,
    vehicle_id INT,
    service_area_id INT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_collections INT DEFAULT 0,
    employment_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    working_hours JSON,
    emergency_contact VARCHAR(20),
    last_active DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_collector_code (collector_code),
    INDEX idx_rating (rating),
    INDEX idx_employment_status (employment_status),
    INDEX idx_service_area (service_area_id),
    INDEX idx_vehicle_id (vehicle_id)
);

-- Admins
CREATE TABLE admins (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    role_type ENUM('super_admin', 'moderator', 'analyst') NOT NULL,
    permissions JSON,
    department VARCHAR(100),
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_role_type (role_type),
    INDEX idx_department (department)
);

-- Sponsors
CREATE TABLE sponsors (
    sponsor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    business_registration VARCHAR(50),
    industry VARCHAR(100),
    website_url TEXT,
    contact_person VARCHAR(255),
    partnership_type ENUM('reward_provider', 'waste_buyer', 'sustainability_partner') NOT NULL,
    partnership_status ENUM('pending', 'active', 'suspended', 'terminated') DEFAULT 'pending',
    partnership_start_date DATE,
    monthly_budget DECIMAL(10,2),
    brand_assets JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_company_name (company_name),
    INDEX idx_partnership_type (partnership_type),
    INDEX idx_partnership_status (partnership_status)
);

-- User Badges
CREATE TABLE user_badges (
    user_badge_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_displayed BOOLEAN DEFAULT TRUE,
    earning_context JSON,
    
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    INDEX idx_user_id (user_id),
    INDEX idx_badge_id (badge_id),
    INDEX idx_earned_at (earned_at)
);

-- Leaderboard
CREATE TABLE leaderboard (
    leaderboard_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all_time') NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    rank_position INT NOT NULL,
    total_points INT NOT NULL,
    total_weight_kg DECIMAL(10,2) DEFAULT 0.00,
    pickups_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_period (user_id, period_type, period_start),
    INDEX idx_period_type (period_type),
    INDEX idx_rank_position (rank_position),
    INDEX idx_total_points (total_points),
    INDEX idx_period_dates (period_start, period_end)
);

-- Notifications
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type ENUM('route_assigned', 'pickup_completed', 'reward_available', 'system_update', 'promotional', 'reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    category VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    is_pushed BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    action_url TEXT,
    action_data JSON,
    expires_at DATETIME,
    
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_is_read (is_read),
    INDEX idx_priority (priority),
    INDEX idx_sent_at (sent_at)
);

-- ============================================================================
-- 3. REWARDS SYSTEM TABLES (Depend on sponsors)
-- ============================================================================

-- Rewards
CREATE TABLE rewards (
    reward_id INT PRIMARY KEY AUTO_INCREMENT,
    sponsor_id INT NOT NULL,
    reward_name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INT NOT NULL,
    category ENUM('Transport', 'Food & Beverage', 'Lifestyle', 'Entertainment', 'Education', 'Technology') NOT NULL,
    stock_quantity INT,
    redeemed_count INT DEFAULT 0,
    image_url TEXT,
    terms_conditions TEXT,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    daily_limit INT,
    user_limit INT,
    cost_per_redemption DECIMAL(8,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sponsor_id (sponsor_id),
    INDEX idx_category (category),
    INDEX idx_points_required (points_required),
    INDEX idx_is_active (is_active),
    INDEX idx_valid_dates (valid_from, valid_until)
);

-- Redemptions
CREATE TABLE redemptions (
    redemption_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    reward_id INT NOT NULL,
    points_spent INT NOT NULL,
    redemption_code VARCHAR(20) UNIQUE NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'delivered', 'expired', 'cancelled', 'refunded') DEFAULT 'pending',
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    delivered_at DATETIME,
    expires_at DATETIME,
    delivery_method ENUM('email', 'sms', 'app_notification', 'physical'),
    delivery_details JSON,
    feedback_rating INT,
    feedback_comments TEXT,
    
    INDEX idx_redemption_code (redemption_code),
    INDEX idx_donor_id (donor_id),
    INDEX idx_reward_id (reward_id),
    INDEX idx_status (status),
    INDEX idx_redeemed_at (redeemed_at),
    CONSTRAINT chk_feedback_rating CHECK (feedback_rating BETWEEN 1 AND 5)
);

-- ============================================================================
-- 4. ROUTE AND PICKUP SYSTEM
-- ============================================================================

-- Routes
CREATE TABLE routes (
    route_id INT PRIMARY KEY AUTO_INCREMENT,
    collector_id INT NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    route_code VARCHAR(10) UNIQUE NOT NULL,
    route_date DATE NOT NULL,
    status ENUM('pending', 'active', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    total_stops INT DEFAULT 0,
    completed_stops INT DEFAULT 0,
    total_distance_km DECIMAL(8,2),
    estimated_duration TIME,
    actual_duration TIME,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    start_time DATETIME,
    end_time DATETIME,
    optimized_sequence JSON,
    route_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_route_code (route_code),
    INDEX idx_collector_id (collector_id),
    INDEX idx_route_date (route_date),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- QR Codes
CREATE TABLE qr_codes (
    qr_id INT PRIMARY KEY AUTO_INCREMENT,
    qr_code VARCHAR(50) UNIQUE NOT NULL,
    qr_data TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    scanned_at DATETIME,
    scanned_by_collector INT,
    scan_location_lat DECIMAL(10,8),
    scan_location_lng DECIMAL(11,8),
    
    INDEX idx_qr_code (qr_code),
    INDEX idx_is_used (is_used),
    INDEX idx_scanned_by (scanned_by_collector)
);

-- Pickups
CREATE TABLE pickups (
    pickup_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    route_id INT,
    address_id INT NOT NULL,
    pickup_code VARCHAR(15) UNIQUE NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_pickup_time DATETIME,
    status ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'missed') DEFAULT 'pending',
    total_weight_kg DECIMAL(8,2) DEFAULT 0.00,
    total_points_awarded INT DEFAULT 0,
    special_instructions TEXT,
    collector_notes TEXT,
    qr_code VARCHAR(50) UNIQUE,
    photos_before JSON,
    photos_after JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_pickup_code (pickup_code),
    INDEX idx_donor_id (donor_id),
    INDEX idx_route_id (route_id),
    INDEX idx_address_id (address_id),
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_status (status),
    INDEX idx_qr_code (qr_code)
);

-- Pickup Items
CREATE TABLE pickup_items (
    pickup_item_id INT PRIMARY KEY AUTO_INCREMENT,
    pickup_id INT NOT NULL,
    item_category_id INT NOT NULL,
    weight_kg DECIMAL(8,2) NOT NULL,
    condition_status ENUM('excellent', 'good', 'fair', 'poor', 'contaminated') DEFAULT 'good',
    points_per_kg INT,
    total_points INT,
    notes TEXT,
    verification_photos JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_pickup_id (pickup_id),
    INDEX idx_item_category (item_category_id),
    INDEX idx_condition_status (condition_status)
);

-- Point Transactions
CREATE TABLE point_transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    pickup_id INT,
    redemption_id INT,
    transaction_type ENUM('earn', 'spend', 'bonus', 'penalty', 'refund', 'adjustment') NOT NULL,
    points_amount INT NOT NULL,
    description VARCHAR(255),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_code VARCHAR(20),
    admin_notes TEXT,
    metadata JSON,
    
    INDEX idx_user_id (user_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_pickup_id (pickup_id),
    INDEX idx_redemption_id (redemption_id)
);

-- ============================================================================
-- 5. ANALYTICS AND REPORTING TABLES
-- ============================================================================

-- System Analytics
CREATE TABLE system_analytics (
    analytics_id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    metric_type ENUM('daily_summary', 'weekly_summary', 'monthly_summary') NOT NULL,
    total_pickups INT DEFAULT 0,
    total_weight_kg DECIMAL(10,2) DEFAULT 0.00,
    total_points_awarded INT DEFAULT 0,
    active_donors INT DEFAULT 0,
    active_collectors INT DEFAULT 0,
    new_registrations INT DEFAULT 0,
    redemptions_count INT DEFAULT 0,
    average_rating DECIMAL(3,2),
    revenue_generated DECIMAL(10,2),
    regional_breakdown JSON,
    category_breakdown JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_date_metric (date, metric_type),
    INDEX idx_date (date),
    INDEX idx_metric_type (metric_type)
);

-- Environmental Impact
CREATE TABLE environmental_impact (
    impact_id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    co2_saved_kg DECIMAL(10,2) DEFAULT 0.00,
    energy_saved_kwh DECIMAL(10,2) DEFAULT 0.00,
    water_saved_liters DECIMAL(10,2) DEFAULT 0.00,
    trees_equivalent INT DEFAULT 0,
    landfill_diverted_kg DECIMAL(10,2) DEFAULT 0.00,
    calculation_methodology JSON,
    impact_by_category JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_impact_date (date),
    INDEX idx_date (date)
);

-- Route Optimization
CREATE TABLE route_optimization (
    optimization_id INT PRIMARY KEY AUTO_INCREMENT,
    route_id INT NOT NULL,
    original_sequence JSON,
    optimized_sequence JSON,
    distance_saved_km DECIMAL(8,2),
    time_saved_minutes INT,
    algorithm_used VARCHAR(100),
    optimization_score DECIMAL(5,2),
    optimized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    optimization_parameters JSON,
    
    INDEX idx_route_id (route_id),
    INDEX idx_optimized_at (optimized_at),
    INDEX idx_algorithm_used (algorithm_used)
);

-- Sponsor Rewards Junction Table
CREATE TABLE sponsor_rewards (
    sponsor_reward_id INT PRIMARY KEY AUTO_INCREMENT,
    sponsor_id INT NOT NULL,
    reward_id INT NOT NULL,
    cost_per_redemption DECIMAL(8,2) NOT NULL,
    monthly_quota INT,
    redeemed_this_month INT DEFAULT 0,
    auto_renewal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_sponsor_reward (sponsor_id, reward_id),
    INDEX idx_sponsor_id (sponsor_id),
    INDEX idx_reward_id (reward_id)
);

-- Audit Log
CREATE TABLE audit_log (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(64) NOT NULL,
    record_id INT NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_action_type (action_type),
    INDEX idx_changed_at (changed_at),
    INDEX idx_changed_by (changed_by)
);

-- ============================================================================
-- 6. ADD ALL FOREIGN KEY CONSTRAINTS (After all tables are created)
-- ============================================================================

-- User related foreign keys
ALTER TABLE addresses ADD CONSTRAINT fk_addresses_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE donors ADD CONSTRAINT fk_donors_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE collectors ADD CONSTRAINT fk_collectors_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE collectors ADD CONSTRAINT fk_collectors_vehicle_id 
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL;

ALTER TABLE collectors ADD CONSTRAINT fk_collectors_service_area_id 
    FOREIGN KEY (service_area_id) REFERENCES service_areas(area_id) ON DELETE SET NULL;

ALTER TABLE admins ADD CONSTRAINT fk_admins_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE sponsors ADD CONSTRAINT fk_sponsors_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Badge relationships
ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE user_badges ADD CONSTRAINT fk_user_badges_badge_id 
    FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE;

-- Leaderboard and notifications
ALTER TABLE leaderboard ADD CONSTRAINT fk_leaderboard_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Rewards system foreign keys
ALTER TABLE rewards ADD CONSTRAINT fk_rewards_sponsor_id 
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id) ON DELETE CASCADE;

ALTER TABLE redemptions ADD CONSTRAINT fk_redemptions_donor_id 
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE;

ALTER TABLE redemptions ADD CONSTRAINT fk_redemptions_reward_id 
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE;

-- Route and pickup foreign keys
ALTER TABLE routes ADD CONSTRAINT fk_routes_collector_id 
    FOREIGN KEY (collector_id) REFERENCES collectors(collector_id) ON DELETE CASCADE;

ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_codes_scanned_by_collector 
    FOREIGN KEY (scanned_by_collector) REFERENCES collectors(collector_id) ON DELETE SET NULL;

ALTER TABLE pickups ADD CONSTRAINT fk_pickups_donor_id 
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE;

ALTER TABLE pickups ADD CONSTRAINT fk_pickups_route_id 
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE SET NULL;

ALTER TABLE pickups ADD CONSTRAINT fk_pickups_address_id 
    FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE CASCADE;

ALTER TABLE pickups ADD CONSTRAINT fk_pickups_qr_code 
    FOREIGN KEY (qr_code) REFERENCES qr_codes(qr_code) ON DELETE SET NULL;

ALTER TABLE pickup_items ADD CONSTRAINT fk_pickup_items_pickup_id 
    FOREIGN KEY (pickup_id) REFERENCES pickups(pickup_id) ON DELETE CASCADE;

ALTER TABLE pickup_items ADD CONSTRAINT fk_pickup_items_item_category_id 
    FOREIGN KEY (item_category_id) REFERENCES item_categories(category_id) ON DELETE CASCADE;

-- Point transactions foreign keys
ALTER TABLE point_transactions ADD CONSTRAINT fk_point_transactions_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE point_transactions ADD CONSTRAINT fk_point_transactions_pickup_id 
    FOREIGN KEY (pickup_id) REFERENCES pickups(pickup_id) ON DELETE SET NULL;

ALTER TABLE point_transactions ADD CONSTRAINT fk_point_transactions_redemption_id 
    FOREIGN KEY (redemption_id) REFERENCES redemptions(redemption_id) ON DELETE SET NULL;

-- Analytics foreign keys
ALTER TABLE route_optimization ADD CONSTRAINT fk_route_optimization_route_id 
    FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE;

-- Junction table foreign keys
ALTER TABLE sponsor_rewards ADD CONSTRAINT fk_sponsor_rewards_sponsor_id 
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id) ON DELETE CASCADE;

ALTER TABLE sponsor_rewards ADD CONSTRAINT fk_sponsor_rewards_reward_id 
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE;

-- Audit log foreign key
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_log_changed_by 
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- ============================================================================
-- 7. INSERT SAMPLE DATA
-- ============================================================================

-- Sample Service Areas
INSERT INTO service_areas (area_name, state, postcode_range, is_active, max_collectors) VALUES
('Kuala Lumpur Central', 'Kuala Lumpur', '50000-59999', TRUE, 15),
('Petaling Jaya', 'Selangor', '46000-47999', TRUE, 12),
('Subang Jaya', 'Selangor', '47500-47800', TRUE, 10),
('Shah Alam', 'Selangor', '40000-40999', TRUE, 8);

-- Sample Item Categories
INSERT INTO item_categories (category_name, description, base_points_per_kg, color_code, is_active) VALUES
('Plastic Bottles', 'PET plastic bottles and containers', 10, '#4CAF50', TRUE),
('Paper', 'Newspapers, magazines, office paper', 5, '#2196F3', TRUE),
('Cardboard', 'Corrugated cardboard and packaging', 3, '#FF9800', TRUE),
('Glass', 'Glass bottles and jars', 8, '#9C27B0', TRUE),
('Metal Cans', 'Aluminum and steel cans', 15, '#607D8B', TRUE),
('Electronics', 'Small electronic devices and components', 25, '#F44336', TRUE);

-- Sample Vehicles
INSERT INTO vehicles (vehicle_type, license_plate, make_model, year, capacity_kg, fuel_type, status) VALUES
('Truck', 'WA1234B', 'Toyota Dyna', 2020, 3000.00, 'Diesel', 'active'),
('Van', 'WB5678C', 'Nissan NV200', 2021, 1500.00, 'Petrol', 'active'),
('Truck', 'WC9012D', 'Isuzu NPR', 2019, 4000.00, 'Diesel', 'active');

-- Sample Badges
INSERT INTO badges (badge_name, description, criteria_text, rarity, points_required, category) VALUES
('First Pickup', 'Completed your first recycling pickup', 'Complete 1 pickup', 'common', 0, 'milestone'),
('Recycling Hero', 'Completed 10 pickups', 'Complete 10 pickups', 'uncommon', 500, 'achievement'),
('Green Champion', 'Earned 1000 points', 'Earn 1000 total points', 'rare', 1000, 'milestone'),
('Eco Warrior', 'Completed 50 pickups', 'Complete 50 pickups', 'epic', 2500, 'achievement'),
('Eco Legend', 'Top 10 on leaderboard', 'Reach top 10 ranking', 'legendary', 5000, 'special');

-- ============================================================================
-- 8. CREATE VIEWS
-- ============================================================================

-- User Summary View
CREATE VIEW user_summary AS
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.user_type,
    u.verification_status,
    u.is_active,
    CASE 
        WHEN u.user_type = 'donor' THEN COALESCE(d.total_points, 0)
        WHEN u.user_type = 'collector' THEN COALESCE(c.total_collections * 10, 0)
        ELSE 0
    END AS activity_score,
    u.created_at
FROM users u
LEFT JOIN donors d ON u.user_id = d.user_id
LEFT JOIN collectors c ON u.user_id = c.user_id;

-- Active Pickups View
CREATE VIEW active_pickups AS
SELECT 
    p.pickup_id,
    p.pickup_code,
    u.full_name AS donor_name,
    CONCAT(a.address_line_1, ', ', a.city) AS pickup_address,
    p.scheduled_date,
    p.scheduled_time,
    p.status,
    COALESCE(r.route_name, 'Not Assigned') AS route_name,
    COALESCE(cu.full_name, 'Not Assigned') AS collector_name
FROM pickups p
JOIN donors d ON p.donor_id = d.donor_id
JOIN users u ON d.user_id = u.user_id
JOIN addresses a ON p.address_id = a.address_id
LEFT JOIN routes r ON p.route_id = r.route_id
LEFT JOIN collectors c ON r.collector_id = c.collector_id
LEFT JOIN users cu ON c.user_id = cu.user_id
WHERE p.status IN ('pending', 'assigned', 'in_progress');

-- ============================================================================
-- 9. CREATE PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_pickups_donor_status_date ON pickups(donor_id, status, scheduled_date);
CREATE INDEX idx_routes_collector_date ON routes(collector_id, route_date);
CREATE INDEX idx_transactions_user_type_date ON point_transactions(user_id, transaction_type, transaction_date);
CREATE INDEX idx_redemptions_donor_status ON redemptions(donor_id, status);
CREATE INDEX idx_user_badges_user_earned ON user_badges(user_id, earned_at);

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================

-- Show all tables created
SHOW TABLES;

-- Display foreign key relationships
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'mycycle_plus'
ORDER BY TABLE_NAME, CONSTRAINT_NAME; 