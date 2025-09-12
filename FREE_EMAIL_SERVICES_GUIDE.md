# Free Email Services Setup Guide for MyCycle+

## 🆓 Available Free Email Services

### 1. **EmailJS (Recommended for Frontend Apps)**
- **Free Tier**: 200 emails/month
- **Setup Time**: 5 minutes
- **Complexity**: Easy
- **Best For**: React Native apps

#### Setup Steps:
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Create free account
3. Add email service (Gmail recommended)
4. Create email template
5. Get credentials and update `emailService.js`

#### Template Variables:
```
{{to_name}} - Recipient name
{{verification_pin}} - 4-digit PIN
{{app_name}} - MyCycle+
```

---

### 2. **Resend (Developer-Friendly)**
- **Free Tier**: 3,000 emails/month, 100/day
- **Setup Time**: 10 minutes
- **Complexity**: Medium
- **Best For**: Modern apps with API

#### Installation:
```bash
npm install resend
```

#### Basic Setup:
```javascript
import { Resend } from 'resend';

const resend = new Resend('your-api-key');

export const sendPinEmailResend = async (email, pin, fullName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MyCycle+ <onboarding@yourdomain.com>',
      to: [email],
      subject: 'Verify Your MyCycle+ Account',
      html: `
        <h2>Welcome to MyCycle+, ${fullName}!</h2>
        <p>Your verification PIN is: <strong>${pin}</strong></p>
        <p>Enter this PIN in the app to complete registration.</p>
      `,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Resend error:', error);
    return false;
  }
};
```

---

### 3. **Brevo (formerly Sendinblue)**
- **Free Tier**: 300 emails/day
- **Setup Time**: 15 minutes
- **Complexity**: Medium
- **Best For**: Reliable delivery

#### Installation:
```bash
npm install sib-api-v3-sdk
```

## 🚀 Quick Start with EmailJS

### Step 1: EmailJS Account Setup
1. Visit [emailjs.com](https://www.emailjs.com/)
2. Sign up for free account
3. Verify your email

### Step 2: Add Email Service
1. Go to "Email Services"
2. Click "Add New Service"
3. Choose "Gmail" (easiest)
4. Follow OAuth setup
5. Note your **Service ID**

### Step 3: Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template:

```html
Subject: MyCycle+ - Verify Your Account

Hello {{to_name}},

Welcome to MyCycle+! 🌱

Your verification PIN is: {{verification_pin}}

Please enter this PIN in the app to complete your registration.

Thank you for joining our recycling community!

Best regards,
The MyCycle+ Team
```

4. Note your **Template ID**

### Step 4: Get Public Key
1. Go to "Account" > "General"
2. Copy your **Public Key**

### Step 5: Update Code
Replace these values in `emailService.js`:
```javascript
const EMAILJS_SERVICE_ID = 'service_7dpuhlt';
const EMAILJS_TEMPLATE_ID = 'template_46p7u7c';
const EMAILJS_PUBLIC_KEY = 'Xp7L5BOJxZ6mrcHWC';
```

### Step 6: Switch to Real Email
In `AuthScreen.js`, change:
```javascript
import { sendPinEmail } from './emailService'; // Use real EmailJS

// Then replace sendPinEmailDemo with sendPinEmail
const pinSent = await sendPinEmail(email, newPin, fullName);
```

---

## 📧 Production Email Template

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2d5a27; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f8f9fa; }
        .pin { font-size: 32px; font-weight: bold; color: #2d5a27; text-align: center; 
               background: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MyCycle+ 🌱</h1>
        </div>
        <div class="content">
            <h2>Welcome, {{to_name}}!</h2>
            <p>Thank you for joining our recycling community. To complete your registration, 
               please enter the verification PIN below in the app:</p>
            
            <div class="pin">{{verification_pin}}</div>
            
            <p>This PIN will expire in 10 minutes for security reasons.</p>
            
            <p>If you didn't request this verification, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2025 MyCycle+. Making recycling rewarding.</p>
        </div>
    </div>
</body>
</html>
```

---

## 🔧 Current Implementation Status

✅ **Demo Mode**: Shows PIN in alert (for testing)
🔄 **EmailJS Ready**: Package installed, service file created
⏳ **Production**: Requires EmailJS account setup

## Next Steps
1. Choose your preferred email service
2. Set up account and get credentials
3. Update `emailService.js` with your credentials
4. Test the email flow
5. Deploy to production!
