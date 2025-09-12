-- Users Table: Stores basic information for all user types
CREATE TABLE users (
    user_id VARCHAR(20) PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    profile_image_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Donors Table: Stores donor-specific information
CREATE TABLE donors (
    donor_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE REFERENCES users(user_id),
    points_earned INT DEFAULT 0,
    total_recycled_kg DECIMAL(10, 2) DEFAULT 0.00,
    pickups_completed INT DEFAULT 0,
    current_rank INT,
    level_status VARCHAR(20) DEFAULT 'Beginner',
    preferred_pickup_time TIME,
    last_pickup_date DATE,
    notification_preferences JSON
);

-- Service Areas Table: Defines geographical areas for collection
CREATE TABLE service_areas (
    area_id VARCHAR(20) PRIMARY KEY,
    area_name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    postcode_range VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    max_collectors INT
);

-- Vehicles Table: Stores information about collection vehicles
CREATE TABLE vehicles (
    vehicle_id VARCHAR(20) PRIMARY KEY,
    vehicle_type VARCHAR(30),
    license_plate VARCHAR(20) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    last_maintenance DATE,
    next_maintenance_due DATE,
    insurance_expiry DATE,
    road_tax_expiry DATE,
    vehicle_details JSON
);

-- Collectors Table: Stores collector-specific information
CREATE TABLE collectors (
    collector_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE REFERENCES users(user_id),
    vehicle_id VARCHAR(20) REFERENCES vehicles(vehicle_id),
    service_area_id VARCHAR(20) REFERENCES service_areas(area_id),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    total_collections INT DEFAULT 0,
    employment_status VARCHAR(20),
    on_time_rate DECIMAL(5, 2) DEFAULT 100.00,
    last_active TIMESTAMPTZ
);

-- Admins Table: Stores admin-specific information
CREATE TABLE admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE REFERENCES users(user_id),
    role_type VARCHAR(30),
    permissions JSON,
    department VARCHAR(100)
);

-- Sponsors Table: Stores sponsor-specific information
CREATE TABLE sponsors (
    sponsor_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE REFERENCES users(user_id),
    company_name VARCHAR(255) NOT NULL,
    business_registration VARCHAR(50),
    industry VARCHAR(100),
    website_url VARCHAR(500),
    contact_person VARCHAR(255),
    branding_materials JSON
);

-- Addresses Table: Stores user addresses
CREATE TABLE addresses (
    address_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    address_line_1 VARCHAR(255),
    address_line_2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postcode VARCHAR(10),
    country VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address_type VARCHAR(20),
    is_primary BOOLEAN,
    access_instructions TEXT
);

-- Routes Table: Defines collection routes
CREATE TABLE routes (
    route_id VARCHAR(20) PRIMARY KEY,
    collector_id VARCHAR(20) REFERENCES collectors(collector_id),
    route_name VARCHAR(255),
    route_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    total_stops INT,
    completed_stops INT DEFAULT 0,
    total_distance_km DECIMAL(8, 2),
    estimated_duration_min INT,
    optimized_path JSON,
    route_notes TEXT
);

-- Pickups Table: Stores pickup request information
CREATE TABLE pickups (
    pickup_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) REFERENCES donors(donor_id),
    route_id VARCHAR(20) REFERENCES routes(route_id),
    address_id VARCHAR(20) REFERENCES addresses(address_id),
    scheduled_date DATE,
    scheduled_time TIME,
    actual_pickup_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    total_weight_kg DECIMAL(8, 2),
    total_points_awarded INT,
    special_instructions TEXT,
    collector_rating INT,
    feedback TEXT
);

-- Item Categories Table: Defines categories for recyclable items
CREATE TABLE item_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(100),
    description TEXT,
    handling_instructions TEXT,
    environmental_impact JSON,
    sorting_priority INT
);

-- Pickup Items Table: Stores details of items in a pickup
CREATE TABLE pickup_items (
    pickup_item_id VARCHAR(20) PRIMARY KEY,
    pickup_id VARCHAR(20) REFERENCES pickups(pickup_id),
    item_category_id VARCHAR(20) REFERENCES item_categories(category_id),
    weight_kg DECIMAL(8, 2),
    condition_status VARCHAR(20),
    points_per_kg INT,
    total_points INT,
    notes TEXT,
    verification_photos JSON
);

-- QR Codes Table: Stores QR codes for pickup verification
CREATE TABLE qr_codes (
    qr_id VARCHAR(20) PRIMARY KEY,
    pickup_id VARCHAR(20) REFERENCES pickups(pickup_id),
    qr_code VARCHAR(255),
    qr_data TEXT,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_used BOOLEAN DEFAULT false,
    scanned_at TIMESTAMPTZ,
    scanned_by_collector VARCHAR(20) REFERENCES collectors(collector_id),
    scan_location_lat DECIMAL(10, 8),
    scan_location_lng DECIMAL(11, 8)
);

-- Point Transactions Table: Logs all point-related activities
CREATE TABLE point_transactions (
    transaction_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    transaction_type VARCHAR(20),
    points_amount INT,
    description VARCHAR(255),
    transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reference_code VARCHAR(50),
    admin_notes TEXT,
    metadata JSON
);

-- Rewards Table: Stores available rewards for redemption
CREATE TABLE rewards (
    reward_id VARCHAR(20) PRIMARY KEY,
    sponsor_id VARCHAR(20) REFERENCES sponsors(sponsor_id),
    reward_name VARCHAR(255),
    description TEXT,
    points_required INT,
    category VARCHAR(30),
    stock_quantity INT,
    is_active BOOLEAN,
    valid_from DATE,
    valid_to DATE,
    daily_limit INT,
    user_limit INT,
    cost_per_redemption DECIMAL(8, 2)
);

-- Sponsor Rewards Table: Links sponsors to the rewards they offer
CREATE TABLE sponsor_rewards (
    sponsor_reward_id VARCHAR(20) PRIMARY KEY,
    sponsor_id VARCHAR(20) REFERENCES sponsors(sponsor_id),
    reward_id VARCHAR(20) REFERENCES rewards(reward_id),
    cost_per_redemption DECIMAL(8, 2),
    monthly_quota INT,
    redeemed_this_month INT,
    auto_renewal BOOLEAN
);

-- Redemptions Table: Logs all reward redemptions by users
CREATE TABLE redemptions (
    redemption_id VARCHAR(20) PRIMARY KEY,
    donor_id VARCHAR(20) REFERENCES donors(donor_id),
    reward_id VARCHAR(20) REFERENCES rewards(reward_id),
    points_spent INT,
    status VARCHAR(20) DEFAULT 'pending',
    redeemed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    delivery_method VARCHAR(20),
    delivery_details TEXT,
    product_rating INT,
    product_feedback TEXT
);

-- Badges Table: Defines achievement badges
CREATE TABLE badges (
    badge_id VARCHAR(20) PRIMARY KEY,
    badge_name VARCHAR(100),
    description TEXT,
    criteria TEXT,
    icon_url VARCHAR(500),
    badge_color VARCHAR(10),
    rarity VARCHAR(20),
    points_required INT,
    category VARCHAR(30),
    is_active BOOLEAN,
    sort_order INT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User Badges Table: Tracks badges earned by users
CREATE TABLE user_badges (
    user_badge_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    badge_id VARCHAR(20) REFERENCES badges(badge_id),
    earned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_displayed BOOLEAN
);

-- Leaderboards Table: Stores leaderboard data
CREATE TABLE leaderboards (
    leaderboard_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    period_type VARCHAR(20),
    period_start DATE,
    period_end DATE,
    rank_position INT,
    total_points INT,
    total_weight_kg DECIMAL(10, 2),
    pickups_count INT,
    last_updated TIMESTAMPTZ
);

-- Notifications Table: Stores user notifications
CREATE TABLE notifications (
    notification_id VARCHAR(20) PRIMARY KEY,
    user_id VARCHAR(20) REFERENCES users(user_id),
    notification_type VARCHAR(30),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    action_url VARCHAR(500),
    action_data JSON,
    expires_at TIMESTAMPTZ
);


-- Add FOREIGN KEY constraints with appropriate actions on delete/update

-- Donors to Users
ALTER TABLE donors
ADD CONSTRAINT fk_donors_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Collectors to Users, Vehicles, Service Areas
ALTER TABLE collectors
ADD CONSTRAINT fk_collectors_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_collectors_vehicles FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_collectors_service_areas FOREIGN KEY (service_area_id) REFERENCES service_areas(area_id) ON DELETE SET NULL;

-- Admins to Users
ALTER TABLE admins
ADD CONSTRAINT fk_admins_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Sponsors to Users
ALTER TABLE sponsors
ADD CONSTRAINT fk_sponsors_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Addresses to Users
ALTER TABLE addresses
ADD CONSTRAINT fk_addresses_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Routes to Collectors
ALTER TABLE routes
ADD CONSTRAINT fk_routes_collectors FOREIGN KEY (collector_id) REFERENCES collectors(collector_id) ON DELETE SET NULL;

-- Pickups to Donors, Routes, Addresses
ALTER TABLE pickups
ADD CONSTRAINT fk_pickups_donors FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_pickups_routes FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE SET NULL,
ADD CONSTRAINT fk_pickups_addresses FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL;

-- Pickup Items to Pickups, Item Categories
ALTER TABLE pickup_items
ADD CONSTRAINT fk_pickup_items_pickups FOREIGN KEY (pickup_id) REFERENCES pickups(pickup_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_pickup_items_categories FOREIGN KEY (item_category_id) REFERENCES item_categories(category_id) ON DELETE RESTRICT;

-- QR Codes to Pickups, Collectors
ALTER TABLE qr_codes
ADD CONSTRAINT fk_qr_codes_pickups FOREIGN KEY (pickup_id) REFERENCES pickups(pickup_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_qr_codes_collectors FOREIGN KEY (scanned_by_collector) REFERENCES collectors(collector_id) ON DELETE SET NULL;

-- Point Transactions to Users
ALTER TABLE point_transactions
ADD CONSTRAINT fk_point_transactions_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Rewards to Sponsors
ALTER TABLE rewards
ADD CONSTRAINT fk_rewards_sponsors FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id) ON DELETE CASCADE;

-- Sponsor Rewards to Sponsors, Rewards
ALTER TABLE sponsor_rewards
ADD CONSTRAINT fk_sponsor_rewards_sponsors FOREIGN KEY (sponsor_id) REFERENCES sponsors(sponsor_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_sponsor_rewards_rewards FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE;

-- Redemptions to Donors, Rewards
ALTER TABLE redemptions
ADD CONSTRAINT fk_redemptions_donors FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_redemptions_rewards FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE;

-- User Badges to Users, Badges
ALTER TABLE user_badges
ADD CONSTRAINT fk_user_badges_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
ADD CONSTRAINT fk_user_badges_badges FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE;

-- Leaderboards to Users
ALTER TABLE leaderboards
ADD CONSTRAINT fk_leaderboards_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Notifications to Users
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;


-- Add CHECK constraints to validate data values

-- Users Table
ALTER TABLE users
ADD CONSTRAINT chk_user_type CHECK (user_type IN ('donor', 'collector', 'admin', 'sponsor'));

-- Donors Table
ALTER TABLE donors
ADD CONSTRAINT chk_points_earned CHECK (points_earned >= 0),
ADD CONSTRAINT chk_total_recycled_kg CHECK (total_recycled_kg >= 0);

-- Collectors Table
ALTER TABLE collectors
ADD CONSTRAINT chk_rating CHECK (rating >= 0 AND rating <= 5);

-- Pickups Table
ALTER TABLE pickups
ADD CONSTRAINT chk_collector_rating CHECK (collector_rating >= 1 AND collector_rating <= 5);

-- Pickup Items Table
ALTER TABLE pickup_items
ADD CONSTRAINT chk_weight_kg CHECK (weight_kg > 0);

-- Point Transactions Table
ALTER TABLE point_transactions
ADD CONSTRAINT chk_transaction_type CHECK (transaction_type IN ('credit', 'debit'));

-- Rewards Table
ALTER TABLE rewards
ADD CONSTRAINT chk_points_required CHECK (points_required >= 0),
ADD CONSTRAINT chk_stock_quantity CHECK (stock_quantity >= 0);

-- Redemptions Table
ALTER TABLE redemptions
ADD CONSTRAINT chk_points_spent CHECK (points_spent > 0),
ADD CONSTRAINT chk_product_rating CHECK (product_rating >= 1 AND product_rating <= 5);


-- Sample Users
INSERT INTO users (user_id, user_type, email, password_hash, full_name, phone, verification_status, is_active) VALUES
('U001', 'donor', 'ahmad.r@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye...', 'Ahmad Rahman', '+60123456789', 'verified', true),
('U002', 'donor', 'siti.n@gmail.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye...', 'Siti Nurhaliza', '+60134567890', 'verified', true),
('U003', 'collector', 'raj.k@mycycle.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye...', 'Raj Kumar', '+60145678901', 'verified', true),
('U004', 'admin', 'admin@mycycle.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye...', 'Admin MyCycle', '+60156789012', 'verified', true),
('U005', 'sponsor', 'sponsor@company.com', '$2b$10$N9qo8uLOickgx2ZMRZoMye...', 'Grab Malaysia', '+60167890123', 'verified', true);

-- Sample Donors
INSERT INTO donors (donor_id, user_id, points_earned, total_recycled_kg, pickups_completed) VALUES
('D001', 'U001', 1250, 45.2, 12),
('D002', 'U002', 2850, 89.5, 25);

-- Sample Service Area
INSERT INTO service_areas (area_id, area_name, state, postcode_range, is_active, max_collectors) VALUES
('AREA001', 'Kuala Lumpur Central', 'Kuala Lumpur', '50000-55000', true, 10);

-- Sample Vehicle
INSERT INTO vehicles (vehicle_id, vehicle_type, license_plate, status) VALUES
('V001', 'Truck', 'WA1234B', 'active');

-- Sample Collector
INSERT INTO collectors (collector_id, user_id, vehicle_id, service_area_id, rating, total_collections, employment_status) VALUES
('C001', 'U003', 'V001', 'AREA001', 4.8, 156, 'full-time');

-- Sample Admin
INSERT INTO admins (admin_id, user_id, role_type, department) VALUES
('A001', 'U004', 'super_admin', 'Operations');

-- Sample Sponsor
INSERT INTO sponsors (sponsor_id, user_id, company_name, industry) VALUES
('S001', 'U005', 'Grab', 'Transport');

-- Sample Address
INSERT INTO addresses (address_id, user_id, address_line_1, city, state, postcode, country, address_type, is_primary) VALUES
('ADD001', 'U001', '123 Jalan Hijau', 'Kuala Lumpur', 'Kuala Lumpur', '50480', 'Malaysia', 'home', true);

-- Sample Item Categories
INSERT INTO item_categories (category_id, category_name, description) VALUES
('IC001', 'Plastic', 'PET, HDPE bottles'),
('IC002', 'Paper', 'Newspapers, magazines, cardboard'),
('IC003', 'Metal', 'Aluminum cans, steel cans'),
('IC004', 'Glass', 'Glass bottles and jars');

-- Sample Pickup
INSERT INTO pickups (pickup_id, donor_id, address_id, scheduled_date, scheduled_time, status, total_weight_kg, total_points_awarded) VALUES
('PU001', 'D001', 'ADD001', '2025-07-22', '10:00:00', 'completed', 5.5, 50);

-- Sample Pickup Items
INSERT INTO pickup_items (pickup_item_id, pickup_id, item_category_id, weight_kg, points_per_kg, total_points) VALUES
('PI001', 'PU001', 'IC001', 2.0, 10, 20),
('PI002', 'PU001', 'IC002', 3.5, 8, 28);

-- Sample Reward
INSERT INTO rewards (reward_id, sponsor_id, reward_name, description, points_required, category, stock_quantity, is_active) VALUES
('R001', 'S001', 'RM10 Grab Voucher', 'RM10 voucher for Grab rides', 100, 'Transport', 50, true);

-- Sample Redemption
INSERT INTO redemptions (redemption_id, donor_id, reward_id, points_spent, status) VALUES
('REDEMPT001', 'D001', 'R001', 100, 'delivered');

-- Sample Point Transaction
INSERT INTO point_transactions (transaction_id, user_id, transaction_type, points_amount, description) VALUES
('TXN001', 'U001', 'credit', 50, 'Points from pickup PU001'),
('TXN002', 'U001', 'debit', -100, 'Redeemed RM10 Grab Voucher');
