# MyCycle+ Database Testing Guide

## 📋 Testing Checklist

### Phase 1: Database Schema Testing

**Step 1: Execute Migration Script**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of `complete-schema-migration.sql`
4. Execute the script
5. Check for any error messages

**Step 2: Run Database Tests**
1. In Supabase SQL Editor, copy and paste `database-test-guide.sql`
2. Execute each step one by one (recommended) or all at once
3. Verify all tests pass with "SUCCESS" messages

**Expected Results:**
- ✅ All 20+ tables created (users, donors, collectors, etc.)
- ✅ All sequences created with correct naming
- ✅ Functions `generate_custom_id` and `create_complete_user` working
- ✅ Automatic ID generation working (U001, D001, C001, etc.)
- ✅ Foreign key relationships working
- ✅ Sample data inserted (categories, badges, rewards)

### Phase 2: Authentication System Testing

**Step 1: Test Custom Authentication**
1. In your donor mobile app, import the test script:
   ```javascript
   import { testAuthenticationSystem } from './authTestScript';
   ```
2. Run the test function:
   ```javascript
   testAuthenticationSystem();
   ```
3. Check console output for all ✅ success messages

**Step 2: Test Email Service**
1. Run the email verification test:
   ```javascript
   import { testEmailVerificationFlow } from './authTestScript';
   testEmailVerificationFlow();
   ```
2. Verify email is sent via Resend API

**Expected Results:**
- ✅ User registration creates entries in both `users` and `donors` tables
- ✅ Password hashing with bcryptjs working
- ✅ Login authentication successful
- ✅ Session management working
- ✅ Email verification status updates
- ✅ PIN email sending functional

### Phase 3: Integration Testing

**Step 1: Test Full Registration Flow**
1. Open your donor mobile app
2. Go through complete registration process:
   - Enter email, password, name, phone
   - Receive PIN via email
   - Enter PIN to verify
   - Complete registration
3. Verify account created in database

**Step 2: Test Login Flow**
1. Login with the registered account
2. Verify session is maintained
3. Test app functionality with authenticated user

**Step 3: Verify Database Consistency**
Run these queries in Supabase to verify data integrity:

```sql
-- Check user-donor relationship integrity
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    d.donor_id,
    d.points
FROM users u
LEFT JOIN donors d ON u.user_id = d.user_id
WHERE u.email LIKE '%@gmail.com' OR u.email LIKE '%@test%';

-- Verify ID format consistency
SELECT 
    'users' as table_name,
    user_id as id,
    email
FROM users
WHERE user_id ~ '^U[0-9]{3}$'
UNION ALL
SELECT 
    'donors',
    donor_id,
    NULL
FROM donors
WHERE donor_id ~ '^D[0-9]{3}$'
ORDER BY table_name, id;
```

## 🚨 Troubleshooting

### Common Issues & Solutions

**Issue: Migration fails with "relation already exists"**
- Solution: The script includes `DROP TABLE IF EXISTS` - this is normal

**Issue: Function `create_complete_user` not found**
- Solution: Make sure the migration script completed successfully
- Check: `SELECT proname FROM pg_proc WHERE proname = 'create_complete_user';`

**Issue: Authentication fails with "table doesn't exist"**
- Solution: Verify migration completed and tables were created
- Check: `\dt` in SQL editor to list all tables

**Issue: Email not sending**
- Solution: Verify Resend API key is correct in `emailService.js`
- Check: Console logs for specific Resend error messages

**Issue: IDs not generating correctly**
- Solution: Check sequences are created and triggers are active
- Test: `SELECT generate_custom_id('U', 'user_id_seq');`

## ✅ Success Criteria

Your database is properly set up when:

1. **Database Schema ✅**
   - All 20+ tables exist and are populated with sample data
   - Custom ID generation working (U001, D001, etc.)
   - Foreign key relationships intact

2. **Authentication System ✅**
   - User registration creates proper database entries
   - Login/logout functionality working
   - Session management functional
   - Email verification system operational

3. **Integration ✅**
   - Mobile app can register new users
   - Login process works end-to-end
   - Database queries return expected data
   - No console errors during normal operation

## 📊 Test Results Log

Create a copy of this section to track your test results:

### Database Migration
- [ ] Migration script executed successfully
- [ ] All tables created
- [ ] Functions and triggers working
- [ ] Sample data inserted

### Authentication Tests
- [ ] User registration working
- [ ] Login/logout functional
- [ ] Session management working
- [ ] Email verification working

### Integration Tests
- [ ] Mobile app registration flow
- [ ] Mobile app login flow
- [ ] Database consistency verified
- [ ] No errors in production

Date tested: ___________
Tested by: ___________
Notes: ___________