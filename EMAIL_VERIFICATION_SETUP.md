# PIN-Based Email Verification System

## Overview
The donor signup process now uses a 4-digit PIN verification instead of email links. This provides a better user experience and higher security.

## How It Works

### 1. Donor Signup Flow
1. User fills out the signup form (email, password, full name, phone)
2. System generates a random 4-digit PIN
3. PIN is sent to the user's email address
4. User enters the PIN in the verification screen
5. Once verified, the account is created and activated

### 2. Current Implementation
- **PIN Generation**: Random 4-digit number (1000-9999)
- **PIN Display**: Currently shown in an alert for demo purposes
- **PIN Verification**: User must enter exact PIN to complete signup
- **Account Creation**: Only happens after successful PIN verification

### 3. Production Email Integration
For production, replace the `sendPinEmail` function with actual email service:

```javascript
const sendPinEmail = async (email, pin, fullName) => {
  // Replace with your email service (SendGrid, AWS SES, etc.)
  const emailService = new YourEmailService();
  
  await emailService.send({
    to: email,
    subject: 'MyCycle+ - Verify Your Account',
    html: `
      <h2>Welcome to MyCycle+, ${fullName}!</h2>
      <p>Your verification PIN is: <strong>${pin}</strong></p>
      <p>Enter this PIN in the app to complete your registration.</p>
    `
  });
};
```

### 4. Admin Account Setup (Unchanged)
1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **"Add user"**
3. Create admin user with:
   - Email: `admin@mycycle.com`
   - Password: `Admin123!`
   - **Auto Confirm User**: YES (enable this for admin)
4. Run the SQL script in `setup-default-admin.sql`

### 5. Benefits of PIN System
- ✅ **Better UX**: No need to leave the app
- ✅ **Faster**: Immediate verification without clicking links
- ✅ **More Secure**: PIN expires and is single-use
- ✅ **Mobile Friendly**: Works well on mobile devices
- ✅ **Offline Capable**: User can reference email offline

### 6. Security Features
- PIN is randomly generated (1000-9999)
- PIN is temporary and single-use
- User data is stored temporarily until verification
- Account is only created after successful PIN verification
5. Profile and donor records are created automatically
6. User can now use the app

The app will handle all the profile creation automatically when the user returns from email verification.
