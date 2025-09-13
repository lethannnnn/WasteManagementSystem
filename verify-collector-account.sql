-- Verify and create demo collector account if needed
-- This script checks if the collector1@mycycle.com account exists and creates it if missing

-- Check if the demo collector exists
DO $$
DECLARE
    user_exists BOOLEAN;
    collector_exists BOOLEAN;
    user_id_val VARCHAR(20);
BEGIN
    -- Check if user exists
    SELECT EXISTS(
        SELECT 1 FROM users WHERE email = 'collector1@mycycle.com'
    ) INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'User collector1@mycycle.com already exists';
        
        -- Get user ID
        SELECT user_id INTO user_id_val FROM users WHERE email = 'collector1@mycycle.com';
        
        -- Check if collector profile exists
        SELECT EXISTS(
            SELECT 1 FROM collectors WHERE user_id = user_id_val
        ) INTO collector_exists;
        
        IF collector_exists THEN
            RAISE NOTICE 'Collector profile exists for user %', user_id_val;
        ELSE
            RAISE NOTICE 'Creating missing collector profile for user %', user_id_val;
            INSERT INTO collectors (collector_id, user_id, vehicle_type, license_plate, status)
            VALUES (
                generate_custom_id('C', 'collector_id_seq'),
                user_id_val,
                'Van',
                'ABC1234',
                'Available'
            );
        END IF;
    ELSE
        RAISE NOTICE 'Creating demo collector account...';
        
        -- Create complete user with collector profile
        user_id_val := create_complete_user(
            'collector',
            'collector1@mycycle.com',
            '$2b$10$8K1p/a0dqFNH7rUiY2y3a.D7Q9Z5v6B8c4X2w1E9r7T6y5U4i3O2p', -- bcrypt hash for 'collector1'
            'Demo Collector User',
            '+60123456790'
        );
        
        -- Update collector with vehicle info
        UPDATE collectors SET 
            vehicle_type = 'Van',
            license_plate = 'ABC1234',
            status = 'Available'
        WHERE user_id = user_id_val;
        
        RAISE NOTICE 'Demo collector created with User ID: %', user_id_val;
    END IF;
END $$;

-- Display collector information
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    c.collector_id,
    c.vehicle_type,
    c.license_plate,
    c.status
FROM users u
JOIN collectors c ON u.user_id = c.user_id
WHERE u.email = 'collector1@mycycle.com';