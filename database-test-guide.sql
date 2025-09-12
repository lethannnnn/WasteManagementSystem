-- MyCycle+ Database Testing Guide
-- Execute these commands step by step in your Supabase SQL Editor

-- STEP 1: Check if database is ready for migration
-- This will show existing tables (should be empty for fresh start)
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%user%' OR tablename LIKE '%donor%' OR tablename LIKE '%profile%'
ORDER BY tablename;

-- STEP 2: After running complete-schema-migration.sql, verify all tables were created
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename IN ('users', 'donors', 'collectors', 'admins', 'sponsors', 
                     'addresses', 'routes', 'pickups', 'item_categories', 
                     'rewards', 'badges', 'notifications'))
ORDER BY tablename;

-- STEP 3: Check that all sequences were created
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- STEP 4: Verify functions were created
SELECT proname as function_name, pronargs as num_args
FROM pg_proc 
WHERE proname IN ('generate_custom_id', 'create_complete_user', 'auto_generate_id')
ORDER BY proname;

-- STEP 5: Test ID generation functions
SELECT 
    generate_custom_id('U', 'user_id_seq') as user_id,
    generate_custom_id('D', 'donor_id_seq') as donor_id,
    generate_custom_id('C', 'collector_id_seq') as collector_id;

-- STEP 6: Test complete user creation
SELECT create_complete_user(
    'donor',                                  -- user type
    'test.donor@mycycle.test',               -- email
    '$2b$10$hashedpasswordexample123456789', -- password hash (dummy)
    'Test Donor User',                       -- full name
    '+60123456789'                          -- phone
) AS new_user_id;

-- STEP 7: Verify the test user was created correctly
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.phone_number,
    u.email_verified,
    u.created_at,
    d.donor_id,
    d.points,
    d.membership_tier
FROM users u
JOIN donors d ON u.user_id = d.user_id
WHERE u.email = 'test.donor@mycycle.test';

-- STEP 8: Test creating different user types
SELECT create_complete_user('collector', 'test.collector@mycycle.test', '$2b$10$hashedpassword', 'Test Collector', '+60123456788') AS collector_user_id;
SELECT create_complete_user('sponsor', 'test.sponsor@mycycle.test', '$2b$10$hashedpassword', 'Test Sponsor Company', '+60123456787') AS sponsor_user_id;

-- STEP 9: Verify all user types were created
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    'donor' as user_type,
    d.donor_id as type_specific_id
FROM users u
JOIN donors d ON u.user_id = d.user_id
UNION ALL
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    'collector' as user_type,
    c.collector_id as type_specific_id
FROM users u
JOIN collectors c ON u.user_id = c.user_id
UNION ALL
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    'sponsor' as user_type,
    s.sponsor_id as type_specific_id
FROM users u
JOIN sponsors s ON u.user_id = s.user_id
ORDER BY user_type, email;

-- STEP 10: Test sample data insertion
SELECT count(*) as total_categories, 'item_categories' as table_name FROM item_categories
UNION ALL
SELECT count(*), 'badges' FROM badges
UNION ALL
SELECT count(*), 'rewards' FROM rewards
ORDER BY table_name;

-- STEP 11: Test automatic ID generation with manual inserts
-- Insert a test address (should auto-generate address_id)
INSERT INTO addresses (user_id, street_address, city, state, postal_code, is_primary)
SELECT user_id, '123 Test Street', 'Kuala Lumpur', 'KL', '50000', true
FROM users WHERE email = 'test.donor@mycycle.test';

-- Verify the address was created with auto-generated ID
SELECT address_id, street_address, city, is_primary 
FROM addresses 
WHERE street_address = '123 Test Street';

-- STEP 12: Test pickup creation workflow
-- Insert a test pickup
INSERT INTO pickups (donor_id, address_id, scheduled_date, scheduled_time, status)
SELECT 
    d.donor_id,
    a.address_id,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00:00',
    'Pending'
FROM donors d
JOIN users u ON d.user_id = u.user_id
JOIN addresses a ON u.user_id = a.user_id
WHERE u.email = 'test.donor@mycycle.test'
LIMIT 1;

-- Verify pickup was created
SELECT 
    p.pickup_id,
    p.scheduled_date,
    p.status,
    u.full_name as donor_name
FROM pickups p
JOIN donors d ON p.donor_id = d.donor_id
JOIN users u ON d.user_id = u.user_id
WHERE u.email = 'test.donor@mycycle.test';

-- STEP 13: Test foreign key relationships
-- This should work (valid foreign key)
INSERT INTO point_transactions (donor_id, transaction_type, points, description)
SELECT donor_id, 'Earned', 50, 'Test transaction'
FROM donors d
JOIN users u ON d.user_id = u.user_id
WHERE u.email = 'test.donor@mycycle.test';

-- Verify transaction was created
SELECT transaction_id, transaction_type, points, description, created_at
FROM point_transactions 
WHERE description = 'Test transaction';

-- STEP 14: Final verification - check all test data
SELECT 'SUCCESS: Database schema is working correctly!' as test_result
WHERE EXISTS (
    SELECT 1 FROM users WHERE email = 'test.donor@mycycle.test'
) AND EXISTS (
    SELECT 1 FROM donors d JOIN users u ON d.user_id = u.user_id WHERE u.email = 'test.donor@mycycle.test'
) AND EXISTS (
    SELECT 1 FROM addresses WHERE street_address = '123 Test Street'
) AND EXISTS (
    SELECT 1 FROM pickups p 
    JOIN donors d ON p.donor_id = d.donor_id 
    JOIN users u ON d.user_id = u.user_id 
    WHERE u.email = 'test.donor@mycycle.test'
);

-- STEP 15: Clean up test data (optional)
-- Uncomment to remove test data after successful testing
/*
DELETE FROM point_transactions WHERE description = 'Test transaction';
DELETE FROM pickups WHERE pickup_id IN (
    SELECT p.pickup_id FROM pickups p
    JOIN donors d ON p.donor_id = d.donor_id
    JOIN users u ON d.user_id = u.user_id
    WHERE u.email LIKE '%@mycycle.test'
);
DELETE FROM addresses WHERE street_address = '123 Test Street';
DELETE FROM donors WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE '%@mycycle.test');
DELETE FROM collectors WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE '%@mycycle.test');
DELETE FROM sponsors WHERE user_id IN (SELECT user_id FROM users WHERE email LIKE '%@mycycle.test');
DELETE FROM users WHERE email LIKE '%@mycycle.test';
*/