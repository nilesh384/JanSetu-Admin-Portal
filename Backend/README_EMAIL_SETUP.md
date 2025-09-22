# JanSetu Admin Portal - Email Configuration

## SMTP Configuration for Admin OTP

To enable email-based OTP for admin login, you need to configure the following environment variables in your `.env` file:

### Required Environment Variables

```env
# Email Configuration for Admin OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as `EMAIL_PASS`

### Other Email Providers

You can modify the email service configuration in `services/emailService.js`:

```javascript
// For other providers, change the service or use custom SMTP settings
this.transporter = nodemailer.createTransporter({
  host: 'smtp.yourdomain.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### Features

- ✅ 6-digit OTP generation
- ✅ 10-minute OTP expiration
- ✅ Rate limiting (3 attempts max)
- ✅ Beautiful HTML email template
- ✅ Automatic OTP cleanup
- ✅ Resend OTP functionality
- ✅ Professional email design

### API Endpoints

- `POST /api/v1/admin/send-otp` - Send OTP to admin email
- `POST /api/v1/admin/verify-otp` - Verify OTP and complete login

### Frontend Flow

1. Admin enters email
2. System sends OTP via email
3. Admin enters OTP
4. System verifies and logs in admin

### Security Notes

- OTPs are stored in memory (use Redis in production)
- 10-minute expiration for security
- Rate limiting prevents brute force attacks
- Email validation before OTP generation