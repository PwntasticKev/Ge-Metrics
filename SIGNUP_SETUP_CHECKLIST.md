# 🚀 User Signup Setup Checklist

Complete this checklist to enable user signups on your GE-Metrics platform.

## ✅ Environment Variables Setup

Copy these to your production environment (Vercel, Railway, etc.):

### 🔴 **Required: Email Service**

Choose **ONE** of these options:

#### Option A: AWS SES (Recommended for Production)
```bash
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key" 
AWS_REGION="us-east-1"
SES_FROM_EMAIL="noreply@your-domain.com"
```

#### Option B: Resend.com (Easiest Setup)
```bash
RESEND_API_KEY="re_your_resend_api_key"
FROM_EMAIL="noreply@your-domain.com"
```

#### Option C: SMTP (Gmail, SendGrid, etc.)
```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="your-email@gmail.com"
```

### 🔴 **Required: Stripe Payment Processing**

```bash
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
STRIPE_PRICE_MONTHLY="price_1234567890"
STRIPE_PRICE_YEARLY="price_0987654321"
STRIPE_PRODUCT_PREMIUM="prod_abcdefghijk"
```

### 🟡 **Already Configured**
These are already in your codebase:
```bash
DATABASE_URL="your-postgres-connection-string"
JWT_ACCESS_SECRET="your-jwt-access-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
FRONTEND_URL="https://your-domain.com"
```

---

## 🛠️ **Step-by-Step Setup Guide**

### 1️⃣ **Email Service Setup (Choose One)**

#### **AWS SES Setup** (Most Reliable)

1. **Create AWS Account & IAM User**:
   ```bash
   # Go to AWS Console → IAM → Users → Create User
   # Attach policy: AmazonSESFullAccess
   # Generate access keys
   ```

2. **Verify Domain in SES**:
   ```bash
   # Go to AWS SES → Verified Identities → Create Identity
   # Add your domain (e.g., ge-metrics.com)
   # Add DNS records provided by AWS
   ```

3. **Request Production Access**:
   ```bash
   # Go to AWS SES → Account Dashboard
   # Request to move out of sandbox mode
   # Explain you're sending user verification emails
   ```

4. **Add Environment Variables**:
   ```bash
   AWS_ACCESS_KEY_ID="AKIA..."
   AWS_SECRET_ACCESS_KEY="..."
   AWS_REGION="us-east-1"
   SES_FROM_EMAIL="noreply@your-domain.com"
   ```

#### **Resend.com Setup** (Easiest)

1. **Sign up**: Go to [resend.com](https://resend.com)
2. **Get API Key**: Dashboard → API Keys → Create
3. **Add to Environment**:
   ```bash
   RESEND_API_KEY="re_..."
   FROM_EMAIL="noreply@your-domain.com"
   ```

### 2️⃣ **Stripe Setup**

1. **Create Stripe Account**: [dashboard.stripe.com](https://dashboard.stripe.com)

2. **Create Product**:
   ```bash
   # Go to Products → Add Product
   # Name: "GE-Metrics Premium"
   # Description: "Premium features for OSRS traders"
   ```

3. **Create Prices**:
   ```bash
   # Add Price → Recurring
   # Monthly: $9.99/month
   # Yearly: $99.99/year (save $19.89)
   ```

4. **Set Up Webhook**:
   ```bash
   # Go to Webhooks → Add Endpoint
   # URL: https://your-domain.com/stripe/webhook
   # Events to send:
   # - checkout.session.completed
   # - customer.subscription.created
   # - customer.subscription.updated  
   # - customer.subscription.deleted
   # - invoice.payment_succeeded
   # - invoice.payment_failed
   ```

5. **Copy IDs to Environment**:
   ```bash
   STRIPE_SECRET_KEY="sk_test_..."     # API Keys → Secret Key
   STRIPE_PUBLISHABLE_KEY="pk_test_..."  # API Keys → Publishable Key  
   STRIPE_WEBHOOK_SECRET="whsec_..."   # Webhooks → Signing Secret
   STRIPE_PRICE_MONTHLY="price_..."    # Products → Monthly Price → ID
   STRIPE_PRICE_YEARLY="price_..."     # Products → Yearly Price → ID
   STRIPE_PRODUCT_PREMIUM="prod_..."   # Products → Product → ID
   ```

---

## 🧪 **Testing Your Setup**

### Test Scripts Created for You:

1. **Test Email Configuration**:
   ```bash
   cd server
   npm install tsx  # If not installed
   npx tsx test-email-setup.ts your-email@example.com
   ```

2. **Test Stripe Configuration**:
   ```bash
   cd server
   npx tsx test-stripe-setup.ts
   ```

3. **Run E2E Signup Test**:
   ```bash
   npm run test:e2e -- e2e/signup-flow.spec.ts
   ```

### Manual Testing Checklist:

- [ ] **Email Test**: Sign up with real email, verify you receive verification email
- [ ] **Email Verification**: Click verification link, confirm account activates  
- [ ] **Trial Creation**: Verify 30-day trial subscription is created automatically
- [ ] **Stripe Test**: Use test card `4242 4242 4242 4242` to test upgrade flow
- [ ] **Webhook Test**: Monitor Stripe Dashboard for webhook delivery
- [ ] **Error Handling**: Test duplicate email, weak password, payment failures

---

## 🔍 **Troubleshooting**

### Email Not Sending?
```bash
# Check logs:
cd server && npm run dev
# Look for: "Email service initialized" or error messages

# Test connection:
npx tsx test-email-setup.ts

# Common fixes:
# - AWS SES: Verify domain, request production access
# - SMTP: Use app password, not regular password for Gmail
# - Resend: Check API key starts with "re_"
```

### Stripe Issues?
```bash
# Test Stripe connection:
npx tsx test-stripe-setup.ts

# Common fixes:
# - Verify all Stripe IDs are copied correctly
# - Check webhook URL is accessible
# - Ensure test keys for development, live keys for production
```

### Database Issues?
```bash
# Check database connection:
cd server && npm run dev
# Look for: "Database connected" message

# Apply migrations:
npm run db:generate
npm run db:push
```

---

## 🚀 **Production Deployment**

### Before Going Live:

1. **Switch to Live Stripe Keys**:
   ```bash
   STRIPE_SECRET_KEY="sk_live_..."
   STRIPE_PUBLISHABLE_KEY="pk_live_..."
   # Update webhook endpoint to production URL
   ```

2. **Use Production Email Service**:
   ```bash
   # AWS SES: Ensure you're out of sandbox mode
   # Resend: Use production API key
   # SMTP: Use production credentials
   ```

3. **Set Production Domain**:
   ```bash
   FRONTEND_URL="https://ge-metrics.com"
   # Update Stripe webhook URLs
   # Update email verification links
   ```

4. **Test Everything Again**:
   ```bash
   # Complete signup flow with real email
   # Test payment with real card (small amount)
   # Verify webhook delivery in production
   # Check all email links work with production domain
   ```

---

## ✅ **Success Indicators**

When everything works, you should see:

- ✅ Users can register with email/password
- ✅ Verification emails arrive promptly (check spam folder)
- ✅ Email verification activates accounts
- ✅ 30-day trials are created automatically
- ✅ Users can upgrade to paid subscriptions
- ✅ Stripe webhooks update subscription status
- ✅ Payment history is tracked
- ✅ Failed payments are handled gracefully

---

## 📞 **Support**

If you get stuck:

1. **Check the logs** first - they usually show the exact error
2. **Run the test scripts** to isolate the issue
3. **Verify environment variables** are set correctly
4. **Test with simple cases** before complex flows

Your codebase already has all the signup logic implemented - you just need to configure the external services!

---

**Created scripts for you:**
- `server/test-email-setup.ts` - Test email configuration  
- `server/test-stripe-setup.ts` - Test Stripe configuration
- `e2e/signup-flow.spec.ts` - End-to-end signup tests