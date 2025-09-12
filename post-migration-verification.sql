-- POST-MIGRATION VERIFICATION
-- Run this AFTER executing complete-schema-migration.sql

-- Step 1: Verify all core tables were created
SELECT 'CORE TABLES CHECK' as test_category, 
       COUNT(*) as tables_created,
       CASE 
         WHEN COUNT(*) >= 20 THEN 'PASS ✅' 
         ELSE 'FAIL ❌' 
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'donors', 'collectors', 'admins', 'sponsors', 
                     'addresses', 'routes', 'pickups', 'item_categories', 
                     'rewards', 'badges', 'notifications', 'qr_codes',
                     'point_transactions', 'redemptions', 'user_badges',
                     'leaderboards', 'pickup_items', 'route_assignments');

-- Step 2: Test ID generation function
SELECT 'ID GENERATION TEST' as test_category,
       generate_custom_id('U', 'user_id_seq') as user_id,
       generate_custom_id('D', 'donor_id_seq') as donor_id,
       'PASS ✅' as status;

-- Step 3: Test complete user creation
SELECT 'USER CREATION TEST' as test_category,
       create_complete_user(
           'donor',
           'test.migration@mycycle.test',
           '$2b$10$hashedpasswordexample123456789',
           'Test Migration User',
           '+60123456789'
       ) as created_user_id,
       'PASS ✅' as status;

-- Step 4: Verify the test user was created correctly
SELECT 'USER VERIFICATION' as test_category,
       u.user_id,
       u.email,
       d.donor_id,
       d.points,
       'PASS ✅' as status
FROM users u
JOIN donors d ON u.user_id = d.user_id
WHERE u.email = 'test.migration@mycycle.test';

-- Step 5: Check sample data was inserted
SELECT 'SAMPLE DATA CHECK' as test_category,
       (SELECT COUNT(*) FROM item_categories) as categories,
       (SELECT COUNT(*) FROM badges) as badges,
       (SELECT COUNT(*) FROM rewards) as rewards,
       CASE 
         WHEN (SELECT COUNT(*) FROM item_categories) > 0 
          AND (SELECT COUNT(*) FROM badges) > 0 
          AND (SELECT COUNT(*) FROM rewards) > 0 
         THEN 'PASS ✅' 
         ELSE 'FAIL ❌' 
       END as status;

-- Step 6: Test foreign key relationships
INSERT INTO addresses (user_id, street_address, city, state, postal_code, is_primary)
SELECT user_id, '123 Migration Test St', 'Kuala Lumpur', 'KL', '50000', true
FROM users WHERE email = 'test.migration@mycycle.test';

SELECT 'FOREIGN KEY TEST' as test_category,
       address_id,
       street_address,
       'PASS ✅' as status
FROM addresses 
WHERE street_address = '123 Migration Test St';

-- FINAL RESULT
SELECT 'DATABASE MIGRATION' as final_result,
       'COMPLETED SUCCESSFULLY ✅' as status
WHERE EXISTS (
    SELECT 1 FROM users WHERE email = 'test.migration@mycycle.test'
) AND EXISTS (
    SELECT 1 FROM donors d JOIN users u ON d.user_id = u.user_id 
    WHERE u.email = 'test.migration@mycycle.test'
) AND (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('users', 'donors', 'collectors', 'admins')
) >= 4;