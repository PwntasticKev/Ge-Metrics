# 📧 Email Setup Guide - Ge-Metrics

## Overview

Ge-Metrics sends verification emails when users sign up for their free trial. This guide will help you set up email sending.

## ✅ Recommended: Resend (Easiest & Most Reliable)

**Resend** is a modern transactional email service with:
- ✅ **Free tier**: 3,000 emails/month, 100 emails/day
- ✅ **Easy setup**: Just an API key
- ✅ **Great deliverability**: Built for developers
- ✅ **No domain verification needed** for testing (uses `onboarding@resend.dev`)

### Setup Steps:

1. **Sign up for Resend**:
   - Go to https://resend.com
   - Create a free account
   - Navigate to API Keys section

2. **Get your API key**:
   - Click "Create API Key"
   - Name it (e.g., "Ge-Metrics Production")
   - Copy the API key (starts with `re_`)

3. **Add to Vercel Environment Variables**:
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add:
     ```
     RESEND_API_KEY=re_your_api_key_here
     FROM_EMAIL=noreply@yourdomain.com  # Optional: Use your own domain (requires domain verification)
     ```
   - **Important**: Add this to **Production**, **Preview**, and **Development** environments
   - Click "Save"

4. **Install Resend package** (if not already installed):
   ```bash
   cd server
   npm install resend
   ```

5. **Deploy**:
   - Push your changes to trigger a new deployment
   - Or redeploy from Vercel dashboard

### Domain Verification (Optional - Recommended for Production)

For better deliverability, verify your own domain:

1. In Resend dashboard, go to "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `ge-metrics.com`)
4. Add the DNS records Resend provides to your domain's DNS
5. Wait for verification (usually a few minutes)
6. Update `FROM_EMAIL` in Vercel to use your verified domain:
   ```
   FROM_EMAIL=noreply@ge-metrics.com
   ```

---

## 🔄 Alternative: SMTP (Gmail, SendGrid, etc.)

If you prefer SMTP, you can use any SMTP provider:

### Gmail Setup:

1. **Enable App Passwords**:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Go to App Passwords
   - Create a new app password for "Mail"

2. **Add to Vercel**:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password-here
   FROM_EMAIL=your-email@gmail.com
   ```

### SendGrid Setup:

1. **Create SendGrid account** and get SMTP credentials
2. **Add to Vercel**:
   ```
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Other SMTP Providers:

- **Mailgun**: `smtp.mailgun.org`
- **AWS SES**: Use SES SMTP credentials
- **Postmark**: `smtp.postmarkapp.com`

---

## 🧪 Testing Email Setup

### Test Locally:

1. **Create a `.env` file** in the `server` directory:
   ```bash
   RESEND_API_KEY=re_your_test_key_here
   # OR
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

2. **Start the server**:
   ```bash
   cd server
   npm run dev
   ```

3. **Check server logs** for email connection status:
   - Look for: `✅ [EmailService] Resend API configured` or `✅ [EmailService] SMTP connection verified successfully`

4. **Test signup**:
   - Go to your frontend
   - Sign up with a test email
   - Check your email inbox (and spam folder)

### Test in Production:

1. **Check Vercel logs** after deployment:
   - Go to Vercel dashboard → Your project → Deployments → Latest → Functions → View Function Logs
   - Look for email service initialization messages

2. **Test signup flow**:
   - Sign up with a real email
   - Check if verification email arrives
   - Click the verification link
   - Verify account is activated

---

## 🔍 Troubleshooting

### Emails Not Sending?

1. **Check Environment Variables**:
   - Verify `RESEND_API_KEY` or SMTP credentials are set in Vercel
   - Make sure they're set for the correct environment (Production/Preview)

2. **Check Server Logs**:
   - Look for error messages in Vercel function logs
   - Common errors:
     - `Resend package not installed` → Run `npm install resend`
     - `SMTP connection failed` → Check SMTP credentials
     - `No email service configured` → Set RESEND_API_KEY or SMTP credentials

3. **Check Spam Folder**:
   - Verification emails might go to spam initially
   - Resend emails usually have good deliverability

4. **Resend API Key Issues**:
   - Make sure API key starts with `re_`
   - Check API key hasn't been revoked in Resend dashboard
   - Verify you're using the correct environment (test vs production key)

5. **SMTP Issues**:
   - Gmail: Make sure you're using an App Password, not your regular password
   - Check SMTP port (587 for TLS, 465 for SSL)
   - Verify firewall isn't blocking SMTP ports

### Email Service Priority:

The system tries email services in this order:
1. **Resend** (if `RESEND_API_KEY` is set)
2. **SMTP** (if SMTP credentials are set)
3. **Logs email** (if neither is configured - emails won't actually send)

---

## 📊 Email Service Comparison

| Feature | Resend | SMTP (Gmail) | SMTP (SendGrid) |
|---------|--------|--------------|-----------------|
| **Free Tier** | 3,000/month | Limited | 100/day |
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Medium | ⭐⭐ Medium |
| **Deliverability** | ⭐⭐⭐ Excellent | ⭐⭐ Good | ⭐⭐⭐ Excellent |
| **Domain Required** | No (for testing) | No | Yes |
| **Best For** | Production | Development | Production |

**Recommendation**: Use **Resend** for production. It's the easiest to set up and has the best free tier.

---

## ✅ Quick Start Checklist

- [ ] Sign up for Resend account
- [ ] Get Resend API key
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Install Resend package: `npm install resend`
- [ ] Deploy to Vercel
- [ ] Test signup flow
- [ ] Verify email arrives
- [ ] (Optional) Verify your domain in Resend for better deliverability

---

## 🎯 Current Status

After following this guide, your email service should:
- ✅ Send verification emails when users sign up
- ✅ Work automatically with the existing code
- ✅ Have good deliverability rates
- ✅ Be easy to monitor and debug

**Need Help?** Check the server logs in Vercel or contact support.

