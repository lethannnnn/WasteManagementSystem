-- Test script to verify database setup and create a test donor account
-- Run this after executing the complete-schema-migration.sql

-- Test the create_complete_user function
SELECT create_complete_user(
    'donor',                                  -- user type
    'test.donor@example.com',                -- email
    '$2b$10$hashedpasswordexample123456789', -- password hash (dummy)
    'Test Donor User',                       -- full name
    '+60123456789'                          -- phone
) AS new_user_id;

-- Verify the user was created properly
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    u.phone_number,
    u.email_verified,
    d.donor_id,
    d.points,
    d.membership_tier
FROM users u
JOIN donors d ON u.user_id = d.user_id
WHERE u.email = 'test.donor@example.com';

-- Test all the sequences are working
SELECT 
    'user_id_seq' as sequence_name,
    currval('user_id_seq') as current_value
UNION ALL
SELECT 
    'donor_id_seq',
    currval('donor_id_seq')
UNION ALL
SELECT 
    'admin_id_seq',
    currval('admin_id_seq');

-- Verify sample data was inserted correctly
SELECT count(*) as total_categories FROM item_categories;
SELECT count(*) as total_badges FROM badges;
SELECT count(*) as total_rewards FROM rewards;

-- Test generating IDs manually
SELECT 
    generate_custom_id('D', 'donor_id_seq') as donor_id,
    generate_custom_id('C', 'collector_id_seq') as collector_id,
    generate_custom_id('A', 'admin_id_seq') as admin_id;